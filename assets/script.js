// static/script.js

// --- Глобальные переменные ---
let userLocation = null; // { lat, lng }
let selectedCityKey = null; // Ключ выбранного города из CITIES
let selectedCityName = "Не определен"; // Название выбранного города для отображения

// --- Функции обновления UI ---

/**
 * Обновляет отображение выбранного города.
 * @param {string} cityName Название города или "Не определен".
 */
function updateSelectedCityDisplay(cityName) {
    const citySpan = document.getElementById('selected-city');
    if (citySpan) {
        citySpan.textContent = cityName || 'Не определен';
    }
}

/**
 * Показывает сообщение в секции статуса.
 * @param {string} message Текст сообщения.
 * @param {string} type Тип сообщения ('info', 'warning', 'error').
 */
function showStatusMessage(message, type = 'info') {
    const statusSection = document.getElementById('status-section');
    const statusText = document.getElementById('status-text');
    if (statusSection && statusText) {
        statusText.textContent = message;
        statusSection.className = ''; // Сброс классов
        statusSection.classList.add(type); // Добавить класс типа
        statusSection.style.display = 'block';
    }
}

/**
 * Скрывает секцию статуса.
 */
function hideStatusMessage() {
    const statusSection = document.getElementById('status-section');
    if (statusSection) {
        statusSection.style.display = 'none';
    }
}

/**
 * Показывает список городов.
 */
function showCitiesList() {
    const modal = document.getElementById('cities-modal');
    if (modal) {
        modal.style.display = 'block';
    }
}

/**
 * Скрывает список городов.
 */
function hideCitiesList() {
    const modal = document.getElementById('cities-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Заполняет модальное окно со списком городов.
 * @param {Object} cities Объект с данными городов {city_key: {name: "...", ...}}.
 */
function populateCitiesModal(cities) {
    const listContainer = document.getElementById('cities-list');
    if (!listContainer) {
        console.error("Контейнер списка городов (#cities-list) не найден.");
        return;
    }

    if (!cities || Object.keys(cities).length === 0) {
        listContainer.innerHTML = '<p>Города не загружены.</p>';
        return;
    }

    // Очищаем контейнер
    listContainer.innerHTML = '';

    // Создаем элементы для каждого города
    for (const [cityKey, cityInfo] of Object.entries(cities)) {
        const cityDiv = document.createElement('div');
        cityDiv.className = 'city-item';
        cityDiv.textContent = cityInfo.name;
        cityDiv.dataset.cityKey = cityKey; // Сохраняем ключ в data-атрибуте
        
        // Добавляем обработчик клика
        cityDiv.addEventListener('click', () => {
            selectCity(cityKey, cityInfo.name);
        });
        
        listContainer.appendChild(cityDiv);
    }
}

/**
 * Выбирает город.
 * @param {string} cityKey Ключ города.
 * @param {string} cityName Название города.
 */
function selectCity(cityKey, cityName) {
    console.log(`Выбран город: ${cityName} (${cityKey})`);
    
    // Сохраняем выбранный город
    selectedCityKey = cityKey;
    selectedCityName = cityName;

    // Обновляем отображение выбранного города
    updateSelectedCityDisplay(cityName);

    // Скрываем список городов
    hideCitiesList();

    // Отправляем данные в бот (опционально, если нужно сразу сообщить о выборе)
    // sendDataToBot({ action: "city_selected", city_key: cityKey, city_name: cityName });
    
    // Здесь можно добавить логику обновления других частей UI, зависящих от города
    // updateAvailableRoutesForCity(cityKey);
    // updateShapesForCity(cityKey);
    // updateDifficultiesForCity(cityKey);
}

// --- Функции работы с геолокацией и городом ---

/**
 * Пытается "тихо" получить геолокацию (без запроса разрешения, если уже дано).
 * Использует getCurrentPosition с enableHighAccuracy: false и timeout: 0.
 * Это позволяет получить кэшированную позицию, если она доступна.
 */
async function trySilentGeoLocation() {
    console.log("Попытка тихого получения геолокации...");
    if (!navigator.geolocation) {
        console.warn("Геолокация не поддерживается этим браузером (тихая попытка).");
        return null;
    }

    return new Promise((resolve) => {
        // Используем getCurrentPosition с очень коротким таймаутом
        // и без запроса разрешения, если оно не дано.
        navigator.geolocation.getCurrentPosition(
            (position) => {
                console.log("Тихое получение геолокации успешно.");
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
            },
            (error) => {
                console.log(`Тихая попытка получения геолокации не удалась: ${error.message}`);
                resolve(null); // Не ошибка, просто не удалось тихо получить
            },
            {
                enableHighAccuracy: false, // Не требуем высокой точности
                timeout: 100,              // Очень короткий таймаут
                maximumAge: 5 * 60 * 1000  // Использовать кэш до 5 минут
            }
        );
    });
}

/**
 * Запрашивает геолокацию у пользователя с полным диалогом.
 * @returns {Promise<Object|null>} Объект {lat, lng} или null.
 */
async function requestGeoLocation() {
    console.log("Запрос геолокации у пользователя...");
    showStatusMessage("Запрашиваем доступ к геолокации...", 'info');

    if (!navigator.geolocation) {
        const errorMsg = "Геолокация не поддерживается этим браузером.";
        console.warn(errorMsg);
        showStatusMessage(errorMsg, 'error');
        return null;
    }

    return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const coords = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                console.log(`Геолокация получена: ${coords.lat}, ${coords.lng}`);
                showStatusMessage("Геолокация получена!", 'info');
                resolve(coords);
            },
            (error) => {
                let errorMsg = "Не удалось получить местоположение. ";
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMsg += "Доступ запрещен пользователем.";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMsg += "Информация о местоположении недоступна.";
                        break;
                    case error.TIMEOUT:
                        errorMsg += "Время запроса истекло.";
                        break;
                    default:
                        errorMsg += "Произошла неизвестная ошибка.";
                        break;
                }
                console.error(`Ошибка получения геолокации: ${errorMsg}`);
                showStatusMessage(errorMsg, 'error');
                resolve(null);
            },
            {
                enableHighAccuracy: true,  // Требуем высокую точность
                timeout: 15000,             // Таймаут 15 секунд
                maximumAge: 60000           // Использовать кэш до 1 минуты
            }
        );
    });
}

