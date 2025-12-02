/**
 * Модуль для создания объявлений
 * Открытие модального окна и обработка формы создания объявления
 */

import { CAR_MAKES_AND_MODELS, CAR_COLORS, BELARUS_REGIONS_AND_CITIES, getYearOptions } from './carData.js';
import { decodeVin } from './vinDecoder.js';

// Choices.js instances для формы создания
let createMakeChoice = null;
let createModelChoice = null;
let createYearChoice = null;
let createColorChoice = null;
let createRegionChoice = null;
let createCityChoice = null;

/**
 * Открытие модального окна для создания объявления
 */
function openCreateListingModal() {
    // Проверяем авторизацию
    if (typeof window !== 'undefined' && window.isAuthenticated && !window.isAuthenticated()) {
        alert('Для создания объявления необходимо войти в систему');
        window.location.href = 'login.html';
        return;
    }

    const modal = document.getElementById('createListingModal');
    if (modal) {
        modal.style.display = 'flex';
        
        // Сбрасываем счетчик попыток
        initChoicesAttempts = 0;
        
        // Скрываем сообщения об ошибках
        hideCreateListingMessages();
        
        // Небольшая задержка для того, чтобы модальное окно успело отобразиться
        setTimeout(() => {
            // Сначала очищаем форму
            const form = document.getElementById('createListingForm');
            if (form) {
                form.reset();
            }
            
            // Инициализируем Choices.js для формы, если еще не инициализированы
            initCreateListingChoices();
            
            // Сбрасываем Choices.js после инициализации
            setTimeout(() => {
                resetCreateListingChoices();
            }, 50);
        }, 150);
    }
}

/**
 * Закрытие модального окна
 */
function closeCreateListingModal() {
    const modal = document.getElementById('createListingModal');
    if (modal) {
        modal.style.display = 'none';
        // Сбрасываем режим редактирования
        modal.removeAttribute('data-edit-mode');
        modal.removeAttribute('data-listing-id');
        // Восстанавливаем заголовок
        const modalHeader = modal.querySelector('.modal-header h2');
        if (modalHeader) {
            modalHeader.textContent = 'Добавить объявление';
        }
        // Восстанавливаем текст кнопки
        const submitBtn = document.getElementById('submitListingBtn');
        if (submitBtn) {
            submitBtn.textContent = 'Создать объявление';
            submitBtn.removeAttribute('data-listing-id');
        }
    }
    // Очищаем форму
    const form = document.getElementById('createListingForm');
    if (form) {
        form.reset();
        // Сбрасываем Choices.js
        resetCreateListingChoices();
        // Очищаем превью изображений
        clearImagePreview();
    }
    hideCreateListingMessages();
}

/**
 * Скрытие сообщений об ошибках/успехе
 */
function hideCreateListingMessages() {
    const errorMsg = document.getElementById('createListingErrorMessage');
    const successMsg = document.getElementById('createListingSuccessMessage');
    if (errorMsg) errorMsg.style.display = 'none';
    if (successMsg) successMsg.style.display = 'none';
}

/**
 * Показ сообщения об ошибке
 */
function showCreateListingError(message) {
    const errorMsg = document.getElementById('createListingErrorMessage');
    if (errorMsg) {
        errorMsg.textContent = message;
        errorMsg.style.display = 'block';
    }
}

/**
 * Показ сообщения об успехе
 */
function showCreateListingSuccess(message) {
    const successMsg = document.getElementById('createListingSuccessMessage');
    if (successMsg) {
        successMsg.textContent = message;
        successMsg.style.display = 'block';
    }
}

/**
 * Инициализация формы создания объявления
 */
