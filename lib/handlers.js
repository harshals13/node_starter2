/*
* Request handlers
*/

// Dependencies
var _data = require('./data');
var helpers = require('./helpers');

// Defining the handler
var handlers = {};

//Sample handler
handlers.ping = function(data, callback){
    // Callback a http status code, and a payload object
    callback(200);
};

// Not found handler
handlers.notFound = function(data, callback){
    callback(404);
};


// Handler for users
handlers.users = function(data, callback) {
    var acceptableMethods = ['post', 'get', 'put', 'delete'];
    if(acceptableMethods.indexOf(data.method) > -1){
        handlers._users[data.method](data, callback);
    } else {
        callback(405);
    }
};

// Container for the users submethods
handlers._users = {};


// Users - POST; firstName, lastName, phone, password, toAgreement
// Optional data: none
// Required data
handlers._users.post = function(data, callback){
  // Check that all required fields are filled out
   var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
   var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
   var streetAddress = typeof(data.payload.streetAddress) == 'string' && data.payload.streetAddress.trim().length > 0 ? data.payload.streetAddress.trim() : false;
   var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
   var email = typeof (data.payload.email) === 'string' && data.payload.email.trim().length > 0 && data.payload.email.trim().includes('@', '.') ? data.payload.email.trim() : false;
   var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
   var tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;

   if(firstName && lastName && phone && password && streetAddress && tosAgreement && email){
      // Make sure the user doesnt already exist
      _data.read('users', phone, function(err, data){
          if(err){
              // Hash the password
              var hashedPassword = helpers.hash(password);

              // Create the user object
              if(hashedPassword) {
                var userObject = {
                    'firstName' : firstName,
                    'lastName' : lastName,
                    'phone' : phone,
                    'email': email,
                    'streetAddress': streetAddress,
                    'hashedPassword': hashedPassword,
                    'tosAgreement' : true
                };
  
                // Store the user
                _data.create('users', phone, userObject, function(err){
                    if(!err){
                        callback(200);
                    } else {
                        console.log(err);
                        callback(500, {'Error' : 'Could not create a new user'});
                    }
                });
              } else {
                  callback(500, {'Error' : 'Could not hash the users\'s password'});
              }
          } else {
              // user alresdy exists
              callback(400, {'Error' : 'A user with that phone number already exists'});
          }
      });
   } else {
       callback( 400, {'Error' : 'Missing required fields'});
   }
   
};

// Users - GET
// Required data: phone
// Optional data: none
// @TODO Only let an authenticated user access their object. Dont let anyone else access the object
handlers._users.get = function(data, callback){
    // Chech that the phone number is valid
    var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim(): false;
    if(phone){

        // Get the token from the headers
        var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

        // Verify that the given tokens from the headers is valid for the phone number
        handlers._tokens.verifyToken(token, phone, function(tokenIsValid){
            if(tokenIsValid){
                // Lookup the user 
                _data.read('users', phone, function(err, data){
                    if(!err && data){
                        // Remove the hashed password from the user object before returning it to the requester
                        delete data.hashedPassword;
                        callback(200, data); // This is the data that your getting back from the read function 
                    } else {
                        callback(404);
                    }
                });
            } else {
                callback(403, {'Error': 'Missing required token in header, or token is invalid'});
            }
        });
    }else {
        callback(400, {'Error': 'Missing required field'});
    }
};

// Users - PUT
// Required data : phone
// Optional data: firstname,lastname, password(at least one must be specified)
handlers._users.put = function(data,callback){
    // Check for required field
    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
  
    // Check for optional fields
    var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    var streetAddress = typeof(data.payload.streetAddress) == 'string' && data.payload.streetAddress.trim().length > 0 ? data.payload.streetAddress.trim() : false;
    var email = typeof (data.payload.email) === 'string' && data.payload.email.trim().length > 0 && data.payload.email.trim().includes('@', '.') ? data.payload.email.trim() : false;

    // Error if phone is invalid
    if(phone){
      // Error if nothing is sent to update
      if(firstName || lastName || password || email || streetAddress){

        // Get the token from the headers
        var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

         // Verify that the given tokens from the headers is valid for the phone number
         handlers._tokens.verifyToken(token, phone, function(tokenIsValid){
            if(tokenIsValid){
                // Lookup the user
        _data.read('users',phone,function(err,userData){
            if(!err && userData){
              // Update the fields if necessary
              if(firstName){
                userData.firstName = firstName;
              }
              if(lastName){
                userData.lastName = lastName;
              }
              if(password){
                userData.hashedPassword = helpers.hash(password);
              }
              if(email){
                  userData.email = email;
              }
              if(streetAddress){
                  userData.streetAddress = streetAddress;
              }
              // Store the new updates
              _data.update('users', phone, userData, function(err){
                if(!err){
                  callback(200);
                } else {
                  console.log(err);
                  callback(500,{'Error' : 'Could not update the user.'});
                }
              });
            } else {
              callback(400,{'Error' : 'Specified user does not exist.'});
            }
          });
            } else {
                callback(403, {'Error': 'Missing reuired token in header, or token is invalid'});
            }
        });
      } else {
        callback(400,{'Error' : 'Missing fields to update.'});
      }
    } else {
      callback(400,{'Error' : 'Missing required field.'});
    }
  
  };

