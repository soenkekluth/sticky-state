(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.StickyState = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var assign = require('object-assign');
var FastScroll = require('fastscroll');

var _globals = {
  featureTested: false
};

var defaults = {
  disabled: false,
  className: 'sticky',
  useAnimationFrame: false,
  stateClassName: 'is-sticky'
};

function getSrollPosition() {
  return (window.scrollY || window.pageYOffset || 0);
}

function getAbsolutBoundingRect(el) {
  var rect = el.getBoundingClientRect();
  var top = rect.top + getSrollPosition();
  return {
    top: top,
    bottom: top + rect.height,
    height: rect.height,
    width: rect.width
  };
}

function addBounds(rect1, rect2) {
  var rect = assign({}, rect1);
  rect.top -= rect2.top;
  rect.bottom = rect.top + rect1.height;
  return rect;
}

function getPreviousElementSibling(el) {
  var prev = el.previousElementSibling;
  if (prev && prev.tagName.toLocaleLowerCase() === 'script') {
    prev = getPreviousElementSibling(prev);
  }
  return prev;
}


var StickyState = function(element, options) {
  if (!element) {
    throw new Error('StickyState needs a DomElement');
  }

  this.el = element;
  this.options = assign({}, defaults, options);

  this.state = {
    sticky: false,
    fixedOffset:{
      top: 0,
      bottom: 0
    },
    bounds: {
      top: null,
      bottom: null,
      height: null,
      width: null
    },
    restrict: null,
    style: {
      top: null,
      bottom: null
    }
  };

  this.child = this.el;
  this.scrollTarget = StickyState.native() ? (window.getComputedStyle(this.el.parentNode).overflow !== 'auto' ? window :  this.el.parentNode) : window;
  this.hasOwnScrollTarget = this.scrollTarget !== window;
  this.firstRender = true;
  this.hasFeature = null;
  this.scrollHandler = null;
  this.resizeHandler = null;
  this.fastScroll = null;
  this.wrapper = null;

  this.updateDom = this.updateDom.bind(this);
  this.render = (this.state.useAnimationFrame && window && window.requestAnimationFrame) ? this.renderOnAnimationFrame.bind(this) : this.updateDom;

  this.addSrollHandler();
  this.addResizeHandler();
  this.render();
};

StickyState.prototype.updateState = function(values, silent) {
  silent = silent === true;
  this.state = assign({}, this.state, values);
  if (!silent) {
    this.render();
  }
};

StickyState.prototype.getPositionStyle = function() {

  var obj = {
    top: null,
    bottom: null
  };

  for (var key in obj) {
    var value = parseInt(window.getComputedStyle(this.el)[key]);
    value = isNaN(value) ? null : value;
    obj[key] = value;
  }

  return obj;
};

StickyState.prototype.updateBounds = function(silent) {
  silent = silent === true;

  var style = this.getPositionStyle();
  var rect;
  var restrict;

  if (!this.canSticky()) {
    rect = getAbsolutBoundingRect(this.child);
    if (this.hasOwnScrollTarget) {
      var parentRect = getAbsolutBoundingRect(this.scrollTarget);
      this.state.fixedOffset.top = parentRect.top;
      this.state.fixedOffset.bottom = parentRect.bottom;
      rect = addBounds(rect, parentRect);
      restrict = rect;//getAbsolutBoundingRect(this.child.parentNode);
    }
  }else {
    var elem = getPreviousElementSibling(this.child);
    var offset = 0;

    if (elem) {
      offset = parseInt(window.getComputedStyle(elem)['margin-bottom']);
      offset = offset || 0;
      rect = getAbsolutBoundingRect(elem);
      if (this.hasOwnScrollTarget) {
        rect = addBounds(rect, getAbsolutBoundingRect(this.scrollTarget));
      }

      rect.top  = rect.bottom + offset;

    }else {
      elem = this.child.parentNode;
      offset = parseInt(window.getComputedStyle(elem)['padding-top']);
      offset = offset || 0;
      rect = getAbsolutBoundingRect(elem);
      if (this.hasOwnScrollTarget) {
        rect = addBounds(rect, getAbsolutBoundingRect(this.scrollTarget));
      }
      rect.top =  rect.top +  offset;
    }

    rect.height = this.child.clientHeight;
    rect.width = this.child.clientWidth;
    rect.bottom = rect.top + rect.height;
  }

  restrict = restrict || getAbsolutBoundingRect(this.child.parentNode);

  this.updateState({
    style: style,
    bounds: rect,
    restrict:restrict
  }, silent);
};

StickyState.prototype.canSticky = function() {
  if (this.hasFeature !== null) {
    return this.hasFeature;
  }
  return this.hasFeature = window.getComputedStyle(this.el).position.match('sticky');
};

StickyState.prototype.addSrollHandler = function() {
  if (!this.scrollHandler) {
    this.fastScroll = new FastScroll(this.scrollTarget);
    this.scrollHandler = this.updateStickyState.bind(this);
    this.fastScroll.on('scroll:start', this.scrollHandler);
    this.fastScroll.on('scroll:progress', this.scrollHandler);
    this.fastScroll.on('scroll:stop', this.scrollHandler);
  }
};

StickyState.prototype.removeSrollHandler = function() {
  if (this.fastScroll) {
    this.fastScroll.off('scroll:start', this.scrollHandler);
    this.fastScroll.off('scroll:progress', this.scrollHandler);
    this.fastScroll.off('scroll:stop', this.scrollHandler);
    this.fastScroll.destroy();
    this.scrollHandler = null;
    this.fastScroll = null;
  }
};

StickyState.prototype.addResizeHandler = function() {
  if (!this.resizeHandler) {
    this.resizeHandler = this.onResize.bind(this);
    window.addEventListener('resize', this.resizeHandler, false);
    window.addEventListener('orientationchange', this.resizeHandler, false);
  }
};

StickyState.prototype.removeResizeHandler = function() {
  if (this.resizeHandler) {
    window.removeEventListener('resize', this.resizeHandler);
    window.removeEventListener('orientationchange', this.resizeHandler);
    this.resizeHandler = null;
  }
};

StickyState.prototype.onResize = function(e) {
  this.updateBounds(true);
  this.updateStickyState(false);
};

StickyState.prototype.updateStickyState = function(silent) {

  var child = this.child;

  silent = silent === true;
  var scrollY = this.fastScroll.scrollY;

  var top = this.state.style.top;
  var offsetBottom;


  if (top !== null) {
    offsetBottom = this.state.restrict.bottom - this.state.bounds.height - top;
    top = this.state.bounds.top - top;

    if (this.state.sticky === false && scrollY >= top && scrollY <= offsetBottom) {
      this.updateState({
        sticky: true
      }, silent);
    } else if (this.state.sticky && (scrollY < top || scrollY > offsetBottom)) {
      this.updateState({
        sticky: false
      }, silent);
    }

    return;
  }

  scrollY += window.innerHeight;
  var bottom = this.state.style.bottom;
  if (bottom !== null) {
    offsetBottom = this.state.restrict.top + this.state.bounds.height - bottom;
    bottom = this.state.bounds.bottom + bottom;

    if (this.state.sticky === false && scrollY <= bottom && scrollY >= offsetBottom) {
      this.updateState({
        sticky: true
      }, silent);
    } else if (this.state.sticky && (scrollY > bottom || scrollY < offsetBottom)) {
      this.updateState({
        sticky: false
      }, silent);
    }
  }

};

StickyState.prototype.renderOnAnimationFrame = function() {
  window.requestAnimationFrame(this.updateDom);
};

StickyState.prototype.updateDom = function() {

  if (this.firstRender) {
    this.firstRender = false;

    if (!this.canSticky()) {
      this.wrapper = document.createElement('div');
      this.wrapper.className = 'sticky-wrap';
      var parent = this.el.parentNode;
      if (parent) {
        parent.insertBefore(this.wrapper, this.el);
      }
      this.wrapper.appendChild(this.el);
      this.el.className += ' sticky-fixed';
      this.child = this.wrapper;
    }

    this.updateBounds(true);
    this.updateStickyState(true);
  }

  if (!this.canSticky()) {
    var height = this.state.bounds.height;
    height = (!this.state.sticky || height === null) ? 'auto' : height + 'px';

    // if(this.state.sticky && this.state.fixedOffset.top !== 0){
    //   this.el.style.marginTop = this.state.fixedOffset.top+'px';
    // }

    this.wrapper.style.height = height;
  }

  var className = this.el.className;
  var hasStateClass = className.indexOf(this.options.stateClassName) > -1;
  if (this.state.sticky && !hasStateClass) {
    className = className + ' ' + this.options.stateClassName;
  } else if (!this.state.sticky && hasStateClass) {
    className = className.split(this.options.stateClassName).join('');
  }

  if (this.el.className !== className) {
    this.el.className = className;
  }

  return this.el;
};


StickyState.native = function() {
  if (_globals.featureTested) {
    return _globals.canSticky;
  }
  if (typeof window !== 'undefined') {
    var testEl = document.createElement('div');
    document.documentElement.appendChild(testEl);
    var prefixedSticky = ['sticky', '-webkit-sticky', '-moz-sticky', '-ms-sticky', '-o-sticky'];

    _globals.canSticky = false;

    for(var i = 0; i < prefixedSticky.length; i++) {
      testEl.style.position = prefixedSticky[i];
      _globals.canSticky = !!window.getComputedStyle(testEl).position.match('sticky');
      if(_globals.canSticky){
        break;
      }
    }
    _globals.featureTested = true;
    document.documentElement.removeChild(testEl);
  }
  return _globals.canSticky;
};

StickyState.apply = function(elements) {
  if (elements) {
    if (elements.length) {
      for (var i = 0; i < elements.length; i++) {
        new StickyState(elements[i]);
      }
    } else {
      new StickyState(elements);
    }
  }
};

module.exports = StickyState;

},{"fastscroll":4,"object-assign":5}],2:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Sönke Kluth
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 **/

