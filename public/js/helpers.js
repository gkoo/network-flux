/**
 * getData
 * =======
 * Takes result from LinkedIn API and returns data values if there are any to
 * return.
 */
var getData, extend, output;

getData = function(data) {
  if (data && data.values && data.values.length) {
    return data.values;
  }
  return null;
};

// Adds properties of obj2 to obj1 and returns obj1.
if (typeof extend === 'undefined') {
  extend = function(obj1, obj2) {
    for (prop in obj2) {
      if (obj2.hasOwnProperty(prop)) {
        obj1[prop] = obj2[prop];
      }
    }
    return obj1;
  }
}

// debug
output = function(str) {
  $('#output').append($('<p>').text(str));
};

if (Array && Array.prototype && typeof Array.prototype.forEach === 'undefined') {
  Array.prototype.forEach = function(fn) {
    var i, len;
    for (i = 0, len < this.length; i < len; ++i) {
      fn(this[i]);
    }
  }
}

if (Object && typeof Object.keys === 'undefined') {
  Object.keys = function(o) {
    var i = 0;
    for (key in o) {
      if (o.hasOwnProperty(key)) {
        ++i;
      }
    }
  };
}

// Thanks, MDN!
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Function/bind#Compatibility
if (Function && Function.prototype && !Function.prototype.bind) {
  Function.prototype.bind = function (oThis) {
    if (typeof this !== "function") {
      // closest thing possible to the ECMAScript 5 internal IsCallable function
      throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
    }

    var aArgs = Array.prototype.slice.call(arguments, 1), 
        fToBind = this, 
        fNOP = function () {},
        fBound = function () {
          return fToBind.apply(this instanceof fNOP
                                 ? this
                                 : oThis || window,
                               aArgs.concat(Array.prototype.slice.call(arguments)));
        };

    fNOP.prototype = this.prototype;
    fBound.prototype = new fNOP();

    return fBound;
  };
}

