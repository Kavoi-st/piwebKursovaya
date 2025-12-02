const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Модель лога модерации объявлений
 * Соответствует таблице ModerationLogs в БД
 * Автоматически заполняется триггером при изменении статуса объявления
 */
const ModerationLog = sequelize.define('ModerationLog', {
  logId: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    field: 'log_id'
  },
  listingId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    field: 'listing_id',
    references: {
      model: 'Listings',
      key: 'listing_id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  moderatorId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    field: 'moderator_id',
    references: {
      model: 'Users',
      key: 'user_id'
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  },
  oldStatus: {
    type: DataTypes.ENUM('pending', 'published', 'rejected', 'sold', 'archived'),
    allowNull: false,
    field: 'old_status',
    validate: {
      isIn: [['pending', 'published', 'rejected', 'sold', 'archived']]
    }
  },
  newStatus: {
    type: DataTypes.ENUM('pending', 'published', 'rejected', 'sold', 'archived'),
    allowNull: false,
    field: 'new_status',
    validate: {
      isIn: [['pending', 'published', 'rejected', 'sold', 'archived']]
    }
  },
  reason: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  changedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'changed_at'
  }
}, {
  tableName: 'ModerationLogs',
  timestamps: false
});

module.exports = ModerationLog;

