const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Модель комментария к объявлению
 * Соответствует таблице Comments в БД
 * Поддерживает вложенность через parent_comment_id
 */
const Comment = sequelize.define('Comment', {
  commentId: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
    field: 'comment_id'
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
  parentCommentId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    field: 'parent_comment_id',
    references: {
      model: 'Comments',
      key: 'comment_id'
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
  postedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'posted_at'
  },
  isHidden: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_hidden'
  }
}, {
  tableName: 'Comments',
  timestamps: false,
  indexes: [
    { fields: ['listing_id', 'posted_at'], name: 'idx_listing_comments' }
  ]
});

module.exports = Comment;

