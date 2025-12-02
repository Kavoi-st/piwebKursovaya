const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Модель уведомления пользователя
 * Соответствует таблице Notifications в БД
 */
const Notification = sequelize.define('Notification', {
  notificationId: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    field: 'notification_id'
  },
  userId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'Users',
      key: 'user_id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  payload: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_read'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  }
}, {
  tableName: 'Notifications',
  timestamps: false,
  indexes: [
    { fields: ['user_id', 'is_read'], name: 'idx_user_unread' }
  ]
});

module.exports = Notification;