(function(exports) {

    'use strict';

    var delegate = function(target, handler) {
        // Get any extra arguments for handler
        var args = [].slice.call(arguments, 2);

        // Create delegate function
        var fn = function() {

            // Call handler with arguments
            return handler.apply(target, args);
        };

        // Return the delegate function.
        return fn;
    };


    (typeof module != "undefined" && module.exports) ? (module.exports = delegate) : (typeof define != "undefined" ? (define(function() {
        return delegate;
    })) : (exports.delegate = delegate));

})(this);

},{}],3:[function(require,module,exports){
'use strict';

//IE8
if (!Array.prototype.indexOf) {
  Array.prototype.indexOf = function(obj, start) {
    for (var i = (start || 0), j = this.length; i < j; i++) {
      if (this[i] === obj) {
        return i;
      }
    }
    return -1;
  };
}

var EventDispatcher = function() {
  this._eventMap = {};
  this._destroyed = false;
};

EventDispatcher.prototype = {

  addListener: function(event, listener) {

    this.getListener(event) || (this._eventMap[event] = []);

    if (this.getListener(event).indexOf(listener) == -1) {
      this._eventMap[event].push(listener);
    }

    return this;
  },

  addListenerOnce: function(event, listener) {
    var s = this;
    var f2 = function() {
      s.removeListener(event, f2);
      return listener.apply(this, arguments);
    };
    return this.addListener(event, f2);
  },

  removeListener: function(event, listener) {

    var listeners = this.getListener(event);
    if (listeners) {
      var i = listeners.indexOf(listener);
      if (i > -1) {
        this._eventMap[event] = listeners.splice(i, 1);
        if (listeners.length === 0) {
          delete(this._eventMap[event]);
        }
      }
    }

    return this;
  },

  removeAllListener: function(event) {

    var listeners = this.getListener(event);
    if (listeners) {
      this._eventMap[event].length = 0;
      delete(this._eventMap[event]);
    }
    return this;
  },

  dispatch: function(eventType, eventObject) {

    var listeners = this.getListener(eventType);

    if (listeners) {

      //var args = Array.prototype.slice.call(arguments, 1);
      eventObject = (eventObject) ? eventObject : {};
      eventObject.type = eventType;
      eventObject.target = eventObject.target || this;
      var i = -1;
      while (++i < listeners.length) {

        //args ? listeners[i].apply(null, args) : listeners[i]();
        listeners[i].call(null, eventObject);
      }
    } else {
      // console.info('Nobody is listening to ' + event);
    }

    return this;
  },

  getListener: function(event) {
    if (this._destroyed) {
      throw new Error('I am destroyed');
    }
    return this._eventMap[event];
  },

  destroy: function() {
    if (this._eventMap) {
      for (var i in this._eventMap) {
        this.removeAllListener(i);
      }
      //TODO leave an empty object is better then throwing an error when using a fn after destroy?
      this._eventMap = null;
    }
    this._destroyed = true;
  }
};

//Method Map
EventDispatcher.prototype.on = EventDispatcher.prototype.bind = EventDispatcher.prototype.addEventListener = EventDispatcher.prototype.addListener;
EventDispatcher.prototype.off = EventDispatcher.prototype.unbind = EventDispatcher.prototype.removeEventListener = EventDispatcher.prototype.removeListener;
EventDispatcher.prototype.once = EventDispatcher.prototype.one = EventDispatcher.prototype.addListenerOnce;
EventDispatcher.prototype.trigger = EventDispatcher.prototype.dispatchEvent = EventDispatcher.prototype.dispatch;

module.exports = EventDispatcher;

},{}],4:[function(require,module,exports){
'use strict';

/*
 * FastScroll
 * https://github.com/soenkekluth/fastscroll
 *
 * Copyright (c) 2014 Sönke Kluth
 * Licensed under the MIT license.
 */

var delegate = require('delegatejs');
var EventDispatcher = require('./eventdispatcher');

var _instanceMap = {};


var FastScroll = function(scrollTarget) {
  scrollTarget = scrollTarget || window;
  if (_instanceMap[scrollTarget]) {
    return _instanceMap[scrollTarget].instance;
  } else {
    _instanceMap[scrollTarget] = {
      instance: this,
      listenerCount: 0
    }
  }

  this.element = scrollTarget;
  this.init();
  return this;
};

FastScroll.UP = 'up';
FastScroll.DOWN = 'down';
FastScroll.NONE = 'none';
FastScroll.LEFT = 'left';
FastScroll.RIGHT = 'right';

FastScroll.prototype = {

  destroyed: false,
  scrolling: false,
  scrollY: 0,
  scrollX: 0,
  lastScrollY: 0,
  lastScrollX: 0,
  speedY: 0,
  speedX: 0,
  stopFrames: 5,
  currentStopFrames: 0,
  firstRender: true,

  _hasRequestedAnimationFrame: false,

  init: function() {
    this.dispatcher = new EventDispatcher();
    this.updateScrollPosition = (this.element === window) ? delegate(this, this.updateWindowScrollPosition) : delegate(this, this.updateElementScrollPosition);
    this.onScrollDelegate = delegate(this, this.onScroll);
    this.onAnimationFrameDelegate = delegate(this, this.onAnimationFrame);
    this.element.addEventListener('scroll', this.onScrollDelegate, false);
  },

  destroy: function() {
    if(_instanceMap[this.element].listenerCount <= 0 && !this.destroyed){
      delete(_instanceMap[this.element]);
      this.element.removeEventListener('scroll', this.onScrollDelegate);
      this.dispatcher.off();
      this.dispatcher = null;
      this.onScrollDelegate = null;
      this.updateScrollPosition = null;
      this.onAnimationFrameDelegate = null;
      this.element = null;
      this.destroyed = true;
    }
  },

  getAttributes: function() {
    return {
      scrollX: this.scrollX,
      scrollY: this.scrollY,
      speedY: this.speedY,
      speedX: this.speedX,
      angle: 0,
      speedY: this.speedY === 0 ? FastScroll.NONE : ((this.speedY > 0) ? FastScroll.UP : FastScroll.DOWN),
      speedX: this.speedX === 0 ? FastScroll.NONE : ((this.speedX > 0) ? FastScroll.RIGHT : FastScroll.LEFT)
    };
  },

  updateWindowScrollPosition: function() {
    this.scrollY = this.element.scrollY || this.element.pageYOffset || 0;
    this.scrollX = this.element.scrollX || this.element.pageXOffset || 0;
  },

  updateElementScrollPosition: function() {
    this.scrollY = this.element.scrollTop;
    this.scrollX = this.element.scrollLeft;
  },

  onScroll: function() {
    this.updateScrollPosition();
    this.currentStopFrames = 0;
    this.scrolling = true;

    if (this.firstRender) {
      if (this.scrollY > 1) {
        this.currentStopFrames = this.stopFrames - 1;
      }
      this.firstRender = false;
    }

    if (!this._hasRequestedAnimationFrame) {
      this._hasRequestedAnimationFrame = true;
      this.dispatchEvent('scroll:start');
      requestAnimationFrame(this.onAnimationFrameDelegate);
    }
  },

  onAnimationFrame: function() {
    if (this.destroyed) {
      return;
    }

    this.updateScrollPosition();

    this.speedY = this.lastScrollY - this.scrollY;
    this.speedX = this.lastScrollX - this.scrollX;

    this.lastScrollY = this.scrollY;
    this.lastScrollX = this.scrollX;

    if (this.speedY === 0 && this.scrolling && (this.currentStopFrames++ > this.stopFrames)) {
      this.onScrollStop();
      return;
    }

    this.dispatchEvent('scroll:progress');
    requestAnimationFrame(this.onAnimationFrameDelegate);
  },

  onScrollStop: function() {
    this.scrolling = false;
    this._hasRequestedAnimationFrame = false;
    this.currentStopFrames = 0;
    this.dispatchEvent('scroll:stop');
  },

  dispatchEvent: function(type, eventObject) {
    eventObject = eventObject || this.getAttributes();
    eventObject.fastScroll = this;
    eventObject.target = this.element;
    this.dispatcher.dispatch(type, eventObject);
  },

  on: function(event, listener) {
    if (this.dispatcher.on(event, listener)) {
      _instanceMap[this.element].listenerCount += 1;
      return true;
    }
    return false;
  },

  off: function(event, listener) {
    if(this.dispatcher.off(event, listener)){
      _instanceMap[this.element].listenerCount -= 1;
      return true;
    }
    return false;
  }
};

FastScroll.___instanceMap = _instanceMap;

module.exports = FastScroll;

},{"./eventdispatcher":3,"delegatejs":2}],5:[function(require,module,exports){
/* eslint-disable no-unused-vars */
'use strict';
var hasOwnProperty = Object.prototype.hasOwnProperty;
var propIsEnumerable = Object.prototype.propertyIsEnumerable;

function toObject(val) {
	if (val === null || val === undefined) {
		throw new TypeError('Object.assign cannot be called with null or undefined');
	}

	return Object(val);
}

module.exports = Object.assign || function (target, source) {
	var from;
	var to = toObject(target);
	var symbols;

	for (var s = 1; s < arguments.length; s++) {
		from = Object(arguments[s]);

		for (var key in from) {
			if (hasOwnProperty.call(from, key)) {
				to[key] = from[key];
			}
		}

		if (Object.getOwnPropertySymbols) {
			symbols = Object.getOwnPropertySymbols(from);
			for (var i = 0; i < symbols.length; i++) {
				if (propIsEnumerable.call(from, symbols[i])) {
					to[symbols[i]] = from[symbols[i]];
				}
			}
		}
	}

	return to;
};

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9kZWxlZ2F0ZWpzL2RlbGVnYXRlLmpzIiwibm9kZV9tb2R1bGVzL2Zhc3RzY3JvbGwvc3JjL2V2ZW50ZGlzcGF0Y2hlci5qcyIsIm5vZGVfbW9kdWxlcy9mYXN0c2Nyb2xsL3NyYy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9vYmplY3QtYXNzaWduL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbFdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIGFzc2lnbiA9IHJlcXVpcmUoJ29iamVjdC1hc3NpZ24nKTtcbnZhciBGYXN0U2Nyb2xsID0gcmVxdWlyZSgnZmFzdHNjcm9sbCcpO1xuXG52YXIgX2dsb2JhbHMgPSB7XG4gIGZlYXR1cmVUZXN0ZWQ6IGZhbHNlXG59O1xuXG52YXIgZGVmYXVsdHMgPSB7XG4gIGRpc2FibGVkOiBmYWxzZSxcbiAgY2xhc3NOYW1lOiAnc3RpY2t5JyxcbiAgdXNlQW5pbWF0aW9uRnJhbWU6IGZhbHNlLFxuICBzdGF0ZUNsYXNzTmFtZTogJ2lzLXN0aWNreSdcbn07XG5cbmZ1bmN0aW9uIGdldFNyb2xsUG9zaXRpb24oKSB7XG4gIHJldHVybiAod2luZG93LnNjcm9sbFkgfHwgd2luZG93LnBhZ2VZT2Zmc2V0IHx8IDApO1xufVxuXG5mdW5jdGlvbiBnZXRBYnNvbHV0Qm91bmRpbmdSZWN0KGVsKSB7XG4gIHZhciByZWN0ID0gZWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gIHZhciB0b3AgPSByZWN0LnRvcCArIGdldFNyb2xsUG9zaXRpb24oKTtcbiAgcmV0dXJuIHtcbiAgICB0b3A6IHRvcCxcbiAgICBib3R0b206IHRvcCArIHJlY3QuaGVpZ2h0LFxuICAgIGhlaWdodDogcmVjdC5oZWlnaHQsXG4gICAgd2lkdGg6IHJlY3Qud2lkdGhcbiAgfTtcbn1cblxuZnVuY3Rpb24gYWRkQm91bmRzKHJlY3QxLCByZWN0Mikge1xuICB2YXIgcmVjdCA9IGFzc2lnbih7fSwgcmVjdDEpO1xuICByZWN0LnRvcCAtPSByZWN0Mi50b3A7XG4gIHJlY3QuYm90dG9tID0gcmVjdC50b3AgKyByZWN0MS5oZWlnaHQ7XG4gIHJldHVybiByZWN0O1xufVxuXG5mdW5jdGlvbiBnZXRQcmV2aW91c0VsZW1lbnRTaWJsaW5nKGVsKSB7XG4gIHZhciBwcmV2ID0gZWwucHJldmlvdXNFbGVtZW50U2libGluZztcbiAgaWYgKHByZXYgJiYgcHJldi50YWdOYW1lLnRvTG9jYWxlTG93ZXJDYXNlKCkgPT09ICdzY3JpcHQnKSB7XG4gICAgcHJldiA9IGdldFByZXZpb3VzRWxlbWVudFNpYmxpbmcocHJldik7XG4gIH1cbiAgcmV0dXJuIHByZXY7XG59XG5cblxudmFyIFN0aWNreVN0YXRlID0gZnVuY3Rpb24oZWxlbWVudCwgb3B0aW9ucykge1xuICBpZiAoIWVsZW1lbnQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1N0aWNreVN0YXRlIG5lZWRzIGEgRG9tRWxlbWVudCcpO1xuICB9XG5cbiAgdGhpcy5lbCA9IGVsZW1lbnQ7XG4gIHRoaXMub3B0aW9ucyA9IGFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpO1xuXG4gIHRoaXMuc3RhdGUgPSB7XG4gICAgc3RpY2t5OiBmYWxzZSxcbiAgICBmaXhlZE9mZnNldDp7XG4gICAgICB0b3A6IDAsXG4gICAgICBib3R0b206IDBcbiAgICB9LFxuICAgIGJvdW5kczoge1xuICAgICAgdG9wOiBudWxsLFxuICAgICAgYm90dG9tOiBudWxsLFxuICAgICAgaGVpZ2h0OiBudWxsLFxuICAgICAgd2lkdGg6IG51bGxcbiAgICB9LFxuICAgIHJlc3RyaWN0OiBudWxsLFxuICAgIHN0eWxlOiB7XG4gICAgICB0b3A6IG51bGwsXG4gICAgICBib3R0b206IG51bGxcbiAgICB9XG4gIH07XG5cbiAgdGhpcy5jaGlsZCA9IHRoaXMuZWw7XG4gIHRoaXMuc2Nyb2xsVGFyZ2V0ID0gU3RpY2t5U3RhdGUubmF0aXZlKCkgPyAod2luZG93LmdldENvbXB1dGVkU3R5bGUodGhpcy5lbC5wYXJlbnROb2RlKS5vdmVyZmxvdyAhPT0gJ2F1dG8nID8gd2luZG93IDogIHRoaXMuZWwucGFyZW50Tm9kZSkgOiB3aW5kb3c7XG4gIHRoaXMuaGFzT3duU2Nyb2xsVGFyZ2V0ID0gdGhpcy5zY3JvbGxUYXJnZXQgIT09IHdpbmRvdztcbiAgdGhpcy5maXJzdFJlbmRlciA9IHRydWU7XG4gIHRoaXMuaGFzRmVhdHVyZSA9IG51bGw7XG4gIHRoaXMuc2Nyb2xsSGFuZGxlciA9IG51bGw7XG4gIHRoaXMucmVzaXplSGFuZGxlciA9IG51bGw7XG4gIHRoaXMuZmFzdFNjcm9sbCA9IG51bGw7XG4gIHRoaXMud3JhcHBlciA9IG51bGw7XG5cbiAgdGhpcy51cGRhdGVEb20gPSB0aGlzLnVwZGF0ZURvbS5iaW5kKHRoaXMpO1xuICB0aGlzLnJlbmRlciA9ICh0aGlzLnN0YXRlLnVzZUFuaW1hdGlvbkZyYW1lICYmIHdpbmRvdyAmJiB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKSA/IHRoaXMucmVuZGVyT25BbmltYXRpb25GcmFtZS5iaW5kKHRoaXMpIDogdGhpcy51cGRhdGVEb207XG5cbiAgdGhpcy5hZGRTcm9sbEhhbmRsZXIoKTtcbiAgdGhpcy5hZGRSZXNpemVIYW5kbGVyKCk7XG4gIHRoaXMucmVuZGVyKCk7XG59O1xuXG5TdGlja3lTdGF0ZS5wcm90b3R5cGUudXBkYXRlU3RhdGUgPSBmdW5jdGlvbih2YWx1ZXMsIHNpbGVudCkge1xuICBzaWxlbnQgPSBzaWxlbnQgPT09IHRydWU7XG4gIHRoaXMuc3RhdGUgPSBhc3NpZ24oe30sIHRoaXMuc3RhdGUsIHZhbHVlcyk7XG4gIGlmICghc2lsZW50KSB7XG4gICAgdGhpcy5yZW5kZXIoKTtcbiAgfVxufTtcblxuU3RpY2t5U3RhdGUucHJvdG90eXBlLmdldFBvc2l0aW9uU3R5bGUgPSBmdW5jdGlvbigpIHtcblxuICB2YXIgb2JqID0ge1xuICAgIHRvcDogbnVsbCxcbiAgICBib3R0b206IG51bGxcbiAgfTtcblxuICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgdmFyIHZhbHVlID0gcGFyc2VJbnQod2luZG93LmdldENvbXB1dGVkU3R5bGUodGhpcy5lbClba2V5XSk7XG4gICAgdmFsdWUgPSBpc05hTih2YWx1ZSkgPyBudWxsIDogdmFsdWU7XG4gICAgb2JqW2tleV0gPSB2YWx1ZTtcbiAgfVxuXG4gIHJldHVybiBvYmo7XG59O1xuXG5TdGlja3lTdGF0ZS5wcm90b3R5cGUudXBkYXRlQm91bmRzID0gZnVuY3Rpb24oc2lsZW50KSB7XG4gIHNpbGVudCA9IHNpbGVudCA9PT0gdHJ1ZTtcblxuICB2YXIgc3R5bGUgPSB0aGlzLmdldFBvc2l0aW9uU3R5bGUoKTtcbiAgdmFyIHJlY3Q7XG4gIHZhciByZXN0cmljdDtcblxuICBpZiAoIXRoaXMuY2FuU3RpY2t5KCkpIHtcbiAgICByZWN0ID0gZ2V0QWJzb2x1dEJvdW5kaW5nUmVjdCh0aGlzLmNoaWxkKTtcbiAgICBpZiAodGhpcy5oYXNPd25TY3JvbGxUYXJnZXQpIHtcbiAgICAgIHZhciBwYXJlbnRSZWN0ID0gZ2V0QWJzb2x1dEJvdW5kaW5nUmVjdCh0aGlzLnNjcm9sbFRhcmdldCk7XG4gICAgICB0aGlzLnN0YXRlLmZpeGVkT2Zmc2V0LnRvcCA9IHBhcmVudFJlY3QudG9wO1xuICAgICAgdGhpcy5zdGF0ZS5maXhlZE9mZnNldC5ib3R0b20gPSBwYXJlbnRSZWN0LmJvdHRvbTtcbiAgICAgIHJlY3QgPSBhZGRCb3VuZHMocmVjdCwgcGFyZW50UmVjdCk7XG4gICAgICByZXN0cmljdCA9IHJlY3Q7Ly9nZXRBYnNvbHV0Qm91bmRpbmdSZWN0KHRoaXMuY2hpbGQucGFyZW50Tm9kZSk7XG4gICAgfVxuICB9ZWxzZSB7XG4gICAgdmFyIGVsZW0gPSBnZXRQcmV2aW91c0VsZW1lbnRTaWJsaW5nKHRoaXMuY2hpbGQpO1xuICAgIHZhciBvZmZzZXQgPSAwO1xuXG4gICAgaWYgKGVsZW0pIHtcbiAgICAgIG9mZnNldCA9IHBhcnNlSW50KHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKGVsZW0pWydtYXJnaW4tYm90dG9tJ10pO1xuICAgICAgb2Zmc2V0ID0gb2Zmc2V0IHx8IDA7XG4gICAgICByZWN0ID0gZ2V0QWJzb2x1dEJvdW5kaW5nUmVjdChlbGVtKTtcbiAgICAgIGlmICh0aGlzLmhhc093blNjcm9sbFRhcmdldCkge1xuICAgICAgICByZWN0ID0gYWRkQm91bmRzKHJlY3QsIGdldEFic29sdXRCb3VuZGluZ1JlY3QodGhpcy5zY3JvbGxUYXJnZXQpKTtcbiAgICAgIH1cblxuICAgICAgcmVjdC50b3AgID0gcmVjdC5ib3R0b20gKyBvZmZzZXQ7XG5cbiAgICB9ZWxzZSB7XG4gICAgICBlbGVtID0gdGhpcy5jaGlsZC5wYXJlbnROb2RlO1xuICAgICAgb2Zmc2V0ID0gcGFyc2VJbnQod2luZG93LmdldENvbXB1dGVkU3R5bGUoZWxlbSlbJ3BhZGRpbmctdG9wJ10pO1xuICAgICAgb2Zmc2V0ID0gb2Zmc2V0IHx8IDA7XG4gICAgICByZWN0ID0gZ2V0QWJzb2x1dEJvdW5kaW5nUmVjdChlbGVtKTtcbiAgICAgIGlmICh0aGlzLmhhc093blNjcm9sbFRhcmdldCkge1xuICAgICAgICByZWN0ID0gYWRkQm91bmRzKHJlY3QsIGdldEFic29sdXRCb3VuZGluZ1JlY3QodGhpcy5zY3JvbGxUYXJnZXQpKTtcbiAgICAgIH1cbiAgICAgIHJlY3QudG9wID0gIHJlY3QudG9wICsgIG9mZnNldDtcbiAgICB9XG5cbiAgICByZWN0LmhlaWdodCA9IHRoaXMuY2hpbGQuY2xpZW50SGVpZ2h0O1xuICAgIHJlY3Qud2lkdGggPSB0aGlzLmNoaWxkLmNsaWVudFdpZHRoO1xuICAgIHJlY3QuYm90dG9tID0gcmVjdC50b3AgKyByZWN0LmhlaWdodDtcbiAgfVxuXG4gIHJlc3RyaWN0ID0gcmVzdHJpY3QgfHwgZ2V0QWJzb2x1dEJvdW5kaW5nUmVjdCh0aGlzLmNoaWxkLnBhcmVudE5vZGUpO1xuXG4gIHRoaXMudXBkYXRlU3RhdGUoe1xuICAgIHN0eWxlOiBzdHlsZSxcbiAgICBib3VuZHM6IHJlY3QsXG4gICAgcmVzdHJpY3Q6cmVzdHJpY3RcbiAgfSwgc2lsZW50KTtcbn07XG5cblN0aWNreVN0YXRlLnByb3RvdHlwZS5jYW5TdGlja3kgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuaGFzRmVhdHVyZSAhPT0gbnVsbCkge1xuICAgIHJldHVybiB0aGlzLmhhc0ZlYXR1cmU7XG4gIH1cbiAgcmV0dXJuIHRoaXMuaGFzRmVhdHVyZSA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKHRoaXMuZWwpLnBvc2l0aW9uLm1hdGNoKCdzdGlja3knKTtcbn07XG5cblN0aWNreVN0YXRlLnByb3RvdHlwZS5hZGRTcm9sbEhhbmRsZXIgPSBmdW5jdGlvbigpIHtcbiAgaWYgKCF0aGlzLnNjcm9sbEhhbmRsZXIpIHtcbiAgICB0aGlzLmZhc3RTY3JvbGwgPSBuZXcgRmFzdFNjcm9sbCh0aGlzLnNjcm9sbFRhcmdldCk7XG4gICAgdGhpcy5zY3JvbGxIYW5kbGVyID0gdGhpcy51cGRhdGVTdGlja3lTdGF0ZS5iaW5kKHRoaXMpO1xuICAgIHRoaXMuZmFzdFNjcm9sbC5vbignc2Nyb2xsOnN0YXJ0JywgdGhpcy5zY3JvbGxIYW5kbGVyKTtcbiAgICB0aGlzLmZhc3RTY3JvbGwub24oJ3Njcm9sbDpwcm9ncmVzcycsIHRoaXMuc2Nyb2xsSGFuZGxlcik7XG4gICAgdGhpcy5mYXN0U2Nyb2xsLm9uKCdzY3JvbGw6c3RvcCcsIHRoaXMuc2Nyb2xsSGFuZGxlcik7XG4gIH1cbn07XG5cblN0aWNreVN0YXRlLnByb3RvdHlwZS5yZW1vdmVTcm9sbEhhbmRsZXIgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuZmFzdFNjcm9sbCkge1xuICAgIHRoaXMuZmFzdFNjcm9sbC5vZmYoJ3Njcm9sbDpzdGFydCcsIHRoaXMuc2Nyb2xsSGFuZGxlcik7XG4gICAgdGhpcy5mYXN0U2Nyb2xsLm9mZignc2Nyb2xsOnByb2dyZXNzJywgdGhpcy5zY3JvbGxIYW5kbGVyKTtcbiAgICB0aGlzLmZhc3RTY3JvbGwub2ZmKCdzY3JvbGw6c3RvcCcsIHRoaXMuc2Nyb2xsSGFuZGxlcik7XG4gICAgdGhpcy5mYXN0U2Nyb2xsLmRlc3Ryb3koKTtcbiAgICB0aGlzLnNjcm9sbEhhbmRsZXIgPSBudWxsO1xuICAgIHRoaXMuZmFzdFNjcm9sbCA9IG51bGw7XG4gIH1cbn07XG5cblN0aWNreVN0YXRlLnByb3RvdHlwZS5hZGRSZXNpemVIYW5kbGVyID0gZnVuY3Rpb24oKSB7XG4gIGlmICghdGhpcy5yZXNpemVIYW5kbGVyKSB7XG4gICAgdGhpcy5yZXNpemVIYW5kbGVyID0gdGhpcy5vblJlc2l6ZS5iaW5kKHRoaXMpO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCB0aGlzLnJlc2l6ZUhhbmRsZXIsIGZhbHNlKTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignb3JpZW50YXRpb25jaGFuZ2UnLCB0aGlzLnJlc2l6ZUhhbmRsZXIsIGZhbHNlKTtcbiAgfVxufTtcblxuU3RpY2t5U3RhdGUucHJvdG90eXBlLnJlbW92ZVJlc2l6ZUhhbmRsZXIgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMucmVzaXplSGFuZGxlcikge1xuICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdyZXNpemUnLCB0aGlzLnJlc2l6ZUhhbmRsZXIpO1xuICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdvcmllbnRhdGlvbmNoYW5nZScsIHRoaXMucmVzaXplSGFuZGxlcik7XG4gICAgdGhpcy5yZXNpemVIYW5kbGVyID0gbnVsbDtcbiAgfVxufTtcblxuU3RpY2t5U3RhdGUucHJvdG90eXBlLm9uUmVzaXplID0gZnVuY3Rpb24oZSkge1xuICB0aGlzLnVwZGF0ZUJvdW5kcyh0cnVlKTtcbiAgdGhpcy51cGRhdGVTdGlja3lTdGF0ZShmYWxzZSk7XG59O1xuXG5TdGlja3lTdGF0ZS5wcm90b3R5cGUudXBkYXRlU3RpY2t5U3RhdGUgPSBmdW5jdGlvbihzaWxlbnQpIHtcblxuICB2YXIgY2hpbGQgPSB0aGlzLmNoaWxkO1xuXG4gIHNpbGVudCA9IHNpbGVudCA9PT0gdHJ1ZTtcbiAgdmFyIHNjcm9sbFkgPSB0aGlzLmZhc3RTY3JvbGwuc2Nyb2xsWTtcblxuICB2YXIgdG9wID0gdGhpcy5zdGF0ZS5zdHlsZS50b3A7XG4gIHZhciBvZmZzZXRCb3R0b207XG5cblxuICBpZiAodG9wICE9PSBudWxsKSB7XG4gICAgb2Zmc2V0Qm90dG9tID0gdGhpcy5zdGF0ZS5yZXN0cmljdC5ib3R0b20gLSB0aGlzLnN0YXRlLmJvdW5kcy5oZWlnaHQgLSB0b3A7XG4gICAgdG9wID0gdGhpcy5zdGF0ZS5ib3VuZHMudG9wIC0gdG9wO1xuXG4gICAgaWYgKHRoaXMuc3RhdGUuc3RpY2t5ID09PSBmYWxzZSAmJiBzY3JvbGxZID49IHRvcCAmJiBzY3JvbGxZIDw9IG9mZnNldEJvdHRvbSkge1xuICAgICAgdGhpcy51cGRhdGVTdGF0ZSh7XG4gICAgICAgIHN0aWNreTogdHJ1ZVxuICAgICAgfSwgc2lsZW50KTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuc3RhdGUuc3RpY2t5ICYmIChzY3JvbGxZIDwgdG9wIHx8IHNjcm9sbFkgPiBvZmZzZXRCb3R0b20pKSB7XG4gICAgICB0aGlzLnVwZGF0ZVN0YXRlKHtcbiAgICAgICAgc3RpY2t5OiBmYWxzZVxuICAgICAgfSwgc2lsZW50KTtcbiAgICB9XG5cbiAgICByZXR1cm47XG4gIH1cblxuICBzY3JvbGxZICs9IHdpbmRvdy5pbm5lckhlaWdodDtcbiAgdmFyIGJvdHRvbSA9IHRoaXMuc3RhdGUuc3R5bGUuYm90dG9tO1xuICBpZiAoYm90dG9tICE9PSBudWxsKSB7XG4gICAgb2Zmc2V0Qm90dG9tID0gdGhpcy5zdGF0ZS5yZXN0cmljdC50b3AgKyB0aGlzLnN0YXRlLmJvdW5kcy5oZWlnaHQgLSBib3R0b207XG4gICAgYm90dG9tID0gdGhpcy5zdGF0ZS5ib3VuZHMuYm90dG9tICsgYm90dG9tO1xuXG4gICAgaWYgKHRoaXMuc3RhdGUuc3RpY2t5ID09PSBmYWxzZSAmJiBzY3JvbGxZIDw9IGJvdHRvbSAmJiBzY3JvbGxZID49IG9mZnNldEJvdHRvbSkge1xuICAgICAgdGhpcy51cGRhdGVTdGF0ZSh7XG4gICAgICAgIHN0aWNreTogdHJ1ZVxuICAgICAgfSwgc2lsZW50KTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuc3RhdGUuc3RpY2t5ICYmIChzY3JvbGxZID4gYm90dG9tIHx8IHNjcm9sbFkgPCBvZmZzZXRCb3R0b20pKSB7XG4gICAgICB0aGlzLnVwZGF0ZVN0YXRlKHtcbiAgICAgICAgc3RpY2t5OiBmYWxzZVxuICAgICAgfSwgc2lsZW50KTtcbiAgICB9XG4gIH1cblxufTtcblxuU3RpY2t5U3RhdGUucHJvdG90eXBlLnJlbmRlck9uQW5pbWF0aW9uRnJhbWUgPSBmdW5jdGlvbigpIHtcbiAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSh0aGlzLnVwZGF0ZURvbSk7XG59O1xuXG5TdGlja3lTdGF0ZS5wcm90b3R5cGUudXBkYXRlRG9tID0gZnVuY3Rpb24oKSB7XG5cbiAgaWYgKHRoaXMuZmlyc3RSZW5kZXIpIHtcbiAgICB0aGlzLmZpcnN0UmVuZGVyID0gZmFsc2U7XG5cbiAgICBpZiAoIXRoaXMuY2FuU3RpY2t5KCkpIHtcbiAgICAgIHRoaXMud3JhcHBlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgdGhpcy53cmFwcGVyLmNsYXNzTmFtZSA9ICdzdGlja3ktd3JhcCc7XG4gICAgICB2YXIgcGFyZW50ID0gdGhpcy5lbC5wYXJlbnROb2RlO1xuICAgICAgaWYgKHBhcmVudCkge1xuICAgICAgICBwYXJlbnQuaW5zZXJ0QmVmb3JlKHRoaXMud3JhcHBlciwgdGhpcy5lbCk7XG4gICAgICB9XG4gICAgICB0aGlzLndyYXBwZXIuYXBwZW5kQ2hpbGQodGhpcy5lbCk7XG4gICAgICB0aGlzLmVsLmNsYXNzTmFtZSArPSAnIHN0aWNreS1maXhlZCc7XG4gICAgICB0aGlzLmNoaWxkID0gdGhpcy53cmFwcGVyO1xuICAgIH1cblxuICAgIHRoaXMudXBkYXRlQm91bmRzKHRydWUpO1xuICAgIHRoaXMudXBkYXRlU3RpY2t5U3RhdGUodHJ1ZSk7XG4gIH1cblxuICBpZiAoIXRoaXMuY2FuU3RpY2t5KCkpIHtcbiAgICB2YXIgaGVpZ2h0ID0gdGhpcy5zdGF0ZS5ib3VuZHMuaGVpZ2h0O1xuICAgIGhlaWdodCA9ICghdGhpcy5zdGF0ZS5zdGlja3kgfHwgaGVpZ2h0ID09PSBudWxsKSA/ICdhdXRvJyA6IGhlaWdodCArICdweCc7XG5cbiAgICAvLyBpZih0aGlzLnN0YXRlLnN0aWNreSAmJiB0aGlzLnN0YXRlLmZpeGVkT2Zmc2V0LnRvcCAhPT0gMCl7XG4gICAgLy8gICB0aGlzLmVsLnN0eWxlLm1hcmdpblRvcCA9IHRoaXMuc3RhdGUuZml4ZWRPZmZzZXQudG9wKydweCc7XG4gICAgLy8gfVxuXG4gICAgdGhpcy53cmFwcGVyLnN0eWxlLmhlaWdodCA9IGhlaWdodDtcbiAgfVxuXG4gIHZhciBjbGFzc05hbWUgPSB0aGlzLmVsLmNsYXNzTmFtZTtcbiAgdmFyIGhhc1N0YXRlQ2xhc3MgPSBjbGFzc05hbWUuaW5kZXhPZih0aGlzLm9wdGlvbnMuc3RhdGVDbGFzc05hbWUpID4gLTE7XG4gIGlmICh0aGlzLnN0YXRlLnN0aWNreSAmJiAhaGFzU3RhdGVDbGFzcykge1xuICAgIGNsYXNzTmFtZSA9IGNsYXNzTmFtZSArICcgJyArIHRoaXMub3B0aW9ucy5zdGF0ZUNsYXNzTmFtZTtcbiAgfSBlbHNlIGlmICghdGhpcy5zdGF0ZS5zdGlja3kgJiYgaGFzU3RhdGVDbGFzcykge1xuICAgIGNsYXNzTmFtZSA9IGNsYXNzTmFtZS5zcGxpdCh0aGlzLm9wdGlvbnMuc3RhdGVDbGFzc05hbWUpLmpvaW4oJycpO1xuICB9XG5cbiAgaWYgKHRoaXMuZWwuY2xhc3NOYW1lICE9PSBjbGFzc05hbWUpIHtcbiAgICB0aGlzLmVsLmNsYXNzTmFtZSA9IGNsYXNzTmFtZTtcbiAgfVxuXG4gIHJldHVybiB0aGlzLmVsO1xufTtcblxuXG5TdGlja3lTdGF0ZS5uYXRpdmUgPSBmdW5jdGlvbigpIHtcbiAgaWYgKF9nbG9iYWxzLmZlYXR1cmVUZXN0ZWQpIHtcbiAgICByZXR1cm4gX2dsb2JhbHMuY2FuU3RpY2t5O1xuICB9XG4gIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xuICAgIHZhciB0ZXN0RWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuYXBwZW5kQ2hpbGQodGVzdEVsKTtcbiAgICB2YXIgcHJlZml4ZWRTdGlja3kgPSBbJ3N0aWNreScsICctd2Via2l0LXN0aWNreScsICctbW96LXN0aWNreScsICctbXMtc3RpY2t5JywgJy1vLXN0aWNreSddO1xuXG4gICAgX2dsb2JhbHMuY2FuU3RpY2t5ID0gZmFsc2U7XG5cbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgcHJlZml4ZWRTdGlja3kubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRlc3RFbC5zdHlsZS5wb3NpdGlvbiA9IHByZWZpeGVkU3RpY2t5W2ldO1xuICAgICAgX2dsb2JhbHMuY2FuU3RpY2t5ID0gISF3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZSh0ZXN0RWwpLnBvc2l0aW9uLm1hdGNoKCdzdGlja3knKTtcbiAgICAgIGlmKF9nbG9iYWxzLmNhblN0aWNreSl7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICBfZ2xvYmFscy5mZWF0dXJlVGVzdGVkID0gdHJ1ZTtcbiAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQucmVtb3ZlQ2hpbGQodGVzdEVsKTtcbiAgfVxuICByZXR1cm4gX2dsb2JhbHMuY2FuU3RpY2t5O1xufTtcblxuU3RpY2t5U3RhdGUuYXBwbHkgPSBmdW5jdGlvbihlbGVtZW50cykge1xuICBpZiAoZWxlbWVudHMpIHtcbiAgICBpZiAoZWxlbWVudHMubGVuZ3RoKSB7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGVsZW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG5ldyBTdGlja3lTdGF0ZShlbGVtZW50c1tpXSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIG5ldyBTdGlja3lTdGF0ZShlbGVtZW50cyk7XG4gICAgfVxuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFN0aWNreVN0YXRlO1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQgU8O2bmtlIEtsdXRoXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weSBvZlxuICogdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpblxuICogdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0b1xuICogdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2ZcbiAqIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbyxcbiAqIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluIGFsbFxuICogY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTU1xuICogRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SXG4gKiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVJcbiAqIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOXG4gKiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuICoqL1xuXG4oZnVuY3Rpb24oZXhwb3J0cykge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgdmFyIGRlbGVnYXRlID0gZnVuY3Rpb24odGFyZ2V0LCBoYW5kbGVyKSB7XG4gICAgICAgIC8vIEdldCBhbnkgZXh0cmEgYXJndW1lbnRzIGZvciBoYW5kbGVyXG4gICAgICAgIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpO1xuXG4gICAgICAgIC8vIENyZWF0ZSBkZWxlZ2F0ZSBmdW5jdGlvblxuICAgICAgICB2YXIgZm4gPSBmdW5jdGlvbigpIHtcblxuICAgICAgICAgICAgLy8gQ2FsbCBoYW5kbGVyIHdpdGggYXJndW1lbnRzXG4gICAgICAgICAgICByZXR1cm4gaGFuZGxlci5hcHBseSh0YXJnZXQsIGFyZ3MpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFJldHVybiB0aGUgZGVsZWdhdGUgZnVuY3Rpb24uXG4gICAgICAgIHJldHVybiBmbjtcbiAgICB9O1xuXG5cbiAgICAodHlwZW9mIG1vZHVsZSAhPSBcInVuZGVmaW5lZFwiICYmIG1vZHVsZS5leHBvcnRzKSA/IChtb2R1bGUuZXhwb3J0cyA9IGRlbGVnYXRlKSA6ICh0eXBlb2YgZGVmaW5lICE9IFwidW5kZWZpbmVkXCIgPyAoZGVmaW5lKGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gZGVsZWdhdGU7XG4gICAgfSkpIDogKGV4cG9ydHMuZGVsZWdhdGUgPSBkZWxlZ2F0ZSkpO1xuXG59KSh0aGlzKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLy9JRThcbmlmICghQXJyYXkucHJvdG90eXBlLmluZGV4T2YpIHtcbiAgQXJyYXkucHJvdG90eXBlLmluZGV4T2YgPSBmdW5jdGlvbihvYmosIHN0YXJ0KSB7XG4gICAgZm9yICh2YXIgaSA9IChzdGFydCB8fCAwKSwgaiA9IHRoaXMubGVuZ3RoOyBpIDwgajsgaSsrKSB7XG4gICAgICBpZiAodGhpc1tpXSA9PT0gb2JqKSB7XG4gICAgICAgIHJldHVybiBpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gLTE7XG4gIH07XG59XG5cbnZhciBFdmVudERpc3BhdGNoZXIgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5fZXZlbnRNYXAgPSB7fTtcbiAgdGhpcy5fZGVzdHJveWVkID0gZmFsc2U7XG59O1xuXG5FdmVudERpc3BhdGNoZXIucHJvdG90eXBlID0ge1xuXG4gIGFkZExpc3RlbmVyOiBmdW5jdGlvbihldmVudCwgbGlzdGVuZXIpIHtcblxuICAgIHRoaXMuZ2V0TGlzdGVuZXIoZXZlbnQpIHx8ICh0aGlzLl9ldmVudE1hcFtldmVudF0gPSBbXSk7XG5cbiAgICBpZiAodGhpcy5nZXRMaXN0ZW5lcihldmVudCkuaW5kZXhPZihsaXN0ZW5lcikgPT0gLTEpIHtcbiAgICAgIHRoaXMuX2V2ZW50TWFwW2V2ZW50XS5wdXNoKGxpc3RlbmVyKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICBhZGRMaXN0ZW5lck9uY2U6IGZ1bmN0aW9uKGV2ZW50LCBsaXN0ZW5lcikge1xuICAgIHZhciBzID0gdGhpcztcbiAgICB2YXIgZjIgPSBmdW5jdGlvbigpIHtcbiAgICAgIHMucmVtb3ZlTGlzdGVuZXIoZXZlbnQsIGYyKTtcbiAgICAgIHJldHVybiBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gICAgcmV0dXJuIHRoaXMuYWRkTGlzdGVuZXIoZXZlbnQsIGYyKTtcbiAgfSxcblxuICByZW1vdmVMaXN0ZW5lcjogZnVuY3Rpb24oZXZlbnQsIGxpc3RlbmVyKSB7XG5cbiAgICB2YXIgbGlzdGVuZXJzID0gdGhpcy5nZXRMaXN0ZW5lcihldmVudCk7XG4gICAgaWYgKGxpc3RlbmVycykge1xuICAgICAgdmFyIGkgPSBsaXN0ZW5lcnMuaW5kZXhPZihsaXN0ZW5lcik7XG4gICAgICBpZiAoaSA+IC0xKSB7XG4gICAgICAgIHRoaXMuX2V2ZW50TWFwW2V2ZW50XSA9IGxpc3RlbmVycy5zcGxpY2UoaSwgMSk7XG4gICAgICAgIGlmIChsaXN0ZW5lcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgZGVsZXRlKHRoaXMuX2V2ZW50TWFwW2V2ZW50XSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICByZW1vdmVBbGxMaXN0ZW5lcjogZnVuY3Rpb24oZXZlbnQpIHtcblxuICAgIHZhciBsaXN0ZW5lcnMgPSB0aGlzLmdldExpc3RlbmVyKGV2ZW50KTtcbiAgICBpZiAobGlzdGVuZXJzKSB7XG4gICAgICB0aGlzLl9ldmVudE1hcFtldmVudF0ubGVuZ3RoID0gMDtcbiAgICAgIGRlbGV0ZSh0aGlzLl9ldmVudE1hcFtldmVudF0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICBkaXNwYXRjaDogZnVuY3Rpb24oZXZlbnRUeXBlLCBldmVudE9iamVjdCkge1xuXG4gICAgdmFyIGxpc3RlbmVycyA9IHRoaXMuZ2V0TGlzdGVuZXIoZXZlbnRUeXBlKTtcblxuICAgIGlmIChsaXN0ZW5lcnMpIHtcblxuICAgICAgLy92YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICBldmVudE9iamVjdCA9IChldmVudE9iamVjdCkgPyBldmVudE9iamVjdCA6IHt9O1xuICAgICAgZXZlbnRPYmplY3QudHlwZSA9IGV2ZW50VHlwZTtcbiAgICAgIGV2ZW50T2JqZWN0LnRhcmdldCA9IGV2ZW50T2JqZWN0LnRhcmdldCB8fCB0aGlzO1xuICAgICAgdmFyIGkgPSAtMTtcbiAgICAgIHdoaWxlICgrK2kgPCBsaXN0ZW5lcnMubGVuZ3RoKSB7XG5cbiAgICAgICAgLy9hcmdzID8gbGlzdGVuZXJzW2ldLmFwcGx5KG51bGwsIGFyZ3MpIDogbGlzdGVuZXJzW2ldKCk7XG4gICAgICAgIGxpc3RlbmVyc1tpXS5jYWxsKG51bGwsIGV2ZW50T2JqZWN0KTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gY29uc29sZS5pbmZvKCdOb2JvZHkgaXMgbGlzdGVuaW5nIHRvICcgKyBldmVudCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgZ2V0TGlzdGVuZXI6IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgaWYgKHRoaXMuX2Rlc3Ryb3llZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJIGFtIGRlc3Ryb3llZCcpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fZXZlbnRNYXBbZXZlbnRdO1xuICB9LFxuXG4gIGRlc3Ryb3k6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLl9ldmVudE1hcCkge1xuICAgICAgZm9yICh2YXIgaSBpbiB0aGlzLl9ldmVudE1hcCkge1xuICAgICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVyKGkpO1xuICAgICAgfVxuICAgICAgLy9UT0RPIGxlYXZlIGFuIGVtcHR5IG9iamVjdCBpcyBiZXR0ZXIgdGhlbiB0aHJvd2luZyBhbiBlcnJvciB3aGVuIHVzaW5nIGEgZm4gYWZ0ZXIgZGVzdHJveT9cbiAgICAgIHRoaXMuX2V2ZW50TWFwID0gbnVsbDtcbiAgICB9XG4gICAgdGhpcy5fZGVzdHJveWVkID0gdHJ1ZTtcbiAgfVxufTtcblxuLy9NZXRob2QgTWFwXG5FdmVudERpc3BhdGNoZXIucHJvdG90eXBlLm9uID0gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5iaW5kID0gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5hZGRFdmVudExpc3RlbmVyID0gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcbkV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUub2ZmID0gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS51bmJpbmQgPSBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLnJlbW92ZUV2ZW50TGlzdGVuZXIgPSBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyO1xuRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5vbmNlID0gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5vbmUgPSBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLmFkZExpc3RlbmVyT25jZTtcbkV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUudHJpZ2dlciA9IEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUuZGlzcGF0Y2hFdmVudCA9IEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUuZGlzcGF0Y2g7XG5cbm1vZHVsZS5leHBvcnRzID0gRXZlbnREaXNwYXRjaGVyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKlxuICogRmFzdFNjcm9sbFxuICogaHR0cHM6Ly9naXRodWIuY29tL3NvZW5rZWtsdXRoL2Zhc3RzY3JvbGxcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQgU8O2bmtlIEtsdXRoXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UuXG4gKi9cblxudmFyIGRlbGVnYXRlID0gcmVxdWlyZSgnZGVsZWdhdGVqcycpO1xudmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoJy4vZXZlbnRkaXNwYXRjaGVyJyk7XG5cbnZhciBfaW5zdGFuY2VNYXAgPSB7fTtcblxuXG52YXIgRmFzdFNjcm9sbCA9IGZ1bmN0aW9uKHNjcm9sbFRhcmdldCkge1xuICBzY3JvbGxUYXJnZXQgPSBzY3JvbGxUYXJnZXQgfHwgd2luZG93O1xuICBpZiAoX2luc3RhbmNlTWFwW3Njcm9sbFRhcmdldF0pIHtcbiAgICByZXR1cm4gX2luc3RhbmNlTWFwW3Njcm9sbFRhcmdldF0uaW5zdGFuY2U7XG4gIH0gZWxzZSB7XG4gICAgX2luc3RhbmNlTWFwW3Njcm9sbFRhcmdldF0gPSB7XG4gICAgICBpbnN0YW5jZTogdGhpcyxcbiAgICAgIGxpc3RlbmVyQ291bnQ6IDBcbiAgICB9XG4gIH1cblxuICB0aGlzLmVsZW1lbnQgPSBzY3JvbGxUYXJnZXQ7XG4gIHRoaXMuaW5pdCgpO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkZhc3RTY3JvbGwuVVAgPSAndXAnO1xuRmFzdFNjcm9sbC5ET1dOID0gJ2Rvd24nO1xuRmFzdFNjcm9sbC5OT05FID0gJ25vbmUnO1xuRmFzdFNjcm9sbC5MRUZUID0gJ2xlZnQnO1xuRmFzdFNjcm9sbC5SSUdIVCA9ICdyaWdodCc7XG5cbkZhc3RTY3JvbGwucHJvdG90eXBlID0ge1xuXG4gIGRlc3Ryb3llZDogZmFsc2UsXG4gIHNjcm9sbGluZzogZmFsc2UsXG4gIHNjcm9sbFk6IDAsXG4gIHNjcm9sbFg6IDAsXG4gIGxhc3RTY3JvbGxZOiAwLFxuICBsYXN0U2Nyb2xsWDogMCxcbiAgc3BlZWRZOiAwLFxuICBzcGVlZFg6IDAsXG4gIHN0b3BGcmFtZXM6IDUsXG4gIGN1cnJlbnRTdG9wRnJhbWVzOiAwLFxuICBmaXJzdFJlbmRlcjogdHJ1ZSxcblxuICBfaGFzUmVxdWVzdGVkQW5pbWF0aW9uRnJhbWU6IGZhbHNlLFxuXG4gIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuZGlzcGF0Y2hlciA9IG5ldyBFdmVudERpc3BhdGNoZXIoKTtcbiAgICB0aGlzLnVwZGF0ZVNjcm9sbFBvc2l0aW9uID0gKHRoaXMuZWxlbWVudCA9PT0gd2luZG93KSA/IGRlbGVnYXRlKHRoaXMsIHRoaXMudXBkYXRlV2luZG93U2Nyb2xsUG9zaXRpb24pIDogZGVsZWdhdGUodGhpcywgdGhpcy51cGRhdGVFbGVtZW50U2Nyb2xsUG9zaXRpb24pO1xuICAgIHRoaXMub25TY3JvbGxEZWxlZ2F0ZSA9IGRlbGVnYXRlKHRoaXMsIHRoaXMub25TY3JvbGwpO1xuICAgIHRoaXMub25BbmltYXRpb25GcmFtZURlbGVnYXRlID0gZGVsZWdhdGUodGhpcywgdGhpcy5vbkFuaW1hdGlvbkZyYW1lKTtcbiAgICB0aGlzLmVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignc2Nyb2xsJywgdGhpcy5vblNjcm9sbERlbGVnYXRlLCBmYWxzZSk7XG4gIH0sXG5cbiAgZGVzdHJveTogZnVuY3Rpb24oKSB7XG4gICAgaWYoX2luc3RhbmNlTWFwW3RoaXMuZWxlbWVudF0ubGlzdGVuZXJDb3VudCA8PSAwICYmICF0aGlzLmRlc3Ryb3llZCl7XG4gICAgICBkZWxldGUoX2luc3RhbmNlTWFwW3RoaXMuZWxlbWVudF0pO1xuICAgICAgdGhpcy5lbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Njcm9sbCcsIHRoaXMub25TY3JvbGxEZWxlZ2F0ZSk7XG4gICAgICB0aGlzLmRpc3BhdGNoZXIub2ZmKCk7XG4gICAgICB0aGlzLmRpc3BhdGNoZXIgPSBudWxsO1xuICAgICAgdGhpcy5vblNjcm9sbERlbGVnYXRlID0gbnVsbDtcbiAgICAgIHRoaXMudXBkYXRlU2Nyb2xsUG9zaXRpb24gPSBudWxsO1xuICAgICAgdGhpcy5vbkFuaW1hdGlvbkZyYW1lRGVsZWdhdGUgPSBudWxsO1xuICAgICAgdGhpcy5lbGVtZW50ID0gbnVsbDtcbiAgICAgIHRoaXMuZGVzdHJveWVkID0gdHJ1ZTtcbiAgICB9XG4gIH0sXG5cbiAgZ2V0QXR0cmlidXRlczogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHNjcm9sbFg6IHRoaXMuc2Nyb2xsWCxcbiAgICAgIHNjcm9sbFk6IHRoaXMuc2Nyb2xsWSxcbiAgICAgIHNwZWVkWTogdGhpcy5zcGVlZFksXG4gICAgICBzcGVlZFg6IHRoaXMuc3BlZWRYLFxuICAgICAgYW5nbGU6IDAsXG4gICAgICBzcGVlZFk6IHRoaXMuc3BlZWRZID09PSAwID8gRmFzdFNjcm9sbC5OT05FIDogKCh0aGlzLnNwZWVkWSA+IDApID8gRmFzdFNjcm9sbC5VUCA6IEZhc3RTY3JvbGwuRE9XTiksXG4gICAgICBzcGVlZFg6IHRoaXMuc3BlZWRYID09PSAwID8gRmFzdFNjcm9sbC5OT05FIDogKCh0aGlzLnNwZWVkWCA+IDApID8gRmFzdFNjcm9sbC5SSUdIVCA6IEZhc3RTY3JvbGwuTEVGVClcbiAgICB9O1xuICB9LFxuXG4gIHVwZGF0ZVdpbmRvd1Njcm9sbFBvc2l0aW9uOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnNjcm9sbFkgPSB0aGlzLmVsZW1lbnQuc2Nyb2xsWSB8fCB0aGlzLmVsZW1lbnQucGFnZVlPZmZzZXQgfHwgMDtcbiAgICB0aGlzLnNjcm9sbFggPSB0aGlzLmVsZW1lbnQuc2Nyb2xsWCB8fCB0aGlzLmVsZW1lbnQucGFnZVhPZmZzZXQgfHwgMDtcbiAgfSxcblxuICB1cGRhdGVFbGVtZW50U2Nyb2xsUG9zaXRpb246IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc2Nyb2xsWSA9IHRoaXMuZWxlbWVudC5zY3JvbGxUb3A7XG4gICAgdGhpcy5zY3JvbGxYID0gdGhpcy5lbGVtZW50LnNjcm9sbExlZnQ7XG4gIH0sXG5cbiAgb25TY3JvbGw6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMudXBkYXRlU2Nyb2xsUG9zaXRpb24oKTtcbiAgICB0aGlzLmN1cnJlbnRTdG9wRnJhbWVzID0gMDtcbiAgICB0aGlzLnNjcm9sbGluZyA9IHRydWU7XG5cbiAgICBpZiAodGhpcy5maXJzdFJlbmRlcikge1xuICAgICAgaWYgKHRoaXMuc2Nyb2xsWSA+IDEpIHtcbiAgICAgICAgdGhpcy5jdXJyZW50U3RvcEZyYW1lcyA9IHRoaXMuc3RvcEZyYW1lcyAtIDE7XG4gICAgICB9XG4gICAgICB0aGlzLmZpcnN0UmVuZGVyID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLl9oYXNSZXF1ZXN0ZWRBbmltYXRpb25GcmFtZSkge1xuICAgICAgdGhpcy5faGFzUmVxdWVzdGVkQW5pbWF0aW9uRnJhbWUgPSB0cnVlO1xuICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KCdzY3JvbGw6c3RhcnQnKTtcbiAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSh0aGlzLm9uQW5pbWF0aW9uRnJhbWVEZWxlZ2F0ZSk7XG4gICAgfVxuICB9LFxuXG4gIG9uQW5pbWF0aW9uRnJhbWU6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLmRlc3Ryb3llZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMudXBkYXRlU2Nyb2xsUG9zaXRpb24oKTtcblxuICAgIHRoaXMuc3BlZWRZID0gdGhpcy5sYXN0U2Nyb2xsWSAtIHRoaXMuc2Nyb2xsWTtcbiAgICB0aGlzLnNwZWVkWCA9IHRoaXMubGFzdFNjcm9sbFggLSB0aGlzLnNjcm9sbFg7XG5cbiAgICB0aGlzLmxhc3RTY3JvbGxZID0gdGhpcy5zY3JvbGxZO1xuICAgIHRoaXMubGFzdFNjcm9sbFggPSB0aGlzLnNjcm9sbFg7XG5cbiAgICBpZiAodGhpcy5zcGVlZFkgPT09IDAgJiYgdGhpcy5zY3JvbGxpbmcgJiYgKHRoaXMuY3VycmVudFN0b3BGcmFtZXMrKyA+IHRoaXMuc3RvcEZyYW1lcykpIHtcbiAgICAgIHRoaXMub25TY3JvbGxTdG9wKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KCdzY3JvbGw6cHJvZ3Jlc3MnKTtcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUodGhpcy5vbkFuaW1hdGlvbkZyYW1lRGVsZWdhdGUpO1xuICB9LFxuXG4gIG9uU2Nyb2xsU3RvcDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zY3JvbGxpbmcgPSBmYWxzZTtcbiAgICB0aGlzLl9oYXNSZXF1ZXN0ZWRBbmltYXRpb25GcmFtZSA9IGZhbHNlO1xuICAgIHRoaXMuY3VycmVudFN0b3BGcmFtZXMgPSAwO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudCgnc2Nyb2xsOnN0b3AnKTtcbiAgfSxcblxuICBkaXNwYXRjaEV2ZW50OiBmdW5jdGlvbih0eXBlLCBldmVudE9iamVjdCkge1xuICAgIGV2ZW50T2JqZWN0ID0gZXZlbnRPYmplY3QgfHwgdGhpcy5nZXRBdHRyaWJ1dGVzKCk7XG4gICAgZXZlbnRPYmplY3QuZmFzdFNjcm9sbCA9IHRoaXM7XG4gICAgZXZlbnRPYmplY3QudGFyZ2V0ID0gdGhpcy5lbGVtZW50O1xuICAgIHRoaXMuZGlzcGF0Y2hlci5kaXNwYXRjaCh0eXBlLCBldmVudE9iamVjdCk7XG4gIH0sXG5cbiAgb246IGZ1bmN0aW9uKGV2ZW50LCBsaXN0ZW5lcikge1xuICAgIGlmICh0aGlzLmRpc3BhdGNoZXIub24oZXZlbnQsIGxpc3RlbmVyKSkge1xuICAgICAgX2luc3RhbmNlTWFwW3RoaXMuZWxlbWVudF0ubGlzdGVuZXJDb3VudCArPSAxO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfSxcblxuICBvZmY6IGZ1bmN0aW9uKGV2ZW50LCBsaXN0ZW5lcikge1xuICAgIGlmKHRoaXMuZGlzcGF0Y2hlci5vZmYoZXZlbnQsIGxpc3RlbmVyKSl7XG4gICAgICBfaW5zdGFuY2VNYXBbdGhpcy5lbGVtZW50XS5saXN0ZW5lckNvdW50IC09IDE7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59O1xuXG5GYXN0U2Nyb2xsLl9fX2luc3RhbmNlTWFwID0gX2luc3RhbmNlTWFwO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZhc3RTY3JvbGw7XG4iLCIvKiBlc2xpbnQtZGlzYWJsZSBuby11bnVzZWQtdmFycyAqL1xuJ3VzZSBzdHJpY3QnO1xudmFyIGhhc093blByb3BlcnR5ID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcbnZhciBwcm9wSXNFbnVtZXJhYmxlID0gT2JqZWN0LnByb3RvdHlwZS5wcm9wZXJ0eUlzRW51bWVyYWJsZTtcblxuZnVuY3Rpb24gdG9PYmplY3QodmFsKSB7XG5cdGlmICh2YWwgPT09IG51bGwgfHwgdmFsID09PSB1bmRlZmluZWQpIHtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdPYmplY3QuYXNzaWduIGNhbm5vdCBiZSBjYWxsZWQgd2l0aCBudWxsIG9yIHVuZGVmaW5lZCcpO1xuXHR9XG5cblx0cmV0dXJuIE9iamVjdCh2YWwpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gKHRhcmdldCwgc291cmNlKSB7XG5cdHZhciBmcm9tO1xuXHR2YXIgdG8gPSB0b09iamVjdCh0YXJnZXQpO1xuXHR2YXIgc3ltYm9scztcblxuXHRmb3IgKHZhciBzID0gMTsgcyA8IGFyZ3VtZW50cy5sZW5ndGg7IHMrKykge1xuXHRcdGZyb20gPSBPYmplY3QoYXJndW1lbnRzW3NdKTtcblxuXHRcdGZvciAodmFyIGtleSBpbiBmcm9tKSB7XG5cdFx0XHRpZiAoaGFzT3duUHJvcGVydHkuY2FsbChmcm9tLCBrZXkpKSB7XG5cdFx0XHRcdHRvW2tleV0gPSBmcm9tW2tleV07XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMpIHtcblx0XHRcdHN5bWJvbHMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKGZyb20pO1xuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBzeW1ib2xzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdGlmIChwcm9wSXNFbnVtZXJhYmxlLmNhbGwoZnJvbSwgc3ltYm9sc1tpXSkpIHtcblx0XHRcdFx0XHR0b1tzeW1ib2xzW2ldXSA9IGZyb21bc3ltYm9sc1tpXV07XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gdG87XG59O1xuIl19
