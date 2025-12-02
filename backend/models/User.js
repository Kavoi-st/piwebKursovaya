const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { buildPublicUrl } = require('../services/storageService');

/**
 * Модель пользователя
 * Соответствует таблице Users в БД
 */
const User = sequelize.define('User', {
  userId: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    field: 'user_id'
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 50],
      notEmpty: true
    }
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
      notEmpty: true
    }
  },
  passwordHash: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'password_hash',
    validate: {
      notEmpty: true
    }
  },
  role: {
    type: DataTypes.ENUM('user', 'moderator', 'admin'),
    allowNull: false,
    defaultValue: 'user',
    validate: {
      isIn: [['user', 'moderator', 'admin']]
    }
  },
  displayName: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'display_name'
  },
  phone: {
    type: DataTypes.STRING(30),
    allowNull: true
  },
  avatarUrl: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'avatar_url',
    get() {
      const value = this.getDataValue('avatarUrl');
      return buildPublicUrl(value);
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
  },
  registrationDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'registration_date'
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_login'
  }
}, {
  tableName: 'Users',
  timestamps: false, // Используем ручные поля created_at/updated_at
  indexes: [
    { fields: ['username'] },
    { fields: ['email'] },
    { fields: ['role'] }
  ]
});

module.exports = User;

