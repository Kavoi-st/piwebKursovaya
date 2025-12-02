/**
 * Модуль для декодирования VIN номеров
 * Поддерживает американские, европейские и азиатские автомобили
 * Использует несколько бесплатных API для максимального покрытия
 */

/**
 * Определение региона по первому символу VIN (WMI)
 * @param {string} vin - VIN номер
 * @returns {string} Регион: 'US', 'EU', 'ASIA', 'OTHER'
 */
function detectRegion(vin) {
    const firstChar = vin.charAt(0);
    
    // Северная Америка
    if (/[1-5]/.test(firstChar)) {
        return 'US';
    }
    
    // Япония
    if (firstChar === 'J') {
        return 'ASIA';
    }
    
    // Южная Корея
    if (firstChar === 'K') {
        return 'ASIA';
    }
    
    // Китай (L)
    if (firstChar === 'L') {
        return 'ASIA';
    }
    
    // Европа
    if (/[SWVYZ]/.test(firstChar)) {
        return 'EU';
    }
    
    // Другие европейские коды
    if (/[A-H]/.test(firstChar)) {
        return 'EU';
    }
    
    return 'OTHER';
}

/**
 * Получение данных по VIN номеру
 * Пробует несколько API для максимального покрытия
 * @param {string} vin - VIN номер автомобиля
 * @returns {Promise<Object>} Данные об автомобиле
 */
export async function decodeVin(vin) {
    if (!vin || vin.length !== 17) {
        throw new Error('VIN номер должен содержать 17 символов');
    }

    // Удаляем пробелы и приводим к верхнему регистру
    vin = vin.trim().toUpperCase();

    // Валидация VIN
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
        throw new Error('Неверный формат VIN номера. Используйте только буквы и цифры (I, O, Q не допускаются)');
    }

    // Определяем регион
    const region = detectRegion(vin);
    console.log(`Определен регион: ${region} для VIN: ${vin}`);

    // Пробуем несколько API по очереди
    const apis = [
        () => decodeVinNHTSA(vin),           // NHTSA (лучше для американских)
        () => decodeVinUniversal(vin),       // Универсальный API
        () => decodeVinAlternative(vin),     // Альтернативный API
        () => decodeVinByRegion(vin, region) // Региональный API
    ];

    let lastError = null;
    
    for (const apiFunc of apis) {
        try {
            const result = await apiFunc();
            // Проверяем, что получили хотя бы марку или модель
            if (result && (result.make || result.model)) {
                return result;
            }
        } catch (error) {
            console.warn('API не вернул данные:', error.message);
            lastError = error;
            // Продолжаем пробовать следующий API
            continue;
        }
    }

    // Если все API не сработали
    throw new Error(lastError?.message || 'Не удалось получить данные по VIN номеру. Возможно, VIN номер не найден в базах данных.');
}

/**
 * Декодирование VIN через NHTSA API (лучше для американских автомобилей)
 */
async function decodeVinNHTSA(vin) {
    const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vin}?format=json`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
        throw new Error(`NHTSA API недоступен: ${response.status}`);
    }

    const data = await response.json();
    if (!data.Results || data.Results.length === 0) {
        throw new Error('Данные не найдены в NHTSA');
    }

    const vinData = {};
    data.Results.forEach(item => {
        if (item.Value && item.Value !== 'Not Applicable' && item.Value !== '' && item.Value !== null) {
            vinData[item.Variable] = item.Value;
        }
    });

    if (Object.keys(vinData).length === 0) {
        throw new Error('NHTSA не вернул данных');
    }

    return mapVinDataToForm(vinData);
}

/**
 * Универсальный VIN декодер (работает с разными регионами)
 */
async function decodeVinUniversal(vin) {
    // Используем бесплатный API, который работает с разными регионами
    try {
        // Пробуем через CORS proxy или напрямую, если API поддерживает
        const response = await fetch(`https://vindecoderapi.com/api/decode/${vin}?format=json`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            mode: 'cors'
        });

        if (response.ok) {
            const data = await response.json();
            if (data.specification) {
                return mapUniversalVinData(data.specification);
            }
        }
    } catch (error) {
        console.warn('Universal API недоступен:', error);
    }

    // Пробуем другой универсальный API
    try {
        const response = await fetch(`https://api.carqueryapi.com/v1/decoder?vin=${vin}`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.make) {
                return {
                    make: data.make,
                    model: data.model_name || data.model,
                    year: data.model_year ? parseInt(data.model_year) : null,
                    bodyType: mapBodyType(data.body_type),
                    engineType: mapEngineType(data.fuel_type),
                    transmission: mapTransmission(data.transmission_type)
                };
            }
        }
    } catch (error) {
        console.warn('CarQuery API недоступен:', error);
    }

    throw new Error('Универсальные API недоступны');
}