function initCreateListingForm() {
    const form = document.getElementById('createListingForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Скрываем предыдущие сообщения
        hideCreateListingMessages();

        // Получаем данные формы
        const makeSelect = document.getElementById('createMake');
        const modelSelect = document.getElementById('createModel');
        const yearSelect = document.getElementById('createYear');
        const colorSelect = document.getElementById('createColor');
        const regionSelect = document.getElementById('createRegion');
        const citySelect = document.getElementById('createCity');
        
        const formData = {
            // Данные автомобиля
            make: makeSelect ? makeSelect.value.trim() : '',
            model: modelSelect ? modelSelect.value.trim() : '',
            year: yearSelect ? parseInt(yearSelect.value) : undefined,
            mileage: document.getElementById('createMileage').value ? parseInt(document.getElementById('createMileage').value) : undefined,
            bodyType: document.getElementById('createBodyType').value || undefined,
            engineType: document.getElementById('createEngineType').value || undefined,
            transmission: document.getElementById('createTransmission').value || undefined,
            color: colorSelect ? colorSelect.value.trim() : undefined,
            vin: document.getElementById('createVin').value.trim() || undefined,
            // Данные объявления
            title: document.getElementById('createTitle').value.trim(),
            price: parseFloat(document.getElementById('createPrice').value),
            currency: document.getElementById('createCurrency').value,
            description: document.getElementById('createDescription').value.trim() || undefined,
            city: citySelect ? citySelect.value.trim() : undefined,
            region: regionSelect ? regionSelect.value.trim() : undefined
        };

        // Удаляем undefined значения
        Object.keys(formData).forEach(key => {
            if (formData[key] === undefined || formData[key] === '') {
                delete formData[key];
            }
        });

        // Валидация на клиенте
        if (!formData.make || !formData.model || !formData.year || !formData.title || !formData.price) {
            showCreateListingError('Пожалуйста, заполните все обязательные поля (отмечены звёздочкой *)');
            return;
        }

        if (formData.price <= 0) {
            showCreateListingError('Цена должна быть больше нуля');
            return;
        }

        const currentYear = new Date().getFullYear();
        if (formData.year < 1900 || formData.year > currentYear + 1) {
            showCreateListingError(`Год должен быть в диапазоне от 1900 до ${currentYear + 1}`);
            return;
        }

        // Блокируем кнопку отправки
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        
        // Проверяем режим редактирования
        const modal = document.getElementById('createListingModal');
        const isEditMode = modal && modal.getAttribute('data-edit-mode') === 'true';
        const listingId = modal ? modal.getAttribute('data-listing-id') : null;
        
        submitBtn.textContent = isEditMode ? 'Сохранение...' : 'Создание...';

        try {
            let response;
            const apiPostFunc = typeof window !== 'undefined' ? window.apiPost : null;
            const apiPutFunc = typeof window !== 'undefined' ? window.apiPut : null;
            
            if (!apiPostFunc || !apiPutFunc) {
                throw new Error('Функции API не найдены');
            }
            
            if (isEditMode && listingId) {
                // Режим редактирования - обновляем существующее объявление
                response = await apiPutFunc(`/listings/${listingId}`, formData);
            } else {
                // Режим создания - создаем новое объявление
                response = await apiPostFunc('/listings', formData);
            }

            // Загружаем изображения, если они были выбраны
            const imageInput = document.getElementById('createImages');
            const files = imageInput ? imageInput.files : [];
            
            const finalListingId = response && response.listing ? response.listing.listingId : listingId;
            
            if (files.length > 0 && finalListingId) {
                try {
                    const uploadFunc = typeof window !== 'undefined' ? window.uploadListingImages : null;
                    if (uploadFunc) {
                        await uploadFunc(finalListingId, files);
                    }
                } catch (imageError) {
                    console.error('Ошибка при загрузке изображений:', imageError);
                    // Не прерываем процесс, если объявление создано/обновлено, но изображения не загрузились
                }
            }

            if (isEditMode) {
                showCreateListingSuccess('Объявление успешно обновлено и отправлено на модерацию!');
            } else {
                showCreateListingSuccess('Объявление успешно создано и отправлено на модерацию!');
            }
            
            // Очищаем форму
            form.reset();
            clearImagePreview();
            
            // Сбрасываем режим редактирования
            if (modal) {
                modal.removeAttribute('data-edit-mode');
                modal.removeAttribute('data-listing-id');
                const modalHeader = modal.querySelector('.modal-header h2');
                if (modalHeader) {
                    modalHeader.textContent = 'Добавить объявление';
                }
                if (submitBtn) {
                    submitBtn.textContent = 'Создать объявление';
                    submitBtn.removeAttribute('data-listing-id');
                }
            }

            // Закрываем модальное окно через 2 секунды
            setTimeout(() => {
                closeCreateListingModal();
                // Обновляем список объявлений, если на странице есть контейнер
                if (typeof loadListings === 'function') {
                    loadListings();
                } else {
                    // Если на странице профиля, перезагружаем страницу
                    if (window.location.pathname.includes('profile.html')) {
                        window.location.reload();
                    }
                }
            }, 2000);

        } catch (error) {
            console.error(isEditMode ? 'Ошибка при обновлении объявления:' : 'Ошибка при создании объявления:', error);
            const errorMessage = error.data?.error || error.message || (isEditMode ? 'Не удалось обновить объявление. Попробуйте снова.' : 'Не удалось создать объявление. Попробуйте снова.');
            showCreateListingError(errorMessage);
        } finally {
            // Разблокируем кнопку
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });

    // Обработчик кнопки "Отмена"
    const cancelBtn = document.getElementById('cancelListingBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            closeCreateListingModal();
        });
    }

    // Обработчик кнопки закрытия модального окна
    const closeBtn = document.getElementById('closeCreateListingModalBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            closeCreateListingModal();
        });
    }

    // Обработчик кнопки "Заполнить по VIN"
    const fillByVinBtn = document.getElementById('fillByVinBtn');
    if (fillByVinBtn) {
        fillByVinBtn.addEventListener('click', handleFillByVin);
    }

    // Закрытие модального окна при клике вне его
    const modal = document.getElementById('createListingModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeCreateListingModal();
            }
        });
    }

    // Закрытие модального окна при нажатии Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('createListingModal');
            if (modal && modal.style.display !== 'none') {
                closeCreateListingModal();
            }
        }
    });
}

