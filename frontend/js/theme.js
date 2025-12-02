/**
 * Модуль для переключения темы (светлая/темная)
 */

/**
 * Инициализация темы при загрузке страницы
 */
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
}

/**
 * Установка темы
 */
function setTheme(theme) {
    const html = document.documentElement;
    
    if (theme === 'dark') {
        html.setAttribute('data-theme', 'dark');
    } else {
        html.removeAttribute('data-theme');
    }
    
    localStorage.setItem('theme', theme);
    updateThemeToggleButton(theme);
}

/**
 * Переключение темы
 */
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
}

/**
 * Обновление внешнего вида кнопки переключения темы
 */
function updateThemeToggleButton(theme) {
    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn) {
        // Анимация переключения
        toggleBtn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            toggleBtn.style.transform = 'scale(1)';
        }, 150);
    }
}

/**
 * Инициализация при загрузке DOM
 */
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    
    // Обработчик клика на кнопку переключения темы
    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleTheme();
        });
    }
});

// Экспорт функций для глобального использования
if (typeof window !== 'undefined') {
    window.toggleTheme = toggleTheme;
    window.setTheme = setTheme;
    window.initTheme = initTheme;
}

