const User = require('./User');
const Car = require('./Car');
const Listing = require('./Listing');
const Image = require('./Image');
const Comment = require('./Comment');
const Favorite = require('./Favorite');
const Message = require('./Message');
const ModerationLog = require('./ModerationLog');
const Report = require('./Report');
const Notification = require('./Notification');
const CurrencyRate = require('./CurrencyRate');

/**
 * Инициализация всех связей между моделями
 * Связи соответствуют внешним ключам в БД
 */

// ====================
// User Associations
// ====================

// User -> Listings (один ко многим)
User.hasMany(Listing, {
  foreignKey: 'user_id',
  as: 'listings'
});
Listing.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// User -> Listings как модератор (один ко многим)
User.hasMany(Listing, {
  foreignKey: 'moderator_id',
  as: 'moderatedListings'
});
Listing.belongsTo(User, {
  foreignKey: 'moderator_id',
  as: 'moderator'
});

// User -> Comments (один ко многим)
User.hasMany(Comment, {
  foreignKey: 'user_id',
  as: 'comments'
});
Comment.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// User -> Favorites (многие ко многим через Favorite)
User.belongsToMany(Listing, {
  through: Favorite,
  foreignKey: 'user_id',
  otherKey: 'listing_id',
  as: 'favoriteListings'
});
Listing.belongsToMany(User, {
  through: Favorite,
  foreignKey: 'listing_id',
  otherKey: 'user_id',
  as: 'favoritedByUsers'
});

// User -> Messages как отправитель (один ко многим)
User.hasMany(Message, {
  foreignKey: 'sender_id',
  as: 'sentMessages'
});
Message.belongsTo(User, {
  foreignKey: 'sender_id',
  as: 'sender'
});

// User -> Messages как получатель (один ко многим)
User.hasMany(Message, {
  foreignKey: 'receiver_id',
  as: 'receivedMessages'
});
Message.belongsTo(User, {
  foreignKey: 'receiver_id',
  as: 'receiver'
});

// User -> ModerationLogs (один ко многим)
User.hasMany(ModerationLog, {
  foreignKey: 'moderator_id',
  as: 'moderationLogs'
});
ModerationLog.belongsTo(User, {
  foreignKey: 'moderator_id',
  as: 'moderator'
});

// User -> Reports как жалобщик (один ко многим)
User.hasMany(Report, {
  foreignKey: 'reporter_id',
  as: 'reportedIssues'
});
Report.belongsTo(User, {
  foreignKey: 'reporter_id',
  as: 'reporter'
});

// User -> Reports как обработчик (один ко многим)
User.hasMany(Report, {
  foreignKey: 'handled_by',
  as: 'handledReports'
});
Report.belongsTo(User, {
  foreignKey: 'handled_by',
  as: 'handler'
});

// User -> Notifications (один ко многим)
User.hasMany(Notification, {
  foreignKey: 'user_id',
  as: 'notifications'
});
Notification.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// ====================
// Car Associations
// ====================

// Car -> Listings (один ко многим)
Car.hasMany(Listing, {
  foreignKey: 'car_id',
  as: 'listings'
});
Listing.belongsTo(Car, {
  foreignKey: 'car_id',
  as: 'car'
});

// ====================
// Listing Associations
// ====================

// Listing -> Images (один ко многим)
Listing.hasMany(Image, {
  foreignKey: 'listing_id',
  as: 'images'
});
Image.belongsTo(Listing, {
  foreignKey: 'listing_id',
  as: 'listing'
});

// Listing -> Comments (один ко многим)
Listing.hasMany(Comment, {
  foreignKey: 'listing_id',
  as: 'comments'
});
Comment.belongsTo(Listing, {
  foreignKey: 'listing_id',
  as: 'listing'
});

// Listing -> Messages (один ко многим)
Listing.hasMany(Message, {
  foreignKey: 'listing_id',
  as: 'messages'
});
Message.belongsTo(Listing, {
  foreignKey: 'listing_id',
  as: 'listing'
});

// Listing -> ModerationLogs (один ко многим)
Listing.hasMany(ModerationLog, {
  foreignKey: 'listing_id',
  as: 'moderationLogs'
});
ModerationLog.belongsTo(Listing, {
  foreignKey: 'listing_id',
  as: 'listing'
});

// Listing -> Reports (один ко многим)
Listing.hasMany(Report, {
  foreignKey: 'listing_id',
  as: 'reports'
});
Report.belongsTo(Listing, {
  foreignKey: 'listing_id',
  as: 'listing'
});

// ====================
// Comment Associations
// ====================

// Comment -> Comments (самореференция для вложенных комментариев)
Comment.hasMany(Comment, {
  foreignKey: 'parent_comment_id',
  as: 'replies'
});
Comment.belongsTo(Comment, {
  foreignKey: 'parent_comment_id',
  as: 'parentComment'
});

// Comment -> Reports (один ко многим)
Comment.hasMany(Report, {
  foreignKey: 'comment_id',
  as: 'reports'
});
Report.belongsTo(Comment, {
  foreignKey: 'comment_id',
  as: 'comment'
});

// ====================
// Favorite Associations
// ====================

// Favorite -> Listing (многие к одному)
Favorite.belongsTo(Listing, {
  foreignKey: 'listing_id',
  as: 'listing'
});
Listing.hasMany(Favorite, {
  foreignKey: 'listing_id',
  as: 'favorites'
});

// Favorite -> User (многие к одному)
Favorite.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});
User.hasMany(Favorite, {
  foreignKey: 'user_id',
  as: 'favorites'
});

// ====================
// Экспорт всех моделей
// ====================
module.exports = {
  User,
  Car,
  Listing,
  Image,
  Comment,
  Favorite,
  Message,
  ModerationLog,
  Report,
  Notification,
  CurrencyRate
};