// Делаем Choices.js instances и функции доступными глобально для использования в других модулях
if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'createMakeChoice', {
        get: () => createMakeChoice,
        set: (value) => { createMakeChoice = value; }
    });
    Object.defineProperty(window, 'createModelChoice', {
        get: () => createModelChoice,
        set: (value) => { createModelChoice = value; }
    });
    Object.defineProperty(window, 'createYearChoice', {
        get: () => createYearChoice,
        set: (value) => { createYearChoice = value; }
    });
    Object.defineProperty(window, 'createColorChoice', {
        get: () => createColorChoice,
        set: (value) => { createColorChoice = value; }
    });
    Object.defineProperty(window, 'createRegionChoice', {
        get: () => createRegionChoice,
        set: (value) => { createRegionChoice = value; }
    });
    Object.defineProperty(window, 'createCityChoice', {
        get: () => createCityChoice,
        set: (value) => { createCityChoice = value; }
    });
    
    // Экспортируем функцию инициализации
    window.initCreateListingChoices = initCreateListingChoices;
    window.initChoicesAttempts = 0;
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    initCreateListingForm();
    
    // Обработчик кнопки "Создать объявление"
    const createListingBtn = document.getElementById('createListingBtn');
    if (createListingBtn) {
        createListingBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openCreateListingModal();
        });
    }
    
    // Обработчик изменения файлов изображений
    const imageInput = document.getElementById('createImages');
    if (imageInput) {
        imageInput.addEventListener('change', () => {
            showImagePreview();
        });
    }
});

// Счетчик попыток инициализации Choices.js
let initChoicesAttempts = 0;
const MAX_INIT_ATTEMPTS = 10;

/**
 * Инициализация Choices.js для формы создания объявления
 */
