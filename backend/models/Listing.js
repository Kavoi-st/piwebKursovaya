const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Модель объявления о продаже
 * Соответствует таблице Listings в БД
 */
const Listing = sequelize.define('Listing', {
  listingId: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    field: 'listing_id'
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
  carId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    field: 'car_id',
    references: {
      model: 'Cars',
      key: 'car_id'
    },
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 200]
    }
  },
  price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  currency: {
    type: DataTypes.CHAR(3),
    allowNull: false,
    defaultValue: 'EUR',
    validate: {
      len: [3, 3]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  region: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'updated_at'
  },
  status: {
    type: DataTypes.ENUM('pending', 'published', 'rejected', 'sold', 'archived'),
    allowNull: false,
    defaultValue: 'pending',
    validate: {
      isIn: [['pending', 'published', 'rejected', 'sold', 'archived']]
    }
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
  moderationDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'moderation_date'
  },
  rejectionReason: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'rejection_reason'
  },
  views: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  featured: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  tableName: 'Listings',
  timestamps: false,
  indexes: [
    { fields: ['status'], name: 'idx_status' },
    { fields: ['price'], name: 'idx_price' },
    { fields: ['created_at'], name: 'idx_created_at' },
    {
      type: 'FULLTEXT',
      fields: ['title', 'description'],
      name: 'ft_description'
    }
  ]
});

module.exports = Listing;

