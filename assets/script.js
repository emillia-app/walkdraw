// static/script.js

// --- Переменные ---
let userLocation = null; // { lat, lng }
let userCity = null;     // { key, name }

// --- Функции обновления UI ---

/**
 * Обновляет отображение статуса определения города в шапке.
 * @param {string|null} cityName Название города или null/'Не определен'.
 */
function updateLocationDisplay(cityName) {
    const cityNameElement = document.getElementById('city-name');
    if (cityNameElement) {
        cityNameElement.textContent = cityName || 'Не определен';
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
 * Сначала пытается тихо получить геолокацию, если не удается - запрашивает у пользователя.
 */
async function determineUserLocationAndCity() {
    console.log("Начало процесса определения местоположения и города...");

    // 1. Попытка тихого получения
    let coords = await trySilentGeoLocation();

    if (coords) {
        userLocation = coords;
        // 2. Определение города по координатам
        const city = await determineCity(coords.lat, coords.lng);
        if (city) {
            userCity = city;
            updateLocationDisplay(city.name);
            showStatusMessage(`Город определен: ${city.name}`, 'info');
            // Отправляем данные в бот
            sendDataToBot({
                action: "location_and_city_determined",
                lat: coords.lat,
                lng: coords.lng,
                city_key: city.key,
                city_name: city.name
            });
            return;
        } else {
            // Координаты есть, но город не определен
            updateLocationDisplay('Не определен');
            showStatusMessage("Город по координатам не найден. Выберите вручную.", 'warning');
            return;
        }
    } else {
        // Тихо не получилось
        console.log("Тихое определение не удалось. Город не определен.");
        updateLocationDisplay('Не определен');
        // showStatusMessage("Город не определен. Нажмите 'Выбрать город'.", 'warning');
        // Не показываем сообщение сразу, пусть пользователь сам нажмет кнопку
    }
}

/**
 * Обработчик клика по кнопке "Выбрать город".
 * Запрашивает геолокацию у пользователя.
 */
async function onSelectLocationClick() {
    console.log("Кнопка 'Выбрать город' нажата.");
    hideStatusMessage(); // Скрываем предыдущие сообщения

    // 1. Запрашиваем геолокацию у пользователя
    const coords = await requestGeoLocation();

    if (coords) {
        userLocation = coords;
        // 2. Определяем город
        showStatusMessage("Определение города...", 'info');
        const city = await determineCity(coords.lat, coords.lng);

        if (city) {
            userCity = city;
            updateLocationDisplay(city.name);
            showStatusMessage(`Город определен: ${city.name}`, 'info');
            // Отправляем данные в бот
            sendDataToBot({
                action: "location_and_city_determined",
                lat: coords.lat,
                lng: coords.lng,
                city_key: city.key,
                city_name: city.name
            });
        } else {
            updateLocationDisplay('Не определен');
            showStatusMessage("Город по координатам не найден. Попробуйте другой способ.", 'warning');
            // Здесь можно реализовать ручной выбор из списка городов
        }
    }
    // Если coords null, requestGeoLocation уже показал ошибку
}

// --- Основная инициализация ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Mini App загружается...");
    updateLocationDisplay('Определение...'); // Показываем состояние "загрузка"

    // --- Назначение обработчиков ---
    const selectLocationBtn = document.getElementById('select-location-btn');
    if (selectLocationBtn) {
        selectLocationBtn.addEventListener('click', onSelectLocationClick);
    }

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

    // --- Автоматическое определение ---
    // Запускаем процесс определения местоположения и города
    determineUserLocationAndCity();
});