/**
 * Альтернативный метод декодирования VIN
 */
async function decodeVinAlternative(vin) {
    try {
        // Используем VIN Decoder API (бесплатный вариант)
        const response = await fetch(`https://api.vindecoder.eu/3.2/decode/${vin}?apikey=decode&format=json`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            throw new Error('Альтернативный API недоступен');
        }

        const data = await response.json();
        if (data.decode && data.decode.length > 0) {
            const vinData = {};
            data.decode.forEach(item => {
                if (item.value && item.value !== 'N/A' && item.value !== '') {
                    vinData[item.label] = item.value;
                }
            });
            return mapVinDataToFormAlternative(vinData);
        }

        throw new Error('Данные не найдены');
    } catch (error) {
        throw new Error('Альтернативный API недоступен');
    }
}

/**
 * Региональный декодер (для европейских и азиатских автомобилей)
 */
async function decodeVinByRegion(vin, region) {
    // Для европейских и азиатских автомобилей используем извлечение из структуры VIN
    // Это работает, так как WMI коды стандартизированы
    if (region === 'EU' || region === 'ASIA') {
        return extractDataFromVinStructure(vin);
    }

    throw new Error('Региональный API недоступен');
}

/**
 * Извлечение базовых данных из структуры VIN (для азиатских и европейских автомобилей)
 * VIN содержит закодированную информацию о марке, модели и годе
 */
