/**
 * Модуль авторизации и регистрации
 * Использует api.js для запросов к серверу
 */

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Проверка, на какой странице мы находимся
    if (document.getElementById('loginForm')) {
        initLogin();
    }
    
    if (document.getElementById('registerForm')) {
        initRegister();
    }

    // Проверка авторизации и обновление UI
    updateAuthUI();
});

/**
 * Инициализация формы входа
 */
function initLogin() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Скрытие предыдущих сообщений
        hideMessage(errorMessage);
        hideMessage(successMessage);

        // Получение данных формы
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        // Базовая валидация
        if (!email || !password) {
            showMessage(errorMessage, 'Заполните все поля');
            return;
        }

        // Валидация email
        if (!isValidEmail(email)) {
            showMessage(errorMessage, 'Некорректный формат email');
            return;
        }

        // Отключение кнопки отправки
        const submitBtn = document.getElementById('loginBtn');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Вход...';

        try {
            // Отправка запроса на сервер
            const response = await apiPost('/auth/login', {
                email,
                password
            });

            // Сохранение токена и данных пользователя
            if (response.token && response.user) {
                setToken(response.token);
                setCurrentUser(response.user);

                // Показ сообщения об успехе
                showMessage(successMessage, 'Вход выполнен успешно! Перенаправление...');

                // Перенаправление на главную страницу
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            }
        } catch (error) {
            // Показ ошибки
            const errorText = error.data?.error || error.message || 'Ошибка при входе. Попробуйте еще раз.';
            showMessage(errorMessage, errorText);
            
            // Включение кнопки обратно
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
}

/**
 * Инициализация формы регистрации
 */
function initRegister() {
    const registerForm = document.getElementById('registerForm');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');

    // Проверка совпадения паролей в реальном времени
    confirmPasswordInput.addEventListener('input', () => {
        if (confirmPasswordInput.value && passwordInput.value !== confirmPasswordInput.value) {
            confirmPasswordInput.setCustomValidity('Пароли не совпадают');
        } else {
            confirmPasswordInput.setCustomValidity('');
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Скрытие предыдущих сообщений
        hideMessage(errorMessage);
        hideMessage(successMessage);

        // Получение данных формы
        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        const displayName = document.getElementById('displayName').value.trim();
        const phone = document.getElementById('phone').value.trim();

        // Валидация обязательных полей
        if (!username || !email || !password || !confirmPassword) {
            showMessage(errorMessage, 'Заполните все обязательные поля');
            return;
        }

        // Валидация email
        if (!isValidEmail(email)) {
            showMessage(errorMessage, 'Некорректный формат email');
            return;
        }

        // Валидация имени пользователя
        if (username.length < 3 || username.length > 50) {
            showMessage(errorMessage, 'Имя пользователя должно содержать от 3 до 50 символов');
            return;
        }

        // Валидация пароля
        if (password.length < 6) {
            showMessage(errorMessage, 'Пароль должен содержать минимум 6 символов');
            return;
        }

        if (!isValidPassword(password)) {
            showMessage(errorMessage, 'Пароль должен содержать буквы и цифры');
            return;
        }

        // Проверка совпадения паролей
        if (password !== confirmPassword) {
            showMessage(errorMessage, 'Пароли не совпадают');
            return;
        }

        // Отключение кнопки отправки
        const submitBtn = document.getElementById('registerBtn');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Регистрация...';

        try {
            // Отправка запроса на сервер
            const response = await apiPost('/auth/register', {
                username,
                email,
                password,
                displayName: displayName || undefined,
                phone: phone || undefined
            });

            // Сохранение токена и данных пользователя
            if (response.token && response.user) {
                setToken(response.token);
                setCurrentUser(response.user);

                // Показ сообщения об успехе
                showMessage(successMessage, 'Регистрация успешна! Перенаправление...');

                // Перенаправление на главную страницу
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            }
        } catch (error) {
            // Показ ошибки
            const errorText = error.data?.error || error.message || 'Ошибка при регистрации. Попробуйте еще раз.';
            showMessage(errorMessage, errorText);
            
            // Включение кнопки обратно
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
}

/**
 * Обновление UI в зависимости от статуса авторизации
 */
function updateAuthUI() {
    const user = getCurrentUser();
    const isAuth = isAuthenticated();

    // Обновление навигации
    const loginLink = document.getElementById('loginLink');
    const userMenu = document.getElementById('userMenu');
    const userName = document.getElementById('userName');

    if (isAuth && user) {
        // Показываем меню пользователя
        if (userMenu) {
            userMenu.style.display = 'block';
        }
        if (userName) {
            userName.textContent = user.displayName || user.username;
        }
        if (loginLink) {
            loginLink.style.display = 'none';
        }
        
        // Скрываем кнопку регистрации для авторизованных пользователей
        const registerLink = document.getElementById('registerLink');
        if (registerLink) {
            registerLink.style.display = 'none';
        }

        // Показываем/скрываем ссылку на модерацию для модераторов и админов
        const moderationLink = document.querySelector('a[href="moderation.html"]');
        if (moderationLink) {
            const isModeratorOrAdmin = user.role === 'moderator' || user.role === 'admin';
            moderationLink.style.display = isModeratorOrAdmin ? 'block' : 'none';
        }
        
        // Показываем/скрываем ссылку на жалобы для модераторов и админов
        const reportsLink = document.querySelector('a[href="reports.html"]');
        if (reportsLink) {
            const isModeratorOrAdmin = user.role === 'moderator' || user.role === 'admin';
            reportsLink.style.display = isModeratorOrAdmin ? 'block' : 'none';
        }

        // Обработчик выхода (удаляем старые обработчики перед добавлением нового)
        const logoutLink = document.getElementById('logoutLink');
        if (logoutLink) {
            // Удаляем все старые обработчики, клонируя элемент
            const newLogoutLink = logoutLink.cloneNode(true);
            logoutLink.parentNode.replaceChild(newLogoutLink, logoutLink);
            
            // Добавляем новый обработчик
            newLogoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (confirm('Вы уверены, что хотите выйти?')) {
                    logout();
                }
                return false;
            });
        }

        // Обработчики ссылок в меню
        const profileLink = document.querySelector('a[href="profile.html"]');
        if (profileLink) {
            profileLink.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = 'profile.html';
            });
        }
    } else {
        // Показываем ссылку на вход
        if (loginLink) {
            loginLink.style.display = 'block';
            loginLink.href = 'login.html';
        }
        
        // Показываем кнопку регистрации для неавторизованных пользователей
        const registerLink = document.getElementById('registerLink');
        if (registerLink) {
            registerLink.style.display = 'block';
        }
        
        if (userMenu) {
            userMenu.style.display = 'none';
        }
    }
}

/**
 * Вспомогательные функции для работы с сообщениями
 */
function showMessage(element, message) {
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function hideMessage(element) {
    if (element) {
        element.style.display = 'none';
        element.textContent = '';
    }
}

/**
 * Валидация email
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Валидация пароля (минимум 6 символов, буквы и цифры)
 */
function isValidPassword(password) {
    if (password.length < 6) {
        return false;
    }
    return /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
}

// Автоматическое обновление UI при изменении авторизации
window.addEventListener('storage', (e) => {
    if (e.key === 'authToken' || e.key === 'currentUser') {
        updateAuthUI();
    }
});

