/**
 * Главный JavaScript файл для Car Marketplace
 * Инициализация общих функций и обновление UI при загрузке страницы
 */

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('Car Marketplace loaded');
    
    // Обновление UI авторизации на всех страницах
    updateAuthUI();
    
    // Инициализация обработчиков навигации
    initNavigation();
    
    // Инициализация меню пользователя с задержкой скрытия
    initUserMenu();
});

/**
 * Инициализация навигации
 */
function initNavigation() {
    // Обработчик ссылки на вход
    const loginLink = document.getElementById('loginLink');
    if (loginLink && !isAuthenticated()) {
        loginLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'login.html';
        });
    }

    // Обработчики меню пользователя
    const favoritesLink = document.getElementById('favoritesLink');
    if (favoritesLink) {
        favoritesLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (isAuthenticated()) {
                window.location.href = 'favorites.html';
            } else {
                window.location.href = 'login.html';
            }
        });
    }

    // Обработчик ссылки "Сообщения" - используем делегирование событий для надежности
    // Обрабатываем клики на уровне документа, чтобы перехватить все клики
    document.addEventListener('click', (e) => {
        // Проверяем, кликнули ли на ссылку "Сообщения"
        const messagesLink = e.target.closest('#messagesLink') || 
                           (e.target.textContent && e.target.textContent.trim() === 'Сообщения' && e.target.closest('a[href="#"]'));
        
        if (messagesLink) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Переход на страницу сообщений');
            window.location.href = 'messages.html';
            return false;
        }
    }, true); // Используем capture phase для раннего перехвата
    
    // Дополнительная обработка для всех ссылок с href="#" и текстом "Сообщения"
    function setupMessagesLinks() {
        const allMessagesLinks = document.querySelectorAll('a[href="#"]');
        allMessagesLinks.forEach(link => {
            if (link.id === 'messagesLink' || (link.textContent && link.textContent.trim() === 'Сообщения')) {
                // Удаляем старые обработчики
                const newLink = link.cloneNode(true);
                link.parentNode.replaceChild(newLink, link);
                
                // Устанавливаем новый обработчик
                newLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Переход на страницу сообщений (обработчик ссылки)');
                    window.location.href = 'messages.html';
                    return false;
                });
            }
        });
    }
    
    // Настраиваем обработчики после загрузки DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupMessagesLinks);
    } else {
        setupMessagesLinks();
    }

    const myListingsLink = document.getElementById('myListingsLink');
    if (myListingsLink) {
        myListingsLink.addEventListener('click', (e) => {
            e.preventDefault();
            // Переходим на страницу профиля, где отображаются объявления
            window.location.href = 'profile.html';
        });
    }
}

/**
 * Инициализация меню пользователя с задержкой скрытия
 */
function initUserMenu() {
    const userMenu = document.getElementById('userMenu');
    const dropdown = userMenu?.querySelector('.dropdown');
    
    if (!userMenu || !dropdown) return;
    
    let hideTimeout = null;
    const HIDE_DELAY = 300; // Задержка скрытия в миллисекундах
    
    // Показ меню при наведении на user-menu
    userMenu.addEventListener('mouseenter', () => {
        if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
        }
        dropdown.style.display = 'block';
        // Небольшая задержка для плавного появления
        setTimeout(() => {
            dropdown.style.opacity = '1';
            dropdown.style.visibility = 'visible';
        }, 10);
    });
    
    // Показ меню при наведении на dropdown
    dropdown.addEventListener('mouseenter', () => {
        if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
        }
        dropdown.style.display = 'block';
        dropdown.style.opacity = '1';
        dropdown.style.visibility = 'visible';
    });
    
    // Скрытие меню с задержкой при уходе курсора
    userMenu.addEventListener('mouseleave', () => {
        hideTimeout = setTimeout(() => {
            dropdown.style.opacity = '0';
            dropdown.style.visibility = 'hidden';
            // Полностью скрываем после анимации
            setTimeout(() => {
                if (dropdown.style.opacity === '0') {
                    dropdown.style.display = 'none';
                }
            }, 200);
        }, HIDE_DELAY);
    });
    
    // Скрытие меню с задержкой при уходе курсора с dropdown
    dropdown.addEventListener('mouseleave', () => {
        hideTimeout = setTimeout(() => {
            dropdown.style.opacity = '0';
            dropdown.style.visibility = 'hidden';
            // Полностью скрываем после анимации
            setTimeout(() => {
                if (dropdown.style.opacity === '0') {
                    dropdown.style.display = 'none';
                }
            }, 200);
        }, HIDE_DELAY);
    });
}