function initCreateListingChoices() {
    // Проверяем, что Choices.js загружен
    // Choices.js может быть доступен как window.Choices или просто Choices
    let ChoicesClass = null;
    
    // Проверяем разные способы доступа к Choices
    if (typeof window !== 'undefined') {
        ChoicesClass = window.Choices || (typeof Choices !== 'undefined' ? Choices : null);
    }
    
    // Если Choices не найден, ждем загрузки
    if (!ChoicesClass) {
        // Проверяем флаг загрузки
        if (window.choicesLoaded === false) {
            initChoicesAttempts++;
            if (initChoicesAttempts < MAX_INIT_ATTEMPTS) {
                console.warn(`Choices.js еще не загружен, попытка ${initChoicesAttempts}/${MAX_INIT_ATTEMPTS}...`);
                setTimeout(() => {
                    initCreateListingChoices();
                }, 200);
            } else {
                console.error('Choices.js не удалось загрузить после нескольких попыток. Проверьте, что скрипт Choices.js загружен на странице.');
                // Показываем пользователю сообщение
                const modal = document.getElementById('createListingModal');
                if (modal) {
                    const errorMsg = document.getElementById('createListingErrorMessage');
                    if (errorMsg) {
                        errorMsg.textContent = 'Ошибка загрузки формы. Пожалуйста, обновите страницу.';
                        errorMsg.style.display = 'block';
                    }
                }
            }
            return;
        } else {
            // Скрипт загружен, но Choices все еще не доступен - пробуем еще раз
            ChoicesClass = window.Choices || (typeof Choices !== 'undefined' ? Choices : null);
            if (!ChoicesClass) {
                console.error('Choices.js загружен, но класс Choices недоступен');
                return;
            }
        }
    }
    
    // Сбрасываем счетчик при успешной загрузке
    initChoicesAttempts = 0;
    
    // Марки
    const makeSelect = document.getElementById('createMake');
    if (makeSelect) {
        // Если Choices уже инициализирован, обновляем опции через setChoices
        if (createMakeChoice) {
            const makes = Object.keys(CAR_MAKES_AND_MODELS).sort();
            const choices = makes.map(make => ({
                value: make,
                label: make
            }));
            // Добавляем пустую опцию для placeholder
            choices.unshift({ value: '', label: 'Выберите марку' });
            createMakeChoice.setChoices(choices, 'value', 'label', true);
        } else {
            // Очищаем все опции
            makeSelect.innerHTML = '';
            
            // Добавляем placeholder
            const placeholderOption = document.createElement('option');
            placeholderOption.value = '';
            placeholderOption.textContent = 'Выберите марку';
            makeSelect.appendChild(placeholderOption);
            
            // Добавляем опции марок
            const makes = Object.keys(CAR_MAKES_AND_MODELS).sort();
            makes.forEach(make => {
                const option = document.createElement('option');
                option.value = make;
                option.textContent = make;
                makeSelect.appendChild(option);
            });
            
            // Инициализируем Choices.js только после добавления всех опций
            createMakeChoice = new ChoicesClass(makeSelect, {
                searchEnabled: true,
                placeholder: true,
                placeholderValue: 'Выберите марку',
                searchPlaceholderValue: 'Поиск марки...',
                itemSelectText: '',
                shouldSort: true,
                allowHTML: false
            });
            
            // Используем событие Choices.js для обновления моделей
            createMakeChoice.passedElement.element.addEventListener('change', () => {
                updateCreateModelFilter();
            });
        }
    }

    // Модели
    const modelSelect = document.getElementById('createModel');
    if (modelSelect && !createModelChoice) {
        createModelChoice = new ChoicesClass(modelSelect, {
            searchEnabled: true,
            placeholder: true,
            placeholderValue: 'Сначала выберите марку',
            searchPlaceholderValue: 'Поиск модели...',
            itemSelectText: '',
            shouldSort: true,
            allowHTML: false
        });
    }

    // Годы
    const yearSelect = document.getElementById('createYear');
    if (yearSelect) {
        if (createYearChoice) {
            const years = getYearOptions();
            const choices = years.map(year => ({
                value: year.toString(),
                label: year.toString()
            }));
            choices.unshift({ value: '', label: 'Выберите год' });
            createYearChoice.setChoices(choices, 'value', 'label', true);
        } else {
            // Очищаем все опции
            yearSelect.innerHTML = '';
            
            // Добавляем placeholder
            const placeholderOption = document.createElement('option');
            placeholderOption.value = '';
            placeholderOption.textContent = 'Выберите год';
            yearSelect.appendChild(placeholderOption);
            
            const years = getYearOptions();
            years.forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                yearSelect.appendChild(option);
            });
            
            createYearChoice = new ChoicesClass(yearSelect, {
                searchEnabled: true,
                placeholder: true,
                placeholderValue: 'Выберите год',
                searchPlaceholderValue: 'Поиск года...',
                itemSelectText: '',
                shouldSort: false,
                allowHTML: false
            });
        }
    }

    // Цвета
    const colorSelect = document.getElementById('createColor');
    if (colorSelect) {
        if (createColorChoice) {
            const choices = CAR_COLORS.map(color => ({
                value: color.value,
                label: color.label
            }));
            choices.unshift({ value: '', label: 'Выберите цвет' });
            createColorChoice.setChoices(choices, 'value', 'label', true);
        } else {
            // Очищаем все опции
            colorSelect.innerHTML = '';
            
            // Добавляем placeholder
            const placeholderOption = document.createElement('option');
            placeholderOption.value = '';
            placeholderOption.textContent = 'Выберите цвет';
            colorSelect.appendChild(placeholderOption);
            
            CAR_COLORS.forEach(color => {
                const option = document.createElement('option');
                option.value = color.value;
                option.textContent = color.label;
                colorSelect.appendChild(option);
            });
            
            createColorChoice = new ChoicesClass(colorSelect, {
                searchEnabled: true,
                placeholder: true,
                placeholderValue: 'Выберите цвет',
                searchPlaceholderValue: 'Поиск цвета...',
                itemSelectText: '',
                shouldSort: true,
                allowHTML: false
            });
        }
    }

    // Области
    const regionSelect = document.getElementById('createRegion');
    if (regionSelect) {
        if (createRegionChoice) {
            const regions = Object.keys(BELARUS_REGIONS_AND_CITIES).sort();
            const choices = regions.map(region => ({
                value: region,
                label: region
            }));
            choices.unshift({ value: '', label: 'Выберите область' });
            createRegionChoice.setChoices(choices, 'value', 'label', true);
        } else {
            // Очищаем все опции
            regionSelect.innerHTML = '';
            
            // Добавляем placeholder
            const placeholderOption = document.createElement('option');
            placeholderOption.value = '';
            placeholderOption.textContent = 'Выберите область';
            regionSelect.appendChild(placeholderOption);
            
            const regions = Object.keys(BELARUS_REGIONS_AND_CITIES).sort();
            regions.forEach(region => {
                const option = document.createElement('option');
                option.value = region;
                option.textContent = region;
                regionSelect.appendChild(option);
            });
            
            createRegionChoice = new ChoicesClass(regionSelect, {
                searchEnabled: true,
                placeholder: true,
                placeholderValue: 'Выберите область',
                searchPlaceholderValue: 'Поиск области...',
                itemSelectText: '',
                shouldSort: true,
                allowHTML: false
            });
            
            // Используем событие Choices.js для обновления городов
            createRegionChoice.passedElement.element.addEventListener('change', () => {
                updateCreateCityFilter();
            });
        }
    }

    // Города
    const citySelect = document.getElementById('createCity');
    if (citySelect && !createCityChoice) {
        createCityChoice = new ChoicesClass(citySelect, {
            searchEnabled: true,
            placeholder: true,
            placeholderValue: 'Сначала выберите область',
            searchPlaceholderValue: 'Поиск города...',
            itemSelectText: '',
            shouldSort: true,
            allowHTML: false
        });
    }
}

/**
 * Обновление списка моделей при выборе марки
 */
