const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { buildPublicUrl } = require('../services/storageService');

/**
 * Модель изображения объявления
 * Соответствует таблице Images в БД
 */
const Image = sequelize.define('Image', {
  imageId: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    field: 'image_id'
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
  imageUrl: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'image_url',
    validate: {
      notEmpty: true
    },
    get() {
      const value = this.getDataValue('imageUrl');
      return buildPublicUrl(value);
    }
  },
  caption: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  isMain: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_main'
  },
  uploadedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'uploaded_at'
  }
}, {
  tableName: 'Images',
  timestamps: false,
  defaultScope: {
    order: [
      ['isMain', 'DESC'],
      ['uploadedAt', 'ASC'],
      ['imageId', 'ASC']
    ]
  },
  indexes: [
    { fields: ['listing_id', 'is_main'], name: 'idx_listing_image' }
  ]
});

module.exports = Image;

