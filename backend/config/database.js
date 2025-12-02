const { Sequelize } = require('sequelize');
require('dotenv').config();

/**
 * Настройка подключения к базе данных MySQL через Sequelize ORM
 * Использует переменные окружения из .env файла
 */

// Получаем настройки подключения
// Обработка пустого пароля: если DB_PASSWORD не установлен или пустая строка, передаем пустую строку
let dbPassword = process.env.DB_PASSWORD;
if (dbPassword === undefined || dbPassword === null) {
  dbPassword = '';
}

const dbConfig = {
  database: process.env.DB_NAME || 'car_marketplace',
  username: process.env.DB_USER || 'root',
  password: dbPassword,
  host: process.env.DB_HOST || '127.0.0.1', // Используем 127.0.0.1 вместо localhost для избежания проблем с DNS
  port: parseInt(process.env.DB_PORT || '3306', 10),
};

// Логирование настроек подключения (без пароля)
if (process.env.NODE_ENV === 'development') {
  console.log('\n📋 Настройки подключения к БД:');
  console.log(`   Хост: ${dbConfig.host}:${dbConfig.port}`);
  console.log(`   База данных: ${dbConfig.database}`);
  console.log(`   Пользователь: ${dbConfig.username}`);
  console.log(`   Пароль: ${dbConfig.password ? '***установлен***' : 'не установлен (пустая строка)'}`);
  console.log(`   Длина пароля: ${dbConfig.password.length} символов`);
  console.log(`   Тип пароля: ${typeof dbConfig.password}`);
  console.log(`   DB_PASSWORD из env: "${process.env.DB_PASSWORD}" (${process.env.DB_PASSWORD === undefined ? 'undefined' : typeof process.env.DB_PASSWORD})\n`);
}

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: 'mysql',
    dialectOptions: {
      // Опции для MySQL 8.0
      connectTimeout: 60000,
      // Для MySQL 8.0 - разрешаем использование mysql_native_password если нужно
      // Это может помочь с пустым паролем
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: false, // Sequelize не будет автоматически добавлять createdAt/updatedAt
      underscored: false, // Используем camelCase для имен полей
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    },
    // Дополнительные опции для подключения
    retry: {
      max: 3
    }
  }
);

/**
 * Проверка подключения к базе данных
 * @returns {Promise<boolean>} true если подключение успешно
 */
async function testConnection() {
  try {
    // Сначала пытаемся подключиться без указания базы данных, чтобы проверить список доступных БД
    const tempSequelize = new Sequelize(
      '', // без базы данных
      dbConfig.username,
      dbConfig.password,
      {
        host: dbConfig.host,
        port: dbConfig.port,
        dialect: 'mysql',
        logging: false,
      }
    );
    
    try {
      await tempSequelize.authenticate();
      console.log('✅ Соединение с MySQL сервером установлено.');
      
      // Проверяем список доступных баз данных
      const [results] = await tempSequelize.query("SHOW DATABASES");
      console.log('\n📚 Доступные базы данных на этом MySQL сервере:');
      const databases = results.map(row => Object.values(row)[0]);
      databases.forEach(db => {
        const isTarget = db.toLowerCase() === dbConfig.database.toLowerCase() ? ' ⬅ нужная БД' : '';
        console.log(`   - ${db}${isTarget}`);
      });
      
      // Проверяем существование нужной БД (без учета регистра)
      const dbExists = databases.some(db => db.toLowerCase() === dbConfig.database.toLowerCase());
      
      if (!dbExists) {
        console.error(`\n❌ База данных "${dbConfig.database}" НЕ НАЙДЕНА на сервере ${dbConfig.host}:${dbConfig.port}`);
        console.error(`   💡 Возможные причины:`);
        console.error(`      1. Вы подключаетесь к другому экземпляру MySQL (не к тому, где видна БД в phpMyAdmin)`);
        console.error(`      2. phpMyAdmin подключается к другому MySQL серверу`);
        console.error(`      3. База данных имеет другое имя (возможно, с заглавными буквами)`);
        console.error(`\n   💡 Решение:`);
        console.error(`      Выполните SQL скрипт DB.sql на том же MySQL сервере, к которому подключается Node.js`);
        console.error(`      Или проверьте в .env файле правильность DB_HOST (сейчас: ${dbConfig.host})`);
        await tempSequelize.close();
        return false;
      }
      
      await tempSequelize.close();
    } catch (tempError) {
      console.error('❌ Не удалось подключиться к MySQL серверу для проверки БД:', tempError.message);
    }
    
    // Теперь пытаемся подключиться к конкретной базе данных
    await sequelize.authenticate();
    console.log(`✅ Подключение к базе данных "${dbConfig.database}" установлено успешно.`);
    return true;
  } catch (error) {
    console.error('\n❌ ОШИБКА подключения к базе данных:');
    console.error(`   Сообщение: ${error.message}`);
    
    if (error.original) {
      console.error(`   MySQL ошибка: ${error.original.message}`);
      if (error.original.code) {
        console.error(`   Код ошибки: ${error.original.code}`);
      }
    }
    
    // Если ошибка о несуществующей БД
    if (error.original && error.original.code === 'ER_BAD_DB_ERROR') {
      console.error(`\n💡 База данных "${dbConfig.database}" не найдена на сервере ${dbConfig.host}:${dbConfig.port}`);
      console.error(`   Возможно, вы подключаетесь к другому MySQL серверу, чем тот, где видна БД в phpMyAdmin`);
      console.error(`   Проверьте настройку DB_HOST в .env файле (сейчас: ${dbConfig.host})`);
    }
    
    console.error('\n📋 Проверьте следующее:');
    console.error(`   1. MySQL сервер запущен`);
    console.error(`   2. База данных "${dbConfig.database}" существует`);
    console.error(`   3. Хост и порт: ${dbConfig.host}:${dbConfig.port}`);
    console.error(`   4. Пользователь: ${dbConfig.username}`);
    console.error(`   5. Пароль: ${dbConfig.password ? 'установлен' : 'НЕ УСТАНОВЛЕН - проверьте .env файл'}`);
    console.error(`   6. Файл .env в папке backend/ существует и содержит правильные настройки\n`);
    return false;
  }
}

module.exports = { sequelize, testConnection };