function updateCreateModelFilter() {
    const makeSelect = document.getElementById('createMake');
    const modelSelect = document.getElementById('createModel');
    
    if (!makeSelect || !modelSelect) {
        console.warn('updateCreateModelFilter: makeSelect или modelSelect не найдены');
        return;
    }
    
    if (!createModelChoice) {
        console.warn('updateCreateModelFilter: createModelChoice не инициализирован, пытаемся инициализировать...');
        // Пытаемся инициализировать Choices для модели
        try {
            createModelChoice = new (window.Choices || Choices)(modelSelect, {
                searchEnabled: true,
                placeholder: true,
                placeholderValue: 'Сначала выберите марку',
                searchPlaceholderValue: 'Поиск модели...',
                itemSelectText: '',
                shouldSort: true,
                allowHTML: false
            });
        } catch (error) {
            console.error('updateCreateModelFilter: не удалось инициализировать Choices:', error);
            return;
        }
    }
    
    const selectedMake = makeSelect.value;
    console.log('updateCreateModelFilter: выбранная марка:', selectedMake);
    
    if (selectedMake && CAR_MAKES_AND_MODELS[selectedMake]) {
        const models = CAR_MAKES_AND_MODELS[selectedMake].sort();
        const choices = models.map(model => ({
            value: model,
            label: model
        }));
        
        console.log('updateCreateModelFilter: загружаем', models.length, 'моделей для марки', selectedMake);
        
        try {
            // Сначала разблокируем поле
            modelSelect.disabled = false;
            
            // Обновляем Choices
            createModelChoice.setChoices(choices, 'value', 'label', true);
            
            // Включаем Choices
            createModelChoice.enable();
            
            console.log('updateCreateModelFilter: поле модели разблокировано и заполнено');
        } catch (error) {
            console.error('updateCreateModelFilter: ошибка при обновлении Choices:', error);
            // Пробуем напрямую обновить select
            modelSelect.innerHTML = '';
            choices.forEach(choice => {
                const option = document.createElement('option');
                option.value = choice.value;
                option.textContent = choice.label;
                modelSelect.appendChild(option);
            });
            modelSelect.disabled = false;
        }
    } else {
        console.log('updateCreateModelFilter: марка не выбрана или не найдена, блокируем поле модели');
        try {
            createModelChoice.setChoices([{ value: '', label: 'Сначала выберите марку' }], 'value', 'label', true);
            modelSelect.disabled = true;
            createModelChoice.disable();
        } catch (error) {
            console.error('updateCreateModelFilter: ошибка при блокировке:', error);
            modelSelect.disabled = true;
        }
    }
}

/**
 * Обновление списка городов при выборе области
 */
function updateCreateCityFilter() {
    const regionSelect = document.getElementById('createRegion');
    const citySelect = document.getElementById('createCity');
    
    if (!regionSelect || !citySelect || !createCityChoice) return;
    
    const selectedRegion = regionSelect.value;
    
    if (selectedRegion && BELARUS_REGIONS_AND_CITIES[selectedRegion]) {
        const cities = BELARUS_REGIONS_AND_CITIES[selectedRegion].sort();
        const choices = cities.map(city => ({
            value: city,
            label: city
        }));
        
        createCityChoice.setChoices(choices, 'value', 'label', true);
        citySelect.disabled = false;
        createCityChoice.enable();
    } else {
        createCityChoice.setChoices([{ value: '', label: 'Сначала выберите область' }], 'value', 'label', true);
        citySelect.disabled = true;
        createCityChoice.disable();
    }
}

/**
 * Показ превью выбранных изображений
 */
function showImagePreview() {
    const imageInput = document.getElementById('createImages');
    const previewContainer = document.getElementById('imagePreview');
    
    if (!imageInput || !previewContainer) return;
    
    const files = imageInput.files;
    
    if (files.length === 0) {
        previewContainer.style.display = 'none';
        previewContainer.innerHTML = '';
        return;
    }
    
    previewContainer.style.display = 'block';
    previewContainer.innerHTML = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 0.5rem; margin-top: 0.5rem;">';
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.style.width = '100%';
                img.style.height = '100px';
                img.style.objectFit = 'cover';
                img.style.borderRadius = '4px';
                img.style.border = '1px solid #ddd';
                previewContainer.querySelector('div').appendChild(img);
            };
            reader.readAsDataURL(file);
        }
    }
    
    previewContainer.innerHTML += '</div>';
}

/**
 * Очистка превью изображений
 */
function clearImagePreview() {
    const previewContainer = document.getElementById('imagePreview');
    if (previewContainer) {
        previewContainer.style.display = 'none';
        previewContainer.innerHTML = '';
    }
}

/**
 * Сброс Choices.js для формы создания
 */
function resetCreateListingChoices() {
    if (createMakeChoice) {
        createMakeChoice.setChoiceByValue('');
    }
    if (createModelChoice) {
        createModelChoice.setChoices([{ value: '', label: 'Сначала выберите марку' }], 'value', 'label', true);
        const modelSelect = document.getElementById('createModel');
        if (modelSelect) {
            modelSelect.disabled = true;
            createModelChoice.disable();
        }
    }
    if (createYearChoice) {
        createYearChoice.setChoiceByValue('');
    }
    if (createColorChoice) {
        createColorChoice.setChoiceByValue('');
    }
    if (createRegionChoice) {
        createRegionChoice.setChoiceByValue('');
    }
    if (createCityChoice) {
        createCityChoice.setChoices([{ value: '', label: 'Сначала выберите область' }], 'value', 'label', true);
        const citySelect = document.getElementById('createCity');
        if (citySelect) {
            citySelect.disabled = true;
            createCityChoice.disable();
        }
    }
}

