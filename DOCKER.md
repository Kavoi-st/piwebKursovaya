# Docker Setup для Car Marketplace

Этот документ описывает, как запустить проект Car Marketplace с помощью Docker.

## Требования

- Docker (версия 20.10 или выше)
- Docker Compose (версия 2.0 или выше)

## Быстрый старт

### 1. Клонирование и настройка

```bash
# Клонируйте репозиторий (если еще не сделано)
git clone <repository-url>
cd PiWebKursach

# Создайте файл .env на основе примера
cp .env.example .env

# Отредактируйте .env файл и установите нужные значения:
# - DB_PASSWORD - пароль для базы данных
# - DB_ROOT_PASSWORD - пароль root для MySQL
# - JWT_SECRET - секретный ключ для JWT токенов (минимум 32 символа)
```

### 2. Запуск проекта

```bash
# Сборка и запуск всех контейнеров
docker-compose up -d

# Просмотр логов
docker-compose logs -f

# Остановка контейнеров
docker-compose down

# Остановка с удалением volumes (удалит все данные БД!)
docker-compose down -v
```

### 3. Доступ к приложению

После запуска контейнеров:

- **Frontend**: http://localhost (или http://localhost:80)
- **Backend API**: http://localhost:3000
- **MySQL**: localhost:3306

## Структура Docker

Проект состоит из трех сервисов:

### 1. MySQL Database (`db`)
- Образ: `mysql:8.0`
- Порт: `3306` (по умолчанию)
- Данные сохраняются в Docker volume `mysql_data`
- Автоматически выполняется скрипт `DB.sql` при первом запуске

### 2. Backend API (`backend`)
- Образ: Node.js 18 Alpine
- Порт: `3000` (по умолчанию)
- Загруженные файлы сохраняются в `backend/uploads/`
- Автоматически подключается к MySQL после его готовности

### 3. Frontend (`frontend`)
- Образ: Nginx Alpine
- Порт: `80` (по умолчанию)
- Проксирует API запросы на backend
- Отдает статические файлы

## Переменные окружения

Создайте файл `.env` в корне проекта со следующими переменными:

```env
# Environment
NODE_ENV=production

# Database Configuration
DB_HOST=db
DB_PORT=3306
DB_NAME=car_marketplace
DB_USER=car_user
DB_PASSWORD=car_password
DB_ROOT_PASSWORD=rootpassword

# Backend Configuration
BACKEND_PORT=3000
JWT_SECRET=your-secret-key-change-in-production-min-32-characters

# Frontend Configuration
FRONTEND_PORT=80
FRONTEND_URL=http://localhost
```

**Важно**: Измените `JWT_SECRET`, `DB_PASSWORD` и `DB_ROOT_PASSWORD` на безопасные значения перед запуском в production!

## Полезные команды

### Просмотр статуса контейнеров
```bash
docker-compose ps
```

### Просмотр логов конкретного сервиса
```bash
# Backend
docker-compose logs -f backend

# Frontend
docker-compose logs -f frontend

# Database
docker-compose logs -f db
```

### Пересборка контейнеров
```bash
# Пересборка всех сервисов
docker-compose build

# Пересборка конкретного сервиса
docker-compose build backend

# Пересборка и перезапуск
docker-compose up -d --build
```

### Выполнение команд внутри контейнера
```bash
# Backend
docker-compose exec backend sh

# Database
docker-compose exec db mysql -u car_user -p car_marketplace
```

### Очистка
```bash
# Остановка и удаление контейнеров
docker-compose down

# Остановка, удаление контейнеров и volumes (удалит БД!)
docker-compose down -v

# Удаление неиспользуемых образов
docker image prune -a
```

## Разработка

Для разработки с hot-reload:

1. Запустите только MySQL через Docker:
```bash
docker-compose up -d db
```

2. Запустите backend локально:
```bash
cd backend
npm install
npm run dev
```

3. Запустите frontend локально (например, через Live Server в VS Code)

## Troubleshooting

### Проблема: Контейнеры не запускаются

1. Проверьте логи:
```bash
docker-compose logs
```

2. Проверьте, что порты не заняты:
```bash
# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :80
netstat -ano | findstr :3306

# Linux/Mac
lsof -i :3000
lsof -i :80
lsof -i :3306
```

### Проблема: База данных не инициализируется

1. Проверьте, что файл `DB.sql` существует в корне проекта
2. Проверьте логи MySQL:
```bash
docker-compose logs db
```

3. Попробуйте пересоздать volumes:
```bash
docker-compose down -v
docker-compose up -d
```

### Проблема: Backend не может подключиться к БД

1. Убедитесь, что MySQL контейнер запущен и здоров:
```bash
docker-compose ps
```

2. Проверьте переменные окружения в `.env`
3. Проверьте логи backend:
```bash
docker-compose logs backend
```

### Проблема: Загруженные файлы не сохраняются

Убедитесь, что директория `backend/uploads/` существует и имеет правильные права доступа.

## Production Deployment

Для production развертывания:

1. Измените все пароли и секретные ключи в `.env`
2. Установите `NODE_ENV=production`
3. Настройте правильный `FRONTEND_URL` (домен вашего сайта)
4. Рассмотрите использование внешней БД вместо контейнера
5. Настройте SSL/TLS для Nginx
6. Настройте резервное копирование базы данных

## Безопасность

- **Никогда не коммитьте `.env` файл в Git**
- Используйте сильные пароли для БД
- Используйте длинный случайный `JWT_SECRET` (минимум 32 символа)
- В production используйте HTTPS
- Регулярно обновляйте Docker образы

