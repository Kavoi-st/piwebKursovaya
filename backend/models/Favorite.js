const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Модель избранного (связующая таблица User-Listing)
 * Соответствует таблице Favorites в БД
 */
const Favorite = sequelize.define('Favorite', {
  userId: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    field: 'user_id',
    references: {
      model: 'Users',
      key: 'user_id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  listingId: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    field: 'listing_id',
    references: {
      model: 'Listings',
      key: 'listing_id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  addedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'added_at'
  }
}, {
  tableName: 'Favorites',
  timestamps: false
});

module.exports = Favorite;