/**
 * Обработчик кнопки "Заполнить по VIN"
 */
async function handleFillByVin() {
    const vinInput = document.getElementById('createVin');
    const fillBtn = document.getElementById('fillByVinBtn');
    
    if (!vinInput || !fillBtn) return;

    const vin = vinInput.value.trim().toUpperCase();
    
    if (!vin) {
        showCreateListingError('Пожалуйста, введите VIN номер');
        return;
    }

    if (vin.length !== 17) {
        showCreateListingError('VIN номер должен содержать 17 символов');
        return;
    }

    // Блокируем кнопку и показываем индикатор загрузки
    const originalText = fillBtn.textContent;
    fillBtn.disabled = true;
    fillBtn.textContent = 'Загрузка...';

    try {
        hideCreateListingMessages();
        
        // Получаем данные по VIN
        const vinData = await decodeVin(vin);
        
        // Заполняем форму данными
        await fillFormFromVinData(vinData);
        
        // Показываем сообщение об успехе
        const successMsg = document.getElementById('createListingSuccessMessage');
        if (successMsg) {
            successMsg.textContent = 'Данные успешно заполнены по VIN номеру!';
            successMsg.style.display = 'block';
        }

    } catch (error) {
        console.error('Ошибка при заполнении по VIN:', error);
        showCreateListingError(error.message || 'Не удалось получить данные по VIN номеру. Проверьте правильность ввода.');
    } finally {
        // Разблокируем кнопку
        fillBtn.disabled = false;
        fillBtn.textContent = originalText;
    }
}

/**
 * Заполнение формы данными из VIN
 */