function extractDataFromVinStructure(vin) {
    const formData = {};
    
    // Определяем марку по WMI (первые 3 символа)
    const wmi = vin.substring(0, 3);
    const wmi2 = vin.substring(0, 2);
    
    // Расширенный словарь WMI кодов для разных регионов
    const wmiDatabase = {
        // Японские производители
        'JHM': 'Honda', 'JHL': 'Honda', 'JHN': 'Honda',
        'JT1': 'Toyota', 'JT2': 'Toyota', 'JT3': 'Toyota', 'JT4': 'Toyota',
        'JT5': 'Toyota', 'JT6': 'Toyota', 'JT7': 'Toyota', 'JT8': 'Toyota',
        'JN1': 'Nissan', 'JN3': 'Nissan', 'JN4': 'Nissan', 'JN6': 'Nissan',
        'JN8': 'Nissan',
        'JM1': 'Mazda', 'JM3': 'Mazda', 'JM7': 'Mazda',
        'JF1': 'Subaru', 'JF2': 'Subaru',
        '4T1': 'Toyota', '4T3': 'Toyota', '4T4': 'Toyota',
        '5YJ': 'Tesla',
        
        // Корейские производители
        'KMH': 'Hyundai', 'KM8': 'Hyundai', 'KMC': 'Hyundai',
        'KND': 'Kia', 'KNJ': 'Kia', 'KNA': 'Kia', 'KNB': 'Kia',
        '5NP': 'Hyundai', '5NM': 'Hyundai',
        
        // Китайские производители
        'LSG': 'SAIC-GM', 'LSV': 'SAIC-Volkswagen',
        'LFM': 'FAW-Toyota', 'LFV': 'FAW-Volkswagen',
        'LGB': 'Dongfeng-Nissan', 'LGD': 'Dongfeng',
        'LGW': 'Great Wall', 'LHG': 'Guangzhou Honda',
        
        // Европейские производители
        'WBA': 'BMW', 'WBS': 'BMW', 'WBX': 'BMW',
        'WDB': 'Mercedes-Benz', 'WDC': 'Mercedes-Benz', 'WDD': 'Mercedes-Benz',
        'WVW': 'Volkswagen', 'WVG': 'Volkswagen', 'WV1': 'Volkswagen',
        'WAU': 'Audi', 'WUA': 'Audi',
        'ZFA': 'Fiat', 'ZFF': 'Ferrari',
        'VF1': 'Renault', 'VF3': 'Peugeot', 'VF7': 'Citroen',
        'SAJ': 'Jaguar', 'SAL': 'Land Rover',
        'TRU': 'Audi', 'TMB': 'Skoda',
        'YV1': 'Volvo', 'YV2': 'Volvo',
        
        // Другие
        '1G1': 'Chevrolet', '1G2': 'Pontiac', '1G3': 'Oldsmobile',
        '1FA': 'Ford', '1FD': 'Ford', '1FM': 'Ford',
        '1FT': 'Ford', '1FU': 'Freightliner', '1FV': 'Freightliner'
    };
    
    // Проверяем полный WMI (3 символа)
    if (wmiDatabase[wmi]) {
        formData.make = wmiDatabase[wmi];
    } 
    // Проверяем первые 2 символа для некоторых производителей
    else if (wmiDatabase[wmi2]) {
        formData.make = wmiDatabase[wmi2];
    }
    // Специальные случаи для Toyota (JT может быть 2 или 3 символа)
    else if (wmi.startsWith('JT')) {
        formData.make = 'Toyota';
    }
    // Специальные случаи для Honda (JH может быть 2 или 3 символа)
    else if (wmi.startsWith('JH')) {
        formData.make = 'Honda';
    }
    // Специальные случаи для Nissan (JN может быть 2 или 3 символа)
    else if (wmi.startsWith('JN')) {
        formData.make = 'Nissan';
    }
    // Специальные случаи для Mazda (JM может быть 2 или 3 символа)
    else if (wmi.startsWith('JM')) {
        formData.make = 'Mazda';
    }
    // Специальные случаи для Subaru (JF может быть 2 или 3 символа)
    else if (wmi.startsWith('JF')) {
        formData.make = 'Subaru';
    }
    // Специальные случаи для Hyundai (KM может быть 2 или 3 символа)
    else if (wmi.startsWith('KM')) {
        formData.make = 'Hyundai';
    }
    // Специальные случаи для Kia (KN может быть 2 или 3 символа)
    else if (wmi.startsWith('KN')) {
        formData.make = 'Kia';
    }
    // Специальные случаи для BMW (WB может быть 2 или 3 символа)
    else if (wmi.startsWith('WB')) {
        formData.make = 'BMW';
    }
    // Специальные случаи для Mercedes (WD может быть 2 или 3 символа)
    else if (wmi.startsWith('WD')) {
        formData.make = 'Mercedes-Benz';
    }
    // Специальные случаи для Volkswagen (WV может быть 2 или 3 символа)
    else if (wmi.startsWith('WV')) {
        formData.make = 'Volkswagen';
    }
    // Специальные случаи для Audi (WA может быть 2 или 3 символа)
    else if (wmi.startsWith('WA')) {
        formData.make = 'Audi';
    }
    
    // Извлекаем год из 10-го символа VIN
    const yearChar = vin.charAt(9);
    const currentYear = new Date().getFullYear();
    
    // Полная таблица кодов года
    // VIN стандарт: 1980-2009 (буквы A-Y, цифры 1-9), затем повторяется каждые 30 лет
    // Для старых машин (1971-1979) использовались цифры 1-9
    const yearCodeMap = {
        // Буквы: 1980-2009, 2010-2039, 2040-2069...
        'A': [1980, 2010], 'B': [1981, 2011], 'C': [1982, 2012], 'D': [1983, 2013],
        'E': [1984, 2014], 'F': [1985, 2015], 'G': [1986, 2016], 'H': [1987, 2017],
        'J': [1988, 2018], 'K': [1989, 2019], 'L': [1990, 2020], 'M': [1991, 2021],
        'N': [1992, 2022], 'P': [1993, 2023], 'R': [1994, 2024], 'S': [1995, 2025],
        'T': [1996, 2026], 'V': [1997, 2027], 'W': [1998, 2028], 'X': [1999, 2029],
        'Y': [2000, 2030],
        // Цифры: 2001-2009, 2031-2039... или для старых машин 1971-1979
        '1': [1971, 2001, 2031], '2': [1972, 2002, 2032], '3': [1973, 2003, 2033],
        '4': [1974, 2004, 2034], '5': [1975, 2005, 2035], '6': [1976, 2006, 2036],
        '7': [1977, 2007, 2037], '8': [1978, 2008, 2038], '9': [1979, 2009, 2039]
    };
    
    // Определяем год
    if (yearCodeMap[yearChar]) {
        const possibleYears = yearCodeMap[yearChar];
        
        // Выбираем наиболее вероятный год
        let selectedYear = null;
        let bestScore = -1;
        
        for (const year of possibleYears) {
            // Ограничиваем разумными пределами (1970 - текущий год + 1)
            if (year >= 1970 && year <= currentYear + 1) {
                // Вычисляем "оценку" года
                let score = 0;
                
                // Предпочитаем годы ближе к текущему, но не в будущем
                const yearsFromNow = currentYear - year;
                
                if (yearsFromNow >= 0 && yearsFromNow <= 50) {
                    // Год в прошлом, но не слишком старый
                    score = 100 - yearsFromNow; // Чем новее, тем выше оценка
                } else if (yearsFromNow < 0 && Math.abs(yearsFromNow) <= 1) {
                    // Год в будущем, но не более чем на 1 год (модельный год)
                    score = 50;
                } else if (year < 1970) {
                    // Слишком старый год
                    score = 0;
                }
                
                // Для букв предпочитаем более новые циклы (2010+)
                if (/[A-Y]/.test(yearChar) && year >= 2010) {
                    score += 20;
                }
                
                // Для цифр предпочитаем цикл 2001-2009, если он не слишком старый
                if (/[1-9]/.test(yearChar)) {
                    if (year >= 2001 && year <= 2009) {
                        score += 10;
                    } else if (year >= 1971 && year <= 1979) {
                        // Старые машины (1971-1979) получают меньшую оценку, но все еще возможны
                        score += 5;
                    }
                }
                
                if (score > bestScore) {
                    bestScore = score;
                    selectedYear = year;
                }
            }
        }
        
        if (selectedYear) {
            formData.year = selectedYear;
            console.log('Год определен из VIN:', selectedYear, 'из символа', yearChar, 'возможные годы:', possibleYears);
        } else {
            console.warn('Не удалось определить год из символа:', yearChar, 'возможные годы:', possibleYears);
        }
    } else {
        console.warn('Неизвестный символ года в VIN:', yearChar);
    }
    
    // Если получили хотя бы марку, возвращаем данные
    if (formData.make) {
        return formData;
    }
    
    throw new Error('Не удалось извлечь данные из структуры VIN');
}

