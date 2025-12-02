const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Модель жалобы на объявление или комментарий
 * Соответствует таблице Reports в БД
 */
const Report = sequelize.define('Report', {
  reportId: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    field: 'report_id'
  },
  reporterId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    field: 'reporter_id',
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
  commentId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    field: 'comment_id',
    references: {
      model: 'Comments',
      key: 'comment_id'
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  },
  reason: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  details: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('open', 'in_progress', 'resolved', 'dismissed'),
    allowNull: false,
    defaultValue: 'open',
    validate: {
      isIn: [['open', 'in_progress', 'resolved', 'dismissed']]
    }
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  handledBy: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    field: 'handled_by',
    references: {
      model: 'Users',
      key: 'user_id'
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  },
  handledAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'handled_at'
  }
}, {
  tableName: 'Reports',
  timestamps: false,
  indexes: [
    { fields: ['status', 'created_at'], name: 'idx_reports_status' }
  ]
});

module.exports = Report;