async function fillFormFromVinData(vinData) {
    console.log('Заполнение формы данными из VIN:', vinData);
    
    // Заполняем марку
    if (vinData.make && createMakeChoice) {
        // Ищем марку в списке (с учетом разных вариантов написания)
        const makeKey = findMakeInList(vinData.make);
        console.log('Найдена марка:', makeKey, 'из', vinData.make);
        
        if (makeKey) {
            // Ждем, пока Choices.js будет готов
            await waitForChoicesReady();
            
            try {
                const makeSelect = document.getElementById('createMake');
                
                // Устанавливаем марку
                createMakeChoice.setChoiceByValue(makeKey);
                
                // Триггерим событие change вручную, чтобы обновить список моделей
                if (makeSelect) {
                    makeSelect.value = makeKey;
                    makeSelect.dispatchEvent(new Event('change', { bubbles: true }));
                }
                
                // Вызываем функцию обновления моделей напрямую
                updateCreateModelFilter();
                
                console.log('Марка установлена:', makeKey);
                
                // Ждем обновления модели (нужно время для загрузки моделей)
                await new Promise(resolve => setTimeout(resolve, 600));
                
                // Проверяем, что поле модели разблокировано
                const modelSelect = document.getElementById('createModel');
                if (modelSelect) {
                    // Убеждаемся, что поле разблокировано
                    if (modelSelect.disabled) {
                        console.log('Поле модели заблокировано, разблокируем...');
                        modelSelect.disabled = false;
                        if (createModelChoice) {
                            createModelChoice.enable();
                        }
                        // Повторно вызываем обновление
                        updateCreateModelFilter();
                        await new Promise(resolve => setTimeout(resolve, 200));
                    }
                    
                    // Заполняем модель
                    if (vinData.model && createModelChoice) {
                        const modelKey = findModelInList(makeKey, vinData.model);
                        console.log('Поиск модели:', vinData.model, 'в марке', makeKey, 'результат:', modelKey);
                        
                        if (modelKey) {
                            try {
                                // Пробуем установить значение
                                createModelChoice.setChoiceByValue(modelKey);
                                console.log('Модель установлена через Choices:', modelKey);
                                
                                // Дополнительно устанавливаем напрямую в select
                                modelSelect.value = modelKey;
                                modelSelect.dispatchEvent(new Event('change', { bubbles: true }));
                            } catch (error) {
                                console.error('Ошибка при установке модели через Choices:', error);
                                // Пробуем напрямую
                                modelSelect.value = modelKey;
                            }
                        } else {
                            // Если модель не найдена, пытаемся ввести вручную
                            console.log('Модель не найдена в списке, добавляем вручную:', vinData.model);
                            
                            // Создаем новую опцию
                            const option = document.createElement('option');
                            option.value = vinData.model;
                            option.textContent = vinData.model;
                            modelSelect.appendChild(option);
                            
                            // Обновляем Choices.js с новой опцией
                            await new Promise(resolve => setTimeout(resolve, 200));
                            try {
                                // Обновляем Choices с новыми опциями
                                const choices = Array.from(modelSelect.options).map(opt => ({
                                    value: opt.value,
                                    label: opt.textContent
                                }));
                                createModelChoice.setChoices(choices, 'value', 'label', true);
                                createModelChoice.setChoiceByValue(vinData.model);
                                console.log('Модель добавлена вручную:', vinData.model);
                            } catch (error) {
                                console.error('Ошибка при добавлении модели:', error);
                                // Пробуем напрямую
                                modelSelect.value = vinData.model;
                            }
                        }
                    } else {
                        console.warn('Поле модели недоступно или заблокировано');
                    }
                } else {
                    console.warn('Модель не найдена в данных VIN или Choices не инициализирован');
                }
            } catch (error) {
                console.error('Ошибка при установке марки/модели:', error);
            }
        } else {
            console.warn('Марка не найдена в списке:', vinData.make);
        }
    }

    // Заполняем год
    if (vinData.year && createYearChoice) {
        await waitForChoicesReady();
        try {
            createYearChoice.setChoiceByValue(vinData.year.toString());
            console.log('Год установлен:', vinData.year);
        } catch (error) {
            console.error('Ошибка при установке года:', error);
        }
    }

    // Заполняем тип кузова
    if (vinData.bodyType) {
        const bodyTypeSelect = document.getElementById('createBodyType');
        if (bodyTypeSelect) {
            bodyTypeSelect.value = vinData.bodyType;
            console.log('Тип кузова установлен:', vinData.bodyType);
        }
    }

    // Заполняем тип двигателя
    if (vinData.engineType) {
        const engineTypeSelect = document.getElementById('createEngineType');
        if (engineTypeSelect) {
            engineTypeSelect.value = vinData.engineType;
            console.log('Тип двигателя установлен:', vinData.engineType);
        }
    }

    // Заполняем коробку передач
    if (vinData.transmission) {
        const transmissionSelect = document.getElementById('createTransmission');
        if (transmissionSelect) {
            // Проверяем, что значение есть в списке опций
            const options = Array.from(transmissionSelect.options);
            const foundOption = options.find(opt => opt.value === vinData.transmission);
            
            if (foundOption) {
                transmissionSelect.value = vinData.transmission;
                // Триггерим событие change для обновления UI
                transmissionSelect.dispatchEvent(new Event('change', { bubbles: true }));
                console.log('Коробка передач установлена:', vinData.transmission);
            } else {
                console.warn('Значение КПП не найдено в списке:', vinData.transmission, 'Доступные:', options.map(o => o.value));
            }
        } else {
            console.error('Элемент createTransmission не найден');
        }
    } else {
        console.warn('КПП не найдена в данных VIN');
    }

    // Заполняем цвет (если есть в данных и в списке)
    if (vinData.color && createColorChoice) {
        await waitForChoicesReady();
        const colorKey = findColorInList(vinData.color);
        if (colorKey) {
            try {
                createColorChoice.setChoiceByValue(colorKey);
                console.log('Цвет установлен:', colorKey);
            } catch (error) {
                console.error('Ошибка при установке цвета:', error);
            }
        } else {
            console.warn('Цвет не найден в списке:', vinData.color);
        }
    }

    // Добавляем объем двигателя в описание, если он есть
    if (vinData.engineDisplacement) {
        const descriptionField = document.getElementById('createDescription');
        if (descriptionField) {
            const currentDesc = descriptionField.value.trim();
            const engineInfo = `Объем двигателя: ${vinData.engineDisplacement} л`;
            
            if (currentDesc) {
                // Добавляем в начало описания, если его еще нет
                if (!currentDesc.includes('Объем двигателя')) {
                    descriptionField.value = `${engineInfo}\n\n${currentDesc}`;
                }
            } else {
                descriptionField.value = engineInfo;
            }
            console.log('Объем двигателя добавлен в описание:', vinData.engineDisplacement);
        }
    }
}

/**
 * Поиск марки в списке (с учетом разных вариантов написания)
 */
function findMakeInList(makeName) {
    if (!makeName || !CAR_MAKES_AND_MODELS) return null;
    
    const normalized = makeName.toLowerCase().trim();
    
    // Словарь синонимов и альтернативных названий
    const makeSynonyms = {
        'mercedes-benz': 'Mercedes-Benz',
        'mercedes': 'Mercedes-Benz',
        'benz': 'Mercedes-Benz',
        'bmw': 'BMW',
        'vw': 'Volkswagen',
        'volkswagen': 'Volkswagen',
        'toyota': 'Toyota',
        'honda': 'Honda',
        'nissan': 'Nissan',
        'ford': 'Ford',
        'chevrolet': 'Chevrolet',
        'chev': 'Chevrolet',
        'gm': 'General Motors',
        'hyundai': 'Hyundai',
        'kia': 'Kia',
        'mazda': 'Mazda',
        'subaru': 'Subaru',
        'audi': 'Audi',
        'lexus': 'Lexus',
        'infiniti': 'Infiniti',
        'acura': 'Acura'
    };
    
    // Проверяем синонимы
    if (makeSynonyms[normalized]) {
        const synonymKey = makeSynonyms[normalized];
        if (CAR_MAKES_AND_MODELS[synonymKey]) {
            return synonymKey;
        }
    }
    
    // Прямое совпадение
    for (const key in CAR_MAKES_AND_MODELS) {
        if (key.toLowerCase() === normalized) {
            return key;
        }
    }
    
    // Частичное совпадение (более точное)
    for (const key in CAR_MAKES_AND_MODELS) {
        const keyLower = key.toLowerCase();
        // Проверяем, содержит ли ключ нормализованное название или наоборот
        if (keyLower.includes(normalized) || normalized.includes(keyLower)) {
            // Предпочитаем более длинные совпадения
            if (keyLower.length >= normalized.length * 0.7) {
                return key;
            }
        }
    }
    
    // Удаляем общие слова и пробуем снова
    const cleaned = normalized.replace(/\b(motor|company|corporation|inc|llc)\b/g, '').trim();
    if (cleaned !== normalized) {
        for (const key in CAR_MAKES_AND_MODELS) {
            if (key.toLowerCase().includes(cleaned) || cleaned.includes(key.toLowerCase())) {
                return key;
            }
        }
    }
    
    return null;
}

