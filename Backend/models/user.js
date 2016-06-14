/** Model: User **/
/*
* User = {
*      id: id, 
*      name: name,
*      email: email,
*      password: hashed password      
* }
*/

var db = require('../config/db').get();
var async = require('async');

var that = this;

/**
 * Create a new user object in the database
 * user: User object to be inserted
 */
exports.create = function (user, callback) {
    // First check if a user with that name already exists
    db.hexists('users', user.name, function (err, rep) {
        if (err) throw err;
        if (rep == 1) {
            callback(new Error("A user with that name already exists."));
        } else {
            async.series([
                // Get a new incremented ID for the user
                function (callback) {
                    db.incr('id:user', function (err, rep) {
                        if (err) throw err;
                        user.id = rep;
                        callback();
                    });
                },
                // Insert user into database
                function (callback) {
                    db.set('user:' + user.id, JSON.stringify(user), function (err, rep) {
                        if (err) throw err;
                        callback();
                    });
                },
                // Add user to users hash (name -> id)
                function (callback) {
                    db.hset("users", user.name, user.id, function (err, rep) {
                        if (err) throw err;
                        callback();
                    });
                }
            ], function (err) {
                callback(null, user);
            });
        }
    });
}

/**
 * Retrieve a user by his ID
 * id: ID of the user
 */
exports.get = function (id, callback) {
    db.get('user:' + id, function (err, rep) {
        if (rep) {
            var user = JSON.parse(rep);
            callback(null, user);
        } else {
            callback(new Error("User with ID " + id + " not found."));
        }
    });
}

/**
 * Finds a user by his name
 * name: name of the user
 */
exports.find = function(name, callback) {
    // Hash 'users' stores (name -> id) pairs
    db.hget('users', name, function (err, rep) {
        if (err) throw err;
        if (rep) {
            that.get(rep, function(err, result) {
                if (err) {
                    callback(err);
                } else {
                    callback(null, result);
                }
            });
        } else {
            callback(new Error("No user with that name exists."));
        }
    });
}

/**
 * Update an existing user object in the database
 * user: User object to be updated
 */
exports.save = function (user, callback) {
    that.exists(user.id, function (result) {
        if (result == true) {
            // User exists in the database, update record
            async.series([
                // Overwrite existing user key
                function (callback) {
                    db.set('user:' + user.id, JSON.stringify(user), function (err, rep) {
                        if (err) throw err;
                        callback();
                    });
                },
                // Just in case, add the new name to the users hash (name -> id)
                function (callback) {
                    db.hset("users", user.name, user.id, function (err, rep) {
                        if (err) throw err;
                        callback();
                    });
                }
            ], function (err) {
                callback(null, user);
            });
        } else {
            // User doesn't exist, can't update
            callback(new Error("User with ID " + user.id + " not found."));
        }
    });
}

/**
 * Get all entries in a users' watchlist (array)
 * id: ID of the user
 */
exports.getWatchlist = function (id, callback) {
    db.smembers('user:' + id + ':watchlist', function (err, rep) {
        if (err) throw err;
        if (rep.length > 0) {
            callback(null, rep);
        } else {
            callback(new Error("No watchlist for this user."));
        }
    });
}

/**
 * Delete entries from a users' watchlist
 * id: ID of the user
 * movies: Array of IMDB ids
 */
exports.deleteFromWatchlist = function (id, movies, callback) {
    db.srem("user:" + id + ":watchlist", movies, function (err, rep) {
        if (err) throw err;
        if (rep > 0) {
            callback();
        } else {
            callback(new Error("Couldn't delete the movie(s) from watchlist."));
        }
    });
}

/**
 * Add entries to a users' watchlist
 * id: ID of the user
 * movies: Array of IMDB ids
 */
exports.addToWatchlist = function (id, movies, callback) {
    db.sadd("user:" + id + ":watchlist", movies, function (err, rep) {
        if (err) throw err;
        if (rep > 0) {
            callback();
        } else {
            callback(new Error("Couldn't insert movie(s). Please try again."));
        }
    });
}

/**
 * Get movies that are not in a users' watchlist
 * id: ID of the user
 * region: String that represents the region ("ca", "de", ...)
 */
exports.getMovies = function (id, region, callback) {
    db.sdiff("region:" + region + ":movies", "user:" + id + ":watchlist", function (err, rep) {
        // :rep is an array with all IMDB IDs from :region that are not in the user watchlist
        if (err) throw err;
        if (rep) {
            callback(null, rep);
        } else {
            callback(new Error("No unwatched movies found."));
        }
    });
}

/**
 * Check if user exists
 */
exports.exists = function (id, callback) {
    if (typeof id)
        db.exists('user:' + id, function (err, rep) {
            if (err) throw err;
            if (rep == 1) callback(true)
            else callback(false)
        });
}