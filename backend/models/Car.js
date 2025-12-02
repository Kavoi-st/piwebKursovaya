const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Модель автомобиля
 * Соответствует таблице Cars в БД
 */
const Car = sequelize.define('Car', {
  carId: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    field: 'car_id'
  },
  make: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  model: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  year: {
    type: DataTypes.SMALLINT.UNSIGNED,
    allowNull: false,
    validate: {
      min: 1900,
      max: new Date().getFullYear() + 1
    }
  },
  mileage: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    validate: {
      min: 0
    }
  },
  bodyType: {
    type: DataTypes.STRING(30),
    allowNull: true,
    field: 'body_type'
  },
  engineType: {
    type: DataTypes.STRING(30),
    allowNull: true,
    field: 'engine_type'
  },
  transmission: {
    type: DataTypes.STRING(30),
    allowNull: true
  },
  color: {
    type: DataTypes.STRING(30),
    allowNull: true
  },
  vin: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  extra: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null
  }
}, {
  tableName: 'Cars',
  timestamps: false,
  indexes: [
    { fields: ['make', 'model'], name: 'idx_make_model' },
    { fields: ['year'], name: 'idx_year' }
  ]
});

module.exports = Car;