/**
 * Маппинг данных из универсального API
 */
function mapUniversalVinData(data) {
    const formData = {};
    
    formData.make = data.make || data.manufacturer || null;
    formData.model = data.model || data.model_name || null;
    
    const yearStr = data.year || data.model_year || data.year_of_manufacture;
    if (yearStr) {
        const year = parseInt(yearStr);
        if (!isNaN(year) && year >= 1900 && year <= new Date().getFullYear() + 1) {
            formData.year = year;
        }
    }
    
    const bodyType = data.body_type || data.body_style || data.vehicle_type;
    if (bodyType) {
        formData.bodyType = mapBodyType(bodyType);
    }
    
    const fuelType = data.fuel_type || data.fuel || data.engine_fuel;
    if (fuelType) {
        formData.engineType = mapEngineType(fuelType);
    }
    
    const transmission = data.transmission_type || data.transmission || data.gearbox;
    if (transmission) {
        formData.transmission = mapTransmission(transmission);
    }
    
    formData.color = data.color || data.exterior_color || data.paint_color || null;
    
    const displacement = data.displacement || data.engine_displacement || data.engine_size;
    if (displacement) {
        formData.engineDisplacement = parseDisplacement(displacement);
    }

    console.log('Данные из универсального API:', data);
    console.log('Маппированные данные:', formData);
    
    return formData;
}

/**
 * Маппинг данных из NHTSA API на поля формы
 * @param {Object} vinData - Данные из API
 * @returns {Object} Данные для формы
 */
