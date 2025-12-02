const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CurrencyRate = sequelize.define('CurrencyRate', {
    currencyRateId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'currency_rate_id'
    },
    baseCurrency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        field: 'base_currency',
        comment: 'Базовая валюта (например, EUR)'
    },
    targetCurrency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        field: 'target_currency',
        comment: 'Целевая валюта (например, USD)'
    },
    rate: {
        type: DataTypes.DECIMAL(20, 6),
        allowNull: false,
        comment: 'Курс обмена'
    },
    lastUpdated: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'last_updated',
        comment: 'Время последнего обновления'
    }
}, {
    tableName: 'CurrencyRates',
    timestamps: false,
    indexes: [
        {
            unique: true,
            fields: ['base_currency', 'target_currency']
        },
        {
            fields: ['last_updated']
        }
    ]
});

module.exports = CurrencyRate;

