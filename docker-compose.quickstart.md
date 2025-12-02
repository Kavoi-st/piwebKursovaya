# 🚀 Быстрый старт с Docker

## Шаг 1: Создайте .env файл

```bash
cp .env.example .env
```

## Шаг 2: Отредактируйте .env

Откройте `.env` и установите:
- `DB_PASSWORD` - пароль для пользователя БД
- `DB_ROOT_PASSWORD` - пароль root для MySQL
- `JWT_SECRET` - секретный ключ (минимум 32 символа)

**Пример:**
```env
DB_PASSWORD=secure_password_123
DB_ROOT_PASSWORD=root_secure_password_123
JWT_SECRET=your-very-long-secret-key-minimum-32-characters-long
```

## Шаг 3: Запустите проект

```bash
docker-compose up -d
```

## Шаг 4: Откройте в браузере

- **Frontend**: http://localhost
- **Backend API**: http://localhost:3000

## Полезные команды

```bash
# Просмотр логов
docker-compose logs -f

# Остановка
docker-compose down

# Пересборка после изменений
docker-compose up -d --build
```

## Подробная документация

См. [DOCKER.md](./DOCKER.md) для полной документации.