// Users - DELETE
// Required data: phone
// @TODO Only let an authenticated user delete their object. Dont let them delete update elses.
// @TODO Cleanup (delete) any other data files associated with the user
handlers._users.delete = function(data,callback){
    // Check that phone number is valid
    var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
    if(phone){
        // Get the token from the headers
        var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

         // Verify that the given tokens from the headers is valid for the phone number
         handlers._tokens.verifyToken(token, phone, function(tokenIsValid){
            if(tokenIsValid){
                 // Lookup the user
                _data.read('users',phone,function(err,data){
                  if(!err && data){
                    _data.delete('users',phone,function(err){
                      if(!err){
                        callback(200);
                      } else {
                        callback(500,{'Error':'Could not delete the specified user'});
                      }
                    });
                  } else {
                    callback(400,{'Error':'Could not find the specified user.'});
                  }
                });
            } else {
                callback(403, {'Error': 'Missing reuired token in header, or token is invalid'});
            }
        });
    } else {
      callback(400,{'Error':'Missing required field'});
    }
  };

  // Tokens
  handlers.tokens = function(data, callback) {
    var acceptableMethods = ['post', 'get', 'put', 'delete'];
    if(acceptableMethods.indexOf(data.method) > -1){
        handlers._tokens[data.method](data, callback);
    } else {
        callback(405);
    }
};

// Container for tokens sub methods
handlers._tokens = {};

// Tokens - post
// Required data is phone and password
// Optional data is null
handlers._tokens.post = function(data, callback){
    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

   if(phone && password){
       // Lookup the user who matches that phone number
       _data.read('users', phone, function(err, userData){
           if(!err && userData){
               // hash the sent password and compare
               var hashedPassword = helpers.hash(password);
               if(hashedPassword == userData.hashedPassword){
                   // If valid , create a new token witha random name. Set expiration date 1 hour in the future
                   var tokenId =helpers.createRandomString(20);
                   var expires = Date.now() + 1000 * 60 * 60;
                   var tokenObject = {
                       'phone' : phone,
                       'id' : tokenId,
                       'expires': expires
                   };

                   // Store the token
                   _data.create('tokens', tokenId, tokenObject, function(err){
                       if(!err){
                           callback(200, tokenObject);
                       } else {
                           callback(500, {'Error': 'Could not create the new token'});
                       }
                   });
               } else{
                   callback(400, {'Error': 'Password did not match the specified users stored password'});
               }
           } else {
               callback(400, {'Error':'Could not find the specified user'});
           }
       });

   }else {
       callback(400, {'Error': 'Missing required fields'});
   }
};

// Tokens - get
// Required data :id
// Optional data:none
handlers._tokens.get = function(data, callback){
    // Check that the id is valid
    var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim(): false;
    if(id){
        // Lookup the tokens
        _data.read('tokens', id, function(err, tokenData){
            if(!err && tokenData){
                callback(200, tokenData); // This is the data that your getting back from the read function 
            } else {
                callback(404);
            }

        });
    }else {
        callback(400, {'Error': 'Missing required field'});
    }

};

// Tokens - put
// Required data: id, extend
// Optional data: none
handlers._tokens.put = function(data, callback){
    var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim(): false;
    var extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;
    if(id && extend){
        // Lookup the token
        _data.read('tokens', id, function(err, tokenData ){
            if(!err && tokenData) {
                // Check for token expiration
                if(tokenData.expires > Date.now()){
                    // Set the expiration an hour from now
                    tokenData.expires = Date.now() + 1000 * 60 * 60;
                    
                    // Store the new updates
                    _data.update('tokens', id, tokenData, function(err){
                        if(!err) {
                            callback(200);
                        } else {
                            callback(500, {'Error' : 'Could not update the token\'s expiration'});
                        }
                    });
                } else {
                    callback(400, {'Error' : 'The token has already expired and cannot be extended'});
                }
            } else {
                callback(400, {'Error' : 'Specified token does not exist'});
            } 
        });
    } else {
        callback(400, {'Error': 'Missing required fields or fields are invalid'});
    }

};

// Tokens - delete
handlers._tokens.delete = function(data, callback){
    // Check that the id is valid
    var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if(id){
      // Lookup the user
      _data.read('tokens',id,function(err,data){
        if(!err && data){
          _data.delete('tokens',id,function(err){
            if(!err){
              callback(200);
            } else {
              callback(500,{'Error':'Could not delete the specified token'});
            }
          });
        } else {
          callback(400,{'Error':'Could not find the specified token.'});
        }
      });
    } else {
      callback(400,{'Error':'Missing required field'});
    }

};

// Verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = function(id, phone, callback){
    // Lookup the token
    _data.read('tokens', id, function(err, tokenData){
        if(!err && tokenData){
            // Check that the token is for the given user and has not expired
            if(tokenData.phone == phone && tokenData.expires > Date.now()){
                callback(true);
            } else {
                callback(false);
            }
        } else {
            callback(false);
        }
    });
};

// MENU HANDLER

handlers.menu = function (data, callback) {
    var acceptableMethods = ['get'];
    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._menu[data.method](data, callback);
    } else {
        callback(405);
    }
};

// CONTAINER FOR MENU SUB METHODS
handlers._menu = {};

// MENU - GET
// REQUIRED DATA - PHONE, TOKEN
// OPTIONAL DATA - NONE

handlers._menu.get = function(data, callback) {
    var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;

    if(phone){
        var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

        handlers._tokens.verifyToken(token, phone, function(tokenIsValid){
            if(tokenIsValid){
                 // Lookup the user
                _data.read('menu', 'menu1', function(err,data){
                  if(!err && data){
                    callback(200, data);
                  } else {
                    callback(400,{'Error':'Could not get the menu'});
                  }
                });
            } else {
                callback(403, {'Error': 'Missing required token in header, or token is invalid'});
            }
        });
    } else {
        callback(400, {'Error': 'Required data is missing'});
    }
};


// PIZZA CART HANDLER

handlers.cart = function(data, callback) {
    var acceptableMethods = ['get', 'post', 'put', 'delete'];

    if(acceptableMethods.indexOf(data.method) > -1) {
        handlers._cart[data.method] (data, callback);
    } else {
        callback(405);
    }
};

handlers._cart = {};

// CART - POST
// REQUIRED DATA - PHONE, TOKEN, PIZZA'S INDEX
// OPTIONAL DATA - NONE

handlers._cart.post = function(data, callback) {

  var phone = typeof (data.payload.phone) === 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false;

  var pizzaIndex = typeof (data.payload.pizzaIndex) === 'number' && data.payload.pizzaIndex > -1 ? data.payload.pizzaIndex : false;

  var quantity = typeof (data.payload.quantity) === 'number' && data.payload.quantity > 0 ? data.payload.quantity : false;
  console.log(phone,pizzaIndex,quantity);
if(phone && pizzaIndex && quantity){
    var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
    handlers._tokens.verifyToken(token, phone, function(tokenIsValid){
       
        if(tokenIsValid) {
            // Loop through the order and push data into the cart
            _data.read('menu', 'menu1', function(error, menu){
                var orders = [];
                var name = menu[pizzaIndex].name;
                var price = menu[pizzaIndex].price;

                var cartItem = {
                        "name": name,
                        "price": price,
                        "quantity": quantity,
                        "total": quantity * price
                    };
                orders.push(cartItem);
               
                if(!error && menu){
                    _data.create('user_shopping_cart', phone, orders, function(error){
                        if(!error) {
                            _data.read('user_shopping_cart', phone, function(error, data){
                                if( !error && data){
                                    callback(200, data);
                                } else {
                                    callback(500, { 'Error': 'Internal server error. Could not read your cart' });
                                }
                            });
                        } else {
                            callback(400 , {'Error':'Sorry, There was a problem adding your item to the cart'});
                        }
                    });

                } else {
                    callback(400 , {'Error':'Could not get the menu'});
                }
            
            });

        } else {
            callback(403, {'Error': 'Missing required token in header, or token is invalid'});
        }
    });
  }
};

// CART - GET
// REQUIRED DATA - PHONE, TOKEN
// OPTIONAL DATA - NONE

handlers._cart.get = function(data, callback) {
    var phone = typeof (data.payload.phone) === 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false;

    var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

    if(phone) {
        handlers._tokens.verifyToken(token, phone, function(tokenIsValid){

            if(tokenIsValid){
                _data.read('user_shopping_cart', phone, function(error, data){
                    if( !error && data){
                        callback(200, data);
                    } else {
                        callback(500, { 'Error': 'Internal server error. Could not find your cart or your cart does not exist' });
                    }
                });
            }else {
                callback(403, {'Error': 'Missing required token in header, or token is invalid'});
            }
        });
    }  else {
        callback(403, {'Error': 'Missing required fields'});
    }
}

// CART - PUT
// REQUIRED DATA - PHONE, TOKEN, PIZZA INDEX and QUANTITY
// OPTIONAL DATA - NONE

handlers._cart.put = function(data, callback){

};


// EXPORTING THE MODULE
module.exports = handlers;