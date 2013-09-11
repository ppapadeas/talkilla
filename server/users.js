var config = require('./config').config;
var logger = require('./logger');

/**
 * User class constructor
 *
 * @param {String} nick User's nick
 */
function User(nick) {
  this.nick = nick;
  this.events = [];
  this.pending = {};
  this.ws = undefined;
}

/**
 * Attach a WebSocket to the user
 *
 * @param {WebSocket} ws The WebSocket to attach
 * @return {User} chainable
 */
User.prototype.connect = function(ws) {
  this.ws = ws;
  return this;
};

/**
 * Close and remove the WebSocket.
 *
 * @return {User} chainable
 */
User.prototype.disconnect = function() {
  if (this.ws) {
    this.ws.close();
    this.ws = undefined;
  }
  return this;
};

/**
 * Send data throught the attached WebSocket
 *
 * @param {Object} data An object to send throught the WebSocket
 * @param {Function} errback An optional error callback
 *
 * @return {User} chainable
 */
User.prototype.send = function(data) {
  if (this.pending.timeout) {
    clearTimeout(this.pending.timeout);
    this.pending.callback([data]);
    this.pending = {};
  } else {
    this.events.push(data);
  }

  return this;
};

/**
 * Transform the user into a JSON structure
 *
 * @return {Object} a JSON structure
 */
User.prototype.toJSON = function() {
  return {nick: this.nick};
};

User.prototype.waitForEvents = function(callback) {
  if (this.events.length > 0) {
    callback(this.events);
    this.events = [];
  } else {
    var timeout = setTimeout(function() {
      callback([]);
    }, config.LONG_POLLING_TIMEOUT);

    this.pending = {timeout: timeout, callback: callback};
  }
};

/**
 * Users class constructor
 */
function Users() {
  this.users = {};
}

/**
 * Check if the nick is already in the user list
 *
 * @param {String} nick the nick to check
 * @return {Boolean}
 */
Users.prototype.hasNick = function(nick) {
  return Object.keys(this.users).some(function(username) {
    return username === nick;
  });
};

/**
 * Add a new user to the collection with the given nick
 *
 * @param {String} nick the nick of the new user
 * @return {Users} chainable
 */
Users.prototype.add = function(nick) {
  this.users[nick] = new User(nick);
  return this;
};

/**
 * Retrieve a user in the collection via its nick
 *
 * @param {String} nick the nick of the user to find
 * @return {User}
 */
Users.prototype.get = function(nick) {
  return this.users[nick];
};

/**
 * Retrieve all the users as an array
 */
Users.prototype.all = function() {
  return Object.keys(this.users).map(function(nick) {
    return this.users[nick];
  }, this);
};

/**
 * Remove a user from the collection
 *
 * @param {String} nick the nick of the user to remove
 * @return {Users} chainable
 */
Users.prototype.remove = function(nick) {
  delete this.users[nick];
  return this;
};

/**
 * Iterate on the collection
 *
 * @param {Function} callback the callback to execute for each user
 */
Users.prototype.forEach = function(callback) {
  Object.keys(this.users).forEach(function(nick) {
    callback(this.users[nick]);
  }, this);
};

/**
 * Retrieve the list of connected users (i.e. having an attached WebSocket)
 * @return {Array} array of users
 */
Users.prototype.present = function() {
  return Object.keys(this.users)
    .filter(function(nick) {
      return !!this.users[nick].ws;
    }, this)
    .map(function(nick) {
      return this.users[nick];
    }, this);
};

/**
 * Transform the collecton into a JSON structure
 *
 * @param {Array} users an optional list of users to process
 * @return {Object}
 */
Users.prototype.toJSON = function(users) {
  users = users || this.all();

  return Object.keys(users).map(function(nick) {
    var user = users[nick];

    return {nick: user.nick};
  });
};

module.exports.Users = Users;
module.exports.User = User;
