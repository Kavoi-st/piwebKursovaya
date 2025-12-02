/**
 * Универсальные функции для работы с API
 * Базовый модуль для всех запросов к серверу
 */

// Конфигурация API
// Автоматическое определение базового URL:
// - В Docker/Production: используем относительный путь (проксируется через nginx)
// - В локальной разработке: используем абсолютный URL
const getBaseUrl = () => {
    // Если мы на localhost с портом (локальная разработка), используем прямой URL
    if (window.location.hostname === 'localhost' && window.location.port && window.location.port !== '80' && window.location.port !== '443') {
        return 'http://localhost:3000/api';
    }
    // Иначе используем относительный путь (работает через nginx proxy в Docker)
    return '/api';
};

const API_CONFIG = {
    BASE_URL: getBaseUrl(),
    TIMEOUT: 10000 // 10 секунд
};

/**
 * Получение токена из localStorage
 */
const getToken = () => {
    return localStorage.getItem('authToken');
};

/**
 * Сохранение токена в localStorage
 */
const setToken = (token) => {
    if (token) {
        localStorage.setItem('authToken', token);
    } else {
        localStorage.removeItem('authToken');
    }
};

/**
 * Получение текущего пользователя из localStorage
 */
const getCurrentUser = () => {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
};

/**
 * Сохранение текущего пользователя в localStorage
 */
const setCurrentUser = (user) => {
    if (user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
    } else {
        localStorage.removeItem('currentUser');
    }
};

/**
 * Универсальная функция для выполнения HTTP запросов
 * @param {string} endpoint - Конечная точка API (без /api)
 * @param {object} options - Опции запроса (method, body, headers и т.д.)
 * @returns {Promise} Promise с результатом запроса
 */
const apiRequest = async (endpoint, options = {}) => {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;
    
    // Настройка заголовков
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    // Добавление токена аутентификации, если он есть
    const token = getToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Настройки запроса
    const requestOptions = {
        ...options,
        headers,
        mode: 'cors',
        credentials: 'include'
    };

    // Таймаут запроса
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
    requestOptions.signal = controller.signal;

    try {
        const response = await fetch(url, requestOptions);
        
        clearTimeout(timeoutId);

        // Парсинг ответа
        let data;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        // Проверка статуса ответа
        if (!response.ok) {
            // Если 401 - токен истек или невалиден, очищаем хранилище
            if (response.status === 401) {
                setToken(null);
                setCurrentUser(null);
                // Перенаправление на страницу входа (если не на странице входа)
                if (!window.location.pathname.includes('login.html') && 
                    !window.location.pathname.includes('register.html')) {
                    window.location.href = 'login.html';
                }
            }

            // Выбрасываем ошибку с сообщением от сервера
            const error = new Error(data.error || `HTTP error! status: ${response.status}`);
            error.status = response.status;
            error.data = data;
            throw error;
        }

        return data;
    } catch (error) {
        clearTimeout(timeoutId);

        // Обработка различных типов ошибок
        if (error.name === 'AbortError') {
            throw new Error('Запрос превысил время ожидания. Проверьте подключение к интернету.');
        }

        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('Ошибка подключения к серверу. Убедитесь, что сервер запущен.');
        }

        // Пробрасываем ошибку дальше, если это уже обработанная ошибка
        throw error;
    }
};

/**
 * GET запрос
 */
const apiGet = (endpoint, params = {}) => {
    // Формирование query параметров
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    
    return apiRequest(url, {
        method: 'GET'
    });
};

/**
 * POST запрос
 */
const apiPost = (endpoint, data = {}) => {
    return apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(data)
    });
};

/**
 * PUT запрос
 */
const apiPut = (endpoint, data = {}) => {
    return apiRequest(endpoint, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
};

/**
 * DELETE запрос
 */
const apiDelete = (endpoint) => {
    return apiRequest(endpoint, {
        method: 'DELETE'
    });
};

/**
 * Проверка, авторизован ли пользователь
 */
const isAuthenticated = () => {
    return !!getToken();
};

/**
 * Выход из системы
 */
const logout = () => {
    setToken(null);
    setCurrentUser(null);
    window.location.href = 'index.html';
};

/**
 * Проверка роли пользователя
 */
const hasRole = (role) => {
    const user = getCurrentUser();
    return user && user.role === role;
};

/**
 * Проверка, является ли пользователь модератором или админом
 */
const isModerator = () => {
    const user = getCurrentUser();
    return user && (user.role === 'moderator' || user.role === 'admin');
};

/**
 * Проверка, является ли пользователь администратором
 */
const isAdmin = () => {
    const user = getCurrentUser();
    return user && user.role === 'admin';
};

/**
 * Загрузка изображений для объявления
 * @param {number} listingId - ID объявления
 * @param {FileList} files - Список файлов для загрузки
 * @returns {Promise} Promise с результатом загрузки
 */
const uploadListingImages = async (listingId, files) => {
    if (!files || files.length === 0) {
        return;
    }

    const url = `${API_CONFIG.BASE_URL}/listings/${listingId}/images`;
    const token = getToken();

    if (!token) {
        throw new Error('Требуется аутентификация');
    }

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
        formData.append('images', files[i]);
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Ошибка загрузки изображений' }));
        throw new Error(error.error || 'Ошибка загрузки изображений');
    }

    return await response.json();
};

/**
 * Загрузка аватара пользователя
 * @param {File} file - Файл аватара
 * @returns {Promise} Promise с результатом загрузки
 */
const uploadAvatar = async (file) => {
    if (!file) {
        throw new Error('Файл не выбран');
    }

    const url = `${API_CONFIG.BASE_URL}/auth/profile/avatar`;
    const token = getToken();

    if (!token) {
        throw new Error('Требуется аутентификация');
    }

    const formData = new FormData();
    formData.append('avatar', file);

    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Ошибка загрузки аватара' }));
        throw new Error(error.error || 'Ошибка загрузки аватара');
    }

    const data = await response.json();
    // Обновляем текущего пользователя в localStorage
    if (data.user) {
        setCurrentUser(data.user);
    }
    return data;
};

// Экспорт функций для браузера (глобальная область видимости)
if (typeof window !== 'undefined') {
    window.apiGet = apiGet;
    window.apiPost = apiPost;
    window.apiPut = apiPut;
    window.apiDelete = apiDelete;
    window.uploadListingImages = uploadListingImages;
    window.uploadAvatar = uploadAvatar;
    window.getToken = getToken;
    window.setToken = setToken;
    window.getCurrentUser = getCurrentUser;
    window.setCurrentUser = setCurrentUser;
    window.isAuthenticated = isAuthenticated;
    window.logout = logout;
    window.hasRole = hasRole;
    window.isModerator = isModerator;
    window.isAdmin = isAdmin;
}

// Экспорт функций для Node.js (CommonJS)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        apiGet,
        apiPost,
        apiPut,
        apiDelete,
        uploadListingImages,
        uploadAvatar,
        getToken,
        setToken,
        getCurrentUser,
        setCurrentUser,
        isAuthenticated,
        logout,
        hasRole,
        isModerator,
        isAdmin
    };
}

