(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.StickyState = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var assign = require('object-assign');
var FastScroll = require('fastscroll');

var _globals = {
  featureTested: false
};

var defaults = {
  scrollTarget: null,
  disabled: false,
  className: 'sticky',
  useAnimationFrame: false,
  stateclassName: 'is-sticky'
};


function getSrollPosition(){
  return (window.scrollY || window.pageYOffset || 0);
}

function getAbsolutBoundingRect(el) {
  var rect = el.getBoundingClientRect();
  var scrollPos = getSrollPosition();
  var top = rect.top + scrollPos;
  return {
    top: top,
    bottom: top + rect.height,
    height: rect.height,
    width: rect.width
  };
}


function addBounds(rect1, rect2){
  var rect = assign({}, rect1);
  rect.top -= rect2.top;
  rect.bottom = rect.top + rect1.height;
  return rect;
}


function getPreviousElementSibling(el) {
  var prev = el.previousElementSibling;
  if(prev && prev.tagName.toLocaleLowerCase() === 'script'){
    prev = getPreviousElementSibling(prev);
  }
  return prev;
}

function canSticky(stickyClass) {
  if (_globals.featureTested) {
    return _globals.canSticky;
  }
  if (window) {
    stickyClass = stickyClass || defaults.className;
    var testEl = document.createElement('div');
    testEl.className = stickyClass;
    document.documentElement.appendChild(testEl);
    _globals.canSticky = window.getComputedStyle(testEl).position.match('sticky');
    _globals.featureTested = true;
    document.documentElement.removeChild(testEl);
  }
  return _globals.canSticky;
}

function getFastScroll(scrollTarget) {
  if(!scrollTarget){
    scrollTarget = window;
  }
  if (!_globals[scrollTarget]) {
    _globals[scrollTarget] = new FastScroll({el:scrollTarget});
  }
  return _globals[scrollTarget];
}

var StickyState = function(element, options) {
  if (!element) {
    throw new Error('StickyState needs a DomElement');
    return;
  }
  this.el = element;
  this.options = assign({}, defaults, {scrollTarget:window}, options);

  this.state = {
    sticky: false,
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
  silent = silent === true ? true : false;
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
    value = parseInt(window.getComputedStyle(this.el)[key]);
    value = isNaN(value) ? null : value;
    obj[key] = value;
  }

  return obj;
};


StickyState.prototype.updateBounds = function(silent) {
  silent = silent === true ? true : false;

  var style = this.getPositionStyle();
  var rect;

  if(!this.canSticky()){
    rect = getAbsolutBoundingRect(this.child);
    if(this.options.scrollTarget !== window){
      rect = addBounds(rect, getAbsolutBoundingRect(this.options.scrollTarget));
    }
  }else{
    var elem = getPreviousElementSibling(this.child);
    var offset = 0;

    if(elem){
      offset = parseInt(window.getComputedStyle(elem)['margin-bottom']);
      offset = offset || 0;
      rect = getAbsolutBoundingRect(elem);
      if(this.options.scrollTarget !== window){
       rect = addBounds(rect, getAbsolutBoundingRect(this.options.scrollTarget));
      }

      rect.top  = rect.bottom + offset;

    }else{
      elem = this.child.parentNode;
      offset = parseInt(window.getComputedStyle(elem)['padding-top']);
      offset = offset || 0;
      rect = getAbsolutBoundingRect(elem);
      if(this.options.scrollTarget !== window){
       rect = addBounds(rect, getAbsolutBoundingRect(this.options.scrollTarget));
      }
      rect.top =  rect.top +  offset;
    }

    rect.height = this.child.clientHeight;
    rect.width = this.child.clientWidth;
    rect.bottom = rect.top + rect.height;
  }

  this.updateState({
    style: style,
    bounds: rect,
    restrict: getAbsolutBoundingRect(this.child.parentNode)
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
    this.fastScroll = this.fastScroll || getFastScroll(this.options.scrollTarget);
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

  silent = silent === true ? true : false;
  var scrollY = this.fastScroll.scrollY;

  var top = this.state.style.top;

  if (top !== null) {
    var offsetBottom = this.state.restrict.bottom - this.state.bounds.height - top;
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
    var offsetBottom = this.state.restrict.top + this.state.bounds.height - bottom;
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
    this.wrapper.style.height = height;
  }

  var className = this.el.className;
  var hasStateClass = className.indexOf(this.options.stateclassName) > -1;
  if (this.state.sticky && !hasStateClass) {
    className = className + ' ' + this.options.stateclassName;
  } else if (!this.state.sticky && hasStateClass) {
    className = className.split(this.options.stateclassName).join('');
  }

  if (this.el.className !== className) {
    this.el.className = className;
  }

  return this.el;
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

var FastScroll = function(options) {
  this.options = (options || {});
  this.element = this.options.el ||  window;
  if (this.element) {
    this.init();
  }
};

FastScroll.prototype = {

  destroyed: false,
  scrolling: false,
  scrollY: 0,
  scrollX: 0,
  lastScrollY: 0,
  lastScrollX: 0,
  stopFrames: 5,
  currentStopFrames: 0,
  firstRender: true,
  speedY: 0,
  speedX: 0,

  _hasRequestedAnimationFrame: false,

  init: function() {
    this.dispatcher = new EventDispatcher();
    if (this.element === window) {
      this.updateScrollPosition = delegate(this, this.updateWindowScrollPosition);
    }else {
      this.updateScrollPosition = delegate(this, this.updateElementScrollPosition);
    }
    this.onScrollDelegate = delegate(this, this.onScroll);
    this.onAnimationFrameDelegate = delegate(this, this.onAnimationFrame);
    this.element.addEventListener('scroll', this.onScrollDelegate, false);
  },

  destroy: function() {
    this.element.removeEventListener('scroll', this.onScrollDelegate);
    this.onScrollDelegate = null;
    this.element = null;
    this.options = null;
    this.destroyed = true;
  },

  getAttributes: function() {
    return {
      scrollY: this.scrollY,
      scrollX: this.scrollX,
      speedY: this.speedY,
      speedX: this.speedX,
      angle: 0,
      //TODO not save for now... do like checkScrollstop
      direction: this.speedY === 0 ? 'none' : (this.speedY > 0) ? 'up' : 'down'
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
      var attr = this.getAttributes();
      this.dispatchEvent('scroll:start', attr);
      requestAnimationFrame(this.onAnimationFrameDelegate);
      if (this.options.start) {
        this.options.start.call(this, attr);
      }
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

    var attr = this.getAttributes();
    this.dispatchEvent('scroll:progress', attr);

    if (this.options.scrolling) {
      this.options.scrolling.call(this, attr);
    }

    requestAnimationFrame(this.onAnimationFrameDelegate);
  },

  onScrollStop: function() {

    this.scrolling = false;
    this._hasRequestedAnimationFrame = false;
    this.currentStopFrames = 0;
    var attr = this.getAttributes();
    this.dispatchEvent('scroll:stop', attr);
    if (this.options.stop) {
      this.options.stop.call(this, attr);
    }
  },

  dispatchEvent: function(type, eventObject) {
    eventObject = eventObject || this.getAttributes();
    eventObject.target = this.element;
    eventObject.detail = eventObject;
    this.dispatcher.dispatch(type, eventObject);
  },

  on: function(event, listener) {
    return this.dispatcher.on(event, listener);
  },

  off: function(event, listener) {
    return this.dispatcher.off(event, listener);
  }
};

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9kZWxlZ2F0ZWpzL2RlbGVnYXRlLmpzIiwibm9kZV9tb2R1bGVzL2Zhc3RzY3JvbGwvc3JjL2V2ZW50ZGlzcGF0Y2hlci5qcyIsIm5vZGVfbW9kdWxlcy9mYXN0c2Nyb2xsL3NyYy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9vYmplY3QtYXNzaWduL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgYXNzaWduID0gcmVxdWlyZSgnb2JqZWN0LWFzc2lnbicpO1xudmFyIEZhc3RTY3JvbGwgPSByZXF1aXJlKCdmYXN0c2Nyb2xsJyk7XG5cbnZhciBfZ2xvYmFscyA9IHtcbiAgZmVhdHVyZVRlc3RlZDogZmFsc2Vcbn07XG5cbnZhciBkZWZhdWx0cyA9IHtcbiAgc2Nyb2xsVGFyZ2V0OiBudWxsLFxuICBkaXNhYmxlZDogZmFsc2UsXG4gIGNsYXNzTmFtZTogJ3N0aWNreScsXG4gIHVzZUFuaW1hdGlvbkZyYW1lOiBmYWxzZSxcbiAgc3RhdGVjbGFzc05hbWU6ICdpcy1zdGlja3knXG59O1xuXG5cbmZ1bmN0aW9uIGdldFNyb2xsUG9zaXRpb24oKXtcbiAgcmV0dXJuICh3aW5kb3cuc2Nyb2xsWSB8fCB3aW5kb3cucGFnZVlPZmZzZXQgfHwgMCk7XG59XG5cbmZ1bmN0aW9uIGdldEFic29sdXRCb3VuZGluZ1JlY3QoZWwpIHtcbiAgdmFyIHJlY3QgPSBlbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgdmFyIHNjcm9sbFBvcyA9IGdldFNyb2xsUG9zaXRpb24oKTtcbiAgdmFyIHRvcCA9IHJlY3QudG9wICsgc2Nyb2xsUG9zO1xuICByZXR1cm4ge1xuICAgIHRvcDogdG9wLFxuICAgIGJvdHRvbTogdG9wICsgcmVjdC5oZWlnaHQsXG4gICAgaGVpZ2h0OiByZWN0LmhlaWdodCxcbiAgICB3aWR0aDogcmVjdC53aWR0aFxuICB9O1xufVxuXG5cbmZ1bmN0aW9uIGFkZEJvdW5kcyhyZWN0MSwgcmVjdDIpe1xuICB2YXIgcmVjdCA9IGFzc2lnbih7fSwgcmVjdDEpO1xuICByZWN0LnRvcCAtPSByZWN0Mi50b3A7XG4gIHJlY3QuYm90dG9tID0gcmVjdC50b3AgKyByZWN0MS5oZWlnaHQ7XG4gIHJldHVybiByZWN0O1xufVxuXG5cbmZ1bmN0aW9uIGdldFByZXZpb3VzRWxlbWVudFNpYmxpbmcoZWwpIHtcbiAgdmFyIHByZXYgPSBlbC5wcmV2aW91c0VsZW1lbnRTaWJsaW5nO1xuICBpZihwcmV2ICYmIHByZXYudGFnTmFtZS50b0xvY2FsZUxvd2VyQ2FzZSgpID09PSAnc2NyaXB0Jyl7XG4gICAgcHJldiA9IGdldFByZXZpb3VzRWxlbWVudFNpYmxpbmcocHJldik7XG4gIH1cbiAgcmV0dXJuIHByZXY7XG59XG5cbmZ1bmN0aW9uIGNhblN0aWNreShzdGlja3lDbGFzcykge1xuICBpZiAoX2dsb2JhbHMuZmVhdHVyZVRlc3RlZCkge1xuICAgIHJldHVybiBfZ2xvYmFscy5jYW5TdGlja3k7XG4gIH1cbiAgaWYgKHdpbmRvdykge1xuICAgIHN0aWNreUNsYXNzID0gc3RpY2t5Q2xhc3MgfHwgZGVmYXVsdHMuY2xhc3NOYW1lO1xuICAgIHZhciB0ZXN0RWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICB0ZXN0RWwuY2xhc3NOYW1lID0gc3RpY2t5Q2xhc3M7XG4gICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmFwcGVuZENoaWxkKHRlc3RFbCk7XG4gICAgX2dsb2JhbHMuY2FuU3RpY2t5ID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUodGVzdEVsKS5wb3NpdGlvbi5tYXRjaCgnc3RpY2t5Jyk7XG4gICAgX2dsb2JhbHMuZmVhdHVyZVRlc3RlZCA9IHRydWU7XG4gICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnJlbW92ZUNoaWxkKHRlc3RFbCk7XG4gIH1cbiAgcmV0dXJuIF9nbG9iYWxzLmNhblN0aWNreTtcbn1cblxuZnVuY3Rpb24gZ2V0RmFzdFNjcm9sbChzY3JvbGxUYXJnZXQpIHtcbiAgaWYoIXNjcm9sbFRhcmdldCl7XG4gICAgc2Nyb2xsVGFyZ2V0ID0gd2luZG93O1xuICB9XG4gIGlmICghX2dsb2JhbHNbc2Nyb2xsVGFyZ2V0XSkge1xuICAgIF9nbG9iYWxzW3Njcm9sbFRhcmdldF0gPSBuZXcgRmFzdFNjcm9sbCh7ZWw6c2Nyb2xsVGFyZ2V0fSk7XG4gIH1cbiAgcmV0dXJuIF9nbG9iYWxzW3Njcm9sbFRhcmdldF07XG59XG5cbnZhciBTdGlja3lTdGF0ZSA9IGZ1bmN0aW9uKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgaWYgKCFlbGVtZW50KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdTdGlja3lTdGF0ZSBuZWVkcyBhIERvbUVsZW1lbnQnKTtcbiAgICByZXR1cm47XG4gIH1cbiAgdGhpcy5lbCA9IGVsZW1lbnQ7XG4gIHRoaXMub3B0aW9ucyA9IGFzc2lnbih7fSwgZGVmYXVsdHMsIHtzY3JvbGxUYXJnZXQ6d2luZG93fSwgb3B0aW9ucyk7XG5cbiAgdGhpcy5zdGF0ZSA9IHtcbiAgICBzdGlja3k6IGZhbHNlLFxuICAgIGJvdW5kczoge1xuICAgICAgdG9wOiBudWxsLFxuICAgICAgYm90dG9tOiBudWxsLFxuICAgICAgaGVpZ2h0OiBudWxsLFxuICAgICAgd2lkdGg6IG51bGxcbiAgICB9LFxuICAgIHJlc3RyaWN0OiBudWxsLFxuICAgIHN0eWxlOiB7XG4gICAgICB0b3A6IG51bGwsXG4gICAgICBib3R0b206IG51bGxcbiAgICB9XG4gIH07XG5cbiAgdGhpcy5jaGlsZCA9IHRoaXMuZWw7XG4gIHRoaXMuZmlyc3RSZW5kZXIgPSB0cnVlO1xuICB0aGlzLmhhc0ZlYXR1cmUgPSBudWxsO1xuICB0aGlzLnNjcm9sbEhhbmRsZXIgPSBudWxsO1xuICB0aGlzLnJlc2l6ZUhhbmRsZXIgPSBudWxsO1xuICB0aGlzLmZhc3RTY3JvbGwgPSBudWxsO1xuICB0aGlzLndyYXBwZXIgPSBudWxsO1xuXG4gIHRoaXMudXBkYXRlRG9tID0gdGhpcy51cGRhdGVEb20uYmluZCh0aGlzKTtcbiAgdGhpcy5yZW5kZXIgPSAodGhpcy5zdGF0ZS51c2VBbmltYXRpb25GcmFtZSAmJiB3aW5kb3cgJiYgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSkgPyB0aGlzLnJlbmRlck9uQW5pbWF0aW9uRnJhbWUuYmluZCh0aGlzKSA6IHRoaXMudXBkYXRlRG9tO1xuXG4gIHRoaXMuYWRkU3JvbGxIYW5kbGVyKCk7XG4gIHRoaXMuYWRkUmVzaXplSGFuZGxlcigpO1xuICB0aGlzLnJlbmRlcigpO1xufTtcblxuU3RpY2t5U3RhdGUucHJvdG90eXBlLnVwZGF0ZVN0YXRlID0gZnVuY3Rpb24odmFsdWVzLCBzaWxlbnQpIHtcbiAgc2lsZW50ID0gc2lsZW50ID09PSB0cnVlID8gdHJ1ZSA6IGZhbHNlO1xuICB0aGlzLnN0YXRlID0gYXNzaWduKHt9LCB0aGlzLnN0YXRlLCB2YWx1ZXMpO1xuICBpZiAoIXNpbGVudCkge1xuICAgIHRoaXMucmVuZGVyKCk7XG4gIH1cbn07XG5cblN0aWNreVN0YXRlLnByb3RvdHlwZS5nZXRQb3NpdGlvblN0eWxlID0gZnVuY3Rpb24oKSB7XG5cbiAgdmFyIG9iaiA9IHtcbiAgICB0b3A6IG51bGwsXG4gICAgYm90dG9tOiBudWxsXG4gIH07XG5cbiAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgIHZhbHVlID0gcGFyc2VJbnQod2luZG93LmdldENvbXB1dGVkU3R5bGUodGhpcy5lbClba2V5XSk7XG4gICAgdmFsdWUgPSBpc05hTih2YWx1ZSkgPyBudWxsIDogdmFsdWU7XG4gICAgb2JqW2tleV0gPSB2YWx1ZTtcbiAgfVxuXG4gIHJldHVybiBvYmo7XG59O1xuXG5cblN0aWNreVN0YXRlLnByb3RvdHlwZS51cGRhdGVCb3VuZHMgPSBmdW5jdGlvbihzaWxlbnQpIHtcbiAgc2lsZW50ID0gc2lsZW50ID09PSB0cnVlID8gdHJ1ZSA6IGZhbHNlO1xuXG4gIHZhciBzdHlsZSA9IHRoaXMuZ2V0UG9zaXRpb25TdHlsZSgpO1xuICB2YXIgcmVjdDtcblxuICBpZighdGhpcy5jYW5TdGlja3koKSl7XG4gICAgcmVjdCA9IGdldEFic29sdXRCb3VuZGluZ1JlY3QodGhpcy5jaGlsZCk7XG4gICAgaWYodGhpcy5vcHRpb25zLnNjcm9sbFRhcmdldCAhPT0gd2luZG93KXtcbiAgICAgIHJlY3QgPSBhZGRCb3VuZHMocmVjdCwgZ2V0QWJzb2x1dEJvdW5kaW5nUmVjdCh0aGlzLm9wdGlvbnMuc2Nyb2xsVGFyZ2V0KSk7XG4gICAgfVxuICB9ZWxzZXtcbiAgICB2YXIgZWxlbSA9IGdldFByZXZpb3VzRWxlbWVudFNpYmxpbmcodGhpcy5jaGlsZCk7XG4gICAgdmFyIG9mZnNldCA9IDA7XG5cbiAgICBpZihlbGVtKXtcbiAgICAgIG9mZnNldCA9IHBhcnNlSW50KHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKGVsZW0pWydtYXJnaW4tYm90dG9tJ10pO1xuICAgICAgb2Zmc2V0ID0gb2Zmc2V0IHx8IDA7XG4gICAgICByZWN0ID0gZ2V0QWJzb2x1dEJvdW5kaW5nUmVjdChlbGVtKTtcbiAgICAgIGlmKHRoaXMub3B0aW9ucy5zY3JvbGxUYXJnZXQgIT09IHdpbmRvdyl7XG4gICAgICAgcmVjdCA9IGFkZEJvdW5kcyhyZWN0LCBnZXRBYnNvbHV0Qm91bmRpbmdSZWN0KHRoaXMub3B0aW9ucy5zY3JvbGxUYXJnZXQpKTtcbiAgICAgIH1cblxuICAgICAgcmVjdC50b3AgID0gcmVjdC5ib3R0b20gKyBvZmZzZXQ7XG5cbiAgICB9ZWxzZXtcbiAgICAgIGVsZW0gPSB0aGlzLmNoaWxkLnBhcmVudE5vZGU7XG4gICAgICBvZmZzZXQgPSBwYXJzZUludCh3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShlbGVtKVsncGFkZGluZy10b3AnXSk7XG4gICAgICBvZmZzZXQgPSBvZmZzZXQgfHwgMDtcbiAgICAgIHJlY3QgPSBnZXRBYnNvbHV0Qm91bmRpbmdSZWN0KGVsZW0pO1xuICAgICAgaWYodGhpcy5vcHRpb25zLnNjcm9sbFRhcmdldCAhPT0gd2luZG93KXtcbiAgICAgICByZWN0ID0gYWRkQm91bmRzKHJlY3QsIGdldEFic29sdXRCb3VuZGluZ1JlY3QodGhpcy5vcHRpb25zLnNjcm9sbFRhcmdldCkpO1xuICAgICAgfVxuICAgICAgcmVjdC50b3AgPSAgcmVjdC50b3AgKyAgb2Zmc2V0O1xuICAgIH1cblxuICAgIHJlY3QuaGVpZ2h0ID0gdGhpcy5jaGlsZC5jbGllbnRIZWlnaHQ7XG4gICAgcmVjdC53aWR0aCA9IHRoaXMuY2hpbGQuY2xpZW50V2lkdGg7XG4gICAgcmVjdC5ib3R0b20gPSByZWN0LnRvcCArIHJlY3QuaGVpZ2h0O1xuICB9XG5cbiAgdGhpcy51cGRhdGVTdGF0ZSh7XG4gICAgc3R5bGU6IHN0eWxlLFxuICAgIGJvdW5kczogcmVjdCxcbiAgICByZXN0cmljdDogZ2V0QWJzb2x1dEJvdW5kaW5nUmVjdCh0aGlzLmNoaWxkLnBhcmVudE5vZGUpXG4gIH0sIHNpbGVudCk7XG59O1xuXG5TdGlja3lTdGF0ZS5wcm90b3R5cGUuY2FuU3RpY2t5ID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLmhhc0ZlYXR1cmUgIT09IG51bGwpIHtcbiAgICByZXR1cm4gdGhpcy5oYXNGZWF0dXJlO1xuICB9XG4gIHJldHVybiB0aGlzLmhhc0ZlYXR1cmUgPSB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZSh0aGlzLmVsKS5wb3NpdGlvbi5tYXRjaCgnc3RpY2t5Jyk7XG59O1xuXG5TdGlja3lTdGF0ZS5wcm90b3R5cGUuYWRkU3JvbGxIYW5kbGVyID0gZnVuY3Rpb24oKSB7XG4gIGlmICghdGhpcy5zY3JvbGxIYW5kbGVyKSB7XG4gICAgdGhpcy5mYXN0U2Nyb2xsID0gdGhpcy5mYXN0U2Nyb2xsIHx8IGdldEZhc3RTY3JvbGwodGhpcy5vcHRpb25zLnNjcm9sbFRhcmdldCk7XG4gICAgdGhpcy5zY3JvbGxIYW5kbGVyID0gdGhpcy51cGRhdGVTdGlja3lTdGF0ZS5iaW5kKHRoaXMpO1xuICAgIHRoaXMuZmFzdFNjcm9sbC5vbignc2Nyb2xsOnN0YXJ0JywgdGhpcy5zY3JvbGxIYW5kbGVyKTtcbiAgICB0aGlzLmZhc3RTY3JvbGwub24oJ3Njcm9sbDpwcm9ncmVzcycsIHRoaXMuc2Nyb2xsSGFuZGxlcik7XG4gICAgdGhpcy5mYXN0U2Nyb2xsLm9uKCdzY3JvbGw6c3RvcCcsIHRoaXMuc2Nyb2xsSGFuZGxlcik7XG4gIH1cbn07XG5cblN0aWNreVN0YXRlLnByb3RvdHlwZS5yZW1vdmVTcm9sbEhhbmRsZXIgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuZmFzdFNjcm9sbCkge1xuICAgIHRoaXMuZmFzdFNjcm9sbC5vZmYoJ3Njcm9sbDpzdGFydCcsIHRoaXMuc2Nyb2xsSGFuZGxlcik7XG4gICAgdGhpcy5mYXN0U2Nyb2xsLm9mZignc2Nyb2xsOnByb2dyZXNzJywgdGhpcy5zY3JvbGxIYW5kbGVyKTtcbiAgICB0aGlzLmZhc3RTY3JvbGwub2ZmKCdzY3JvbGw6c3RvcCcsIHRoaXMuc2Nyb2xsSGFuZGxlcik7XG4gICAgdGhpcy5mYXN0U2Nyb2xsLmRlc3Ryb3koKTtcbiAgICB0aGlzLnNjcm9sbEhhbmRsZXIgPSBudWxsO1xuICAgIHRoaXMuZmFzdFNjcm9sbCA9IG51bGw7XG4gIH1cbn07XG5cblN0aWNreVN0YXRlLnByb3RvdHlwZS5hZGRSZXNpemVIYW5kbGVyID0gZnVuY3Rpb24oKSB7XG4gIGlmICghdGhpcy5yZXNpemVIYW5kbGVyKSB7XG4gICAgdGhpcy5yZXNpemVIYW5kbGVyID0gdGhpcy5vblJlc2l6ZS5iaW5kKHRoaXMpO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCB0aGlzLnJlc2l6ZUhhbmRsZXIsIGZhbHNlKTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignb3JpZW50YXRpb25jaGFuZ2UnLCB0aGlzLnJlc2l6ZUhhbmRsZXIsIGZhbHNlKTtcbiAgfVxufTtcblxuU3RpY2t5U3RhdGUucHJvdG90eXBlLnJlbW92ZVJlc2l6ZUhhbmRsZXIgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMucmVzaXplSGFuZGxlcikge1xuICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdyZXNpemUnLCB0aGlzLnJlc2l6ZUhhbmRsZXIpO1xuICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdvcmllbnRhdGlvbmNoYW5nZScsIHRoaXMucmVzaXplSGFuZGxlcik7XG4gICAgdGhpcy5yZXNpemVIYW5kbGVyID0gbnVsbDtcbiAgfVxufTtcblxuU3RpY2t5U3RhdGUucHJvdG90eXBlLm9uUmVzaXplID0gZnVuY3Rpb24oZSkge1xuICB0aGlzLnVwZGF0ZUJvdW5kcyh0cnVlKTtcbiAgdGhpcy51cGRhdGVTdGlja3lTdGF0ZShmYWxzZSk7XG59O1xuXG5TdGlja3lTdGF0ZS5wcm90b3R5cGUudXBkYXRlU3RpY2t5U3RhdGUgPSBmdW5jdGlvbihzaWxlbnQpIHtcblxuICB2YXIgY2hpbGQgPSB0aGlzLmNoaWxkO1xuXG4gIHNpbGVudCA9IHNpbGVudCA9PT0gdHJ1ZSA/IHRydWUgOiBmYWxzZTtcbiAgdmFyIHNjcm9sbFkgPSB0aGlzLmZhc3RTY3JvbGwuc2Nyb2xsWTtcblxuICB2YXIgdG9wID0gdGhpcy5zdGF0ZS5zdHlsZS50b3A7XG5cbiAgaWYgKHRvcCAhPT0gbnVsbCkge1xuICAgIHZhciBvZmZzZXRCb3R0b20gPSB0aGlzLnN0YXRlLnJlc3RyaWN0LmJvdHRvbSAtIHRoaXMuc3RhdGUuYm91bmRzLmhlaWdodCAtIHRvcDtcbiAgICB0b3AgPSB0aGlzLnN0YXRlLmJvdW5kcy50b3AgLSB0b3A7XG5cbiAgICBpZiAodGhpcy5zdGF0ZS5zdGlja3kgPT09IGZhbHNlICYmIHNjcm9sbFkgPj0gdG9wICYmIHNjcm9sbFkgPD0gb2Zmc2V0Qm90dG9tKSB7XG4gICAgICB0aGlzLnVwZGF0ZVN0YXRlKHtcbiAgICAgICAgc3RpY2t5OiB0cnVlXG4gICAgICB9LCBzaWxlbnQpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5zdGF0ZS5zdGlja3kgJiYgKHNjcm9sbFkgPCB0b3AgfHwgc2Nyb2xsWSA+IG9mZnNldEJvdHRvbSkpIHtcbiAgICAgIHRoaXMudXBkYXRlU3RhdGUoe1xuICAgICAgICBzdGlja3k6IGZhbHNlXG4gICAgICB9LCBzaWxlbnQpO1xuICAgIH1cblxuICAgIHJldHVybjtcbiAgfVxuXG4gIHNjcm9sbFkgKz0gd2luZG93LmlubmVySGVpZ2h0O1xuICB2YXIgYm90dG9tID0gdGhpcy5zdGF0ZS5zdHlsZS5ib3R0b207XG4gIGlmIChib3R0b20gIT09IG51bGwpIHtcbiAgICB2YXIgb2Zmc2V0Qm90dG9tID0gdGhpcy5zdGF0ZS5yZXN0cmljdC50b3AgKyB0aGlzLnN0YXRlLmJvdW5kcy5oZWlnaHQgLSBib3R0b207XG4gICAgYm90dG9tID0gdGhpcy5zdGF0ZS5ib3VuZHMuYm90dG9tICsgYm90dG9tO1xuXG4gICAgaWYgKHRoaXMuc3RhdGUuc3RpY2t5ID09PSBmYWxzZSAmJiBzY3JvbGxZIDw9IGJvdHRvbSAmJiBzY3JvbGxZID49IG9mZnNldEJvdHRvbSkge1xuICAgICAgdGhpcy51cGRhdGVTdGF0ZSh7XG4gICAgICAgIHN0aWNreTogdHJ1ZVxuICAgICAgfSwgc2lsZW50KTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuc3RhdGUuc3RpY2t5ICYmIChzY3JvbGxZID4gYm90dG9tIHx8IHNjcm9sbFkgPCBvZmZzZXRCb3R0b20pKSB7XG4gICAgICB0aGlzLnVwZGF0ZVN0YXRlKHtcbiAgICAgICAgc3RpY2t5OiBmYWxzZVxuICAgICAgfSwgc2lsZW50KTtcbiAgICB9XG4gIH1cblxufTtcblxuU3RpY2t5U3RhdGUucHJvdG90eXBlLnJlbmRlck9uQW5pbWF0aW9uRnJhbWUgPSBmdW5jdGlvbigpIHtcbiAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSh0aGlzLnVwZGF0ZURvbSk7XG59O1xuXG5TdGlja3lTdGF0ZS5wcm90b3R5cGUudXBkYXRlRG9tID0gZnVuY3Rpb24oKSB7XG5cbiAgaWYgKHRoaXMuZmlyc3RSZW5kZXIpIHtcbiAgICB0aGlzLmZpcnN0UmVuZGVyID0gZmFsc2U7XG5cbiAgICBpZiAoIXRoaXMuY2FuU3RpY2t5KCkpIHtcbiAgICAgIHRoaXMud3JhcHBlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgdGhpcy53cmFwcGVyLmNsYXNzTmFtZSA9ICdzdGlja3ktd3JhcCc7XG4gICAgICB2YXIgcGFyZW50ID0gdGhpcy5lbC5wYXJlbnROb2RlO1xuICAgICAgaWYgKHBhcmVudCkge1xuICAgICAgICBwYXJlbnQuaW5zZXJ0QmVmb3JlKHRoaXMud3JhcHBlciwgdGhpcy5lbCk7XG4gICAgICB9XG4gICAgICB0aGlzLndyYXBwZXIuYXBwZW5kQ2hpbGQodGhpcy5lbCk7XG4gICAgICB0aGlzLmVsLmNsYXNzTmFtZSArPSAnIHN0aWNreS1maXhlZCc7XG4gICAgICB0aGlzLmNoaWxkID0gdGhpcy53cmFwcGVyO1xuICAgIH1cblxuICAgIHRoaXMudXBkYXRlQm91bmRzKHRydWUpO1xuICAgIHRoaXMudXBkYXRlU3RpY2t5U3RhdGUodHJ1ZSk7XG5cbiAgfVxuXG4gIGlmICghdGhpcy5jYW5TdGlja3koKSkge1xuICAgIHZhciBoZWlnaHQgPSB0aGlzLnN0YXRlLmJvdW5kcy5oZWlnaHQ7XG4gICAgaGVpZ2h0ID0gKCF0aGlzLnN0YXRlLnN0aWNreSB8fCBoZWlnaHQgPT09IG51bGwpID8gJ2F1dG8nIDogaGVpZ2h0ICsgJ3B4JztcbiAgICB0aGlzLndyYXBwZXIuc3R5bGUuaGVpZ2h0ID0gaGVpZ2h0O1xuICB9XG5cbiAgdmFyIGNsYXNzTmFtZSA9IHRoaXMuZWwuY2xhc3NOYW1lO1xuICB2YXIgaGFzU3RhdGVDbGFzcyA9IGNsYXNzTmFtZS5pbmRleE9mKHRoaXMub3B0aW9ucy5zdGF0ZWNsYXNzTmFtZSkgPiAtMTtcbiAgaWYgKHRoaXMuc3RhdGUuc3RpY2t5ICYmICFoYXNTdGF0ZUNsYXNzKSB7XG4gICAgY2xhc3NOYW1lID0gY2xhc3NOYW1lICsgJyAnICsgdGhpcy5vcHRpb25zLnN0YXRlY2xhc3NOYW1lO1xuICB9IGVsc2UgaWYgKCF0aGlzLnN0YXRlLnN0aWNreSAmJiBoYXNTdGF0ZUNsYXNzKSB7XG4gICAgY2xhc3NOYW1lID0gY2xhc3NOYW1lLnNwbGl0KHRoaXMub3B0aW9ucy5zdGF0ZWNsYXNzTmFtZSkuam9pbignJyk7XG4gIH1cblxuICBpZiAodGhpcy5lbC5jbGFzc05hbWUgIT09IGNsYXNzTmFtZSkge1xuICAgIHRoaXMuZWwuY2xhc3NOYW1lID0gY2xhc3NOYW1lO1xuICB9XG5cbiAgcmV0dXJuIHRoaXMuZWw7XG59O1xuXG5TdGlja3lTdGF0ZS5hcHBseSA9IGZ1bmN0aW9uKGVsZW1lbnRzKSB7XG4gIGlmIChlbGVtZW50cykge1xuICAgIGlmIChlbGVtZW50cy5sZW5ndGgpIHtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZWxlbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgbmV3IFN0aWNreVN0YXRlKGVsZW1lbnRzW2ldKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgbmV3IFN0aWNreVN0YXRlKGVsZW1lbnRzKTtcbiAgICB9XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU3RpY2t5U3RhdGU7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNCBTw7Zua2UgS2x1dGhcbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5IG9mXG4gKiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluXG4gKiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvXG4gKiB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZlxuICogdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLFxuICogc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW4gYWxsXG4gKiBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTXG4gKiBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1JcbiAqIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUlxuICogSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU5cbiAqIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG4gKiovXG5cbihmdW5jdGlvbihleHBvcnRzKSB7XG5cbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICB2YXIgZGVsZWdhdGUgPSBmdW5jdGlvbih0YXJnZXQsIGhhbmRsZXIpIHtcbiAgICAgICAgLy8gR2V0IGFueSBleHRyYSBhcmd1bWVudHMgZm9yIGhhbmRsZXJcbiAgICAgICAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG5cbiAgICAgICAgLy8gQ3JlYXRlIGRlbGVnYXRlIGZ1bmN0aW9uXG4gICAgICAgIHZhciBmbiA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgICAgICAvLyBDYWxsIGhhbmRsZXIgd2l0aCBhcmd1bWVudHNcbiAgICAgICAgICAgIHJldHVybiBoYW5kbGVyLmFwcGx5KHRhcmdldCwgYXJncyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gUmV0dXJuIHRoZSBkZWxlZ2F0ZSBmdW5jdGlvbi5cbiAgICAgICAgcmV0dXJuIGZuO1xuICAgIH07XG5cblxuICAgICh0eXBlb2YgbW9kdWxlICE9IFwidW5kZWZpbmVkXCIgJiYgbW9kdWxlLmV4cG9ydHMpID8gKG1vZHVsZS5leHBvcnRzID0gZGVsZWdhdGUpIDogKHR5cGVvZiBkZWZpbmUgIT0gXCJ1bmRlZmluZWRcIiA/IChkZWZpbmUoZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBkZWxlZ2F0ZTtcbiAgICB9KSkgOiAoZXhwb3J0cy5kZWxlZ2F0ZSA9IGRlbGVnYXRlKSk7XG5cbn0pKHRoaXMpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vL0lFOFxuaWYgKCFBcnJheS5wcm90b3R5cGUuaW5kZXhPZikge1xuICBBcnJheS5wcm90b3R5cGUuaW5kZXhPZiA9IGZ1bmN0aW9uKG9iaiwgc3RhcnQpIHtcbiAgICBmb3IgKHZhciBpID0gKHN0YXJ0IHx8IDApLCBqID0gdGhpcy5sZW5ndGg7IGkgPCBqOyBpKyspIHtcbiAgICAgIGlmICh0aGlzW2ldID09PSBvYmopIHtcbiAgICAgICAgcmV0dXJuIGk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiAtMTtcbiAgfTtcbn1cblxudmFyIEV2ZW50RGlzcGF0Y2hlciA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLl9ldmVudE1hcCA9IHt9O1xuICB0aGlzLl9kZXN0cm95ZWQgPSBmYWxzZTtcbn07XG5cbkV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUgPSB7XG5cbiAgYWRkTGlzdGVuZXI6IGZ1bmN0aW9uKGV2ZW50LCBsaXN0ZW5lcikge1xuXG4gICAgdGhpcy5nZXRMaXN0ZW5lcihldmVudCkgfHwgKHRoaXMuX2V2ZW50TWFwW2V2ZW50XSA9IFtdKTtcblxuICAgIGlmICh0aGlzLmdldExpc3RlbmVyKGV2ZW50KS5pbmRleE9mKGxpc3RlbmVyKSA9PSAtMSkge1xuICAgICAgdGhpcy5fZXZlbnRNYXBbZXZlbnRdLnB1c2gobGlzdGVuZXIpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIGFkZExpc3RlbmVyT25jZTogZnVuY3Rpb24oZXZlbnQsIGxpc3RlbmVyKSB7XG4gICAgdmFyIHMgPSB0aGlzO1xuICAgIHZhciBmMiA9IGZ1bmN0aW9uKCkge1xuICAgICAgcy5yZW1vdmVMaXN0ZW5lcihldmVudCwgZjIpO1xuICAgICAgcmV0dXJuIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgICByZXR1cm4gdGhpcy5hZGRMaXN0ZW5lcihldmVudCwgZjIpO1xuICB9LFxuXG4gIHJlbW92ZUxpc3RlbmVyOiBmdW5jdGlvbihldmVudCwgbGlzdGVuZXIpIHtcblxuICAgIHZhciBsaXN0ZW5lcnMgPSB0aGlzLmdldExpc3RlbmVyKGV2ZW50KTtcbiAgICBpZiAobGlzdGVuZXJzKSB7XG4gICAgICB2YXIgaSA9IGxpc3RlbmVycy5pbmRleE9mKGxpc3RlbmVyKTtcbiAgICAgIGlmIChpID4gLTEpIHtcbiAgICAgICAgdGhpcy5fZXZlbnRNYXBbZXZlbnRdID0gbGlzdGVuZXJzLnNwbGljZShpLCAxKTtcbiAgICAgICAgaWYgKGxpc3RlbmVycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICBkZWxldGUodGhpcy5fZXZlbnRNYXBbZXZlbnRdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIHJlbW92ZUFsbExpc3RlbmVyOiBmdW5jdGlvbihldmVudCkge1xuXG4gICAgdmFyIGxpc3RlbmVycyA9IHRoaXMuZ2V0TGlzdGVuZXIoZXZlbnQpO1xuICAgIGlmIChsaXN0ZW5lcnMpIHtcbiAgICAgIHRoaXMuX2V2ZW50TWFwW2V2ZW50XS5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlKHRoaXMuX2V2ZW50TWFwW2V2ZW50XSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIGRpc3BhdGNoOiBmdW5jdGlvbihldmVudFR5cGUsIGV2ZW50T2JqZWN0KSB7XG5cbiAgICB2YXIgbGlzdGVuZXJzID0gdGhpcy5nZXRMaXN0ZW5lcihldmVudFR5cGUpO1xuXG4gICAgaWYgKGxpc3RlbmVycykge1xuXG4gICAgICAvL3ZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgIGV2ZW50T2JqZWN0ID0gKGV2ZW50T2JqZWN0KSA/IGV2ZW50T2JqZWN0IDoge307XG4gICAgICBldmVudE9iamVjdC50eXBlID0gZXZlbnRUeXBlO1xuICAgICAgZXZlbnRPYmplY3QudGFyZ2V0ID0gZXZlbnRPYmplY3QudGFyZ2V0IHx8IHRoaXM7XG4gICAgICB2YXIgaSA9IC0xO1xuICAgICAgd2hpbGUgKCsraSA8IGxpc3RlbmVycy5sZW5ndGgpIHtcblxuICAgICAgICAvL2FyZ3MgPyBsaXN0ZW5lcnNbaV0uYXBwbHkobnVsbCwgYXJncykgOiBsaXN0ZW5lcnNbaV0oKTtcbiAgICAgICAgbGlzdGVuZXJzW2ldLmNhbGwobnVsbCwgZXZlbnRPYmplY3QpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBjb25zb2xlLmluZm8oJ05vYm9keSBpcyBsaXN0ZW5pbmcgdG8gJyArIGV2ZW50KTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICBnZXRMaXN0ZW5lcjogZnVuY3Rpb24oZXZlbnQpIHtcbiAgICBpZiAodGhpcy5fZGVzdHJveWVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0kgYW0gZGVzdHJveWVkJyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9ldmVudE1hcFtldmVudF07XG4gIH0sXG5cbiAgZGVzdHJveTogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuX2V2ZW50TWFwKSB7XG4gICAgICBmb3IgKHZhciBpIGluIHRoaXMuX2V2ZW50TWFwKSB7XG4gICAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXIoaSk7XG4gICAgICB9XG4gICAgICAvL1RPRE8gbGVhdmUgYW4gZW1wdHkgb2JqZWN0IGlzIGJldHRlciB0aGVuIHRocm93aW5nIGFuIGVycm9yIHdoZW4gdXNpbmcgYSBmbiBhZnRlciBkZXN0cm95P1xuICAgICAgdGhpcy5fZXZlbnRNYXAgPSBudWxsO1xuICAgIH1cbiAgICB0aGlzLl9kZXN0cm95ZWQgPSB0cnVlO1xuICB9XG59O1xuXG4vL01ldGhvZCBNYXBcbkV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUub24gPSBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLmJpbmQgPSBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLmFkZEV2ZW50TGlzdGVuZXIgPSBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5vZmYgPSBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLnVuYmluZCA9IEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUucmVtb3ZlRXZlbnRMaXN0ZW5lciA9IEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXI7XG5FdmVudERpc3BhdGNoZXIucHJvdG90eXBlLm9uY2UgPSBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLm9uZSA9IEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUuYWRkTGlzdGVuZXJPbmNlO1xuRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS50cmlnZ2VyID0gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5kaXNwYXRjaEV2ZW50ID0gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5kaXNwYXRjaDtcblxubW9kdWxlLmV4cG9ydHMgPSBFdmVudERpc3BhdGNoZXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qXG4gKiBGYXN0U2Nyb2xsXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc29lbmtla2x1dGgvZmFzdHNjcm9sbFxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNCBTw7Zua2UgS2x1dGhcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZS5cbiAqL1xuXG52YXIgZGVsZWdhdGUgPSByZXF1aXJlKCdkZWxlZ2F0ZWpzJyk7XG52YXIgRXZlbnREaXNwYXRjaGVyID0gcmVxdWlyZSgnLi9ldmVudGRpc3BhdGNoZXInKTtcblxudmFyIEZhc3RTY3JvbGwgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gIHRoaXMub3B0aW9ucyA9IChvcHRpb25zIHx8IHt9KTtcbiAgdGhpcy5lbGVtZW50ID0gdGhpcy5vcHRpb25zLmVsIHx8IMKgd2luZG93O1xuICBpZiAodGhpcy5lbGVtZW50KSB7XG4gICAgdGhpcy5pbml0KCk7XG4gIH1cbn07XG5cbkZhc3RTY3JvbGwucHJvdG90eXBlID0ge1xuXG4gIGRlc3Ryb3llZDogZmFsc2UsXG4gIHNjcm9sbGluZzogZmFsc2UsXG4gIHNjcm9sbFk6IDAsXG4gIHNjcm9sbFg6IDAsXG4gIGxhc3RTY3JvbGxZOiAwLFxuICBsYXN0U2Nyb2xsWDogMCxcbiAgc3RvcEZyYW1lczogNSxcbiAgY3VycmVudFN0b3BGcmFtZXM6IDAsXG4gIGZpcnN0UmVuZGVyOiB0cnVlLFxuICBzcGVlZFk6IDAsXG4gIHNwZWVkWDogMCxcblxuICBfaGFzUmVxdWVzdGVkQW5pbWF0aW9uRnJhbWU6IGZhbHNlLFxuXG4gIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuZGlzcGF0Y2hlciA9IG5ldyBFdmVudERpc3BhdGNoZXIoKTtcbiAgICBpZiAodGhpcy5lbGVtZW50ID09PSB3aW5kb3cpIHtcbiAgICAgIHRoaXMudXBkYXRlU2Nyb2xsUG9zaXRpb24gPSBkZWxlZ2F0ZSh0aGlzLCB0aGlzLnVwZGF0ZVdpbmRvd1Njcm9sbFBvc2l0aW9uKTtcbiAgICB9ZWxzZSB7XG4gICAgICB0aGlzLnVwZGF0ZVNjcm9sbFBvc2l0aW9uID0gZGVsZWdhdGUodGhpcywgdGhpcy51cGRhdGVFbGVtZW50U2Nyb2xsUG9zaXRpb24pO1xuICAgIH1cbiAgICB0aGlzLm9uU2Nyb2xsRGVsZWdhdGUgPSBkZWxlZ2F0ZSh0aGlzLCB0aGlzLm9uU2Nyb2xsKTtcbiAgICB0aGlzLm9uQW5pbWF0aW9uRnJhbWVEZWxlZ2F0ZSA9IGRlbGVnYXRlKHRoaXMsIHRoaXMub25BbmltYXRpb25GcmFtZSk7XG4gICAgdGhpcy5lbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3Njcm9sbCcsIHRoaXMub25TY3JvbGxEZWxlZ2F0ZSwgZmFsc2UpO1xuICB9LFxuXG4gIGRlc3Ryb3k6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuZWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdzY3JvbGwnLCB0aGlzLm9uU2Nyb2xsRGVsZWdhdGUpO1xuICAgIHRoaXMub25TY3JvbGxEZWxlZ2F0ZSA9IG51bGw7XG4gICAgdGhpcy5lbGVtZW50ID0gbnVsbDtcbiAgICB0aGlzLm9wdGlvbnMgPSBudWxsO1xuICAgIHRoaXMuZGVzdHJveWVkID0gdHJ1ZTtcbiAgfSxcblxuICBnZXRBdHRyaWJ1dGVzOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgc2Nyb2xsWTogdGhpcy5zY3JvbGxZLFxuICAgICAgc2Nyb2xsWDogdGhpcy5zY3JvbGxYLFxuICAgICAgc3BlZWRZOiB0aGlzLnNwZWVkWSxcbiAgICAgIHNwZWVkWDogdGhpcy5zcGVlZFgsXG4gICAgICBhbmdsZTogMCxcbiAgICAgIC8vVE9ETyBub3Qgc2F2ZSBmb3Igbm93Li4uIGRvIGxpa2UgY2hlY2tTY3JvbGxzdG9wXG4gICAgICBkaXJlY3Rpb246IHRoaXMuc3BlZWRZID09PSAwID8gJ25vbmUnIDogKHRoaXMuc3BlZWRZID4gMCkgPyAndXAnIDogJ2Rvd24nXG4gICAgfTtcbiAgfSxcblxuICB1cGRhdGVXaW5kb3dTY3JvbGxQb3NpdGlvbjogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zY3JvbGxZID0gdGhpcy5lbGVtZW50LnNjcm9sbFkgfHwgdGhpcy5lbGVtZW50LnBhZ2VZT2Zmc2V0IHx8IDA7XG4gICAgdGhpcy5zY3JvbGxYID0gdGhpcy5lbGVtZW50LnNjcm9sbFggfHwgdGhpcy5lbGVtZW50LnBhZ2VYT2Zmc2V0IHx8IDA7XG4gIH0sXG5cbiAgdXBkYXRlRWxlbWVudFNjcm9sbFBvc2l0aW9uOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnNjcm9sbFkgPSB0aGlzLmVsZW1lbnQuc2Nyb2xsVG9wO1xuICAgIHRoaXMuc2Nyb2xsWCA9IHRoaXMuZWxlbWVudC5zY3JvbGxMZWZ0O1xuICB9LFxuXG4gIG9uU2Nyb2xsOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnVwZGF0ZVNjcm9sbFBvc2l0aW9uKCk7XG4gICAgdGhpcy5jdXJyZW50U3RvcEZyYW1lcyA9IDA7XG4gICAgdGhpcy5zY3JvbGxpbmcgPSB0cnVlO1xuXG4gICAgaWYgKHRoaXMuZmlyc3RSZW5kZXIpIHtcbiAgICAgIGlmICh0aGlzLnNjcm9sbFkgPiAxKSB7XG4gICAgICAgIHRoaXMuY3VycmVudFN0b3BGcmFtZXMgPSB0aGlzLnN0b3BGcmFtZXMgLSAxO1xuICAgICAgfVxuICAgICAgdGhpcy5maXJzdFJlbmRlciA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5faGFzUmVxdWVzdGVkQW5pbWF0aW9uRnJhbWUpIHtcbiAgICAgIHRoaXMuX2hhc1JlcXVlc3RlZEFuaW1hdGlvbkZyYW1lID0gdHJ1ZTtcbiAgICAgIHZhciBhdHRyID0gdGhpcy5nZXRBdHRyaWJ1dGVzKCk7XG4gICAgICB0aGlzLmRpc3BhdGNoRXZlbnQoJ3Njcm9sbDpzdGFydCcsIGF0dHIpO1xuICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHRoaXMub25BbmltYXRpb25GcmFtZURlbGVnYXRlKTtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuc3RhcnQpIHtcbiAgICAgICAgdGhpcy5vcHRpb25zLnN0YXJ0LmNhbGwodGhpcywgYXR0cik7XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIG9uQW5pbWF0aW9uRnJhbWU6IGZ1bmN0aW9uKCkge1xuXG4gICAgaWYgKHRoaXMuZGVzdHJveWVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy51cGRhdGVTY3JvbGxQb3NpdGlvbigpO1xuXG4gICAgdGhpcy5zcGVlZFkgPSB0aGlzLmxhc3RTY3JvbGxZIC0gdGhpcy5zY3JvbGxZO1xuICAgIHRoaXMuc3BlZWRYID0gdGhpcy5sYXN0U2Nyb2xsWCAtIHRoaXMuc2Nyb2xsWDtcblxuICAgIHRoaXMubGFzdFNjcm9sbFkgPSB0aGlzLnNjcm9sbFk7XG4gICAgdGhpcy5sYXN0U2Nyb2xsWCA9IHRoaXMuc2Nyb2xsWDtcblxuICAgIGlmICh0aGlzLnNwZWVkWSA9PT0gMCAmJiB0aGlzLnNjcm9sbGluZyAmJiAodGhpcy5jdXJyZW50U3RvcEZyYW1lcysrID4gdGhpcy5zdG9wRnJhbWVzKSkge1xuICAgICAgdGhpcy5vblNjcm9sbFN0b3AoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgYXR0ciA9IHRoaXMuZ2V0QXR0cmlidXRlcygpO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudCgnc2Nyb2xsOnByb2dyZXNzJywgYXR0cik7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnNjcm9sbGluZykge1xuICAgICAgdGhpcy5vcHRpb25zLnNjcm9sbGluZy5jYWxsKHRoaXMsIGF0dHIpO1xuICAgIH1cblxuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSh0aGlzLm9uQW5pbWF0aW9uRnJhbWVEZWxlZ2F0ZSk7XG4gIH0sXG5cbiAgb25TY3JvbGxTdG9wOiBmdW5jdGlvbigpIHtcblxuICAgIHRoaXMuc2Nyb2xsaW5nID0gZmFsc2U7XG4gICAgdGhpcy5faGFzUmVxdWVzdGVkQW5pbWF0aW9uRnJhbWUgPSBmYWxzZTtcbiAgICB0aGlzLmN1cnJlbnRTdG9wRnJhbWVzID0gMDtcbiAgICB2YXIgYXR0ciA9IHRoaXMuZ2V0QXR0cmlidXRlcygpO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudCgnc2Nyb2xsOnN0b3AnLCBhdHRyKTtcbiAgICBpZiAodGhpcy5vcHRpb25zLnN0b3ApIHtcbiAgICAgIHRoaXMub3B0aW9ucy5zdG9wLmNhbGwodGhpcywgYXR0cik7XG4gICAgfVxuICB9LFxuXG4gIGRpc3BhdGNoRXZlbnQ6IGZ1bmN0aW9uKHR5cGUsIGV2ZW50T2JqZWN0KSB7XG4gICAgZXZlbnRPYmplY3QgPSBldmVudE9iamVjdCB8fCB0aGlzLmdldEF0dHJpYnV0ZXMoKTtcbiAgICBldmVudE9iamVjdC50YXJnZXQgPSB0aGlzLmVsZW1lbnQ7XG4gICAgZXZlbnRPYmplY3QuZGV0YWlsID0gZXZlbnRPYmplY3Q7XG4gICAgdGhpcy5kaXNwYXRjaGVyLmRpc3BhdGNoKHR5cGUsIGV2ZW50T2JqZWN0KTtcbiAgfSxcblxuICBvbjogZnVuY3Rpb24oZXZlbnQsIGxpc3RlbmVyKSB7XG4gICAgcmV0dXJuIHRoaXMuZGlzcGF0Y2hlci5vbihldmVudCwgbGlzdGVuZXIpO1xuICB9LFxuXG4gIG9mZjogZnVuY3Rpb24oZXZlbnQsIGxpc3RlbmVyKSB7XG4gICAgcmV0dXJuIHRoaXMuZGlzcGF0Y2hlci5vZmYoZXZlbnQsIGxpc3RlbmVyKTtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBGYXN0U2Nyb2xsO1xuIiwiLyogZXNsaW50LWRpc2FibGUgbm8tdW51c2VkLXZhcnMgKi9cbid1c2Ugc3RyaWN0JztcbnZhciBoYXNPd25Qcm9wZXJ0eSA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG52YXIgcHJvcElzRW51bWVyYWJsZSA9IE9iamVjdC5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGU7XG5cbmZ1bmN0aW9uIHRvT2JqZWN0KHZhbCkge1xuXHRpZiAodmFsID09PSBudWxsIHx8IHZhbCA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignT2JqZWN0LmFzc2lnbiBjYW5ub3QgYmUgY2FsbGVkIHdpdGggbnVsbCBvciB1bmRlZmluZWQnKTtcblx0fVxuXG5cdHJldHVybiBPYmplY3QodmFsKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBPYmplY3QuYXNzaWduIHx8IGZ1bmN0aW9uICh0YXJnZXQsIHNvdXJjZSkge1xuXHR2YXIgZnJvbTtcblx0dmFyIHRvID0gdG9PYmplY3QodGFyZ2V0KTtcblx0dmFyIHN5bWJvbHM7XG5cblx0Zm9yICh2YXIgcyA9IDE7IHMgPCBhcmd1bWVudHMubGVuZ3RoOyBzKyspIHtcblx0XHRmcm9tID0gT2JqZWN0KGFyZ3VtZW50c1tzXSk7XG5cblx0XHRmb3IgKHZhciBrZXkgaW4gZnJvbSkge1xuXHRcdFx0aWYgKGhhc093blByb3BlcnR5LmNhbGwoZnJvbSwga2V5KSkge1xuXHRcdFx0XHR0b1trZXldID0gZnJvbVtrZXldO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmIChPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKSB7XG5cdFx0XHRzeW1ib2xzID0gT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyhmcm9tKTtcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgc3ltYm9scy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRpZiAocHJvcElzRW51bWVyYWJsZS5jYWxsKGZyb20sIHN5bWJvbHNbaV0pKSB7XG5cdFx0XHRcdFx0dG9bc3ltYm9sc1tpXV0gPSBmcm9tW3N5bWJvbHNbaV1dO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHRvO1xufTtcbiJdfQ==