/**
 * Поиск модели в списке
 */
function findModelInList(makeKey, modelName) {
    if (!makeKey || !modelName || !CAR_MAKES_AND_MODELS[makeKey]) return null;
    
    const models = CAR_MAKES_AND_MODELS[makeKey];
    const normalized = modelName.toLowerCase().trim();
    
    // Удаляем лишние слова (например, "2020", "sedan", "suv")
    const cleaned = normalized.replace(/\b(\d{4}|\d{2}|sedan|suv|coupe|hatchback|wagon|convertible|hybrid|electric)\b/g, '').trim();
    
    // Прямое совпадение
    for (const model of models) {
        if (model.toLowerCase() === normalized || model.toLowerCase() === cleaned) {
            return model;
        }
    }
    
    // Частичное совпадение (более точное)
    let bestMatch = null;
    let bestScore = 0;
    
    for (const model of models) {
        const modelLower = model.toLowerCase();
        
        // Если модель содержит название или наоборот
        if (modelLower.includes(normalized) || normalized.includes(modelLower) ||
            modelLower.includes(cleaned) || cleaned.includes(modelLower)) {
            // Вычисляем "оценку" совпадения (длина совпадающей части)
            const matchLength = Math.min(modelLower.length, normalized.length);
            const score = matchLength / Math.max(modelLower.length, normalized.length);
            
            if (score > bestScore) {
                bestScore = score;
                bestMatch = model;
            }
        }
    }
    
    // Если нашли хорошее совпадение (более 60% совпадения)
    if (bestMatch && bestScore > 0.6) {
        return bestMatch;
    }
    
    return null;
}

/**
 * Поиск цвета в списке
 */
function findColorInList(colorName) {
    if (!colorName || !CAR_COLORS) return null;
    
    const normalized = colorName.toLowerCase().trim();
    
    // Словарь синонимов цветов
    const colorSynonyms = {
        'black': 'Черный',
        'white': 'Белый',
        'red': 'Красный',
        'blue': 'Синий',
        'green': 'Зеленый',
        'yellow': 'Желтый',
        'gray': 'Серый',
        'grey': 'Серый',
        'silver': 'Серебристый',
        'silver metallic': 'Серебристый',
        'brown': 'Коричневый',
        'beige': 'Бежевый',
        'orange': 'Оранжевый',
        'purple': 'Фиолетовый',
        'pink': 'Розовый',
        'gold': 'Золотой',
        'bronze': 'Бронзовый'
    };
    
    // Проверяем синонимы
    if (colorSynonyms[normalized]) {
        const synonymColor = colorSynonyms[normalized];
        if (CAR_COLORS.includes(synonymColor)) {
            return synonymColor;
        }
    }
    
    // Прямое совпадение
    for (const color of CAR_COLORS) {
        if (color.toLowerCase() === normalized) {
            return color;
        }
    }
    
    // Частичное совпадение
    for (const color of CAR_COLORS) {
        const colorLower = color.toLowerCase();
        if (colorLower.includes(normalized) || normalized.includes(colorLower)) {
            return color;
        }
    }
    
    // Удаляем слова типа "metallic", "pearl", "solid" и пробуем снова
    const cleaned = normalized.replace(/\b(metallic|pearl|solid|matte|glossy|flat)\b/g, '').trim();
    if (cleaned !== normalized) {
        for (const color of CAR_COLORS) {
            if (color.toLowerCase().includes(cleaned) || cleaned.includes(color.toLowerCase())) {
                return color;
            }
        }
    }
    
    return null;
}

/**
 * Ожидание готовности Choices.js
 */
function waitForChoicesReady() {
    return new Promise((resolve) => {
        const checkReady = () => {
            if (window.choicesLoaded && (window.Choices || typeof Choices !== 'undefined')) {
                resolve();
            } else {
                setTimeout(checkReady, 100);
            }
        };
        checkReady();
    });
}

// Делаем функции доступными глобально для inline обработчиков
if (typeof window !== 'undefined') {
    window.openCreateListingModal = openCreateListingModal;
    window.closeCreateListingModal = closeCreateListingModal;
}

