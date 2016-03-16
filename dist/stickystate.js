(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.StickyState = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var assign = require('object-assign');
var FastScroll = require('fastscroll');

var _globals = {
  featureTested: false
};

var defaults = {
  disabled: false,
  className: 'sticky',
  fixedClass: 'sticky-fixed',
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
    fixedOffset: {
      top: 0,
      bottom: 0
    },
    bounds: {
      top: null,
      bottom: null,
      height: null,
      width: null
    },
    restrict: {
      top: null,
      bottom: null,
      height: null,
      width: null
    },
    style: {
      top: null,
      bottom: null
    },
    disabled: false
  };

  this.child = this.el;
  this.scrollTarget = StickyState.native() ? (window.getComputedStyle(this.el.parentNode).overflow !== 'auto' ? window : this.el.parentNode) : window;
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

StickyState.prototype.setState = function(state, silent) {
  silent = silent === true;
  this.state = assign({}, this.state, state);
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


StickyState.prototype.getBoundingClientRect = function() {
  return this.el.getBoundingClientRect();
}

StickyState.prototype.getBounds = function() {
  var style = this.getPositionStyle();

  var currentBounds = {
    style: this.state.style,
    bounds: this.state.bounds,
    restrict: this.state.restrict
  };

  if (currentBounds.style.top === style.top && currentBounds.style.bottom === style.bottom) {
    if (this.getBoundingClientRect().height === currentBounds.bounds.height) {
      return currentBounds;
    }
  }


  var rect;
  var restrict;

  if (!this.canSticky()) {
    rect = getAbsolutBoundingRect(this.child);
    if (this.hasOwnScrollTarget) {
      var parentRect = getAbsolutBoundingRect(this.scrollTarget);
      this.state.fixedOffset.top = parentRect.top;
      this.state.fixedOffset.bottom = parentRect.bottom;
      rect = addBounds(rect, parentRect);
      restrict = assign({}, rect); //getAbsolutBoundingRect(this.child.parentNode);
    }
  } else {
    var elem = getPreviousElementSibling(this.child);
    var offset = 0;

    if (elem) {
      offset = parseInt(window.getComputedStyle(elem)['margin-bottom']);
      offset = offset || 0;
      rect = getAbsolutBoundingRect(elem);
      if (this.hasOwnScrollTarget) {
        rect = addBounds(rect, getAbsolutBoundingRect(this.scrollTarget));
      }

      rect.top = rect.bottom + offset;

    } else {
      elem = this.child.parentNode;
      offset = parseInt(window.getComputedStyle(elem)['padding-top']);
      offset = offset || 0;
      rect = getAbsolutBoundingRect(elem);
      if (this.hasOwnScrollTarget) {
        rect = addBounds(rect, getAbsolutBoundingRect(this.scrollTarget));
      }
      rect.top = rect.top + offset;
    }

    rect.height = this.child.clientHeight;
    rect.width = this.child.clientWidth;
    rect.bottom = rect.top + rect.height;
  }

  restrict = restrict || getAbsolutBoundingRect(this.child.parentNode);

  return {
    style: style,
    bounds: rect,
    restrict: restrict
  };
};

StickyState.prototype.updateBounds = function(silent) {
  silent = silent === true;
  this.setState(this.getBounds(), silent);
};

StickyState.prototype.canSticky = function() {
  if (this.hasFeature !== null) {
    return this.hasFeature;
  }
  return this.hasFeature = window.getComputedStyle(this.el).position.match('sticky');
};

StickyState.prototype.addSrollHandler = function() {
  if (!this.scrollHandler) {
    var hasScrollTarget = FastScroll.hasScrollTarget(this.scrollTarget);

    this.fastScroll = new FastScroll(this.scrollTarget);
    this.scrollHandler = this.updateStickyState.bind(this);
    this.fastScroll.on('scroll:start', this.scrollHandler);
    this.fastScroll.on('scroll:progress', this.scrollHandler);
    this.fastScroll.on('scroll:stop', this.scrollHandler);
    if (hasScrollTarget && this.fastScroll.scrollY > 0) {
      this.fastScroll.trigger('scroll:progress');
    }
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
  var newState;

  if (top !== null) {
    offsetBottom = this.state.restrict.bottom - this.state.bounds.height - top;
    top = this.state.bounds.top - top;

    if (this.state.sticky === false && scrollY >= top && scrollY <= offsetBottom) {
      newState = this.getBounds();
      newState.sticky = true;
      this.setState(newState, silent);
    } else if (this.state.sticky && (scrollY < top || scrollY > offsetBottom)) {
      newState = this.getBounds();
      newState.sticky = false;
      this.setState(newState, silent);
    }

    return;
  }

  scrollY += window.innerHeight;
  var bottom = this.state.style.bottom;
  if (bottom !== null) {
    offsetBottom = this.state.restrict.top + this.state.bounds.height - bottom;
    bottom = this.state.bounds.bottom + bottom;

    if (this.state.sticky === false && scrollY <= bottom && scrollY >= offsetBottom) {
      newState = this.getBounds();
      newState.sticky = true;
      this.setState(newState, silent);
    } else if (this.state.sticky && (scrollY > bottom || scrollY < offsetBottom)) {
      newState = this.getBounds();
      newState.sticky = false;
      this.setState(newState, silent);
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
    var height = (this.state.disabled || (!this.state.sticky || this.state.bounds.height === null)) ? 'auto' : this.state.bounds.height + 'px';

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

    _globals.featureTested = true;

    if (window.Modernizr && window.Modernizr.hasOwnProperty('csspositionsticky')) {
      return _globals.canSticky = window.Modernizr.csspositionsticky;
    }

    var testEl = document.createElement('div');
    document.documentElement.appendChild(testEl);
    var prefixedSticky = ['sticky', '-webkit-sticky', '-moz-sticky', '-ms-sticky', '-o-sticky'];

    _globals.canSticky = false;

    for (var i = 0; i < prefixedSticky.length; i++) {
      testEl.style.position = prefixedSticky[i];
      _globals.canSticky = !!window.getComputedStyle(testEl).position.match('sticky');
      if (_globals.canSticky) {
        break;
      }
    }
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

var FastScroll = function(scrollTarget, options) {
  scrollTarget = scrollTarget || window;
  if (_instanceMap[scrollTarget]) {
    return _instanceMap[scrollTarget].instance;
  } else {
    _instanceMap[scrollTarget] = {
      instance: this,
      listenerCount: 0
    };
  }

  this.options = options || {animationFrame: true};
  this.scrollTarget = scrollTarget;
  this.init();
  return this;
};

FastScroll.___instanceMap = _instanceMap;

FastScroll.getInstance = function(scrollTarget, options) {
  return new FastScroll(scrollTarget, options);
};

FastScroll.hasScrollTarget = function(scrollTarget) {
  return _instanceMap[scrollTarget] !== undefined;
};

FastScroll.hasInstance = FastScroll.hasScrollTarget;

FastScroll.UP = 'up';
FastScroll.DOWN = 'down';
FastScroll.NONE = 'none';
FastScroll.LEFT = 'left';
FastScroll.RIGHT = 'right';

FastScroll.prototype = {

  destroyed: false,
  scrollY: 0,
  scrollX: 0,
  lastScrollY: 0,
  lastScrollX: 0,
  timeout: 0,
  speedY: 0,
  speedX: 0,
  stopFrames: 5,
  currentStopFrames: 0,
  firstRender: true,
  animationFrame: true,
  lastEvent: {
    type: null,
    scrollY: 0,
    scrollX: 0
  },

  scrolling: false,

  init: function() {
    this.dispatcher = new EventDispatcher();
    this.animationFrame = this.options.animationFrame;
    this.updateScrollPosition = (this.scrollTarget === window) ? delegate(this, this.updateWindowScrollPosition) : delegate(this, this.updateElementScrollPosition);
    this.updateScrollPosition();
    this.trigger = this.dispatchEvent;
    this.lastEvent.scrollY = this.scrollY;
    this.lastEvent.scrollX = this.scrollX;
    this.onScrollDelegate = delegate(this, this.onScroll);
    this.onNextFrameDelegate = delegate(this, this.onNextFrame);
    this.scrollTarget.addEventListener('scroll', this.onScrollDelegate, false);
  },

  destroy: function() {
    if (_instanceMap[this.scrollTarget].listenerCount <= 0 && !this.destroyed) {
      delete(_instanceMap[this.scrollTarget]);
      this.cancelNextFrame();
      this.scrollTarget.removeEventListener('scroll', this.onScrollDelegate);
      this.dispatcher.off();
      this.dispatcher = null;
      this.onScrollDelegate = null;
      this.updateScrollPosition = null;
      this.onNextFrameDelegate = null;
      this.scrollTarget = null;
      this.destroyed = true;
    }
  },

  getAttributes: function() {
    return {
      scrollY: this.scrollY,
      scrollX: this.scrollX,
      speedY: this.speedY,
      speedX: this.speedX,
      angle: 0,
      directionY: this.speedY === 0 ? FastScroll.NONE : ((this.speedY > 0) ? FastScroll.UP : FastScroll.DOWN),
      directionX: this.speedX === 0 ? FastScroll.NONE : ((this.speedX > 0) ? FastScroll.RIGHT : FastScroll.LEFT)
    };
  },

  updateWindowScrollPosition: function() {
    this.scrollY = this.scrollTarget.scrollY || this.scrollTarget.pageYOffset || 0;
    this.scrollX = this.scrollTarget.scrollX || this.scrollTarget.pageXOffset || 0;
  },

  updateElementScrollPosition: function() {
    this.scrollY = this.scrollTarget.scrollTop;
    this.scrollX = this.scrollTarget.scrollLeft;
  },

  onScroll: function() {
    this.updateScrollPosition();
    this.currentStopFrames = 0;

    if (this.firstRender) {
      this.firstRender = false;
      if (this.scrollY > 1) {
        this.dispatchEvent('scroll:progress');
        return;
      }
    }

    if (!this.scrolling) {
      this.scrolling = true;
      this.dispatchEvent('scroll:start');
      if (this.animationFrame) {
        this.nextFrameID = requestAnimationFrame(this.onNextFrameDelegate);
      }
    }
    if (!this.animationFrame) {
      clearTimeout(this.timeout);
      this.onNextFrame();
      var self = this;
      this.timeout = setTimeout(function() {
        self.onScrollStop();
      }, 100);
    }
  },

  onNextFrame: function() {
    if (this.destroyed) {
      return;
    }

    if (this.animationFrame) {
      this.updateScrollPosition();
    }

    this.speedY = this.lastScrollY - this.scrollY;
    this.speedX = this.lastScrollX - this.scrollX;

    this.lastScrollY = this.scrollY;
    this.lastScrollX = this.scrollX;

    if (this.animationFrame) {
      if (this.speedY === 0 && this.scrolling && (this.currentStopFrames++ > this.stopFrames)) {
        this.onScrollStop();
        return;
      }
    }

    this.dispatchEvent('scroll:progress');

    if (this.animationFrame) {
      this.nextFrameID = requestAnimationFrame(this.onNextFrameDelegate);
    }

  },

  onScrollStop: function() {
    this.scrolling = false;
    if (this.animationFrame) {
      this.cancelNextFrame();
      this.currentStopFrames = 0;
    }
    this.dispatchEvent('scroll:stop');
  },

  cancelNextFrame: function() {
    cancelAnimationFrame(this.nextFrameID);
  },

  dispatchEvent: function(type, eventObject) {
    eventObject = eventObject || this.getAttributes();

    if (this.lastEvent.type === type && this.lastEvent.scrollY === eventObject.scrollY && this.lastEvent.scrollX === eventObject.scrollX) {
      return;
    }

    this.lastEvent = {
      type: type,
      scrollY: eventObject.scrollY,
      scrollX: eventObject.scrollX
    };
    eventObject.fastScroll = this;
    eventObject.target = this.scrollTarget;
    this.dispatcher.dispatch(type, eventObject);
  },

  on: function(event, listener) {
    if (this.dispatcher.on(event, listener)) {
      _instanceMap[this.scrollTarget].listenerCount += 1;
      return true;
    }
    return false;
  },

  off: function(event, listener) {
    if (this.dispatcher.off(event, listener)) {
      _instanceMap[this.scrollTarget].listenerCount -= 1;
      return true;
    }
    return false;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9kZWxlZ2F0ZWpzL2RlbGVnYXRlLmpzIiwibm9kZV9tb2R1bGVzL2Zhc3RzY3JvbGwvc3JjL2V2ZW50ZGlzcGF0Y2hlci5qcyIsIm5vZGVfbW9kdWxlcy9mYXN0c2Nyb2xsL3NyYy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9vYmplY3QtYXNzaWduL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hZQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgYXNzaWduID0gcmVxdWlyZSgnb2JqZWN0LWFzc2lnbicpO1xudmFyIEZhc3RTY3JvbGwgPSByZXF1aXJlKCdmYXN0c2Nyb2xsJyk7XG5cbnZhciBfZ2xvYmFscyA9IHtcbiAgZmVhdHVyZVRlc3RlZDogZmFsc2Vcbn07XG5cbnZhciBkZWZhdWx0cyA9IHtcbiAgZGlzYWJsZWQ6IGZhbHNlLFxuICBjbGFzc05hbWU6ICdzdGlja3knLFxuICBmaXhlZENsYXNzOiAnc3RpY2t5LWZpeGVkJyxcbiAgc3RhdGVDbGFzc05hbWU6ICdpcy1zdGlja3knXG59O1xuXG5mdW5jdGlvbiBnZXRTcm9sbFBvc2l0aW9uKCkge1xuICByZXR1cm4gKHdpbmRvdy5zY3JvbGxZIHx8IHdpbmRvdy5wYWdlWU9mZnNldCB8fCAwKTtcbn1cblxuZnVuY3Rpb24gZ2V0QWJzb2x1dEJvdW5kaW5nUmVjdChlbCkge1xuICB2YXIgcmVjdCA9IGVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICB2YXIgdG9wID0gcmVjdC50b3AgKyBnZXRTcm9sbFBvc2l0aW9uKCk7XG4gIHJldHVybiB7XG4gICAgdG9wOiB0b3AsXG4gICAgYm90dG9tOiB0b3AgKyByZWN0LmhlaWdodCxcbiAgICBoZWlnaHQ6IHJlY3QuaGVpZ2h0LFxuICAgIHdpZHRoOiByZWN0LndpZHRoXG4gIH07XG59XG5cbmZ1bmN0aW9uIGFkZEJvdW5kcyhyZWN0MSwgcmVjdDIpIHtcbiAgdmFyIHJlY3QgPSBhc3NpZ24oe30sIHJlY3QxKTtcbiAgcmVjdC50b3AgLT0gcmVjdDIudG9wO1xuICByZWN0LmJvdHRvbSA9IHJlY3QudG9wICsgcmVjdDEuaGVpZ2h0O1xuICByZXR1cm4gcmVjdDtcbn1cblxuZnVuY3Rpb24gZ2V0UHJldmlvdXNFbGVtZW50U2libGluZyhlbCkge1xuICB2YXIgcHJldiA9IGVsLnByZXZpb3VzRWxlbWVudFNpYmxpbmc7XG4gIGlmIChwcmV2ICYmIHByZXYudGFnTmFtZS50b0xvY2FsZUxvd2VyQ2FzZSgpID09PSAnc2NyaXB0Jykge1xuICAgIHByZXYgPSBnZXRQcmV2aW91c0VsZW1lbnRTaWJsaW5nKHByZXYpO1xuICB9XG4gIHJldHVybiBwcmV2O1xufVxuXG5cbnZhciBTdGlja3lTdGF0ZSA9IGZ1bmN0aW9uKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgaWYgKCFlbGVtZW50KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdTdGlja3lTdGF0ZSBuZWVkcyBhIERvbUVsZW1lbnQnKTtcbiAgfVxuXG4gIHRoaXMuZWwgPSBlbGVtZW50O1xuICB0aGlzLm9wdGlvbnMgPSBhc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKTtcblxuICB0aGlzLnN0YXRlID0ge1xuICAgIHN0aWNreTogZmFsc2UsXG4gICAgZml4ZWRPZmZzZXQ6IHtcbiAgICAgIHRvcDogMCxcbiAgICAgIGJvdHRvbTogMFxuICAgIH0sXG4gICAgYm91bmRzOiB7XG4gICAgICB0b3A6IG51bGwsXG4gICAgICBib3R0b206IG51bGwsXG4gICAgICBoZWlnaHQ6IG51bGwsXG4gICAgICB3aWR0aDogbnVsbFxuICAgIH0sXG4gICAgcmVzdHJpY3Q6IHtcbiAgICAgIHRvcDogbnVsbCxcbiAgICAgIGJvdHRvbTogbnVsbCxcbiAgICAgIGhlaWdodDogbnVsbCxcbiAgICAgIHdpZHRoOiBudWxsXG4gICAgfSxcbiAgICBzdHlsZToge1xuICAgICAgdG9wOiBudWxsLFxuICAgICAgYm90dG9tOiBudWxsXG4gICAgfSxcbiAgICBkaXNhYmxlZDogZmFsc2VcbiAgfTtcblxuICB0aGlzLmNoaWxkID0gdGhpcy5lbDtcbiAgdGhpcy5zY3JvbGxUYXJnZXQgPSBTdGlja3lTdGF0ZS5uYXRpdmUoKSA/ICh3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZSh0aGlzLmVsLnBhcmVudE5vZGUpLm92ZXJmbG93ICE9PSAnYXV0bycgPyB3aW5kb3cgOiB0aGlzLmVsLnBhcmVudE5vZGUpIDogd2luZG93O1xuICB0aGlzLmhhc093blNjcm9sbFRhcmdldCA9IHRoaXMuc2Nyb2xsVGFyZ2V0ICE9PSB3aW5kb3c7XG4gIHRoaXMuZmlyc3RSZW5kZXIgPSB0cnVlO1xuICB0aGlzLmhhc0ZlYXR1cmUgPSBudWxsO1xuICB0aGlzLnNjcm9sbEhhbmRsZXIgPSBudWxsO1xuICB0aGlzLnJlc2l6ZUhhbmRsZXIgPSBudWxsO1xuICB0aGlzLmZhc3RTY3JvbGwgPSBudWxsO1xuICB0aGlzLndyYXBwZXIgPSBudWxsO1xuXG4gIHRoaXMudXBkYXRlRG9tID0gdGhpcy51cGRhdGVEb20uYmluZCh0aGlzKTtcbiAgdGhpcy5yZW5kZXIgPSAodGhpcy5zdGF0ZS51c2VBbmltYXRpb25GcmFtZSAmJiB3aW5kb3cgJiYgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSkgPyB0aGlzLnJlbmRlck9uQW5pbWF0aW9uRnJhbWUuYmluZCh0aGlzKSA6IHRoaXMudXBkYXRlRG9tO1xuXG4gIHRoaXMuYWRkU3JvbGxIYW5kbGVyKCk7XG4gIHRoaXMuYWRkUmVzaXplSGFuZGxlcigpO1xuICB0aGlzLnJlbmRlcigpO1xufTtcblxuU3RpY2t5U3RhdGUucHJvdG90eXBlLnNldFN0YXRlID0gZnVuY3Rpb24oc3RhdGUsIHNpbGVudCkge1xuICBzaWxlbnQgPSBzaWxlbnQgPT09IHRydWU7XG4gIHRoaXMuc3RhdGUgPSBhc3NpZ24oe30sIHRoaXMuc3RhdGUsIHN0YXRlKTtcbiAgaWYgKCFzaWxlbnQpIHtcbiAgICB0aGlzLnJlbmRlcigpO1xuICB9XG59O1xuXG5TdGlja3lTdGF0ZS5wcm90b3R5cGUuZ2V0UG9zaXRpb25TdHlsZSA9IGZ1bmN0aW9uKCkge1xuXG4gIHZhciBvYmogPSB7XG4gICAgdG9wOiBudWxsLFxuICAgIGJvdHRvbTogbnVsbFxuICB9O1xuXG4gIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICB2YXIgdmFsdWUgPSBwYXJzZUludCh3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZSh0aGlzLmVsKVtrZXldKTtcbiAgICB2YWx1ZSA9IGlzTmFOKHZhbHVlKSA/IG51bGwgOiB2YWx1ZTtcbiAgICBvYmpba2V5XSA9IHZhbHVlO1xuICB9XG5cbiAgcmV0dXJuIG9iajtcbn07XG5cblxuU3RpY2t5U3RhdGUucHJvdG90eXBlLmdldEJvdW5kaW5nQ2xpZW50UmVjdCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5lbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbn1cblxuU3RpY2t5U3RhdGUucHJvdG90eXBlLmdldEJvdW5kcyA9IGZ1bmN0aW9uKCkge1xuICB2YXIgc3R5bGUgPSB0aGlzLmdldFBvc2l0aW9uU3R5bGUoKTtcblxuICB2YXIgY3VycmVudEJvdW5kcyA9IHtcbiAgICBzdHlsZTogdGhpcy5zdGF0ZS5zdHlsZSxcbiAgICBib3VuZHM6IHRoaXMuc3RhdGUuYm91bmRzLFxuICAgIHJlc3RyaWN0OiB0aGlzLnN0YXRlLnJlc3RyaWN0XG4gIH07XG5cbiAgaWYgKGN1cnJlbnRCb3VuZHMuc3R5bGUudG9wID09PSBzdHlsZS50b3AgJiYgY3VycmVudEJvdW5kcy5zdHlsZS5ib3R0b20gPT09IHN0eWxlLmJvdHRvbSkge1xuICAgIGlmICh0aGlzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmhlaWdodCA9PT0gY3VycmVudEJvdW5kcy5ib3VuZHMuaGVpZ2h0KSB7XG4gICAgICByZXR1cm4gY3VycmVudEJvdW5kcztcbiAgICB9XG4gIH1cblxuXG4gIHZhciByZWN0O1xuICB2YXIgcmVzdHJpY3Q7XG5cbiAgaWYgKCF0aGlzLmNhblN0aWNreSgpKSB7XG4gICAgcmVjdCA9IGdldEFic29sdXRCb3VuZGluZ1JlY3QodGhpcy5jaGlsZCk7XG4gICAgaWYgKHRoaXMuaGFzT3duU2Nyb2xsVGFyZ2V0KSB7XG4gICAgICB2YXIgcGFyZW50UmVjdCA9IGdldEFic29sdXRCb3VuZGluZ1JlY3QodGhpcy5zY3JvbGxUYXJnZXQpO1xuICAgICAgdGhpcy5zdGF0ZS5maXhlZE9mZnNldC50b3AgPSBwYXJlbnRSZWN0LnRvcDtcbiAgICAgIHRoaXMuc3RhdGUuZml4ZWRPZmZzZXQuYm90dG9tID0gcGFyZW50UmVjdC5ib3R0b207XG4gICAgICByZWN0ID0gYWRkQm91bmRzKHJlY3QsIHBhcmVudFJlY3QpO1xuICAgICAgcmVzdHJpY3QgPSBhc3NpZ24oe30sIHJlY3QpOyAvL2dldEFic29sdXRCb3VuZGluZ1JlY3QodGhpcy5jaGlsZC5wYXJlbnROb2RlKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdmFyIGVsZW0gPSBnZXRQcmV2aW91c0VsZW1lbnRTaWJsaW5nKHRoaXMuY2hpbGQpO1xuICAgIHZhciBvZmZzZXQgPSAwO1xuXG4gICAgaWYgKGVsZW0pIHtcbiAgICAgIG9mZnNldCA9IHBhcnNlSW50KHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKGVsZW0pWydtYXJnaW4tYm90dG9tJ10pO1xuICAgICAgb2Zmc2V0ID0gb2Zmc2V0IHx8IDA7XG4gICAgICByZWN0ID0gZ2V0QWJzb2x1dEJvdW5kaW5nUmVjdChlbGVtKTtcbiAgICAgIGlmICh0aGlzLmhhc093blNjcm9sbFRhcmdldCkge1xuICAgICAgICByZWN0ID0gYWRkQm91bmRzKHJlY3QsIGdldEFic29sdXRCb3VuZGluZ1JlY3QodGhpcy5zY3JvbGxUYXJnZXQpKTtcbiAgICAgIH1cblxuICAgICAgcmVjdC50b3AgPSByZWN0LmJvdHRvbSArIG9mZnNldDtcblxuICAgIH0gZWxzZSB7XG4gICAgICBlbGVtID0gdGhpcy5jaGlsZC5wYXJlbnROb2RlO1xuICAgICAgb2Zmc2V0ID0gcGFyc2VJbnQod2luZG93LmdldENvbXB1dGVkU3R5bGUoZWxlbSlbJ3BhZGRpbmctdG9wJ10pO1xuICAgICAgb2Zmc2V0ID0gb2Zmc2V0IHx8IDA7XG4gICAgICByZWN0ID0gZ2V0QWJzb2x1dEJvdW5kaW5nUmVjdChlbGVtKTtcbiAgICAgIGlmICh0aGlzLmhhc093blNjcm9sbFRhcmdldCkge1xuICAgICAgICByZWN0ID0gYWRkQm91bmRzKHJlY3QsIGdldEFic29sdXRCb3VuZGluZ1JlY3QodGhpcy5zY3JvbGxUYXJnZXQpKTtcbiAgICAgIH1cbiAgICAgIHJlY3QudG9wID0gcmVjdC50b3AgKyBvZmZzZXQ7XG4gICAgfVxuXG4gICAgcmVjdC5oZWlnaHQgPSB0aGlzLmNoaWxkLmNsaWVudEhlaWdodDtcbiAgICByZWN0LndpZHRoID0gdGhpcy5jaGlsZC5jbGllbnRXaWR0aDtcbiAgICByZWN0LmJvdHRvbSA9IHJlY3QudG9wICsgcmVjdC5oZWlnaHQ7XG4gIH1cblxuICByZXN0cmljdCA9IHJlc3RyaWN0IHx8IGdldEFic29sdXRCb3VuZGluZ1JlY3QodGhpcy5jaGlsZC5wYXJlbnROb2RlKTtcblxuICByZXR1cm4ge1xuICAgIHN0eWxlOiBzdHlsZSxcbiAgICBib3VuZHM6IHJlY3QsXG4gICAgcmVzdHJpY3Q6IHJlc3RyaWN0XG4gIH07XG59O1xuXG5TdGlja3lTdGF0ZS5wcm90b3R5cGUudXBkYXRlQm91bmRzID0gZnVuY3Rpb24oc2lsZW50KSB7XG4gIHNpbGVudCA9IHNpbGVudCA9PT0gdHJ1ZTtcbiAgdGhpcy5zZXRTdGF0ZSh0aGlzLmdldEJvdW5kcygpLCBzaWxlbnQpO1xufTtcblxuU3RpY2t5U3RhdGUucHJvdG90eXBlLmNhblN0aWNreSA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5oYXNGZWF0dXJlICE9PSBudWxsKSB7XG4gICAgcmV0dXJuIHRoaXMuaGFzRmVhdHVyZTtcbiAgfVxuICByZXR1cm4gdGhpcy5oYXNGZWF0dXJlID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUodGhpcy5lbCkucG9zaXRpb24ubWF0Y2goJ3N0aWNreScpO1xufTtcblxuU3RpY2t5U3RhdGUucHJvdG90eXBlLmFkZFNyb2xsSGFuZGxlciA9IGZ1bmN0aW9uKCkge1xuICBpZiAoIXRoaXMuc2Nyb2xsSGFuZGxlcikge1xuICAgIHZhciBoYXNTY3JvbGxUYXJnZXQgPSBGYXN0U2Nyb2xsLmhhc1Njcm9sbFRhcmdldCh0aGlzLnNjcm9sbFRhcmdldCk7XG5cbiAgICB0aGlzLmZhc3RTY3JvbGwgPSBuZXcgRmFzdFNjcm9sbCh0aGlzLnNjcm9sbFRhcmdldCk7XG4gICAgdGhpcy5zY3JvbGxIYW5kbGVyID0gdGhpcy51cGRhdGVTdGlja3lTdGF0ZS5iaW5kKHRoaXMpO1xuICAgIHRoaXMuZmFzdFNjcm9sbC5vbignc2Nyb2xsOnN0YXJ0JywgdGhpcy5zY3JvbGxIYW5kbGVyKTtcbiAgICB0aGlzLmZhc3RTY3JvbGwub24oJ3Njcm9sbDpwcm9ncmVzcycsIHRoaXMuc2Nyb2xsSGFuZGxlcik7XG4gICAgdGhpcy5mYXN0U2Nyb2xsLm9uKCdzY3JvbGw6c3RvcCcsIHRoaXMuc2Nyb2xsSGFuZGxlcik7XG4gICAgaWYgKGhhc1Njcm9sbFRhcmdldCAmJiB0aGlzLmZhc3RTY3JvbGwuc2Nyb2xsWSA+IDApIHtcbiAgICAgIHRoaXMuZmFzdFNjcm9sbC50cmlnZ2VyKCdzY3JvbGw6cHJvZ3Jlc3MnKTtcbiAgICB9XG4gIH1cbn07XG5cblN0aWNreVN0YXRlLnByb3RvdHlwZS5yZW1vdmVTcm9sbEhhbmRsZXIgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuZmFzdFNjcm9sbCkge1xuICAgIHRoaXMuZmFzdFNjcm9sbC5vZmYoJ3Njcm9sbDpzdGFydCcsIHRoaXMuc2Nyb2xsSGFuZGxlcik7XG4gICAgdGhpcy5mYXN0U2Nyb2xsLm9mZignc2Nyb2xsOnByb2dyZXNzJywgdGhpcy5zY3JvbGxIYW5kbGVyKTtcbiAgICB0aGlzLmZhc3RTY3JvbGwub2ZmKCdzY3JvbGw6c3RvcCcsIHRoaXMuc2Nyb2xsSGFuZGxlcik7XG4gICAgdGhpcy5mYXN0U2Nyb2xsLmRlc3Ryb3koKTtcbiAgICB0aGlzLnNjcm9sbEhhbmRsZXIgPSBudWxsO1xuICAgIHRoaXMuZmFzdFNjcm9sbCA9IG51bGw7XG4gIH1cbn07XG5cblN0aWNreVN0YXRlLnByb3RvdHlwZS5hZGRSZXNpemVIYW5kbGVyID0gZnVuY3Rpb24oKSB7XG4gIGlmICghdGhpcy5yZXNpemVIYW5kbGVyKSB7XG4gICAgdGhpcy5yZXNpemVIYW5kbGVyID0gdGhpcy5vblJlc2l6ZS5iaW5kKHRoaXMpO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCB0aGlzLnJlc2l6ZUhhbmRsZXIsIGZhbHNlKTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignb3JpZW50YXRpb25jaGFuZ2UnLCB0aGlzLnJlc2l6ZUhhbmRsZXIsIGZhbHNlKTtcbiAgfVxufTtcblxuU3RpY2t5U3RhdGUucHJvdG90eXBlLnJlbW92ZVJlc2l6ZUhhbmRsZXIgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMucmVzaXplSGFuZGxlcikge1xuICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdyZXNpemUnLCB0aGlzLnJlc2l6ZUhhbmRsZXIpO1xuICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdvcmllbnRhdGlvbmNoYW5nZScsIHRoaXMucmVzaXplSGFuZGxlcik7XG4gICAgdGhpcy5yZXNpemVIYW5kbGVyID0gbnVsbDtcbiAgfVxufTtcblxuU3RpY2t5U3RhdGUucHJvdG90eXBlLm9uUmVzaXplID0gZnVuY3Rpb24oZSkge1xuICB0aGlzLnVwZGF0ZUJvdW5kcyh0cnVlKTtcbiAgdGhpcy51cGRhdGVTdGlja3lTdGF0ZShmYWxzZSk7XG59O1xuXG5TdGlja3lTdGF0ZS5wcm90b3R5cGUudXBkYXRlU3RpY2t5U3RhdGUgPSBmdW5jdGlvbihzaWxlbnQpIHtcblxuICB2YXIgY2hpbGQgPSB0aGlzLmNoaWxkO1xuXG4gIHNpbGVudCA9IHNpbGVudCA9PT0gdHJ1ZTtcbiAgdmFyIHNjcm9sbFkgPSB0aGlzLmZhc3RTY3JvbGwuc2Nyb2xsWTtcblxuICB2YXIgdG9wID0gdGhpcy5zdGF0ZS5zdHlsZS50b3A7XG4gIHZhciBvZmZzZXRCb3R0b207XG4gIHZhciBuZXdTdGF0ZTtcblxuICBpZiAodG9wICE9PSBudWxsKSB7XG4gICAgb2Zmc2V0Qm90dG9tID0gdGhpcy5zdGF0ZS5yZXN0cmljdC5ib3R0b20gLSB0aGlzLnN0YXRlLmJvdW5kcy5oZWlnaHQgLSB0b3A7XG4gICAgdG9wID0gdGhpcy5zdGF0ZS5ib3VuZHMudG9wIC0gdG9wO1xuXG4gICAgaWYgKHRoaXMuc3RhdGUuc3RpY2t5ID09PSBmYWxzZSAmJiBzY3JvbGxZID49IHRvcCAmJiBzY3JvbGxZIDw9IG9mZnNldEJvdHRvbSkge1xuICAgICAgbmV3U3RhdGUgPSB0aGlzLmdldEJvdW5kcygpO1xuICAgICAgbmV3U3RhdGUuc3RpY2t5ID0gdHJ1ZTtcbiAgICAgIHRoaXMuc2V0U3RhdGUobmV3U3RhdGUsIHNpbGVudCk7XG4gICAgfSBlbHNlIGlmICh0aGlzLnN0YXRlLnN0aWNreSAmJiAoc2Nyb2xsWSA8IHRvcCB8fCBzY3JvbGxZID4gb2Zmc2V0Qm90dG9tKSkge1xuICAgICAgbmV3U3RhdGUgPSB0aGlzLmdldEJvdW5kcygpO1xuICAgICAgbmV3U3RhdGUuc3RpY2t5ID0gZmFsc2U7XG4gICAgICB0aGlzLnNldFN0YXRlKG5ld1N0YXRlLCBzaWxlbnQpO1xuICAgIH1cblxuICAgIHJldHVybjtcbiAgfVxuXG4gIHNjcm9sbFkgKz0gd2luZG93LmlubmVySGVpZ2h0O1xuICB2YXIgYm90dG9tID0gdGhpcy5zdGF0ZS5zdHlsZS5ib3R0b207XG4gIGlmIChib3R0b20gIT09IG51bGwpIHtcbiAgICBvZmZzZXRCb3R0b20gPSB0aGlzLnN0YXRlLnJlc3RyaWN0LnRvcCArIHRoaXMuc3RhdGUuYm91bmRzLmhlaWdodCAtIGJvdHRvbTtcbiAgICBib3R0b20gPSB0aGlzLnN0YXRlLmJvdW5kcy5ib3R0b20gKyBib3R0b207XG5cbiAgICBpZiAodGhpcy5zdGF0ZS5zdGlja3kgPT09IGZhbHNlICYmIHNjcm9sbFkgPD0gYm90dG9tICYmIHNjcm9sbFkgPj0gb2Zmc2V0Qm90dG9tKSB7XG4gICAgICBuZXdTdGF0ZSA9IHRoaXMuZ2V0Qm91bmRzKCk7XG4gICAgICBuZXdTdGF0ZS5zdGlja3kgPSB0cnVlO1xuICAgICAgdGhpcy5zZXRTdGF0ZShuZXdTdGF0ZSwgc2lsZW50KTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuc3RhdGUuc3RpY2t5ICYmIChzY3JvbGxZID4gYm90dG9tIHx8IHNjcm9sbFkgPCBvZmZzZXRCb3R0b20pKSB7XG4gICAgICBuZXdTdGF0ZSA9IHRoaXMuZ2V0Qm91bmRzKCk7XG4gICAgICBuZXdTdGF0ZS5zdGlja3kgPSBmYWxzZTtcbiAgICAgIHRoaXMuc2V0U3RhdGUobmV3U3RhdGUsIHNpbGVudCk7XG4gICAgfVxuICB9XG5cbn07XG5cblN0aWNreVN0YXRlLnByb3RvdHlwZS5yZW5kZXJPbkFuaW1hdGlvbkZyYW1lID0gZnVuY3Rpb24oKSB7XG4gIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUodGhpcy51cGRhdGVEb20pO1xufTtcblxuU3RpY2t5U3RhdGUucHJvdG90eXBlLnVwZGF0ZURvbSA9IGZ1bmN0aW9uKCkge1xuXG4gIGlmICh0aGlzLmZpcnN0UmVuZGVyKSB7XG4gICAgdGhpcy5maXJzdFJlbmRlciA9IGZhbHNlO1xuXG4gICAgaWYgKCF0aGlzLmNhblN0aWNreSgpKSB7XG4gICAgICB0aGlzLndyYXBwZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgIHRoaXMud3JhcHBlci5jbGFzc05hbWUgPSAnc3RpY2t5LXdyYXAnO1xuICAgICAgdmFyIHBhcmVudCA9IHRoaXMuZWwucGFyZW50Tm9kZTtcbiAgICAgIGlmIChwYXJlbnQpIHtcbiAgICAgICAgcGFyZW50Lmluc2VydEJlZm9yZSh0aGlzLndyYXBwZXIsIHRoaXMuZWwpO1xuICAgICAgfVxuICAgICAgdGhpcy53cmFwcGVyLmFwcGVuZENoaWxkKHRoaXMuZWwpO1xuICAgICAgdGhpcy5lbC5jbGFzc05hbWUgKz0gJyBzdGlja3ktZml4ZWQnO1xuICAgICAgdGhpcy5jaGlsZCA9IHRoaXMud3JhcHBlcjtcbiAgICB9XG5cbiAgICB0aGlzLnVwZGF0ZUJvdW5kcyh0cnVlKTtcbiAgICB0aGlzLnVwZGF0ZVN0aWNreVN0YXRlKHRydWUpO1xuICB9XG5cbiAgaWYgKCF0aGlzLmNhblN0aWNreSgpKSB7XG4gICAgdmFyIGhlaWdodCA9ICh0aGlzLnN0YXRlLmRpc2FibGVkIHx8ICghdGhpcy5zdGF0ZS5zdGlja3kgfHwgdGhpcy5zdGF0ZS5ib3VuZHMuaGVpZ2h0ID09PSBudWxsKSkgPyAnYXV0bycgOiB0aGlzLnN0YXRlLmJvdW5kcy5oZWlnaHQgKyAncHgnO1xuXG4gICAgLy8gaWYodGhpcy5zdGF0ZS5zdGlja3kgJiYgdGhpcy5zdGF0ZS5maXhlZE9mZnNldC50b3AgIT09IDApe1xuICAgIC8vICAgdGhpcy5lbC5zdHlsZS5tYXJnaW5Ub3AgPSB0aGlzLnN0YXRlLmZpeGVkT2Zmc2V0LnRvcCsncHgnO1xuICAgIC8vIH1cblxuICAgIHRoaXMud3JhcHBlci5zdHlsZS5oZWlnaHQgPSBoZWlnaHQ7XG4gIH1cblxuICB2YXIgY2xhc3NOYW1lID0gdGhpcy5lbC5jbGFzc05hbWU7XG4gIHZhciBoYXNTdGF0ZUNsYXNzID0gY2xhc3NOYW1lLmluZGV4T2YodGhpcy5vcHRpb25zLnN0YXRlQ2xhc3NOYW1lKSA+IC0xO1xuICBpZiAodGhpcy5zdGF0ZS5zdGlja3kgJiYgIWhhc1N0YXRlQ2xhc3MpIHtcbiAgICBjbGFzc05hbWUgPSBjbGFzc05hbWUgKyAnICcgKyB0aGlzLm9wdGlvbnMuc3RhdGVDbGFzc05hbWU7XG4gIH0gZWxzZSBpZiAoIXRoaXMuc3RhdGUuc3RpY2t5ICYmIGhhc1N0YXRlQ2xhc3MpIHtcbiAgICBjbGFzc05hbWUgPSBjbGFzc05hbWUuc3BsaXQodGhpcy5vcHRpb25zLnN0YXRlQ2xhc3NOYW1lKS5qb2luKCcnKTtcbiAgfVxuXG4gIGlmICh0aGlzLmVsLmNsYXNzTmFtZSAhPT0gY2xhc3NOYW1lKSB7XG4gICAgdGhpcy5lbC5jbGFzc05hbWUgPSBjbGFzc05hbWU7XG4gIH1cblxuICByZXR1cm4gdGhpcy5lbDtcbn07XG5cblxuU3RpY2t5U3RhdGUubmF0aXZlID0gZnVuY3Rpb24oKSB7XG4gIGlmIChfZ2xvYmFscy5mZWF0dXJlVGVzdGVkKSB7XG4gICAgcmV0dXJuIF9nbG9iYWxzLmNhblN0aWNreTtcbiAgfVxuICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcblxuICAgIF9nbG9iYWxzLmZlYXR1cmVUZXN0ZWQgPSB0cnVlO1xuXG4gICAgaWYgKHdpbmRvdy5Nb2Rlcm5penIgJiYgd2luZG93Lk1vZGVybml6ci5oYXNPd25Qcm9wZXJ0eSgnY3NzcG9zaXRpb25zdGlja3knKSkge1xuICAgICAgcmV0dXJuIF9nbG9iYWxzLmNhblN0aWNreSA9IHdpbmRvdy5Nb2Rlcm5penIuY3NzcG9zaXRpb25zdGlja3k7XG4gICAgfVxuXG4gICAgdmFyIHRlc3RFbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5hcHBlbmRDaGlsZCh0ZXN0RWwpO1xuICAgIHZhciBwcmVmaXhlZFN0aWNreSA9IFsnc3RpY2t5JywgJy13ZWJraXQtc3RpY2t5JywgJy1tb3otc3RpY2t5JywgJy1tcy1zdGlja3knLCAnLW8tc3RpY2t5J107XG5cbiAgICBfZ2xvYmFscy5jYW5TdGlja3kgPSBmYWxzZTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcHJlZml4ZWRTdGlja3kubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRlc3RFbC5zdHlsZS5wb3NpdGlvbiA9IHByZWZpeGVkU3RpY2t5W2ldO1xuICAgICAgX2dsb2JhbHMuY2FuU3RpY2t5ID0gISF3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZSh0ZXN0RWwpLnBvc2l0aW9uLm1hdGNoKCdzdGlja3knKTtcbiAgICAgIGlmIChfZ2xvYmFscy5jYW5TdGlja3kpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5yZW1vdmVDaGlsZCh0ZXN0RWwpO1xuICB9XG4gIHJldHVybiBfZ2xvYmFscy5jYW5TdGlja3k7XG59O1xuXG5TdGlja3lTdGF0ZS5hcHBseSA9IGZ1bmN0aW9uKGVsZW1lbnRzKSB7XG4gIGlmIChlbGVtZW50cykge1xuICAgIGlmIChlbGVtZW50cy5sZW5ndGgpIHtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZWxlbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgbmV3IFN0aWNreVN0YXRlKGVsZW1lbnRzW2ldKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgbmV3IFN0aWNreVN0YXRlKGVsZW1lbnRzKTtcbiAgICB9XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU3RpY2t5U3RhdGU7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNCBTw7Zua2UgS2x1dGhcbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5IG9mXG4gKiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluXG4gKiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvXG4gKiB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZlxuICogdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLFxuICogc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW4gYWxsXG4gKiBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTXG4gKiBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1JcbiAqIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUlxuICogSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU5cbiAqIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG4gKiovXG5cbihmdW5jdGlvbihleHBvcnRzKSB7XG5cbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICB2YXIgZGVsZWdhdGUgPSBmdW5jdGlvbih0YXJnZXQsIGhhbmRsZXIpIHtcbiAgICAgICAgLy8gR2V0IGFueSBleHRyYSBhcmd1bWVudHMgZm9yIGhhbmRsZXJcbiAgICAgICAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG5cbiAgICAgICAgLy8gQ3JlYXRlIGRlbGVnYXRlIGZ1bmN0aW9uXG4gICAgICAgIHZhciBmbiA9IGZ1bmN0aW9uKCkge1xuXG4gICAgICAgICAgICAvLyBDYWxsIGhhbmRsZXIgd2l0aCBhcmd1bWVudHNcbiAgICAgICAgICAgIHJldHVybiBoYW5kbGVyLmFwcGx5KHRhcmdldCwgYXJncyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gUmV0dXJuIHRoZSBkZWxlZ2F0ZSBmdW5jdGlvbi5cbiAgICAgICAgcmV0dXJuIGZuO1xuICAgIH07XG5cblxuICAgICh0eXBlb2YgbW9kdWxlICE9IFwidW5kZWZpbmVkXCIgJiYgbW9kdWxlLmV4cG9ydHMpID8gKG1vZHVsZS5leHBvcnRzID0gZGVsZWdhdGUpIDogKHR5cGVvZiBkZWZpbmUgIT0gXCJ1bmRlZmluZWRcIiA/IChkZWZpbmUoZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBkZWxlZ2F0ZTtcbiAgICB9KSkgOiAoZXhwb3J0cy5kZWxlZ2F0ZSA9IGRlbGVnYXRlKSk7XG5cbn0pKHRoaXMpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vL0lFOFxuaWYgKCFBcnJheS5wcm90b3R5cGUuaW5kZXhPZikge1xuICBBcnJheS5wcm90b3R5cGUuaW5kZXhPZiA9IGZ1bmN0aW9uKG9iaiwgc3RhcnQpIHtcbiAgICBmb3IgKHZhciBpID0gKHN0YXJ0IHx8IDApLCBqID0gdGhpcy5sZW5ndGg7IGkgPCBqOyBpKyspIHtcbiAgICAgIGlmICh0aGlzW2ldID09PSBvYmopIHtcbiAgICAgICAgcmV0dXJuIGk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiAtMTtcbiAgfTtcbn1cblxudmFyIEV2ZW50RGlzcGF0Y2hlciA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLl9ldmVudE1hcCA9IHt9O1xuICB0aGlzLl9kZXN0cm95ZWQgPSBmYWxzZTtcbn07XG5cbkV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUgPSB7XG5cbiAgYWRkTGlzdGVuZXI6IGZ1bmN0aW9uKGV2ZW50LCBsaXN0ZW5lcikge1xuXG4gICAgdGhpcy5nZXRMaXN0ZW5lcihldmVudCkgfHwgKHRoaXMuX2V2ZW50TWFwW2V2ZW50XSA9IFtdKTtcblxuICAgIGlmICh0aGlzLmdldExpc3RlbmVyKGV2ZW50KS5pbmRleE9mKGxpc3RlbmVyKSA9PSAtMSkge1xuICAgICAgdGhpcy5fZXZlbnRNYXBbZXZlbnRdLnB1c2gobGlzdGVuZXIpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIGFkZExpc3RlbmVyT25jZTogZnVuY3Rpb24oZXZlbnQsIGxpc3RlbmVyKSB7XG4gICAgdmFyIHMgPSB0aGlzO1xuICAgIHZhciBmMiA9IGZ1bmN0aW9uKCkge1xuICAgICAgcy5yZW1vdmVMaXN0ZW5lcihldmVudCwgZjIpO1xuICAgICAgcmV0dXJuIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgICByZXR1cm4gdGhpcy5hZGRMaXN0ZW5lcihldmVudCwgZjIpO1xuICB9LFxuXG4gIHJlbW92ZUxpc3RlbmVyOiBmdW5jdGlvbihldmVudCwgbGlzdGVuZXIpIHtcblxuICAgIHZhciBsaXN0ZW5lcnMgPSB0aGlzLmdldExpc3RlbmVyKGV2ZW50KTtcbiAgICBpZiAobGlzdGVuZXJzKSB7XG4gICAgICB2YXIgaSA9IGxpc3RlbmVycy5pbmRleE9mKGxpc3RlbmVyKTtcbiAgICAgIGlmIChpID4gLTEpIHtcbiAgICAgICAgdGhpcy5fZXZlbnRNYXBbZXZlbnRdID0gbGlzdGVuZXJzLnNwbGljZShpLCAxKTtcbiAgICAgICAgaWYgKGxpc3RlbmVycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICBkZWxldGUodGhpcy5fZXZlbnRNYXBbZXZlbnRdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIHJlbW92ZUFsbExpc3RlbmVyOiBmdW5jdGlvbihldmVudCkge1xuXG4gICAgdmFyIGxpc3RlbmVycyA9IHRoaXMuZ2V0TGlzdGVuZXIoZXZlbnQpO1xuICAgIGlmIChsaXN0ZW5lcnMpIHtcbiAgICAgIHRoaXMuX2V2ZW50TWFwW2V2ZW50XS5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlKHRoaXMuX2V2ZW50TWFwW2V2ZW50XSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIGRpc3BhdGNoOiBmdW5jdGlvbihldmVudFR5cGUsIGV2ZW50T2JqZWN0KSB7XG5cbiAgICB2YXIgbGlzdGVuZXJzID0gdGhpcy5nZXRMaXN0ZW5lcihldmVudFR5cGUpO1xuXG4gICAgaWYgKGxpc3RlbmVycykge1xuXG4gICAgICAvL3ZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgIGV2ZW50T2JqZWN0ID0gKGV2ZW50T2JqZWN0KSA/IGV2ZW50T2JqZWN0IDoge307XG4gICAgICBldmVudE9iamVjdC50eXBlID0gZXZlbnRUeXBlO1xuICAgICAgZXZlbnRPYmplY3QudGFyZ2V0ID0gZXZlbnRPYmplY3QudGFyZ2V0IHx8IHRoaXM7XG4gICAgICB2YXIgaSA9IC0xO1xuICAgICAgd2hpbGUgKCsraSA8IGxpc3RlbmVycy5sZW5ndGgpIHtcblxuICAgICAgICAvL2FyZ3MgPyBsaXN0ZW5lcnNbaV0uYXBwbHkobnVsbCwgYXJncykgOiBsaXN0ZW5lcnNbaV0oKTtcbiAgICAgICAgbGlzdGVuZXJzW2ldLmNhbGwobnVsbCwgZXZlbnRPYmplY3QpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBjb25zb2xlLmluZm8oJ05vYm9keSBpcyBsaXN0ZW5pbmcgdG8gJyArIGV2ZW50KTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICBnZXRMaXN0ZW5lcjogZnVuY3Rpb24oZXZlbnQpIHtcbiAgICBpZiAodGhpcy5fZGVzdHJveWVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0kgYW0gZGVzdHJveWVkJyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9ldmVudE1hcFtldmVudF07XG4gIH0sXG5cbiAgZGVzdHJveTogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuX2V2ZW50TWFwKSB7XG4gICAgICBmb3IgKHZhciBpIGluIHRoaXMuX2V2ZW50TWFwKSB7XG4gICAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXIoaSk7XG4gICAgICB9XG4gICAgICAvL1RPRE8gbGVhdmUgYW4gZW1wdHkgb2JqZWN0IGlzIGJldHRlciB0aGVuIHRocm93aW5nIGFuIGVycm9yIHdoZW4gdXNpbmcgYSBmbiBhZnRlciBkZXN0cm95P1xuICAgICAgdGhpcy5fZXZlbnRNYXAgPSBudWxsO1xuICAgIH1cbiAgICB0aGlzLl9kZXN0cm95ZWQgPSB0cnVlO1xuICB9XG59O1xuXG4vL01ldGhvZCBNYXBcbkV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUub24gPSBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLmJpbmQgPSBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLmFkZEV2ZW50TGlzdGVuZXIgPSBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5vZmYgPSBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLnVuYmluZCA9IEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUucmVtb3ZlRXZlbnRMaXN0ZW5lciA9IEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXI7XG5FdmVudERpc3BhdGNoZXIucHJvdG90eXBlLm9uY2UgPSBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLm9uZSA9IEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUuYWRkTGlzdGVuZXJPbmNlO1xuRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS50cmlnZ2VyID0gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5kaXNwYXRjaEV2ZW50ID0gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5kaXNwYXRjaDtcblxubW9kdWxlLmV4cG9ydHMgPSBFdmVudERpc3BhdGNoZXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qXG4gKiBGYXN0U2Nyb2xsXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc29lbmtla2x1dGgvZmFzdHNjcm9sbFxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNCBTw7Zua2UgS2x1dGhcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZS5cbiAqL1xuXG52YXIgZGVsZWdhdGUgPSByZXF1aXJlKCdkZWxlZ2F0ZWpzJyk7XG52YXIgRXZlbnREaXNwYXRjaGVyID0gcmVxdWlyZSgnLi9ldmVudGRpc3BhdGNoZXInKTtcblxudmFyIF9pbnN0YW5jZU1hcCA9IHt9O1xuXG52YXIgRmFzdFNjcm9sbCA9IGZ1bmN0aW9uKHNjcm9sbFRhcmdldCwgb3B0aW9ucykge1xuICBzY3JvbGxUYXJnZXQgPSBzY3JvbGxUYXJnZXQgfHwgd2luZG93O1xuICBpZiAoX2luc3RhbmNlTWFwW3Njcm9sbFRhcmdldF0pIHtcbiAgICByZXR1cm4gX2luc3RhbmNlTWFwW3Njcm9sbFRhcmdldF0uaW5zdGFuY2U7XG4gIH0gZWxzZSB7XG4gICAgX2luc3RhbmNlTWFwW3Njcm9sbFRhcmdldF0gPSB7XG4gICAgICBpbnN0YW5jZTogdGhpcyxcbiAgICAgIGxpc3RlbmVyQ291bnQ6IDBcbiAgICB9O1xuICB9XG5cbiAgdGhpcy5vcHRpb25zID0gb3B0aW9ucyB8fCB7YW5pbWF0aW9uRnJhbWU6IHRydWV9O1xuICB0aGlzLnNjcm9sbFRhcmdldCA9IHNjcm9sbFRhcmdldDtcbiAgdGhpcy5pbml0KCk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuRmFzdFNjcm9sbC5fX19pbnN0YW5jZU1hcCA9IF9pbnN0YW5jZU1hcDtcblxuRmFzdFNjcm9sbC5nZXRJbnN0YW5jZSA9IGZ1bmN0aW9uKHNjcm9sbFRhcmdldCwgb3B0aW9ucykge1xuICByZXR1cm4gbmV3IEZhc3RTY3JvbGwoc2Nyb2xsVGFyZ2V0LCBvcHRpb25zKTtcbn07XG5cbkZhc3RTY3JvbGwuaGFzU2Nyb2xsVGFyZ2V0ID0gZnVuY3Rpb24oc2Nyb2xsVGFyZ2V0KSB7XG4gIHJldHVybiBfaW5zdGFuY2VNYXBbc2Nyb2xsVGFyZ2V0XSAhPT0gdW5kZWZpbmVkO1xufTtcblxuRmFzdFNjcm9sbC5oYXNJbnN0YW5jZSA9IEZhc3RTY3JvbGwuaGFzU2Nyb2xsVGFyZ2V0O1xuXG5GYXN0U2Nyb2xsLlVQID0gJ3VwJztcbkZhc3RTY3JvbGwuRE9XTiA9ICdkb3duJztcbkZhc3RTY3JvbGwuTk9ORSA9ICdub25lJztcbkZhc3RTY3JvbGwuTEVGVCA9ICdsZWZ0JztcbkZhc3RTY3JvbGwuUklHSFQgPSAncmlnaHQnO1xuXG5GYXN0U2Nyb2xsLnByb3RvdHlwZSA9IHtcblxuICBkZXN0cm95ZWQ6IGZhbHNlLFxuICBzY3JvbGxZOiAwLFxuICBzY3JvbGxYOiAwLFxuICBsYXN0U2Nyb2xsWTogMCxcbiAgbGFzdFNjcm9sbFg6IDAsXG4gIHRpbWVvdXQ6IDAsXG4gIHNwZWVkWTogMCxcbiAgc3BlZWRYOiAwLFxuICBzdG9wRnJhbWVzOiA1LFxuICBjdXJyZW50U3RvcEZyYW1lczogMCxcbiAgZmlyc3RSZW5kZXI6IHRydWUsXG4gIGFuaW1hdGlvbkZyYW1lOiB0cnVlLFxuICBsYXN0RXZlbnQ6IHtcbiAgICB0eXBlOiBudWxsLFxuICAgIHNjcm9sbFk6IDAsXG4gICAgc2Nyb2xsWDogMFxuICB9LFxuXG4gIHNjcm9sbGluZzogZmFsc2UsXG5cbiAgaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5kaXNwYXRjaGVyID0gbmV3IEV2ZW50RGlzcGF0Y2hlcigpO1xuICAgIHRoaXMuYW5pbWF0aW9uRnJhbWUgPSB0aGlzLm9wdGlvbnMuYW5pbWF0aW9uRnJhbWU7XG4gICAgdGhpcy51cGRhdGVTY3JvbGxQb3NpdGlvbiA9ICh0aGlzLnNjcm9sbFRhcmdldCA9PT0gd2luZG93KSA/IGRlbGVnYXRlKHRoaXMsIHRoaXMudXBkYXRlV2luZG93U2Nyb2xsUG9zaXRpb24pIDogZGVsZWdhdGUodGhpcywgdGhpcy51cGRhdGVFbGVtZW50U2Nyb2xsUG9zaXRpb24pO1xuICAgIHRoaXMudXBkYXRlU2Nyb2xsUG9zaXRpb24oKTtcbiAgICB0aGlzLnRyaWdnZXIgPSB0aGlzLmRpc3BhdGNoRXZlbnQ7XG4gICAgdGhpcy5sYXN0RXZlbnQuc2Nyb2xsWSA9IHRoaXMuc2Nyb2xsWTtcbiAgICB0aGlzLmxhc3RFdmVudC5zY3JvbGxYID0gdGhpcy5zY3JvbGxYO1xuICAgIHRoaXMub25TY3JvbGxEZWxlZ2F0ZSA9IGRlbGVnYXRlKHRoaXMsIHRoaXMub25TY3JvbGwpO1xuICAgIHRoaXMub25OZXh0RnJhbWVEZWxlZ2F0ZSA9IGRlbGVnYXRlKHRoaXMsIHRoaXMub25OZXh0RnJhbWUpO1xuICAgIHRoaXMuc2Nyb2xsVGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIoJ3Njcm9sbCcsIHRoaXMub25TY3JvbGxEZWxlZ2F0ZSwgZmFsc2UpO1xuICB9LFxuXG4gIGRlc3Ryb3k6IGZ1bmN0aW9uKCkge1xuICAgIGlmIChfaW5zdGFuY2VNYXBbdGhpcy5zY3JvbGxUYXJnZXRdLmxpc3RlbmVyQ291bnQgPD0gMCAmJiAhdGhpcy5kZXN0cm95ZWQpIHtcbiAgICAgIGRlbGV0ZShfaW5zdGFuY2VNYXBbdGhpcy5zY3JvbGxUYXJnZXRdKTtcbiAgICAgIHRoaXMuY2FuY2VsTmV4dEZyYW1lKCk7XG4gICAgICB0aGlzLnNjcm9sbFRhcmdldC5yZW1vdmVFdmVudExpc3RlbmVyKCdzY3JvbGwnLCB0aGlzLm9uU2Nyb2xsRGVsZWdhdGUpO1xuICAgICAgdGhpcy5kaXNwYXRjaGVyLm9mZigpO1xuICAgICAgdGhpcy5kaXNwYXRjaGVyID0gbnVsbDtcbiAgICAgIHRoaXMub25TY3JvbGxEZWxlZ2F0ZSA9IG51bGw7XG4gICAgICB0aGlzLnVwZGF0ZVNjcm9sbFBvc2l0aW9uID0gbnVsbDtcbiAgICAgIHRoaXMub25OZXh0RnJhbWVEZWxlZ2F0ZSA9IG51bGw7XG4gICAgICB0aGlzLnNjcm9sbFRhcmdldCA9IG51bGw7XG4gICAgICB0aGlzLmRlc3Ryb3llZCA9IHRydWU7XG4gICAgfVxuICB9LFxuXG4gIGdldEF0dHJpYnV0ZXM6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICBzY3JvbGxZOiB0aGlzLnNjcm9sbFksXG4gICAgICBzY3JvbGxYOiB0aGlzLnNjcm9sbFgsXG4gICAgICBzcGVlZFk6IHRoaXMuc3BlZWRZLFxuICAgICAgc3BlZWRYOiB0aGlzLnNwZWVkWCxcbiAgICAgIGFuZ2xlOiAwLFxuICAgICAgZGlyZWN0aW9uWTogdGhpcy5zcGVlZFkgPT09IDAgPyBGYXN0U2Nyb2xsLk5PTkUgOiAoKHRoaXMuc3BlZWRZID4gMCkgPyBGYXN0U2Nyb2xsLlVQIDogRmFzdFNjcm9sbC5ET1dOKSxcbiAgICAgIGRpcmVjdGlvblg6IHRoaXMuc3BlZWRYID09PSAwID8gRmFzdFNjcm9sbC5OT05FIDogKCh0aGlzLnNwZWVkWCA+IDApID8gRmFzdFNjcm9sbC5SSUdIVCA6IEZhc3RTY3JvbGwuTEVGVClcbiAgICB9O1xuICB9LFxuXG4gIHVwZGF0ZVdpbmRvd1Njcm9sbFBvc2l0aW9uOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnNjcm9sbFkgPSB0aGlzLnNjcm9sbFRhcmdldC5zY3JvbGxZIHx8IHRoaXMuc2Nyb2xsVGFyZ2V0LnBhZ2VZT2Zmc2V0IHx8IDA7XG4gICAgdGhpcy5zY3JvbGxYID0gdGhpcy5zY3JvbGxUYXJnZXQuc2Nyb2xsWCB8fCB0aGlzLnNjcm9sbFRhcmdldC5wYWdlWE9mZnNldCB8fCAwO1xuICB9LFxuXG4gIHVwZGF0ZUVsZW1lbnRTY3JvbGxQb3NpdGlvbjogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zY3JvbGxZID0gdGhpcy5zY3JvbGxUYXJnZXQuc2Nyb2xsVG9wO1xuICAgIHRoaXMuc2Nyb2xsWCA9IHRoaXMuc2Nyb2xsVGFyZ2V0LnNjcm9sbExlZnQ7XG4gIH0sXG5cbiAgb25TY3JvbGw6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMudXBkYXRlU2Nyb2xsUG9zaXRpb24oKTtcbiAgICB0aGlzLmN1cnJlbnRTdG9wRnJhbWVzID0gMDtcblxuICAgIGlmICh0aGlzLmZpcnN0UmVuZGVyKSB7XG4gICAgICB0aGlzLmZpcnN0UmVuZGVyID0gZmFsc2U7XG4gICAgICBpZiAodGhpcy5zY3JvbGxZID4gMSkge1xuICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQoJ3Njcm9sbDpwcm9ncmVzcycpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLnNjcm9sbGluZykge1xuICAgICAgdGhpcy5zY3JvbGxpbmcgPSB0cnVlO1xuICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KCdzY3JvbGw6c3RhcnQnKTtcbiAgICAgIGlmICh0aGlzLmFuaW1hdGlvbkZyYW1lKSB7XG4gICAgICAgIHRoaXMubmV4dEZyYW1lSUQgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUodGhpcy5vbk5leHRGcmFtZURlbGVnYXRlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCF0aGlzLmFuaW1hdGlvbkZyYW1lKSB7XG4gICAgICBjbGVhclRpbWVvdXQodGhpcy50aW1lb3V0KTtcbiAgICAgIHRoaXMub25OZXh0RnJhbWUoKTtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHRoaXMudGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIHNlbGYub25TY3JvbGxTdG9wKCk7XG4gICAgICB9LCAxMDApO1xuICAgIH1cbiAgfSxcblxuICBvbk5leHRGcmFtZTogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuZGVzdHJveWVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuYW5pbWF0aW9uRnJhbWUpIHtcbiAgICAgIHRoaXMudXBkYXRlU2Nyb2xsUG9zaXRpb24oKTtcbiAgICB9XG5cbiAgICB0aGlzLnNwZWVkWSA9IHRoaXMubGFzdFNjcm9sbFkgLSB0aGlzLnNjcm9sbFk7XG4gICAgdGhpcy5zcGVlZFggPSB0aGlzLmxhc3RTY3JvbGxYIC0gdGhpcy5zY3JvbGxYO1xuXG4gICAgdGhpcy5sYXN0U2Nyb2xsWSA9IHRoaXMuc2Nyb2xsWTtcbiAgICB0aGlzLmxhc3RTY3JvbGxYID0gdGhpcy5zY3JvbGxYO1xuXG4gICAgaWYgKHRoaXMuYW5pbWF0aW9uRnJhbWUpIHtcbiAgICAgIGlmICh0aGlzLnNwZWVkWSA9PT0gMCAmJiB0aGlzLnNjcm9sbGluZyAmJiAodGhpcy5jdXJyZW50U3RvcEZyYW1lcysrID4gdGhpcy5zdG9wRnJhbWVzKSkge1xuICAgICAgICB0aGlzLm9uU2Nyb2xsU3RvcCgpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KCdzY3JvbGw6cHJvZ3Jlc3MnKTtcblxuICAgIGlmICh0aGlzLmFuaW1hdGlvbkZyYW1lKSB7XG4gICAgICB0aGlzLm5leHRGcmFtZUlEID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHRoaXMub25OZXh0RnJhbWVEZWxlZ2F0ZSk7XG4gICAgfVxuXG4gIH0sXG5cbiAgb25TY3JvbGxTdG9wOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnNjcm9sbGluZyA9IGZhbHNlO1xuICAgIGlmICh0aGlzLmFuaW1hdGlvbkZyYW1lKSB7XG4gICAgICB0aGlzLmNhbmNlbE5leHRGcmFtZSgpO1xuICAgICAgdGhpcy5jdXJyZW50U3RvcEZyYW1lcyA9IDA7XG4gICAgfVxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudCgnc2Nyb2xsOnN0b3AnKTtcbiAgfSxcblxuICBjYW5jZWxOZXh0RnJhbWU6IGZ1bmN0aW9uKCkge1xuICAgIGNhbmNlbEFuaW1hdGlvbkZyYW1lKHRoaXMubmV4dEZyYW1lSUQpO1xuICB9LFxuXG4gIGRpc3BhdGNoRXZlbnQ6IGZ1bmN0aW9uKHR5cGUsIGV2ZW50T2JqZWN0KSB7XG4gICAgZXZlbnRPYmplY3QgPSBldmVudE9iamVjdCB8fCB0aGlzLmdldEF0dHJpYnV0ZXMoKTtcblxuICAgIGlmICh0aGlzLmxhc3RFdmVudC50eXBlID09PSB0eXBlICYmIHRoaXMubGFzdEV2ZW50LnNjcm9sbFkgPT09IGV2ZW50T2JqZWN0LnNjcm9sbFkgJiYgdGhpcy5sYXN0RXZlbnQuc2Nyb2xsWCA9PT0gZXZlbnRPYmplY3Quc2Nyb2xsWCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMubGFzdEV2ZW50ID0ge1xuICAgICAgdHlwZTogdHlwZSxcbiAgICAgIHNjcm9sbFk6IGV2ZW50T2JqZWN0LnNjcm9sbFksXG4gICAgICBzY3JvbGxYOiBldmVudE9iamVjdC5zY3JvbGxYXG4gICAgfTtcbiAgICBldmVudE9iamVjdC5mYXN0U2Nyb2xsID0gdGhpcztcbiAgICBldmVudE9iamVjdC50YXJnZXQgPSB0aGlzLnNjcm9sbFRhcmdldDtcbiAgICB0aGlzLmRpc3BhdGNoZXIuZGlzcGF0Y2godHlwZSwgZXZlbnRPYmplY3QpO1xuICB9LFxuXG4gIG9uOiBmdW5jdGlvbihldmVudCwgbGlzdGVuZXIpIHtcbiAgICBpZiAodGhpcy5kaXNwYXRjaGVyLm9uKGV2ZW50LCBsaXN0ZW5lcikpIHtcbiAgICAgIF9pbnN0YW5jZU1hcFt0aGlzLnNjcm9sbFRhcmdldF0ubGlzdGVuZXJDb3VudCArPSAxO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfSxcblxuICBvZmY6IGZ1bmN0aW9uKGV2ZW50LCBsaXN0ZW5lcikge1xuICAgIGlmICh0aGlzLmRpc3BhdGNoZXIub2ZmKGV2ZW50LCBsaXN0ZW5lcikpIHtcbiAgICAgIF9pbnN0YW5jZU1hcFt0aGlzLnNjcm9sbFRhcmdldF0ubGlzdGVuZXJDb3VudCAtPSAxO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBGYXN0U2Nyb2xsO1xuIiwiLyogZXNsaW50LWRpc2FibGUgbm8tdW51c2VkLXZhcnMgKi9cbid1c2Ugc3RyaWN0JztcbnZhciBoYXNPd25Qcm9wZXJ0eSA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG52YXIgcHJvcElzRW51bWVyYWJsZSA9IE9iamVjdC5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGU7XG5cbmZ1bmN0aW9uIHRvT2JqZWN0KHZhbCkge1xuXHRpZiAodmFsID09PSBudWxsIHx8IHZhbCA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignT2JqZWN0LmFzc2lnbiBjYW5ub3QgYmUgY2FsbGVkIHdpdGggbnVsbCBvciB1bmRlZmluZWQnKTtcblx0fVxuXG5cdHJldHVybiBPYmplY3QodmFsKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBPYmplY3QuYXNzaWduIHx8IGZ1bmN0aW9uICh0YXJnZXQsIHNvdXJjZSkge1xuXHR2YXIgZnJvbTtcblx0dmFyIHRvID0gdG9PYmplY3QodGFyZ2V0KTtcblx0dmFyIHN5bWJvbHM7XG5cblx0Zm9yICh2YXIgcyA9IDE7IHMgPCBhcmd1bWVudHMubGVuZ3RoOyBzKyspIHtcblx0XHRmcm9tID0gT2JqZWN0KGFyZ3VtZW50c1tzXSk7XG5cblx0XHRmb3IgKHZhciBrZXkgaW4gZnJvbSkge1xuXHRcdFx0aWYgKGhhc093blByb3BlcnR5LmNhbGwoZnJvbSwga2V5KSkge1xuXHRcdFx0XHR0b1trZXldID0gZnJvbVtrZXldO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmIChPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKSB7XG5cdFx0XHRzeW1ib2xzID0gT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyhmcm9tKTtcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgc3ltYm9scy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRpZiAocHJvcElzRW51bWVyYWJsZS5jYWxsKGZyb20sIHN5bWJvbHNbaV0pKSB7XG5cdFx0XHRcdFx0dG9bc3ltYm9sc1tpXV0gPSBmcm9tW3N5bWJvbHNbaV1dO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHRvO1xufTtcbiJdfQ==
