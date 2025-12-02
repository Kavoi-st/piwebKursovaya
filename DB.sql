-- Полный SQL-скрипт для MySQL 8.0
-- БД: car_marketplace
-- Включает: DDL всех таблиц, индексы, триггеры (лог модерации, защита ролей),
-- добавление администратора и модераторов (через SQL), создание MySQL-аккаунтов и прав.
-- ПРИМЕЧАНИЕ: Перед запуском на продакшн замените все placeholder-хеши паролей на реальные bcrypt/argon2 хеши,
-- и замените пароли MySQL-пользователей на надёжные секреты.

-- Создать базу и выбрать её
CREATE DATABASE IF NOT EXISTS car_marketplace
  CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;
USE car_marketplace;

-- ---------------------------
-- Таблица Users
-- ---------------------------
CREATE TABLE IF NOT EXISTS Users (
  user_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user','moderator','admin') NOT NULL DEFAULT 'user',
  display_name VARCHAR(100),
  phone VARCHAR(30),
  avatar_url VARCHAR(255),
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  registration_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME NULL,
  CHECK (role IN ('user','moderator','admin'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------
-- Таблица Cars
-- ---------------------------
CREATE TABLE IF NOT EXISTS Cars (
  car_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  make VARCHAR(50) NOT NULL,
  model VARCHAR(50) NOT NULL,
  year SMALLINT UNSIGNED NOT NULL,
  mileage INT UNSIGNED,
  body_type VARCHAR(30),
  engine_type VARCHAR(30),
  transmission VARCHAR(30),
  color VARCHAR(30),
  vin VARCHAR(50),
  extra JSON,
  INDEX idx_make_model (make, model),
  INDEX idx_year (year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------
-- Таблица Listings
-- ---------------------------
CREATE TABLE IF NOT EXISTS Listings (
  listing_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  car_id INT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'EUR',
  description TEXT,
  city VARCHAR(100),
  region VARCHAR(100),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  status ENUM('pending','published','rejected','sold','archived') NOT NULL DEFAULT 'pending',
  moderator_id INT UNSIGNED NULL,
  moderation_date DATETIME NULL,
  rejection_reason VARCHAR(255) NULL,
  views INT UNSIGNED NOT NULL DEFAULT 0,
  featured TINYINT(1) NOT NULL DEFAULT 0,
  INDEX idx_status (status),
  INDEX idx_price (price),
  INDEX idx_created_at (created_at),
  FULLTEXT KEY ft_description (title, description),
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (car_id) REFERENCES Cars(car_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (moderator_id) REFERENCES Users(user_id) ON DELETE SET NULL ON UPDATE CASCADE,
  CHECK (status IN ('pending','published','rejected','sold','archived'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------
-- Таблица Images
-- ---------------------------
CREATE TABLE IF NOT EXISTS Images (
  image_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  listing_id INT UNSIGNED NOT NULL,
  image_url VARCHAR(255) NOT NULL,
  caption VARCHAR(255),
  is_main TINYINT(1) NOT NULL DEFAULT 0,
  uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (listing_id) REFERENCES Listings(listing_id) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_listing_image (listing_id, is_main)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------
-- Таблица Comments
-- ---------------------------
CREATE TABLE IF NOT EXISTS Comments (
  comment_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  listing_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  parent_comment_id INT UNSIGNED NULL,
  content TEXT NOT NULL,
  posted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_hidden TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY (listing_id) REFERENCES Listings(listing_id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (parent_comment_id) REFERENCES Comments(comment_id) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_listing_comments (listing_id, posted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------
-- Таблица Favorites
-- ---------------------------
CREATE TABLE IF NOT EXISTS Favorites (
  user_id INT UNSIGNED NOT NULL,
  listing_id INT UNSIGNED NOT NULL,
  added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, listing_id),
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (listing_id) REFERENCES Listings(listing_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------
-- Таблица Messages
-- ---------------------------
CREATE TABLE IF NOT EXISTS Messages (
  message_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sender_id INT UNSIGNED NOT NULL,
  receiver_id INT UNSIGNED NOT NULL,
  listing_id INT UNSIGNED NULL,
  content TEXT NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES Users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES Users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (listing_id) REFERENCES Listings(listing_id) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_conv (sender_id, receiver_id, sent_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------
-- Таблица ModerationLogs
-- ---------------------------
CREATE TABLE IF NOT EXISTS ModerationLogs (
  log_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  listing_id INT UNSIGNED NOT NULL,
  moderator_id INT UNSIGNED NULL,
  old_status ENUM('pending','published','rejected','sold','archived') NOT NULL,
  new_status ENUM('pending','published','rejected','sold','archived') NOT NULL,
  reason VARCHAR(255) NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (listing_id) REFERENCES Listings(listing_id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (moderator_id) REFERENCES Users(user_id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------
-- Таблица Reports
-- ---------------------------
CREATE TABLE IF NOT EXISTS Reports (
  report_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reporter_id INT UNSIGNED NOT NULL,
  listing_id INT UNSIGNED NULL,
  comment_id INT UNSIGNED NULL,
  reason VARCHAR(255) NOT NULL,
  details TEXT,
  status ENUM('open','in_progress','resolved','dismissed') NOT NULL DEFAULT 'open',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  handled_by INT UNSIGNED NULL,
  handled_at DATETIME NULL,
  FOREIGN KEY (reporter_id) REFERENCES Users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (listing_id) REFERENCES Listings(listing_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (comment_id) REFERENCES Comments(comment_id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (handled_by) REFERENCES Users(user_id) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_reports_status (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------
-- Таблица Notifications
-- ---------------------------
CREATE TABLE IF NOT EXISTS Notifications (
  notification_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  type VARCHAR(50) NOT NULL,
  payload JSON,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_user_unread (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------
-- Триггер: логирование изменения статуса объявления в ModerationLogs
-- ---------------------------
DELIMITER $$
CREATE TRIGGER IF NOT EXISTS trg_listings_status_change
AFTER UPDATE ON Listings
FOR EACH ROW
BEGIN
  IF NOT (OLD.status <=> NEW.status) THEN
    INSERT INTO ModerationLogs (listing_id, moderator_id, old_status, new_status, reason, changed_at)
    VALUES (NEW.listing_id, NEW.moderator_id, OLD.status, NEW.status, NEW.rejection_reason, NOW());
  END IF;
END$$
DELIMITER ;

-- ---------------------------
-- Триггер: защита изменения ролей Users
-- ---------------------------
-- Этот триггер блокирует любые UPDATE, которые пытаются изменить поле role.
-- Изменять роли можно вручную через SQL (например, через админский аккаунт root или специально настроенный админ_user).

DROP TRIGGER IF EXISTS trg_users_role_protect;
DELIMITER $$
CREATE TRIGGER trg_users_role_protect
BEFORE UPDATE ON Users
FOR EACH ROW
BEGIN
  IF OLD.role != NEW.role THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Changing user roles is not allowed directly. Only DB admin can assign roles.';
  END IF;
END$$
DELIMITER ;

-- ---------------------------
-- Вспомогательное представление
-- ---------------------------
CREATE OR REPLACE VIEW v_published_listings AS
SELECT l.listing_id, l.title, l.price, l.currency, l.city, l.region, l.created_at, l.status,
       u.user_id AS seller_id, u.username AS seller_username
FROM Listings l
JOIN Users u ON l.user_id = u.user_id
WHERE l.status = 'published';

-- ---------------------------
-- Пример: добавление администратора и модераторов вручную
-- (ЗАМЕНИТЕ password_hash на реальные bcrypt/argon2 хеши.)
-- INSERT IGNORE позволяет безопасно выполнять скрипт повторно - существующие записи будут пропущены
-- ---------------------------
INSERT IGNORE INTO Users (username, email, password_hash, role, display_name, phone)
VALUES
('admin', 'admin@cars.com', '$2y$10$REPLACE_WITH_BCRYPT_HASH_FOR_ADMIN', 'admin', 'Admin', '+10000000000'),
('moderator1', 'mod1@cars.com', '$2y$10$REPLACE_WITH_BCRYPT_HASH_FOR_MOD1', 'moderator', 'Moderator One', '+20000000001'),
('moderator2', 'mod2@cars.com', '$2y$10$REPLACE_WITH_BCRYPT_HASH_FOR_MOD2', 'moderator', 'Moderator Two', '+20000000002'),
('moderator3', 'mod3@cars.com', '$2y$10$REPLACE_WITH_BCRYPT_HASH_FOR_MOD3', 'moderator', 'Moderator Three', '+20000000003');

-- Пример обычных пользователей
INSERT IGNORE INTO Users (username, email, password_hash, role, display_name, phone)
VALUES
('user1', 'user1@mail.com', '$2y$10$REPLACE_WITH_BCRYPT_HASH_FOR_USER1', 'user', 'Ivan Ivanov', '+380123456789'),
('user2', 'user2@mail.com', '$2y$10$REPLACE_WITH_BCRYPT_HASH_FOR_USER2', 'user', 'Petr Petrov', '+380987654321');

-- ---------------------------
-- Примеры данных: вставим несколько машин и объявление в статусе pending
-- ---------------------------
INSERT IGNORE INTO Cars (make, model, year, mileage, body_type, engine_type, transmission, color, vin, extra)
VALUES
('Toyota', 'Camry', 2017, 85000, 'Sedan', 'Gasoline', 'Automatic', 'White', 'JT1234567890', JSON_OBJECT('trim','LE','hp',178)),
('BMW', 'X5', 2019, 45000, 'SUV', 'Diesel', 'Automatic', 'Black', 'WB1234567890', JSON_OBJECT('trim','xDrive40d'));

-- Создаем объявление от user1 (найти user1 id автоматически)
-- Примечание: если нужно избежать дубликатов объявлений, можно добавить уникальный индекс или использовать INSERT IGNORE
INSERT IGNORE INTO Listings (user_id, car_id, title, price, currency, description, city, region)
VALUES (
  (SELECT user_id FROM Users WHERE username='user1' LIMIT 1),
  (SELECT car_id FROM Cars WHERE make='Toyota' AND model='Camry' LIMIT 1),
  'Toyota Camry 2017, хорошее состояние', 15000.00, 'EUR', 'Описание автомобиля. Один владелец, сервисная книжка.', 'Kiev', 'Kiev region'
);

-- ---------------------------
-- Создание SQL-аккаунтов MySQL и разграничение прав
-- (Запустить от учётной записи с правами GRANT, обычно root)
-- ---------------------------
-- ВНИМАНИЕ: Выполняйте создание MySQL пользователей только в безопасной среде.

CREATE USER IF NOT EXISTS 'web_user'@'%' IDENTIFIED BY 'ReplaceWithStrongWebPassword!';
CREATE USER IF NOT EXISTS 'moderator_user'@'%' IDENTIFIED BY 'ReplaceWithStrongModeratorPass!';
CREATE USER IF NOT EXISTS 'admin_user'@'localhost' IDENTIFIED BY 'ReplaceWithStrongAdminPass!';

-- Права для web_user: минимально необходимые операции для фронтенда
GRANT SELECT, INSERT, UPDATE, DELETE ON car_marketplace.Listings TO 'web_user'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON car_marketplace.Comments TO 'web_user'@'%';
GRANT SELECT, INSERT ON car_marketplace.Users TO 'web_user'@'%';
GRANT SELECT ON car_marketplace.Cars TO 'web_user'@'%';
GRANT SELECT ON car_marketplace.Images TO 'web_user'@'%';
GRANT SELECT, INSERT ON car_marketplace.Favorites TO 'web_user'@'%';
GRANT SELECT, INSERT ON car_marketplace.Messages TO 'web_user'@'%';

-- Права для moderator_user: просмотр + изменение статусов объявлений, логов модерации
GRANT SELECT, UPDATE ON car_marketplace.Listings TO 'moderator_user'@'%';
GRANT SELECT, INSERT ON car_marketplace.ModerationLogs TO 'moderator_user'@'%';
GRANT SELECT ON car_marketplace.Users TO 'moderator_user'@'%';
GRANT SELECT, UPDATE ON car_marketplace.Reports TO 'moderator_user'@'%';

-- Админ: все права на БД (локально). Для глобального админа используйте безопасную настройку.
GRANT ALL PRIVILEGES ON car_marketplace.* TO 'admin_user'@'localhost' WITH GRANT OPTION;

FLUSH PRIVILEGES;

-- ---------------------------
-- Примеры полезных запросов (для использования в приложении)
-- ---------------------------

-- 1) Получить список объявлений на модерацию (pending):
-- Предполагается, что приложение подключается как moderator_user
SELECT l.listing_id, l.title, l.price, l.currency, l.created_at, u.user_id AS seller_id, u.username AS seller_username
FROM Listings l
JOIN Users u ON l.user_id = u.user_id
WHERE l.status = 'pending'
ORDER BY l.created_at ASC
LIMIT 100;

-- 2) Модератор публикует объявление (пример):
-- Выполнять от moderator_user или от admin в приложении/инструменте модерации
START TRANSACTION;
UPDATE Listings
SET status = 'published', moderator_id = (SELECT user_id FROM Users WHERE username='moderator1' LIMIT 1), moderation_date = NOW(), rejection_reason = NULL
WHERE listing_id = 1 AND status = 'pending';
COMMIT;

-- 3) Модератор отклоняет объявление с указанием причины:
START TRANSACTION;
UPDATE Listings
SET status = 'rejected', moderator_id = (SELECT user_id FROM Users WHERE username='moderator2' LIMIT 1), moderation_date = NOW(), rejection_reason = 'Нарушение правил публикации'
WHERE listing_id = 2 AND status = 'pending';
COMMIT;

-- 4) Поиск объявлений по фильтрам (цена, марка, год) с пагинацией
-- MySQL не поддерживает переменные в LIMIT/OFFSET, поэтому используем PREPARE для динамического запроса:
-- 
-- SET @min_price = 10000;
-- SET @max_price = 50000;
-- SET @make = 'Toyota';
-- SET @year_from = 2015;
-- SET @page_size = 20;
-- SET @offset = 0;
-- 
-- SET @sql = CONCAT('
--   SELECT l.listing_id, l.title, l.price, l.currency, l.city, l.created_at, c.make, c.model, c.year
--   FROM Listings l
--   JOIN Cars c ON l.car_id = c.car_id
--   WHERE l.status = ''published''
--     AND l.price BETWEEN COALESCE(?, 0) AND COALESCE(?, 99999999)
--     AND (? IS NULL OR c.make = ?)
--     AND (? IS NULL OR c.year >= ?)
--   ORDER BY l.created_at DESC
--   LIMIT ? OFFSET ?
-- ');
-- 
-- PREPARE stmt FROM @sql;
-- EXECUTE stmt USING @min_price, @max_price, @make, @make, @year_from, @year_from, @page_size, @offset;
-- DEALLOCATE PREPARE stmt;

-- Простой пример с константами (для тестирования):
SELECT l.listing_id, l.title, l.price, l.currency, l.city, l.created_at, c.make, c.model, c.year
FROM Listings l
JOIN Cars c ON l.car_id = c.car_id
WHERE l.status = 'published'
  AND l.price BETWEEN 0 AND 99999999
ORDER BY l.created_at DESC
LIMIT 20 OFFSET 0;

-- 5) Получить логи модерации для объявления
-- Пример: SET @listing_id = 1;
SELECT * FROM ModerationLogs WHERE listing_id = @listing_id ORDER BY changed_at DESC;

-- 6) Получить список модераторов (для админа)
SELECT user_id, username, email, display_name, registration_date FROM Users WHERE role = 'moderator';

-- ---------------------------
-- Таблица CurrencyRates (курсы валют)
-- ---------------------------
CREATE TABLE IF NOT EXISTS CurrencyRates (
    currency_rate_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    base_currency VARCHAR(3) NOT NULL COMMENT 'Базовая валюта (EUR)',
    target_currency VARCHAR(3) NOT NULL COMMENT 'Целевая валюта',
    rate DECIMAL(20, 6) NOT NULL COMMENT 'Курс обмена',
    last_updated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_currency_pair (base_currency, target_currency),
    INDEX idx_last_updated (last_updated)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------
-- Конец скрипта
-- ---------------------------