/**
 * Определяет город по координатам.
 * В реальном приложении это будет вызов вашего API.
 * @param {number} lat Широта.
 * @param {number} lng Долгота.
 * @returns {Promise<Object|null>} Объект {key, name} или null.
 */
async function determineCity(lat, lng) {
    console.log(`Определение города для координат: ${lat}, ${lng}`);
    // --- Имитация API ---
    // В реальном приложении здесь будет fetch к вашему бэкенду.
    // Например:
    // const response = await fetch(`/api/get_city?lat=${lat}&lng=${lng}`);
    // const data = await response.json();
    // return data.city; // {key: "moscow", name: "Москва"}

    // Временная имитация с задержкой
    return new Promise((resolve) => {
        setTimeout(() => {
            // Очень простая логика: если широта > 60, считаем Сургутом, иначе Москвой.
            // В реальном приложении это будет сложный поиск по базе городов.
            if (lat > 60) {
                resolve({ key: "surgut", name: "Сургут" });
            } else {
                resolve({ key: "moscow", name: "Москва" });
            }
        }, 1000); // Имитация задержки сети
    });
}

/**
 * Основная функция для определения города.
 * Сначала пытается тихо получить геолокацию, если не удается - оставляет "Не определен".
 */
async function determineUserLocationAndCity() {
    console.log("Начало процесса определения местоположения и города...");

    // 1. Показываем "Не определен" сразу
    updateSelectedCityDisplay("Не определен");
    showStatusMessage("Определение местоположения...", 'info');

    // 2. Попытка тихого получения
    let coords = await trySilentGeoLocation();

    if (coords) {
        userLocation = coords;
        // 3. Определение города по координатам
        const city = await determineCity(coords.lat, coords.lng);
        if (city) {
            selectCity(city.key, city.name); // Используем нашу функцию выбора
            hideStatusMessage(); // Скрываем статус, если всё ок
        } else {
            // Координаты есть, но город не определен
            updateSelectedCityDisplay('Не определен');
            showStatusMessage("Город по координатам не найден. Выберите вручную.", 'warning');
        }
    } else {
        // Тихо не получилось
        console.log("Тихое определение не удалось. Город не определен.");
        updateSelectedCityDisplay('Не определен');
        hideStatusMessage(); // Скрываем статус, если нет ошибки
        // showStatusMessage("Город не определен. Нажмите 'Выбрать город'.", 'warning');
    }
}

/**
 * Обработчик клика по кнопке "Выбрать город".
 * Показывает модальное окно со списком городов.
 */
function onSelectLocationClick() {
    console.log("Кнопка 'Выбрать город' нажата.");
    showCitiesList();
    // hideStatusMessage(); // Скрываем предыдущие сообщения
}

// --- Основная инициализация ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Mini App загружается...");

    // --- Инициализация Telegram WebApp ---
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        try {
            tg.expand();
            console.log("Telegram WebApp API инициализирован.");
            // Можно получить данные пользователя, если нужно
            console.log("Данные пользователя:", tg.initDataUnsafe?.user);
        } catch (initError) {
            console.error("Ошибка инициализации Telegram WebApp:", initError);
        }
    } else {
        console.warn("Приложение запущено вне Telegram или Telegram WebApp API недоступен.");
        showStatusMessage("Предупреждение: Приложение запущено вне Telegram.", 'warning');
    }

    // --- Назначение обработчиков ---
    const selectLocationBtn = document.getElementById('select-location-btn');
    if (selectLocationBtn) {
        selectLocationBtn.addEventListener('click', onSelectLocationClick);
    }

    const closeModalBtn = document.getElementById('close-modal-btn');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', hideCitiesList);
    }

    // Закрытие модального окна при клике вне его
    const modal = document.getElementById('cities-modal');
    if (modal) {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                hideCitiesList();
            }
        });
    }

    // --- Загрузка и отображение городов ---
    // В реальном приложении здесь будет fetch к вашему API или локальный JSON
    // Пока используем статические данные
    const mockCities = {
        "moscow": {"name": "Москва"},
        "spb": {"name": "Санкт-Петербург"},
        "novosibirsk": {"name": "Новосибирск"},
        "ekb": {"name": "Екатеринбург"},
        "kazan": {"name": "Казань"},
        "surgut": {"name": "Сургут"}
        // ... другие города из CITIES
    };
    populateCitiesModal(mockCities);

    // --- Автоматическое определение ---
    // Запускаем процесс определения местоположения и города
    determineUserLocationAndCity();
});