/**
 * Данные о марках, моделях, цветах, областях и городах Беларуси
 */

// Цвета автомобилей
export const CAR_COLORS = [
    { value: 'white', label: 'Белый' },
    { value: 'black', label: 'Черный' },
    { value: 'silver', label: 'Серебристый' },
    { value: 'gray', label: 'Серый' },
    { value: 'red', label: 'Красный' },
    { value: 'blue', label: 'Синий' },
    { value: 'green', label: 'Зеленый' },
    { value: 'yellow', label: 'Желтый' },
    { value: 'orange', label: 'Оранжевый' },
    { value: 'brown', label: 'Коричневый' },
    { value: 'beige', label: 'Бежевый' },
    { value: 'gold', label: 'Золотой' },
    { value: 'purple', label: 'Фиолетовый' },
    { value: 'pink', label: 'Розовый' },
    { value: 'burgundy', label: 'Бордовый' },
    { value: 'dark_blue', label: 'Темно-синий' },
    { value: 'dark_green', label: 'Темно-зеленый' }
];

// Марки и модели автомобилей
export const CAR_MAKES_AND_MODELS = {
    'Audi': ['A1', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'Q2', 'Q3', 'Q5', 'Q7', 'Q8', 'TT', 'R8', 'e-tron', 'A3 Sportback', 'A4 Avant', 'A6 Avant', 'RS3', 'RS4', 'RS5', 'RS6', 'RS7', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'],
    'BMW': ['1 Series', '2 Series', '3 Series', '4 Series', '5 Series', '6 Series', '7 Series', '8 Series', 'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'Z4', 'i3', 'i4', 'iX', 'M2', 'M3', 'M4', 'M5', 'M6', 'M8', 'X3 M', 'X4 M', 'X5 M', 'X6 M'],
    'Mercedes-Benz': ['A-Class', 'B-Class', 'C-Class', 'E-Class', 'S-Class', 'CLA', 'CLS', 'GLA', 'GLB', 'GLC', 'GLE', 'GLS', 'G-Class', 'SL', 'SLK', 'AMG GT', 'EQC', 'EQS', 'EQE', 'A 45 AMG', 'C 63 AMG', 'E 63 AMG', 'S 63 AMG', 'G 63 AMG'],
    'Volkswagen': ['Polo', 'Golf', 'Jetta', 'Passat', 'Arteon', 'Tiguan', 'Touareg', 'T-Cross', 'T-Roc', 'Touran', 'Sharan', 'Amarok', 'ID.3', 'ID.4', 'ID.6', 'Golf GTI', 'Golf R', 'Passat CC', 'Scirocco'],
    'Toyota': ['Aygo', 'Yaris', 'Corolla', 'Camry', 'Avalon', 'Prius', 'C-HR', 'RAV4', 'Highlander', 'Land Cruiser', 'Prado', 'Hilux', 'Tacoma', 'Tundra', 'Sienna', 'Alphard', 'Venza', 'bZ4X'],
    'Ford': ['Fiesta', 'Focus', 'Mondeo', 'Fusion', 'Mustang', 'EcoSport', 'Kuga', 'Edge', 'Explorer', 'Expedition', 'F-150', 'Ranger', 'Transit', 'Tourneo', 'Puma', 'Bronco', 'Maverick', 'Mach-E'],
    'Opel': ['Corsa', 'Astra', 'Insignia', 'Crossland', 'Grandland X', 'Mokka', 'Combo', 'Vivaro', 'Movano', 'Adam', 'Karl', 'Ampera-e'],
    'Renault': ['Clio', 'Megane', 'Laguna', 'Talisman', 'Captur', 'Kadjar', 'Koleos', 'Duster', 'Sandero', 'Logan', 'Fluence', 'Scenic', 'Grand Scenic', 'Espace', 'Kangoo', 'Master', 'Twingo', 'Zoe'],
    'Peugeot': ['108', '208', '308', '408', '508', '2008', '3008', '5008', 'Partner', 'Expert', 'Boxer', 'Traveller', 'Rifter', 'e-208', 'e-2008'],
    'Citroen': ['C1', 'C3', 'C4', 'C5', 'C6', 'C3 Aircross', 'C5 Aircross', 'Berlingo', 'Jumper', 'SpaceTourer', 'C4 Cactus', 'DS3', 'DS4', 'DS5', 'DS7'],
    'Hyundai': ['i10', 'i20', 'i30', 'Elantra', 'Sonata', 'Accent', 'Tucson', 'Santa Fe', 'Kona', 'Palisade', 'Venue', 'Creta', 'H-1', 'Staria', 'Ioniq', 'Kona Electric', 'IONIQ 5', 'IONIQ 6'],
    'Kia': ['Picanto', 'Rio', 'Ceed', 'Optima', 'Stinger', 'Sportage', 'Sorento', 'Seltos', 'Telluride', 'Soul', 'Niro', 'Carnival', 'EV6', 'Niro EV', 'Soul EV'],
    'Nissan': ['Micra', 'Sentra', 'Altima', 'Maxima', 'Juke', 'Qashqai', 'X-Trail', 'Pathfinder', 'Armada', 'Patrol', 'Navara', 'Leaf', 'Ariya', 'Note', 'Pulsar', '370Z', 'GT-R'],
    'Mazda': ['Mazda2', 'Mazda3', 'Mazda6', 'CX-3', 'CX-30', 'CX-5', 'CX-8', 'CX-9', 'MX-5', 'BT-50'],
    'Honda': ['Civic', 'Accord', 'Insight', 'HR-V', 'CR-V', 'Pilot', 'Passport', 'Ridgeline', 'Odyssey', 'Fit', 'e', 'CR-Z'],
    'Mitsubishi': ['Mirage', 'Lancer', 'Outlander', 'Pajero', 'Eclipse Cross', 'ASX', 'Delica', 'L200', 'i-MiEV'],
    'Subaru': ['Impreza', 'Legacy', 'Outback', 'Forester', 'XV', 'Ascent', 'BRZ', 'WRX', 'Levorg'],
    'Suzuki': ['Swift', 'SX4', 'Vitara', 'Grand Vitara', 'S-Cross', 'Jimny', 'Ignis', 'Baleno', 'Celerio'],
    'Skoda': ['Fabia', 'Octavia', 'Superb', 'Kamiq', 'Karoq', 'Kodiaq', 'Scala', 'Rapid', 'Yeti', 'Roomster', 'Citigo', 'Enyaq'],
    'SEAT': ['Ibiza', 'Leon', 'Ateca', 'Tarraco', 'Arona', 'Formentor', 'Alhambra', 'Toledo', 'Mii'],
    'Fiat': ['500', 'Panda', 'Tipo', 'Punto', 'Bravo', '500L', '500X', 'Doblo', 'Ducato', 'Talento', 'Fullback'],
    'Alfa Romeo': ['Giulia', 'Stelvio', '4C', 'Giulietta', 'MiTo', '159', 'Brera', 'Spider'],
    'Lancia': ['Ypsilon', 'Delta', 'Thema', 'Voyager'],
    'Volvo': ['XC40', 'XC60', 'XC90', 'S60', 'S90', 'V40', 'V60', 'V90', 'C30', 'C70', 'XC70'],
    'Lexus': ['IS', 'ES', 'GS', 'LS', 'NX', 'RX', 'GX', 'LX', 'UX', 'CT', 'RC', 'LC', 'LFA'],
    'Infiniti': ['Q30', 'Q50', 'Q60', 'Q70', 'QX30', 'QX50', 'QX60', 'QX70', 'QX80'],
    'Acura': ['ILX', 'TLX', 'RLX', 'RDX', 'MDX', 'NSX'],
    'Genesis': ['G70', 'G80', 'G90', 'GV70', 'GV80'],
    'Jaguar': ['XE', 'XF', 'XJ', 'E-Pace', 'F-Pace', 'I-Pace', 'F-Type', 'XK'],
    'Land Rover': ['Discovery', 'Discovery Sport', 'Range Rover', 'Range Rover Sport', 'Range Rover Evoque', 'Range Rover Velar', 'Defender'],
    'Mini': ['Cooper', 'Cooper S', 'John Cooper Works', 'Clubman', 'Countryman', 'Paceman', 'Roadster', 'Coupe'],
    'Smart': ['Fortwo', 'Forfour', 'Roadster', 'Crossblade'],
    'Porsche': ['911', 'Boxster', 'Cayman', 'Panamera', 'Macan', 'Cayenne', 'Taycan'],
    'Ferrari': ['488', 'F8', 'SF90', 'Roma', 'Portofino', '812', 'GTC4Lusso', 'LaFerrari'],
    'Lamborghini': ['Huracan', 'Aventador', 'Urus', 'Gallardo', 'Murcielago'],
    'Maserati': ['Ghibli', 'Quattroporte', 'Levante', 'GranTurismo', 'GranCabrio'],
    'Bentley': ['Continental', 'Flying Spur', 'Bentayga', 'Mulsanne'],
    'Rolls-Royce': ['Ghost', 'Wraith', 'Dawn', 'Cullinan', 'Phantom'],
    'Aston Martin': ['DB11', 'Vantage', 'DBS', 'Rapide', 'DBX'],
    'McLaren': ['540C', '570S', '600LT', '720S', '765LT', 'GT', 'Artura', 'P1'],
    'Lada': ['Granta', 'Kalina', 'Vesta', 'XRAY', 'Largus', 'Niva', '4x4', 'Priora', 'Samara'],
    'UAZ': ['Patriot', 'Hunter', 'Pickup', 'Cargo', 'Profi', 'Bukhanka'],
    'GAZ': ['Volga', 'Gazelle', 'Sobol', 'Valdai', 'Next'],
    'ВАЗ': ['2101', '2103', '2105', '2106', '2107', '2109', '2110', '2111', '2112', '2114', '2115', 'Priora', 'Kalina', 'Granta', 'Vesta', 'XRAY', 'Largus', 'Niva'],
    'Geely': ['Coolray', 'Atlas', 'Tugella', 'Monjaro', 'Emgrand', 'Vision', 'GC9', 'MK', 'LC'],
    'Chery': ['Tiggo', 'Tiggo 2', 'Tiggo 3', 'Tiggo 4', 'Tiggo 5', 'Tiggo 7', 'Tiggo 8', 'Exeed', 'QQ', 'Fora', 'Amulet', 'Bonus', 'Very', 'Indis', 'Kimo', 'M11', 'A13', 'A15'],
    'Great Wall': ['Haval', 'Hover', 'Wingle', 'Deer', 'Safe', 'Coolbear', 'Voleex', 'C30', 'M4', 'H6', 'H9'],
    'BYD': ['F3', 'F6', 'G3', 'G6', 'L3', 'S6', 'Tang', 'Song', 'Yuan', 'Qin', 'Han', 'e6', 'e5'],
    'Lifan': ['Solano', 'X60', 'X50', 'X80', 'Cebrium', 'Smily', 'Foison', 'Breez', 'Celliya'],
    'Zotye': ['T600', 'T700', 'T800', 'SR9', 'Z300', 'Z500', 'Z700', 'E200', 'T300'],
    'Haval': ['H2', 'H4', 'H6', 'H9', 'F5', 'F7', 'F7x', 'Jolion', 'Big Dog', 'Little Dog', 'Tank 300', 'Tank 500'],
    'Changan': ['CS35', 'CS55', 'CS75', 'CS85', 'CS95', 'Eado', 'Raeton', 'Alsvin', 'Benben', 'Honor'],
    'Dongfeng': ['AX7', 'AX5', 'AX3', 'A30', 'A60', 'S30', 'H30', 'Fengshen'],
    'FAW': ['Besturn', 'Vita', 'V2', 'V5', 'X80', 'B50', 'B70', 'B90'],
    'JAC': ['J2', 'J3', 'J5', 'J6', 'S2', 'S3', 'S5', 'T40', 'T50', 'T60', 'T80'],
    'MG': ['3', '5', '6', 'GS', 'HS', 'ZS', 'RX5', 'RX8'],
    'Roewe': ['350', '550', '750', '950', 'RX5', 'RX8', 'i5', 'i6'],
    'SAIC': ['Maxus', 'LDV', 'MG'],
    'Wuling': ['Hongguang', 'Rongguang', 'Macro', 'Cortez', 'Almaz'],
    'Brilliance': ['V3', 'V5', 'V6', 'V7', 'H230', 'H330', 'H530', 'FRV', 'FSV', 'FSUV'],
    'JMC': ['Yusheng', 'Baodian', 'Shunda', 'Vigus'],
    'Foton': ['Sauvana', 'Tunland', 'Aumark', 'Auman', 'Aumark S'],
    'Dongfeng': ['AX7', 'AX5', 'AX3', 'A30', 'A60', 'S30', 'H30', 'Fengshen'],
    'BAIC': ['BJ20', 'BJ40', 'BJ80', 'BJ90', 'X25', 'X35', 'X55', 'X65', 'D20', 'D50', 'D70', 'D80'],
    'Zhonghua': ['V3', 'V5', 'V6', 'V7', 'H230', 'H330', 'H530', 'FRV', 'FSV', 'FSUV'],
    'Jinbei': ['Haise', 'Shuttle', 'Grace'],
    'Foton': ['Sauvana', 'Tunland', 'Aumark', 'Auman', 'Aumark S'],
    'DFSK': ['580', '560', '370', '330', '320', 'Fengguang', 'Fengxing'],
    'SWM': ['G01', 'G05', 'X3', 'X7'],
    'Leopaard': ['CS9', 'CS10', 'Q6', 'Mattu', 'Coupe'],
    'Zotye': ['T600', 'T700', 'T800', 'SR9', 'Z300', 'Z500', 'Z700', 'E200', 'T300'],
    'Landwind': ['X5', 'X6', 'X7', 'X8', 'X9', 'Fashion', 'CV9'],
    'JMC': ['Yusheng', 'Baodian', 'Shunda', 'Vigus'],
    'Foton': ['Sauvana', 'Tunland', 'Aumark', 'Auman', 'Aumark S']
};

// Области и города Беларуси
export const BELARUS_REGIONS_AND_CITIES = {
    'Минская область': ['Минск', 'Борисов', 'Солигорск', 'Молодечно', 'Жодино', 'Слуцк', 'Вилейка', 'Дзержинск', 'Марьина Горка', 'Столбцы', 'Несвиж', 'Клецк', 'Копыль', 'Узда', 'Червень', 'Смолевичи', 'Логойск', 'Заславль', 'Фаниполь', 'Любань', 'Старые Дороги', 'Крупки', 'Мядель', 'Воложин', 'Ивье'],
    'Гомельская область': ['Гомель', 'Мозырь', 'Жлобин', 'Светлогорск', 'Речица', 'Калинковичи', 'Рогачев', 'Добруш', 'Житковичи', 'Хойники', 'Петриков', 'Ельск', 'Буда-Кошелево', 'Ветка', 'Чечерск', 'Наровля', 'Лоев', 'Октябрьский', 'Брагин', 'Корма'],
    'Могилевская область': ['Могилев', 'Бобруйск', 'Орша', 'Горки', 'Кричев', 'Быхов', 'Шклов', 'Костюковичи', 'Климовичи', 'Мстиславль', 'Чаусы', 'Чериков', 'Славгород', 'Круглое', 'Белыничи', 'Кличев', 'Краснополье', 'Дрибин', 'Глуск'],
    'Витебская область': ['Витебск', 'Орша', 'Полоцк', 'Новополоцк', 'Глубокое', 'Лепель', 'Новолукомль', 'Городок', 'Поставы', 'Докшицы', 'Миоры', 'Браслав', 'Шарковщина', 'Верхнедвинск', 'Дубровно', 'Толочин', 'Сенно', 'Бешенковичи', 'Чашники', 'Ушачи'],
    'Гродненская область': ['Гродно', 'Лида', 'Слоним', 'Волковыск', 'Сморгонь', 'Новогрудок', 'Мосты', 'Ошмяны', 'Островец', 'Щучин', 'Скидель', 'Берёзовка', 'Ивье', 'Дятлово', 'Кореличи', 'Любча', 'Мир', 'Свислочь', 'Вороново', 'Зельва'],
    'Брестская область': ['Брест', 'Барановичи', 'Пинск', 'Кобрин', 'Береза', 'Лунинец', 'Ивацевичи', 'Пружаны', 'Иваново', 'Дрогичин', 'Жабинка', 'Каменец', 'Малорита', 'Столин', 'Микашевичи', 'Ганцевичи', 'Ляховичи', 'Телеханы', 'Белоозерск', 'Высокое']
};

// Годы выпуска (от 1950 до текущего года)
export function getYearOptions() {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear; year >= 1950; year--) {
        years.push(year);
    }
    return years;
}