function mapVinDataToForm(vinData) {
    const formData = {};

    // Марка (пробуем разные варианты названий полей)
    formData.make = vinData['Make'] || 
                    vinData['Manufacturer Name'] || 
                    vinData['Mfr Name'] || 
                    null;

    // Модель (пробуем разные варианты)
    formData.model = vinData['Model'] || 
                     vinData['Model Name'] || 
                     vinData['Series'] || 
                     null;

    // Год
    const yearStr = vinData['Model Year'] || vinData['Year'];
    if (yearStr) {
        const year = parseInt(yearStr);
        if (!isNaN(year) && year >= 1900 && year <= new Date().getFullYear() + 1) {
            formData.year = year;
        }
    }

    // Тип кузова (пробуем разные варианты)
    const bodyClass = vinData['Body Class'] || 
                      vinData['Body Type'] || 
                      vinData['Vehicle Type'] || 
                      null;
    if (bodyClass) {
        const bodyType = mapBodyType(bodyClass);
        if (bodyType) {
            formData.bodyType = bodyType;
        }
    }

    // Тип двигателя (пробуем разные варианты)
    const fuelType = vinData['Fuel Type - Primary'] || 
                     vinData['Fuel Type'] || 
                     vinData['Fuel'] || 
                     null;
    const engineConfig = vinData['Engine Configuration'] || 
                         vinData['Engine Type'] || 
                         null;
    
    if (fuelType || engineConfig) {
        const engineType = mapEngineType(fuelType, engineConfig);
        if (engineType) {
            formData.engineType = engineType;
        }
    }

    // Объем двигателя (в литрах или кубических дюймах)
    const displacement = vinData['Displacement (L)'] || 
                         vinData['Displacement (CC)'] || 
                         vinData['Engine Displacement'] || 
                         vinData['Displacement'] || 
                         null;
    
    if (displacement) {
        // Парсим объем двигателя
        const displacementValue = parseDisplacement(displacement);
        if (displacementValue) {
            formData.engineDisplacement = displacementValue;
        }
    }

    // Коробка передач (пробуем разные варианты)
    const transmissionStyle = vinData['Transmission Style'] || 
                              vinData['Transmission'] || 
                              vinData['Transmission Type'] || 
                              vinData['Transmission Speeds'] ||
                              vinData['Drive Type'] ||
                              null;
    
    if (transmissionStyle) {
        console.log('Найдена КПП в данных:', transmissionStyle);
        const transmission = mapTransmission(transmissionStyle);
        console.log('Маппированная КПП:', transmission);
        if (transmission) {
            formData.transmission = transmission;
        } else {
            console.warn('Не удалось маппировать КПП:', transmissionStyle);
        }
    } else {
        console.warn('КПП не найдена в данных VIN');
    }

    // Цвет (пробуем разные варианты)
    formData.color = vinData['Exterior Color'] || 
                     vinData['Color'] || 
                     vinData['Paint Color'] || 
                     null;

    // Количество цилиндров
    const cylinders = vinData['Engine Number of Cylinders'] || 
                      vinData['Cylinders'] || 
                      null;
    if (cylinders) {
        formData.cylinders = cylinders;
    }

    // Мощность двигателя (если доступна)
    const horsepower = vinData['Engine Brake (hp)'] || 
                       vinData['Horsepower'] || 
                       vinData['HP'] || 
                       null;
    if (horsepower) {
        formData.horsepower = horsepower;
    }

    // Логируем все доступные данные для отладки
    console.log('Данные из VIN API:', vinData);
    console.log('Маппированные данные:', formData);

    return formData;
}

/**
 * Парсинг объема двигателя из строки
 */
function parseDisplacement(displacement) {
    if (!displacement) return null;
    
    // Удаляем лишние символы
    const cleaned = displacement.toString().replace(/[^\d.,]/g, '');
    
    // Парсим число
    const value = parseFloat(cleaned.replace(',', '.'));
    
    if (isNaN(value) || value <= 0) return null;
    
    // Если значение очень большое (вероятно в кубических сантиметрах), конвертируем в литры
    if (value > 10) {
        return (value / 1000).toFixed(1); // Конвертируем CC в литры
    }
    
    return value.toFixed(1);
}

