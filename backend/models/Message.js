const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Модель личного сообщения между пользователями
 * Соответствует таблице Messages в БД
 */
const Message = sequelize.define('Message', {
  messageId: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    field: 'message_id'
  },
  senderId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    field: 'sender_id',
    references: {
      model: 'Users',
      key: 'user_id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  receiverId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    field: 'receiver_id',
    references: {
      model: 'Users',
      key: 'user_id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  listingId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    field: 'listing_id',
    references: {
      model: 'Listings',
      key: 'listing_id'
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_read'
  },
  sentAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'sent_at'
  }
}, {
  tableName: 'Messages',
  timestamps: false,
  indexes: [
    { fields: ['sender_id', 'receiver_id', 'sent_at'], name: 'idx_conv' }
  ]
});

module.exports = Message;

