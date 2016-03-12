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

function getSrollPosition() {
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



function getFastScroll(scrollTarget) {
  if (!scrollTarget) {
    scrollTarget = window;
  }
  if (!_globals[scrollTarget]) {
    _globals[scrollTarget] = new FastScroll({el: scrollTarget});
  }
  return _globals[scrollTarget];
}

var StickyState = function(element, options) {
  if (!element) {
    throw new Error('StickyState needs a DomElement');
  }

  this.el = element;
  this.options = assign({}, defaults, {scrollTarget: window}, options);

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

  if (!this.canSticky()) {
    rect = getAbsolutBoundingRect(this.child);
    if (this.options.scrollTarget !== window) {
      rect = addBounds(rect, getAbsolutBoundingRect(this.options.scrollTarget));
    }
  }else {
    var elem = getPreviousElementSibling(this.child);
    var offset = 0;

    if (elem) {
      offset = parseInt(window.getComputedStyle(elem)['margin-bottom']);
      offset = offset || 0;
      rect = getAbsolutBoundingRect(elem);
      if (this.options.scrollTarget !== window) {
        rect = addBounds(rect, getAbsolutBoundingRect(this.options.scrollTarget));
      }

      rect.top  = rect.bottom + offset;

    }else {
      elem = this.child.parentNode;
      offset = parseInt(window.getComputedStyle(elem)['padding-top']);
      offset = offset || 0;
      rect = getAbsolutBoundingRect(elem);
      if (this.options.scrollTarget !== window) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9kZWxlZ2F0ZWpzL2RlbGVnYXRlLmpzIiwibm9kZV9tb2R1bGVzL2Zhc3RzY3JvbGwvc3JjL2V2ZW50ZGlzcGF0Y2hlci5qcyIsIm5vZGVfbW9kdWxlcy9mYXN0c2Nyb2xsL3NyYy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9vYmplY3QtYXNzaWduL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNVZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBhc3NpZ24gPSByZXF1aXJlKCdvYmplY3QtYXNzaWduJyk7XG52YXIgRmFzdFNjcm9sbCA9IHJlcXVpcmUoJ2Zhc3RzY3JvbGwnKTtcblxudmFyIF9nbG9iYWxzID0ge1xuICBmZWF0dXJlVGVzdGVkOiBmYWxzZVxufTtcblxudmFyIGRlZmF1bHRzID0ge1xuICBzY3JvbGxUYXJnZXQ6IG51bGwsXG4gIGRpc2FibGVkOiBmYWxzZSxcbiAgY2xhc3NOYW1lOiAnc3RpY2t5JyxcbiAgdXNlQW5pbWF0aW9uRnJhbWU6IGZhbHNlLFxuICBzdGF0ZWNsYXNzTmFtZTogJ2lzLXN0aWNreSdcbn07XG5cbmZ1bmN0aW9uIGdldFNyb2xsUG9zaXRpb24oKSB7XG4gIHJldHVybiAod2luZG93LnNjcm9sbFkgfHwgd2luZG93LnBhZ2VZT2Zmc2V0IHx8IDApO1xufVxuXG5mdW5jdGlvbiBnZXRBYnNvbHV0Qm91bmRpbmdSZWN0KGVsKSB7XG4gIHZhciByZWN0ID0gZWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gIHZhciBzY3JvbGxQb3MgPSBnZXRTcm9sbFBvc2l0aW9uKCk7XG4gIHZhciB0b3AgPSByZWN0LnRvcCArIHNjcm9sbFBvcztcbiAgcmV0dXJuIHtcbiAgICB0b3A6IHRvcCxcbiAgICBib3R0b206IHRvcCArIHJlY3QuaGVpZ2h0LFxuICAgIGhlaWdodDogcmVjdC5oZWlnaHQsXG4gICAgd2lkdGg6IHJlY3Qud2lkdGhcbiAgfTtcbn1cblxuZnVuY3Rpb24gYWRkQm91bmRzKHJlY3QxLCByZWN0Mikge1xuICB2YXIgcmVjdCA9IGFzc2lnbih7fSwgcmVjdDEpO1xuICByZWN0LnRvcCAtPSByZWN0Mi50b3A7XG4gIHJlY3QuYm90dG9tID0gcmVjdC50b3AgKyByZWN0MS5oZWlnaHQ7XG4gIHJldHVybiByZWN0O1xufVxuXG5mdW5jdGlvbiBnZXRQcmV2aW91c0VsZW1lbnRTaWJsaW5nKGVsKSB7XG4gIHZhciBwcmV2ID0gZWwucHJldmlvdXNFbGVtZW50U2libGluZztcbiAgaWYgKHByZXYgJiYgcHJldi50YWdOYW1lLnRvTG9jYWxlTG93ZXJDYXNlKCkgPT09ICdzY3JpcHQnKSB7XG4gICAgcHJldiA9IGdldFByZXZpb3VzRWxlbWVudFNpYmxpbmcocHJldik7XG4gIH1cbiAgcmV0dXJuIHByZXY7XG59XG5cblxuXG5mdW5jdGlvbiBnZXRGYXN0U2Nyb2xsKHNjcm9sbFRhcmdldCkge1xuICBpZiAoIXNjcm9sbFRhcmdldCkge1xuICAgIHNjcm9sbFRhcmdldCA9IHdpbmRvdztcbiAgfVxuICBpZiAoIV9nbG9iYWxzW3Njcm9sbFRhcmdldF0pIHtcbiAgICBfZ2xvYmFsc1tzY3JvbGxUYXJnZXRdID0gbmV3IEZhc3RTY3JvbGwoe2VsOiBzY3JvbGxUYXJnZXR9KTtcbiAgfVxuICByZXR1cm4gX2dsb2JhbHNbc2Nyb2xsVGFyZ2V0XTtcbn1cblxudmFyIFN0aWNreVN0YXRlID0gZnVuY3Rpb24oZWxlbWVudCwgb3B0aW9ucykge1xuICBpZiAoIWVsZW1lbnQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1N0aWNreVN0YXRlIG5lZWRzIGEgRG9tRWxlbWVudCcpO1xuICB9XG5cbiAgdGhpcy5lbCA9IGVsZW1lbnQ7XG4gIHRoaXMub3B0aW9ucyA9IGFzc2lnbih7fSwgZGVmYXVsdHMsIHtzY3JvbGxUYXJnZXQ6IHdpbmRvd30sIG9wdGlvbnMpO1xuXG4gIHRoaXMuc3RhdGUgPSB7XG4gICAgc3RpY2t5OiBmYWxzZSxcbiAgICBib3VuZHM6IHtcbiAgICAgIHRvcDogbnVsbCxcbiAgICAgIGJvdHRvbTogbnVsbCxcbiAgICAgIGhlaWdodDogbnVsbCxcbiAgICAgIHdpZHRoOiBudWxsXG4gICAgfSxcbiAgICByZXN0cmljdDogbnVsbCxcbiAgICBzdHlsZToge1xuICAgICAgdG9wOiBudWxsLFxuICAgICAgYm90dG9tOiBudWxsXG4gICAgfVxuICB9O1xuXG4gIHRoaXMuY2hpbGQgPSB0aGlzLmVsO1xuICB0aGlzLmZpcnN0UmVuZGVyID0gdHJ1ZTtcbiAgdGhpcy5oYXNGZWF0dXJlID0gbnVsbDtcbiAgdGhpcy5zY3JvbGxIYW5kbGVyID0gbnVsbDtcbiAgdGhpcy5yZXNpemVIYW5kbGVyID0gbnVsbDtcbiAgdGhpcy5mYXN0U2Nyb2xsID0gbnVsbDtcbiAgdGhpcy53cmFwcGVyID0gbnVsbDtcblxuICB0aGlzLnVwZGF0ZURvbSA9IHRoaXMudXBkYXRlRG9tLmJpbmQodGhpcyk7XG4gIHRoaXMucmVuZGVyID0gKHRoaXMuc3RhdGUudXNlQW5pbWF0aW9uRnJhbWUgJiYgd2luZG93ICYmIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUpID8gdGhpcy5yZW5kZXJPbkFuaW1hdGlvbkZyYW1lLmJpbmQodGhpcykgOiB0aGlzLnVwZGF0ZURvbTtcblxuICB0aGlzLmFkZFNyb2xsSGFuZGxlcigpO1xuICB0aGlzLmFkZFJlc2l6ZUhhbmRsZXIoKTtcbiAgdGhpcy5yZW5kZXIoKTtcbn07XG5cblN0aWNreVN0YXRlLnByb3RvdHlwZS51cGRhdGVTdGF0ZSA9IGZ1bmN0aW9uKHZhbHVlcywgc2lsZW50KSB7XG4gIHNpbGVudCA9IHNpbGVudCA9PT0gdHJ1ZTtcbiAgdGhpcy5zdGF0ZSA9IGFzc2lnbih7fSwgdGhpcy5zdGF0ZSwgdmFsdWVzKTtcbiAgaWYgKCFzaWxlbnQpIHtcbiAgICB0aGlzLnJlbmRlcigpO1xuICB9XG59O1xuXG5TdGlja3lTdGF0ZS5wcm90b3R5cGUuZ2V0UG9zaXRpb25TdHlsZSA9IGZ1bmN0aW9uKCkge1xuXG4gIHZhciBvYmogPSB7XG4gICAgdG9wOiBudWxsLFxuICAgIGJvdHRvbTogbnVsbFxuICB9O1xuXG4gIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICB2YXIgdmFsdWUgPSBwYXJzZUludCh3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZSh0aGlzLmVsKVtrZXldKTtcbiAgICB2YWx1ZSA9IGlzTmFOKHZhbHVlKSA/IG51bGwgOiB2YWx1ZTtcbiAgICBvYmpba2V5XSA9IHZhbHVlO1xuICB9XG5cbiAgcmV0dXJuIG9iajtcbn07XG5cblN0aWNreVN0YXRlLnByb3RvdHlwZS51cGRhdGVCb3VuZHMgPSBmdW5jdGlvbihzaWxlbnQpIHtcbiAgc2lsZW50ID0gc2lsZW50ID09PSB0cnVlO1xuXG4gIHZhciBzdHlsZSA9IHRoaXMuZ2V0UG9zaXRpb25TdHlsZSgpO1xuICB2YXIgcmVjdDtcblxuICBpZiAoIXRoaXMuY2FuU3RpY2t5KCkpIHtcbiAgICByZWN0ID0gZ2V0QWJzb2x1dEJvdW5kaW5nUmVjdCh0aGlzLmNoaWxkKTtcbiAgICBpZiAodGhpcy5vcHRpb25zLnNjcm9sbFRhcmdldCAhPT0gd2luZG93KSB7XG4gICAgICByZWN0ID0gYWRkQm91bmRzKHJlY3QsIGdldEFic29sdXRCb3VuZGluZ1JlY3QodGhpcy5vcHRpb25zLnNjcm9sbFRhcmdldCkpO1xuICAgIH1cbiAgfWVsc2Uge1xuICAgIHZhciBlbGVtID0gZ2V0UHJldmlvdXNFbGVtZW50U2libGluZyh0aGlzLmNoaWxkKTtcbiAgICB2YXIgb2Zmc2V0ID0gMDtcblxuICAgIGlmIChlbGVtKSB7XG4gICAgICBvZmZzZXQgPSBwYXJzZUludCh3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShlbGVtKVsnbWFyZ2luLWJvdHRvbSddKTtcbiAgICAgIG9mZnNldCA9IG9mZnNldCB8fCAwO1xuICAgICAgcmVjdCA9IGdldEFic29sdXRCb3VuZGluZ1JlY3QoZWxlbSk7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLnNjcm9sbFRhcmdldCAhPT0gd2luZG93KSB7XG4gICAgICAgIHJlY3QgPSBhZGRCb3VuZHMocmVjdCwgZ2V0QWJzb2x1dEJvdW5kaW5nUmVjdCh0aGlzLm9wdGlvbnMuc2Nyb2xsVGFyZ2V0KSk7XG4gICAgICB9XG5cbiAgICAgIHJlY3QudG9wICA9IHJlY3QuYm90dG9tICsgb2Zmc2V0O1xuXG4gICAgfWVsc2Uge1xuICAgICAgZWxlbSA9IHRoaXMuY2hpbGQucGFyZW50Tm9kZTtcbiAgICAgIG9mZnNldCA9IHBhcnNlSW50KHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKGVsZW0pWydwYWRkaW5nLXRvcCddKTtcbiAgICAgIG9mZnNldCA9IG9mZnNldCB8fCAwO1xuICAgICAgcmVjdCA9IGdldEFic29sdXRCb3VuZGluZ1JlY3QoZWxlbSk7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLnNjcm9sbFRhcmdldCAhPT0gd2luZG93KSB7XG4gICAgICAgIHJlY3QgPSBhZGRCb3VuZHMocmVjdCwgZ2V0QWJzb2x1dEJvdW5kaW5nUmVjdCh0aGlzLm9wdGlvbnMuc2Nyb2xsVGFyZ2V0KSk7XG4gICAgICB9XG4gICAgICByZWN0LnRvcCA9ICByZWN0LnRvcCArICBvZmZzZXQ7XG4gICAgfVxuXG4gICAgcmVjdC5oZWlnaHQgPSB0aGlzLmNoaWxkLmNsaWVudEhlaWdodDtcbiAgICByZWN0LndpZHRoID0gdGhpcy5jaGlsZC5jbGllbnRXaWR0aDtcbiAgICByZWN0LmJvdHRvbSA9IHJlY3QudG9wICsgcmVjdC5oZWlnaHQ7XG4gIH1cblxuICB0aGlzLnVwZGF0ZVN0YXRlKHtcbiAgICBzdHlsZTogc3R5bGUsXG4gICAgYm91bmRzOiByZWN0LFxuICAgIHJlc3RyaWN0OiBnZXRBYnNvbHV0Qm91bmRpbmdSZWN0KHRoaXMuY2hpbGQucGFyZW50Tm9kZSlcbiAgfSwgc2lsZW50KTtcbn07XG5cblN0aWNreVN0YXRlLnByb3RvdHlwZS5jYW5TdGlja3kgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuaGFzRmVhdHVyZSAhPT0gbnVsbCkge1xuICAgIHJldHVybiB0aGlzLmhhc0ZlYXR1cmU7XG4gIH1cbiAgcmV0dXJuIHRoaXMuaGFzRmVhdHVyZSA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKHRoaXMuZWwpLnBvc2l0aW9uLm1hdGNoKCdzdGlja3knKTtcbn07XG5cblN0aWNreVN0YXRlLnByb3RvdHlwZS5hZGRTcm9sbEhhbmRsZXIgPSBmdW5jdGlvbigpIHtcbiAgaWYgKCF0aGlzLnNjcm9sbEhhbmRsZXIpIHtcbiAgICB0aGlzLmZhc3RTY3JvbGwgPSB0aGlzLmZhc3RTY3JvbGwgfHwgZ2V0RmFzdFNjcm9sbCh0aGlzLm9wdGlvbnMuc2Nyb2xsVGFyZ2V0KTtcbiAgICB0aGlzLnNjcm9sbEhhbmRsZXIgPSB0aGlzLnVwZGF0ZVN0aWNreVN0YXRlLmJpbmQodGhpcyk7XG4gICAgdGhpcy5mYXN0U2Nyb2xsLm9uKCdzY3JvbGw6c3RhcnQnLCB0aGlzLnNjcm9sbEhhbmRsZXIpO1xuICAgIHRoaXMuZmFzdFNjcm9sbC5vbignc2Nyb2xsOnByb2dyZXNzJywgdGhpcy5zY3JvbGxIYW5kbGVyKTtcbiAgICB0aGlzLmZhc3RTY3JvbGwub24oJ3Njcm9sbDpzdG9wJywgdGhpcy5zY3JvbGxIYW5kbGVyKTtcbiAgfVxufTtcblxuU3RpY2t5U3RhdGUucHJvdG90eXBlLnJlbW92ZVNyb2xsSGFuZGxlciA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5mYXN0U2Nyb2xsKSB7XG4gICAgdGhpcy5mYXN0U2Nyb2xsLm9mZignc2Nyb2xsOnN0YXJ0JywgdGhpcy5zY3JvbGxIYW5kbGVyKTtcbiAgICB0aGlzLmZhc3RTY3JvbGwub2ZmKCdzY3JvbGw6cHJvZ3Jlc3MnLCB0aGlzLnNjcm9sbEhhbmRsZXIpO1xuICAgIHRoaXMuZmFzdFNjcm9sbC5vZmYoJ3Njcm9sbDpzdG9wJywgdGhpcy5zY3JvbGxIYW5kbGVyKTtcbiAgICB0aGlzLmZhc3RTY3JvbGwuZGVzdHJveSgpO1xuICAgIHRoaXMuc2Nyb2xsSGFuZGxlciA9IG51bGw7XG4gICAgdGhpcy5mYXN0U2Nyb2xsID0gbnVsbDtcbiAgfVxufTtcblxuU3RpY2t5U3RhdGUucHJvdG90eXBlLmFkZFJlc2l6ZUhhbmRsZXIgPSBmdW5jdGlvbigpIHtcbiAgaWYgKCF0aGlzLnJlc2l6ZUhhbmRsZXIpIHtcbiAgICB0aGlzLnJlc2l6ZUhhbmRsZXIgPSB0aGlzLm9uUmVzaXplLmJpbmQodGhpcyk7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHRoaXMucmVzaXplSGFuZGxlciwgZmFsc2UpO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdvcmllbnRhdGlvbmNoYW5nZScsIHRoaXMucmVzaXplSGFuZGxlciwgZmFsc2UpO1xuICB9XG59O1xuXG5TdGlja3lTdGF0ZS5wcm90b3R5cGUucmVtb3ZlUmVzaXplSGFuZGxlciA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5yZXNpemVIYW5kbGVyKSB7XG4gICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHRoaXMucmVzaXplSGFuZGxlcik7XG4gICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ29yaWVudGF0aW9uY2hhbmdlJywgdGhpcy5yZXNpemVIYW5kbGVyKTtcbiAgICB0aGlzLnJlc2l6ZUhhbmRsZXIgPSBudWxsO1xuICB9XG59O1xuXG5TdGlja3lTdGF0ZS5wcm90b3R5cGUub25SZXNpemUgPSBmdW5jdGlvbihlKSB7XG4gIHRoaXMudXBkYXRlQm91bmRzKHRydWUpO1xuICB0aGlzLnVwZGF0ZVN0aWNreVN0YXRlKGZhbHNlKTtcbn07XG5cblN0aWNreVN0YXRlLnByb3RvdHlwZS51cGRhdGVTdGlja3lTdGF0ZSA9IGZ1bmN0aW9uKHNpbGVudCkge1xuXG4gIHZhciBjaGlsZCA9IHRoaXMuY2hpbGQ7XG5cbiAgc2lsZW50ID0gc2lsZW50ID09PSB0cnVlO1xuICB2YXIgc2Nyb2xsWSA9IHRoaXMuZmFzdFNjcm9sbC5zY3JvbGxZO1xuXG4gIHZhciB0b3AgPSB0aGlzLnN0YXRlLnN0eWxlLnRvcDtcbiAgdmFyIG9mZnNldEJvdHRvbTtcblxuICBpZiAodG9wICE9PSBudWxsKSB7XG4gICAgb2Zmc2V0Qm90dG9tID0gdGhpcy5zdGF0ZS5yZXN0cmljdC5ib3R0b20gLSB0aGlzLnN0YXRlLmJvdW5kcy5oZWlnaHQgLSB0b3A7XG4gICAgdG9wID0gdGhpcy5zdGF0ZS5ib3VuZHMudG9wIC0gdG9wO1xuXG4gICAgaWYgKHRoaXMuc3RhdGUuc3RpY2t5ID09PSBmYWxzZSAmJiBzY3JvbGxZID49IHRvcCAmJiBzY3JvbGxZIDw9IG9mZnNldEJvdHRvbSkge1xuICAgICAgdGhpcy51cGRhdGVTdGF0ZSh7XG4gICAgICAgIHN0aWNreTogdHJ1ZVxuICAgICAgfSwgc2lsZW50KTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuc3RhdGUuc3RpY2t5ICYmIChzY3JvbGxZIDwgdG9wIHx8IHNjcm9sbFkgPiBvZmZzZXRCb3R0b20pKSB7XG4gICAgICB0aGlzLnVwZGF0ZVN0YXRlKHtcbiAgICAgICAgc3RpY2t5OiBmYWxzZVxuICAgICAgfSwgc2lsZW50KTtcbiAgICB9XG5cbiAgICByZXR1cm47XG4gIH1cblxuICBzY3JvbGxZICs9IHdpbmRvdy5pbm5lckhlaWdodDtcbiAgdmFyIGJvdHRvbSA9IHRoaXMuc3RhdGUuc3R5bGUuYm90dG9tO1xuICBpZiAoYm90dG9tICE9PSBudWxsKSB7XG4gICAgb2Zmc2V0Qm90dG9tID0gdGhpcy5zdGF0ZS5yZXN0cmljdC50b3AgKyB0aGlzLnN0YXRlLmJvdW5kcy5oZWlnaHQgLSBib3R0b207XG4gICAgYm90dG9tID0gdGhpcy5zdGF0ZS5ib3VuZHMuYm90dG9tICsgYm90dG9tO1xuXG4gICAgaWYgKHRoaXMuc3RhdGUuc3RpY2t5ID09PSBmYWxzZSAmJiBzY3JvbGxZIDw9IGJvdHRvbSAmJiBzY3JvbGxZID49IG9mZnNldEJvdHRvbSkge1xuICAgICAgdGhpcy51cGRhdGVTdGF0ZSh7XG4gICAgICAgIHN0aWNreTogdHJ1ZVxuICAgICAgfSwgc2lsZW50KTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuc3RhdGUuc3RpY2t5ICYmIChzY3JvbGxZID4gYm90dG9tIHx8IHNjcm9sbFkgPCBvZmZzZXRCb3R0b20pKSB7XG4gICAgICB0aGlzLnVwZGF0ZVN0YXRlKHtcbiAgICAgICAgc3RpY2t5OiBmYWxzZVxuICAgICAgfSwgc2lsZW50KTtcbiAgICB9XG4gIH1cblxufTtcblxuU3RpY2t5U3RhdGUucHJvdG90eXBlLnJlbmRlck9uQW5pbWF0aW9uRnJhbWUgPSBmdW5jdGlvbigpIHtcbiAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSh0aGlzLnVwZGF0ZURvbSk7XG59O1xuXG5TdGlja3lTdGF0ZS5wcm90b3R5cGUudXBkYXRlRG9tID0gZnVuY3Rpb24oKSB7XG5cbiAgaWYgKHRoaXMuZmlyc3RSZW5kZXIpIHtcbiAgICB0aGlzLmZpcnN0UmVuZGVyID0gZmFsc2U7XG5cbiAgICBpZiAoIXRoaXMuY2FuU3RpY2t5KCkpIHtcbiAgICAgIHRoaXMud3JhcHBlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgdGhpcy53cmFwcGVyLmNsYXNzTmFtZSA9ICdzdGlja3ktd3JhcCc7XG4gICAgICB2YXIgcGFyZW50ID0gdGhpcy5lbC5wYXJlbnROb2RlO1xuICAgICAgaWYgKHBhcmVudCkge1xuICAgICAgICBwYXJlbnQuaW5zZXJ0QmVmb3JlKHRoaXMud3JhcHBlciwgdGhpcy5lbCk7XG4gICAgICB9XG4gICAgICB0aGlzLndyYXBwZXIuYXBwZW5kQ2hpbGQodGhpcy5lbCk7XG4gICAgICB0aGlzLmVsLmNsYXNzTmFtZSArPSAnIHN0aWNreS1maXhlZCc7XG4gICAgICB0aGlzLmNoaWxkID0gdGhpcy53cmFwcGVyO1xuICAgIH1cblxuICAgIHRoaXMudXBkYXRlQm91bmRzKHRydWUpO1xuICAgIHRoaXMudXBkYXRlU3RpY2t5U3RhdGUodHJ1ZSk7XG4gIH1cblxuICBpZiAoIXRoaXMuY2FuU3RpY2t5KCkpIHtcbiAgICB2YXIgaGVpZ2h0ID0gdGhpcy5zdGF0ZS5ib3VuZHMuaGVpZ2h0O1xuICAgIGhlaWdodCA9ICghdGhpcy5zdGF0ZS5zdGlja3kgfHwgaGVpZ2h0ID09PSBudWxsKSA/ICdhdXRvJyA6IGhlaWdodCArICdweCc7XG4gICAgdGhpcy53cmFwcGVyLnN0eWxlLmhlaWdodCA9IGhlaWdodDtcbiAgfVxuXG4gIHZhciBjbGFzc05hbWUgPSB0aGlzLmVsLmNsYXNzTmFtZTtcbiAgdmFyIGhhc1N0YXRlQ2xhc3MgPSBjbGFzc05hbWUuaW5kZXhPZih0aGlzLm9wdGlvbnMuc3RhdGVjbGFzc05hbWUpID4gLTE7XG4gIGlmICh0aGlzLnN0YXRlLnN0aWNreSAmJiAhaGFzU3RhdGVDbGFzcykge1xuICAgIGNsYXNzTmFtZSA9IGNsYXNzTmFtZSArICcgJyArIHRoaXMub3B0aW9ucy5zdGF0ZWNsYXNzTmFtZTtcbiAgfSBlbHNlIGlmICghdGhpcy5zdGF0ZS5zdGlja3kgJiYgaGFzU3RhdGVDbGFzcykge1xuICAgIGNsYXNzTmFtZSA9IGNsYXNzTmFtZS5zcGxpdCh0aGlzLm9wdGlvbnMuc3RhdGVjbGFzc05hbWUpLmpvaW4oJycpO1xuICB9XG5cbiAgaWYgKHRoaXMuZWwuY2xhc3NOYW1lICE9PSBjbGFzc05hbWUpIHtcbiAgICB0aGlzLmVsLmNsYXNzTmFtZSA9IGNsYXNzTmFtZTtcbiAgfVxuXG4gIHJldHVybiB0aGlzLmVsO1xufTtcblxuXG5TdGlja3lTdGF0ZS5uYXRpdmUgPSBmdW5jdGlvbigpIHtcbiAgaWYgKF9nbG9iYWxzLmZlYXR1cmVUZXN0ZWQpIHtcbiAgICByZXR1cm4gX2dsb2JhbHMuY2FuU3RpY2t5O1xuICB9XG4gIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xuICAgIHZhciB0ZXN0RWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuYXBwZW5kQ2hpbGQodGVzdEVsKTtcbiAgICB2YXIgcHJlZml4ZWRTdGlja3kgPSBbJ3N0aWNreScsICctd2Via2l0LXN0aWNreScsICctbW96LXN0aWNreScsICctbXMtc3RpY2t5JywgJy1vLXN0aWNreSddO1xuXG4gICAgX2dsb2JhbHMuY2FuU3RpY2t5ID0gZmFsc2U7XG5cbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgcHJlZml4ZWRTdGlja3kubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRlc3RFbC5zdHlsZS5wb3NpdGlvbiA9IHByZWZpeGVkU3RpY2t5W2ldO1xuICAgICAgX2dsb2JhbHMuY2FuU3RpY2t5ID0gISF3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZSh0ZXN0RWwpLnBvc2l0aW9uLm1hdGNoKCdzdGlja3knKTtcbiAgICAgIGlmKF9nbG9iYWxzLmNhblN0aWNreSl7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICBfZ2xvYmFscy5mZWF0dXJlVGVzdGVkID0gdHJ1ZTtcbiAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQucmVtb3ZlQ2hpbGQodGVzdEVsKTtcbiAgfVxuICByZXR1cm4gX2dsb2JhbHMuY2FuU3RpY2t5O1xufTtcblxuU3RpY2t5U3RhdGUuYXBwbHkgPSBmdW5jdGlvbihlbGVtZW50cykge1xuICBpZiAoZWxlbWVudHMpIHtcbiAgICBpZiAoZWxlbWVudHMubGVuZ3RoKSB7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGVsZW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG5ldyBTdGlja3lTdGF0ZShlbGVtZW50c1tpXSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIG5ldyBTdGlja3lTdGF0ZShlbGVtZW50cyk7XG4gICAgfVxuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFN0aWNreVN0YXRlO1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQgU8O2bmtlIEtsdXRoXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weSBvZlxuICogdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpblxuICogdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0b1xuICogdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2ZcbiAqIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbyxcbiAqIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluIGFsbFxuICogY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTU1xuICogRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SXG4gKiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVJcbiAqIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOXG4gKiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuICoqL1xuXG4oZnVuY3Rpb24oZXhwb3J0cykge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgdmFyIGRlbGVnYXRlID0gZnVuY3Rpb24odGFyZ2V0LCBoYW5kbGVyKSB7XG4gICAgICAgIC8vIEdldCBhbnkgZXh0cmEgYXJndW1lbnRzIGZvciBoYW5kbGVyXG4gICAgICAgIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpO1xuXG4gICAgICAgIC8vIENyZWF0ZSBkZWxlZ2F0ZSBmdW5jdGlvblxuICAgICAgICB2YXIgZm4gPSBmdW5jdGlvbigpIHtcblxuICAgICAgICAgICAgLy8gQ2FsbCBoYW5kbGVyIHdpdGggYXJndW1lbnRzXG4gICAgICAgICAgICByZXR1cm4gaGFuZGxlci5hcHBseSh0YXJnZXQsIGFyZ3MpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFJldHVybiB0aGUgZGVsZWdhdGUgZnVuY3Rpb24uXG4gICAgICAgIHJldHVybiBmbjtcbiAgICB9O1xuXG5cbiAgICAodHlwZW9mIG1vZHVsZSAhPSBcInVuZGVmaW5lZFwiICYmIG1vZHVsZS5leHBvcnRzKSA/IChtb2R1bGUuZXhwb3J0cyA9IGRlbGVnYXRlKSA6ICh0eXBlb2YgZGVmaW5lICE9IFwidW5kZWZpbmVkXCIgPyAoZGVmaW5lKGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gZGVsZWdhdGU7XG4gICAgfSkpIDogKGV4cG9ydHMuZGVsZWdhdGUgPSBkZWxlZ2F0ZSkpO1xuXG59KSh0aGlzKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLy9JRThcbmlmICghQXJyYXkucHJvdG90eXBlLmluZGV4T2YpIHtcbiAgQXJyYXkucHJvdG90eXBlLmluZGV4T2YgPSBmdW5jdGlvbihvYmosIHN0YXJ0KSB7XG4gICAgZm9yICh2YXIgaSA9IChzdGFydCB8fCAwKSwgaiA9IHRoaXMubGVuZ3RoOyBpIDwgajsgaSsrKSB7XG4gICAgICBpZiAodGhpc1tpXSA9PT0gb2JqKSB7XG4gICAgICAgIHJldHVybiBpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gLTE7XG4gIH07XG59XG5cbnZhciBFdmVudERpc3BhdGNoZXIgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5fZXZlbnRNYXAgPSB7fTtcbiAgdGhpcy5fZGVzdHJveWVkID0gZmFsc2U7XG59O1xuXG5FdmVudERpc3BhdGNoZXIucHJvdG90eXBlID0ge1xuXG4gIGFkZExpc3RlbmVyOiBmdW5jdGlvbihldmVudCwgbGlzdGVuZXIpIHtcblxuICAgIHRoaXMuZ2V0TGlzdGVuZXIoZXZlbnQpIHx8ICh0aGlzLl9ldmVudE1hcFtldmVudF0gPSBbXSk7XG5cbiAgICBpZiAodGhpcy5nZXRMaXN0ZW5lcihldmVudCkuaW5kZXhPZihsaXN0ZW5lcikgPT0gLTEpIHtcbiAgICAgIHRoaXMuX2V2ZW50TWFwW2V2ZW50XS5wdXNoKGxpc3RlbmVyKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICBhZGRMaXN0ZW5lck9uY2U6IGZ1bmN0aW9uKGV2ZW50LCBsaXN0ZW5lcikge1xuICAgIHZhciBzID0gdGhpcztcbiAgICB2YXIgZjIgPSBmdW5jdGlvbigpIHtcbiAgICAgIHMucmVtb3ZlTGlzdGVuZXIoZXZlbnQsIGYyKTtcbiAgICAgIHJldHVybiBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gICAgcmV0dXJuIHRoaXMuYWRkTGlzdGVuZXIoZXZlbnQsIGYyKTtcbiAgfSxcblxuICByZW1vdmVMaXN0ZW5lcjogZnVuY3Rpb24oZXZlbnQsIGxpc3RlbmVyKSB7XG5cbiAgICB2YXIgbGlzdGVuZXJzID0gdGhpcy5nZXRMaXN0ZW5lcihldmVudCk7XG4gICAgaWYgKGxpc3RlbmVycykge1xuICAgICAgdmFyIGkgPSBsaXN0ZW5lcnMuaW5kZXhPZihsaXN0ZW5lcik7XG4gICAgICBpZiAoaSA+IC0xKSB7XG4gICAgICAgIHRoaXMuX2V2ZW50TWFwW2V2ZW50XSA9IGxpc3RlbmVycy5zcGxpY2UoaSwgMSk7XG4gICAgICAgIGlmIChsaXN0ZW5lcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgZGVsZXRlKHRoaXMuX2V2ZW50TWFwW2V2ZW50XSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICByZW1vdmVBbGxMaXN0ZW5lcjogZnVuY3Rpb24oZXZlbnQpIHtcblxuICAgIHZhciBsaXN0ZW5lcnMgPSB0aGlzLmdldExpc3RlbmVyKGV2ZW50KTtcbiAgICBpZiAobGlzdGVuZXJzKSB7XG4gICAgICB0aGlzLl9ldmVudE1hcFtldmVudF0ubGVuZ3RoID0gMDtcbiAgICAgIGRlbGV0ZSh0aGlzLl9ldmVudE1hcFtldmVudF0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICBkaXNwYXRjaDogZnVuY3Rpb24oZXZlbnRUeXBlLCBldmVudE9iamVjdCkge1xuXG4gICAgdmFyIGxpc3RlbmVycyA9IHRoaXMuZ2V0TGlzdGVuZXIoZXZlbnRUeXBlKTtcblxuICAgIGlmIChsaXN0ZW5lcnMpIHtcblxuICAgICAgLy92YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICBldmVudE9iamVjdCA9IChldmVudE9iamVjdCkgPyBldmVudE9iamVjdCA6IHt9O1xuICAgICAgZXZlbnRPYmplY3QudHlwZSA9IGV2ZW50VHlwZTtcbiAgICAgIGV2ZW50T2JqZWN0LnRhcmdldCA9IGV2ZW50T2JqZWN0LnRhcmdldCB8fCB0aGlzO1xuICAgICAgdmFyIGkgPSAtMTtcbiAgICAgIHdoaWxlICgrK2kgPCBsaXN0ZW5lcnMubGVuZ3RoKSB7XG5cbiAgICAgICAgLy9hcmdzID8gbGlzdGVuZXJzW2ldLmFwcGx5KG51bGwsIGFyZ3MpIDogbGlzdGVuZXJzW2ldKCk7XG4gICAgICAgIGxpc3RlbmVyc1tpXS5jYWxsKG51bGwsIGV2ZW50T2JqZWN0KTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gY29uc29sZS5pbmZvKCdOb2JvZHkgaXMgbGlzdGVuaW5nIHRvICcgKyBldmVudCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgZ2V0TGlzdGVuZXI6IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgaWYgKHRoaXMuX2Rlc3Ryb3llZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJIGFtIGRlc3Ryb3llZCcpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fZXZlbnRNYXBbZXZlbnRdO1xuICB9LFxuXG4gIGRlc3Ryb3k6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLl9ldmVudE1hcCkge1xuICAgICAgZm9yICh2YXIgaSBpbiB0aGlzLl9ldmVudE1hcCkge1xuICAgICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVyKGkpO1xuICAgICAgfVxuICAgICAgLy9UT0RPIGxlYXZlIGFuIGVtcHR5IG9iamVjdCBpcyBiZXR0ZXIgdGhlbiB0aHJvd2luZyBhbiBlcnJvciB3aGVuIHVzaW5nIGEgZm4gYWZ0ZXIgZGVzdHJveT9cbiAgICAgIHRoaXMuX2V2ZW50TWFwID0gbnVsbDtcbiAgICB9XG4gICAgdGhpcy5fZGVzdHJveWVkID0gdHJ1ZTtcbiAgfVxufTtcblxuLy9NZXRob2QgTWFwXG5FdmVudERpc3BhdGNoZXIucHJvdG90eXBlLm9uID0gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5iaW5kID0gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5hZGRFdmVudExpc3RlbmVyID0gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcbkV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUub2ZmID0gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS51bmJpbmQgPSBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLnJlbW92ZUV2ZW50TGlzdGVuZXIgPSBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyO1xuRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5vbmNlID0gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5vbmUgPSBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLmFkZExpc3RlbmVyT25jZTtcbkV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUudHJpZ2dlciA9IEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUuZGlzcGF0Y2hFdmVudCA9IEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUuZGlzcGF0Y2g7XG5cbm1vZHVsZS5leHBvcnRzID0gRXZlbnREaXNwYXRjaGVyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKlxuICogRmFzdFNjcm9sbFxuICogaHR0cHM6Ly9naXRodWIuY29tL3NvZW5rZWtsdXRoL2Zhc3RzY3JvbGxcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQgU8O2bmtlIEtsdXRoXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UuXG4gKi9cblxudmFyIGRlbGVnYXRlID0gcmVxdWlyZSgnZGVsZWdhdGVqcycpO1xudmFyIEV2ZW50RGlzcGF0Y2hlciA9IHJlcXVpcmUoJy4vZXZlbnRkaXNwYXRjaGVyJyk7XG5cbnZhciBGYXN0U2Nyb2xsID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICB0aGlzLm9wdGlvbnMgPSAob3B0aW9ucyB8fCB7fSk7XG4gIHRoaXMuZWxlbWVudCA9IHRoaXMub3B0aW9ucy5lbCB8fCDCoHdpbmRvdztcbiAgaWYgKHRoaXMuZWxlbWVudCkge1xuICAgIHRoaXMuaW5pdCgpO1xuICB9XG59O1xuXG5GYXN0U2Nyb2xsLnByb3RvdHlwZSA9IHtcblxuICBkZXN0cm95ZWQ6IGZhbHNlLFxuICBzY3JvbGxpbmc6IGZhbHNlLFxuICBzY3JvbGxZOiAwLFxuICBzY3JvbGxYOiAwLFxuICBsYXN0U2Nyb2xsWTogMCxcbiAgbGFzdFNjcm9sbFg6IDAsXG4gIHN0b3BGcmFtZXM6IDUsXG4gIGN1cnJlbnRTdG9wRnJhbWVzOiAwLFxuICBmaXJzdFJlbmRlcjogdHJ1ZSxcbiAgc3BlZWRZOiAwLFxuICBzcGVlZFg6IDAsXG5cbiAgX2hhc1JlcXVlc3RlZEFuaW1hdGlvbkZyYW1lOiBmYWxzZSxcblxuICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmRpc3BhdGNoZXIgPSBuZXcgRXZlbnREaXNwYXRjaGVyKCk7XG4gICAgaWYgKHRoaXMuZWxlbWVudCA9PT0gd2luZG93KSB7XG4gICAgICB0aGlzLnVwZGF0ZVNjcm9sbFBvc2l0aW9uID0gZGVsZWdhdGUodGhpcywgdGhpcy51cGRhdGVXaW5kb3dTY3JvbGxQb3NpdGlvbik7XG4gICAgfWVsc2Uge1xuICAgICAgdGhpcy51cGRhdGVTY3JvbGxQb3NpdGlvbiA9IGRlbGVnYXRlKHRoaXMsIHRoaXMudXBkYXRlRWxlbWVudFNjcm9sbFBvc2l0aW9uKTtcbiAgICB9XG4gICAgdGhpcy5vblNjcm9sbERlbGVnYXRlID0gZGVsZWdhdGUodGhpcywgdGhpcy5vblNjcm9sbCk7XG4gICAgdGhpcy5vbkFuaW1hdGlvbkZyYW1lRGVsZWdhdGUgPSBkZWxlZ2F0ZSh0aGlzLCB0aGlzLm9uQW5pbWF0aW9uRnJhbWUpO1xuICAgIHRoaXMuZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdzY3JvbGwnLCB0aGlzLm9uU2Nyb2xsRGVsZWdhdGUsIGZhbHNlKTtcbiAgfSxcblxuICBkZXN0cm95OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignc2Nyb2xsJywgdGhpcy5vblNjcm9sbERlbGVnYXRlKTtcbiAgICB0aGlzLm9uU2Nyb2xsRGVsZWdhdGUgPSBudWxsO1xuICAgIHRoaXMuZWxlbWVudCA9IG51bGw7XG4gICAgdGhpcy5vcHRpb25zID0gbnVsbDtcbiAgICB0aGlzLmRlc3Ryb3llZCA9IHRydWU7XG4gIH0sXG5cbiAgZ2V0QXR0cmlidXRlczogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHNjcm9sbFk6IHRoaXMuc2Nyb2xsWSxcbiAgICAgIHNjcm9sbFg6IHRoaXMuc2Nyb2xsWCxcbiAgICAgIHNwZWVkWTogdGhpcy5zcGVlZFksXG4gICAgICBzcGVlZFg6IHRoaXMuc3BlZWRYLFxuICAgICAgYW5nbGU6IDAsXG4gICAgICAvL1RPRE8gbm90IHNhdmUgZm9yIG5vdy4uLiBkbyBsaWtlIGNoZWNrU2Nyb2xsc3RvcFxuICAgICAgZGlyZWN0aW9uOiB0aGlzLnNwZWVkWSA9PT0gMCA/ICdub25lJyA6ICh0aGlzLnNwZWVkWSA+IDApID8gJ3VwJyA6ICdkb3duJ1xuICAgIH07XG4gIH0sXG5cbiAgdXBkYXRlV2luZG93U2Nyb2xsUG9zaXRpb246IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc2Nyb2xsWSA9IHRoaXMuZWxlbWVudC5zY3JvbGxZIHx8IHRoaXMuZWxlbWVudC5wYWdlWU9mZnNldCB8fCAwO1xuICAgIHRoaXMuc2Nyb2xsWCA9IHRoaXMuZWxlbWVudC5zY3JvbGxYIHx8IHRoaXMuZWxlbWVudC5wYWdlWE9mZnNldCB8fCAwO1xuICB9LFxuXG4gIHVwZGF0ZUVsZW1lbnRTY3JvbGxQb3NpdGlvbjogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zY3JvbGxZID0gdGhpcy5lbGVtZW50LnNjcm9sbFRvcDtcbiAgICB0aGlzLnNjcm9sbFggPSB0aGlzLmVsZW1lbnQuc2Nyb2xsTGVmdDtcbiAgfSxcblxuICBvblNjcm9sbDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy51cGRhdGVTY3JvbGxQb3NpdGlvbigpO1xuICAgIHRoaXMuY3VycmVudFN0b3BGcmFtZXMgPSAwO1xuICAgIHRoaXMuc2Nyb2xsaW5nID0gdHJ1ZTtcblxuICAgIGlmICh0aGlzLmZpcnN0UmVuZGVyKSB7XG4gICAgICBpZiAodGhpcy5zY3JvbGxZID4gMSkge1xuICAgICAgICB0aGlzLmN1cnJlbnRTdG9wRnJhbWVzID0gdGhpcy5zdG9wRnJhbWVzIC0gMTtcbiAgICAgIH1cbiAgICAgIHRoaXMuZmlyc3RSZW5kZXIgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuX2hhc1JlcXVlc3RlZEFuaW1hdGlvbkZyYW1lKSB7XG4gICAgICB0aGlzLl9oYXNSZXF1ZXN0ZWRBbmltYXRpb25GcmFtZSA9IHRydWU7XG4gICAgICB2YXIgYXR0ciA9IHRoaXMuZ2V0QXR0cmlidXRlcygpO1xuICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KCdzY3JvbGw6c3RhcnQnLCBhdHRyKTtcbiAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSh0aGlzLm9uQW5pbWF0aW9uRnJhbWVEZWxlZ2F0ZSk7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLnN0YXJ0KSB7XG4gICAgICAgIHRoaXMub3B0aW9ucy5zdGFydC5jYWxsKHRoaXMsIGF0dHIpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICBvbkFuaW1hdGlvbkZyYW1lOiBmdW5jdGlvbigpIHtcblxuICAgIGlmICh0aGlzLmRlc3Ryb3llZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMudXBkYXRlU2Nyb2xsUG9zaXRpb24oKTtcblxuICAgIHRoaXMuc3BlZWRZID0gdGhpcy5sYXN0U2Nyb2xsWSAtIHRoaXMuc2Nyb2xsWTtcbiAgICB0aGlzLnNwZWVkWCA9IHRoaXMubGFzdFNjcm9sbFggLSB0aGlzLnNjcm9sbFg7XG5cbiAgICB0aGlzLmxhc3RTY3JvbGxZID0gdGhpcy5zY3JvbGxZO1xuICAgIHRoaXMubGFzdFNjcm9sbFggPSB0aGlzLnNjcm9sbFg7XG5cbiAgICBpZiAodGhpcy5zcGVlZFkgPT09IDAgJiYgdGhpcy5zY3JvbGxpbmcgJiYgKHRoaXMuY3VycmVudFN0b3BGcmFtZXMrKyA+IHRoaXMuc3RvcEZyYW1lcykpIHtcbiAgICAgIHRoaXMub25TY3JvbGxTdG9wKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGF0dHIgPSB0aGlzLmdldEF0dHJpYnV0ZXMoKTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQoJ3Njcm9sbDpwcm9ncmVzcycsIGF0dHIpO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5zY3JvbGxpbmcpIHtcbiAgICAgIHRoaXMub3B0aW9ucy5zY3JvbGxpbmcuY2FsbCh0aGlzLCBhdHRyKTtcbiAgICB9XG5cbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUodGhpcy5vbkFuaW1hdGlvbkZyYW1lRGVsZWdhdGUpO1xuICB9LFxuXG4gIG9uU2Nyb2xsU3RvcDogZnVuY3Rpb24oKSB7XG5cbiAgICB0aGlzLnNjcm9sbGluZyA9IGZhbHNlO1xuICAgIHRoaXMuX2hhc1JlcXVlc3RlZEFuaW1hdGlvbkZyYW1lID0gZmFsc2U7XG4gICAgdGhpcy5jdXJyZW50U3RvcEZyYW1lcyA9IDA7XG4gICAgdmFyIGF0dHIgPSB0aGlzLmdldEF0dHJpYnV0ZXMoKTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQoJ3Njcm9sbDpzdG9wJywgYXR0cik7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5zdG9wKSB7XG4gICAgICB0aGlzLm9wdGlvbnMuc3RvcC5jYWxsKHRoaXMsIGF0dHIpO1xuICAgIH1cbiAgfSxcblxuICBkaXNwYXRjaEV2ZW50OiBmdW5jdGlvbih0eXBlLCBldmVudE9iamVjdCkge1xuICAgIGV2ZW50T2JqZWN0ID0gZXZlbnRPYmplY3QgfHwgdGhpcy5nZXRBdHRyaWJ1dGVzKCk7XG4gICAgZXZlbnRPYmplY3QudGFyZ2V0ID0gdGhpcy5lbGVtZW50O1xuICAgIGV2ZW50T2JqZWN0LmRldGFpbCA9IGV2ZW50T2JqZWN0O1xuICAgIHRoaXMuZGlzcGF0Y2hlci5kaXNwYXRjaCh0eXBlLCBldmVudE9iamVjdCk7XG4gIH0sXG5cbiAgb246IGZ1bmN0aW9uKGV2ZW50LCBsaXN0ZW5lcikge1xuICAgIHJldHVybiB0aGlzLmRpc3BhdGNoZXIub24oZXZlbnQsIGxpc3RlbmVyKTtcbiAgfSxcblxuICBvZmY6IGZ1bmN0aW9uKGV2ZW50LCBsaXN0ZW5lcikge1xuICAgIHJldHVybiB0aGlzLmRpc3BhdGNoZXIub2ZmKGV2ZW50LCBsaXN0ZW5lcik7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRmFzdFNjcm9sbDtcbiIsIi8qIGVzbGludC1kaXNhYmxlIG5vLXVudXNlZC12YXJzICovXG4ndXNlIHN0cmljdCc7XG52YXIgaGFzT3duUHJvcGVydHkgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xudmFyIHByb3BJc0VudW1lcmFibGUgPSBPYmplY3QucHJvdG90eXBlLnByb3BlcnR5SXNFbnVtZXJhYmxlO1xuXG5mdW5jdGlvbiB0b09iamVjdCh2YWwpIHtcblx0aWYgKHZhbCA9PT0gbnVsbCB8fCB2YWwgPT09IHVuZGVmaW5lZCkge1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ09iamVjdC5hc3NpZ24gY2Fubm90IGJlIGNhbGxlZCB3aXRoIG51bGwgb3IgdW5kZWZpbmVkJyk7XG5cdH1cblxuXHRyZXR1cm4gT2JqZWN0KHZhbCk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbiAodGFyZ2V0LCBzb3VyY2UpIHtcblx0dmFyIGZyb207XG5cdHZhciB0byA9IHRvT2JqZWN0KHRhcmdldCk7XG5cdHZhciBzeW1ib2xzO1xuXG5cdGZvciAodmFyIHMgPSAxOyBzIDwgYXJndW1lbnRzLmxlbmd0aDsgcysrKSB7XG5cdFx0ZnJvbSA9IE9iamVjdChhcmd1bWVudHNbc10pO1xuXG5cdFx0Zm9yICh2YXIga2V5IGluIGZyb20pIHtcblx0XHRcdGlmIChoYXNPd25Qcm9wZXJ0eS5jYWxsKGZyb20sIGtleSkpIHtcblx0XHRcdFx0dG9ba2V5XSA9IGZyb21ba2V5XTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAoT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scykge1xuXHRcdFx0c3ltYm9scyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMoZnJvbSk7XG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHN5bWJvbHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0aWYgKHByb3BJc0VudW1lcmFibGUuY2FsbChmcm9tLCBzeW1ib2xzW2ldKSkge1xuXHRcdFx0XHRcdHRvW3N5bWJvbHNbaV1dID0gZnJvbVtzeW1ib2xzW2ldXTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdHJldHVybiB0bztcbn07XG4iXX0=