/**
 * Маппинг данных из альтернативного API на поля формы
 * @param {Object} vinData - Данные из API
 * @returns {Object} Данные для формы
 */
function mapVinDataToFormAlternative(vinData) {
    const formData = {};

    formData.make = vinData['Make'] || vinData['make'] || null;
    formData.model = vinData['Model'] || vinData['model'] || null;
    
    const yearStr = vinData['Model Year'] || vinData['Year'] || vinData['year'];
    if (yearStr) {
        const year = parseInt(yearStr);
        if (!isNaN(year) && year >= 1900 && year <= new Date().getFullYear() + 1) {
            formData.year = year;
        }
    }
    
    const bodyType = vinData['Body Type'] || vinData['body_type'] || vinData['bodyType'];
    if (bodyType) {
        formData.bodyType = mapBodyType(bodyType);
    }
    
    const fuelType = vinData['Fuel Type'] || vinData['fuel_type'] || vinData['fuelType'];
    if (fuelType) {
        formData.engineType = mapEngineType(fuelType);
    }
    
    const transmission = vinData['Transmission'] || vinData['transmission'] || vinData['transmission_type'];
    if (transmission) {
        formData.transmission = mapTransmission(transmission);
    }
    
    formData.color = vinData['Color'] || vinData['color'] || vinData['Exterior Color'] || null;
    
    const displacement = vinData['Displacement'] || vinData['displacement'] || vinData['Engine Displacement'];
    if (displacement) {
        formData.engineDisplacement = parseDisplacement(displacement);
    }

    console.log('Данные из альтернативного API:', vinData);
    console.log('Маппированные данные:', formData);

    return formData;
}

/**
 * Маппинг типа кузова
 */
function mapBodyType(bodyClass) {
    const bodyTypeMap = {
        'Sedan': 'Sedan',
        'Coupe': 'Coupe',
        'Hatchback': 'Hatchback',
        'Wagon': 'Wagon',
        'SUV': 'SUV',
        'Convertible': 'Convertible',
        'Pickup': 'SUV', // Приблизительно
        'Van': 'SUV', // Приблизительно
        'Minivan': 'SUV' // Приблизительно
    };

    if (!bodyClass) return null;

    const normalized = bodyClass.toLowerCase();
    for (const [key, value] of Object.entries(bodyTypeMap)) {
        if (normalized.includes(key.toLowerCase())) {
            return value;
        }
    }

    return null;
}

/**
 * Маппинг типа двигателя
 */
function mapEngineType(fuelType, engineConfig) {
    if (!fuelType) return null;

    const normalized = fuelType.toLowerCase();
    
    if (normalized.includes('gasoline') || normalized.includes('petrol')) {
        return 'Gasoline';
    }
    if (normalized.includes('diesel')) {
        return 'Diesel';
    }
    if (normalized.includes('hybrid') || normalized.includes('electric')) {
        if (normalized.includes('electric') && !normalized.includes('hybrid')) {
            return 'Electric';
        }
        return 'Hybrid';
    }

    return null;
}

/**
 * Маппинг коробки передач
 */
function mapTransmission(transmissionStyle) {
    if (!transmissionStyle) return null;

    const normalized = transmissionStyle.toLowerCase().trim();
    
    // Более точные проверки
    if (normalized.includes('manual') || normalized.includes('mt') || normalized.includes('m/t')) {
        return 'Manual';
    }
    if (normalized.includes('automatic') || normalized.includes('auto') || 
        normalized.includes('at') || normalized.includes('a/t') ||
        normalized.includes('aut') || normalized.includes('automatic transmission')) {
        return 'Automatic';
    }
    if (normalized.includes('cvt') || normalized.includes('continuously variable')) {
        return 'CVT';
    }
    
    // Проверяем по количеству передач (если указано только число)
    if (/^\d+$/.test(normalized)) {
        const speeds = parseInt(normalized);
        // Если больше 5 передач, вероятно автоматическая
        if (speeds > 5) {
            return 'Automatic';
        }
        // Если 5 или меньше, вероятно механическая
        if (speeds <= 5) {
            return 'Manual';
        }
    }

    console.warn('Не удалось определить тип КПП из:', transmissionStyle);
    return null;
}

