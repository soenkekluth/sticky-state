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

function getAbsolutBoundingRect(el, fixedHeight) {
  var rect = el.getBoundingClientRect();
  var top = rect.top + getSrollPosition();
  var height = fixedHeight || rect.height;
  return {
    top: top,
    bottom: top + height,
    height: height,
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
  this.onScroll = null;
  this.resizeHandler = null;
  this.fastScroll = null;
  this.wrapper = null;

  this.render = this.render.bind(this);

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

StickyState.prototype.getBounds = function(noCache) {

  var clientRect  = this.getBoundingClientRect();

  if(noCache !== true && this.state.bounds.height !== null) {
    if (clientRect.height === this.state.bounds.height) {
      return {
        bounds: this.state.bounds,
        restrict: this.state.restrict
      };
    }
  }


  var style = this.getPositionStyle();
  var rect;
  var restrict;
  var fixedOffset = {
      top: 0,
      bottom: 0
  };

  if (!this.canSticky()) {
    rect = getAbsolutBoundingRect(this.child, clientRect.height);
    if (this.hasOwnScrollTarget) {
      var parentRect = getAbsolutBoundingRect(this.scrollTarget);
      fixedOffset.top = parentRect.top;
      fixedOffset.bottom = parentRect.bottom;
      rect = addBounds(rect, parentRect);
      restrict = assign({}, rect);
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
    fixedOffset: fixedOffset,
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
  if (!this.onScroll) {
    var hasScrollTarget = FastScroll.hasScrollTarget(this.scrollTarget);

    this.fastScroll = new FastScroll(this.scrollTarget);
    this.onScroll = this.updateStickyState.bind(this);
    this.fastScroll.on('scroll:start', this.onScroll);
    this.fastScroll.on('scroll:progress', this.onScroll);
    this.fastScroll.on('scroll:stop', this.onScroll);
    if (hasScrollTarget && this.fastScroll.scrollY > 0) {
      this.fastScroll.trigger('scroll:progress');
    }
  }
};

StickyState.prototype.removeSrollHandler = function() {
  if (this.fastScroll) {
    this.fastScroll.off('scroll:start', this.onScroll);
    this.fastScroll.off('scroll:progress', this.onScroll);
    this.fastScroll.off('scroll:stop', this.onScroll);
    this.fastScroll.destroy();
    this.onScroll = null;
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

StickyState.prototype.getStickyState = function() {

  if(this.state.disabled){
    return false;
  }

  var scrollY = this.fastScroll.scrollY;
  var top = this.state.style.top;
  var sticky = this.state.sticky;
  var offsetBottom;

  if (top !== null) {
    offsetBottom = this.state.restrict.bottom - this.state.bounds.height - top;
    top = this.state.bounds.top - top;

    if (this.state.sticky === false && scrollY >= top && scrollY <= offsetBottom) {
      sticky = true;
    } else if (this.state.sticky && (scrollY < top || scrollY > offsetBottom)) {
      sticky = false;
    }
    return sticky;
  }

  scrollY += window.innerHeight;
  var bottom = this.state.style.bottom;
  if (bottom !== null) {
    offsetBottom = this.state.restrict.top + this.state.bounds.height - bottom;
    bottom = this.state.bounds.bottom + bottom;

    if (this.state.sticky === false && scrollY <= bottom && scrollY >= offsetBottom) {
      sticky = true;
    } else if (this.state.sticky && (scrollY > bottom || scrollY < offsetBottom)) {
      sticky = false;
    }
  }
  return sticky;
};

StickyState.prototype.updateStickyState = function(silent) {
  var sticky = this.getStickyState();
  if(sticky !== this.state.sticky) {
    silent = silent === true;
    var state = this.getBounds();
    state.sticky = sticky;
    this.setState(state, silent);
  }
};

StickyState.prototype.render = function() {

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

 function isEmpty(obj) {
   for (var prop in obj) {
     if (obj.hasOwnProperty(prop)){
       return false;
     }
   }
   return true;
 }

var _instanceMap = {};

 var EventDispatcher = function() {
   this._eventMap = {};
   this._destroyed = false;
 };

 EventDispatcher.getInstance = function(key){
  if(!key){
    throw new Error('key must be');
  }
  return _instanceMap[key] || (_instanceMap[key] =  new EventDispatcher());
 };


 EventDispatcher.prototype.addListener = function(event, listener) {
   var listeners = this.getListener(event);
   if (!listeners) {
     this._eventMap[event] = [listener];
     return true;
   }

   if (listeners.indexOf(listener) === -1) {
     listeners.push(listener);
     return true;
   }
   return false;
 };

 EventDispatcher.prototype.addListenerOnce = function(event, listener) {
   var s = this;
   var f2 = function() {
     s.removeListener(event, f2);
     return listener.apply(this, arguments);
   };
   return this.addListener(event, f2);
 };

 EventDispatcher.prototype.removeListener = function(event, listener) {

  if(typeof listener === 'undefined'){
    return this.removeAllListener(event);
  }

   var listeners = this.getListener(event);
   if (listeners) {
     var i = listeners.indexOf(listener);
     if (i > -1) {
       listeners = listeners.splice(i, 1);
       if (!listeners.length) {
         delete(this._eventMap[event]);
       }
       return true;
     }
   }
   return false;
 };

 EventDispatcher.prototype.removeAllListener = function(event) {
   var listeners = this.getListener(event);
   if (listeners) {
     this._eventMap[event].length = 0;
     delete(this._eventMap[event]);
    return true;
   }
   return false;
 };

 EventDispatcher.prototype.hasListener = function(event) {
   return this.getListener(event) !== null;
 };

 EventDispatcher.prototype.hasListeners = function() {
   return (this._eventMap !== null && this._eventMap !== undefined && !isEmpty(this._eventMap));
 };

 EventDispatcher.prototype.dispatch = function(eventType, eventObject) {
   var listeners = this.getListener(eventType);

   if (listeners) {
     eventObject = eventObject || {};
     eventObject.type = eventType;
     eventObject.target = eventObject.target || this;

     var i = -1;
     while (++i < listeners.length) {
       listeners[i](eventObject);
     }
     return true;
   }
   return false;
 };

 EventDispatcher.prototype.getListener = function(event) {
   var result = this._eventMap ? this._eventMap[event] : null;
   return (result || null);
 };

 EventDispatcher.prototype.destroy = function() {
   if (this._eventMap) {
     for (var i in this._eventMap) {
       this.removeAllListener(i);
     }
     this._eventMap = null;
   }
   this._destroyed = true;
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
var EventDispatcher = require('eventdispatcher');
var _instanceMap = {};

var FastScroll = function(scrollTarget, options) {
  scrollTarget = scrollTarget || window;
  this.options = options || {};
  if (!this.options.hasOwnProperty('animationFrame')) {
    this.options.animationFrame = true;
  }

  if(typeof window.requestAnimationFrame !== 'function') {
    this.options.animationFrame = false;
  }

  this.scrollTarget = scrollTarget;
  this.init();
};

FastScroll.___instanceMap = _instanceMap;

FastScroll.getInstance = function(scrollTarget, options) {
  scrollTarget = scrollTarget || window;
  return _instanceMap[scrollTarget] || (_instanceMap[scrollTarget] = new FastScroll(scrollTarget, options));
};

FastScroll.hasInstance = function(scrollTarget) {
  return _instanceMap[scrollTarget] !== undefined;
};


FastScroll.hasScrollTarget = FastScroll.hasInstance;

FastScroll.clearInstance = function(scrollTarget) {
  scrollTarget = scrollTarget || window;
  if (FastScroll.hasInstance(scrollTarget)) {
    FastScroll.getInstance(scrollTarget).destroy();
    delete(_instanceMap[scrollTarget]);
  }
};

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
    this.updateScrollPosition = (this.scrollTarget === window) ? delegate(this, this.updateWindowScrollPosition) : delegate(this, this.updateElementScrollPosition);
    this.updateScrollPosition();
    this.trigger = this.dispatchEvent;
    this.lastEvent.scrollY = this.scrollY;
    this.lastEvent.scrollX = this.scrollX;
    this.onScroll = delegate(this, this.onScroll);
    this.onNextFrame = delegate(this, this.onNextFrame);
    if (this.scrollTarget.addEventListener) {
      this.scrollTarget.addEventListener('mousewheel', this.onScroll, false);
      this.scrollTarget.addEventListener('scroll', this.onScroll, false);
    } else if (this.scrollTarget.attachEvent) {
      this.scrollTarget.attachEvent('onmousewheel', this.onScroll);
      this.scrollTarget.attachEvent('scroll', this.onScroll);
    }
  },

  destroy: function() {
    if (!this.destroyed) {
      this.cancelNextFrame();
      if (this.scrollTarget.addEventListener) {
        this.scrollTarget.removeEventListener('mousewheel', this.onScroll);
        this.scrollTarget.removeEventListener('scroll', this.onScroll);
      } else if (this.scrollTarget.attachEvent) {
        this.scrollTarget.detachEvent('onmousewheel', this.onScroll);
        this.scrollTarget.detachEvent('scroll', this.onScroll);
      }
      this.dispatcher.off();
      this.dispatcher = null;
      this.onScroll = null;
      this.updateScrollPosition = null;
      this.onNextFrame = null;
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
    this.scrollY = window.scrollY || window.pageYOffset || 0;
    this.scrollX = window.scrollX || window.pageXOffset || 0;
  },

  updateElementScrollPosition: function() {
    this.scrollY = this.scrollTarget.scrollTop;
    this.scrollX = this.scrollTarget.scrollLeft;
  },

  onScroll: function() {
    this.currentStopFrames = 0;
    if (this.firstRender) {
      this.firstRender = false;
      if (this.scrollY > 1) {
        this.updateScrollPosition();
        this.dispatchEvent('scroll:progress');
        return;
      }
    }

    if (!this.scrolling) {
      this.scrolling = true;
      this.dispatchEvent('scroll:start');
      if (this.options.animationFrame) {
        this.nextFrameID = requestAnimationFrame(this.onNextFrame);
      }
    }
    if (!this.options.animationFrame) {
      clearTimeout(this.timeout);
      this.onNextFrame();
      var self = this;
      this.timeout = setTimeout(function() {
        self.onScrollStop();
      }, 100);
    }
  },

  onNextFrame: function() {

    this.updateScrollPosition();

    this.speedY = this.lastScrollY - this.scrollY;
    this.speedX = this.lastScrollX - this.scrollX;

    this.lastScrollY = this.scrollY;
    this.lastScrollX = this.scrollX;

    if (this.options.animationFrame && (this.scrolling && this.speedY === 0 && (this.currentStopFrames++ > this.stopFrames))) {
      this.onScrollStop();
      return;
    }

    this.dispatchEvent('scroll:progress');

    if (this.options.animationFrame) {
      this.nextFrameID = requestAnimationFrame(this.onNextFrame);
    }
  },

  onScrollStop: function() {
    this.scrolling = false;
    if (this.options.animationFrame) {
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

    // eventObject.fastScroll = this;
    eventObject.target = this.scrollTarget;
    this.dispatcher.dispatch(type, eventObject);
  },

  on: function(event, listener) {
    return this.dispatcher.addListener(event, listener);
  },

  off: function(event, listener) {
    return this.dispatcher.removeListener(event, listener);
  }
};

module.exports = FastScroll;

},{"delegatejs":2,"eventdispatcher":3}],5:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9kZWxlZ2F0ZWpzL2RlbGVnYXRlLmpzIiwibm9kZV9tb2R1bGVzL2V2ZW50ZGlzcGF0Y2hlci9zcmMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZmFzdHNjcm9sbC9zcmMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvb2JqZWN0LWFzc2lnbi9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pZQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgYXNzaWduID0gcmVxdWlyZSgnb2JqZWN0LWFzc2lnbicpO1xudmFyIEZhc3RTY3JvbGwgPSByZXF1aXJlKCdmYXN0c2Nyb2xsJyk7XG5cbnZhciBfZ2xvYmFscyA9IHtcbiAgZmVhdHVyZVRlc3RlZDogZmFsc2Vcbn07XG5cbnZhciBkZWZhdWx0cyA9IHtcbiAgZGlzYWJsZWQ6IGZhbHNlLFxuICBjbGFzc05hbWU6ICdzdGlja3knLFxuICBmaXhlZENsYXNzOiAnc3RpY2t5LWZpeGVkJyxcbiAgc3RhdGVDbGFzc05hbWU6ICdpcy1zdGlja3knXG59O1xuXG5mdW5jdGlvbiBnZXRTcm9sbFBvc2l0aW9uKCkge1xuICByZXR1cm4gKHdpbmRvdy5zY3JvbGxZIHx8IHdpbmRvdy5wYWdlWU9mZnNldCB8fCAwKTtcbn1cblxuZnVuY3Rpb24gZ2V0QWJzb2x1dEJvdW5kaW5nUmVjdChlbCwgZml4ZWRIZWlnaHQpIHtcbiAgdmFyIHJlY3QgPSBlbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgdmFyIHRvcCA9IHJlY3QudG9wICsgZ2V0U3JvbGxQb3NpdGlvbigpO1xuICB2YXIgaGVpZ2h0ID0gZml4ZWRIZWlnaHQgfHwgcmVjdC5oZWlnaHQ7XG4gIHJldHVybiB7XG4gICAgdG9wOiB0b3AsXG4gICAgYm90dG9tOiB0b3AgKyBoZWlnaHQsXG4gICAgaGVpZ2h0OiBoZWlnaHQsXG4gICAgd2lkdGg6IHJlY3Qud2lkdGhcbiAgfTtcbn1cblxuZnVuY3Rpb24gYWRkQm91bmRzKHJlY3QxLCByZWN0Mikge1xuICB2YXIgcmVjdCA9IGFzc2lnbih7fSwgcmVjdDEpO1xuICByZWN0LnRvcCAtPSByZWN0Mi50b3A7XG4gIHJlY3QuYm90dG9tID0gcmVjdC50b3AgKyByZWN0MS5oZWlnaHQ7XG4gIHJldHVybiByZWN0O1xufVxuXG5mdW5jdGlvbiBnZXRQcmV2aW91c0VsZW1lbnRTaWJsaW5nKGVsKSB7XG4gIHZhciBwcmV2ID0gZWwucHJldmlvdXNFbGVtZW50U2libGluZztcbiAgaWYgKHByZXYgJiYgcHJldi50YWdOYW1lLnRvTG9jYWxlTG93ZXJDYXNlKCkgPT09ICdzY3JpcHQnKSB7XG4gICAgcHJldiA9IGdldFByZXZpb3VzRWxlbWVudFNpYmxpbmcocHJldik7XG4gIH1cbiAgcmV0dXJuIHByZXY7XG59XG5cblxudmFyIFN0aWNreVN0YXRlID0gZnVuY3Rpb24oZWxlbWVudCwgb3B0aW9ucykge1xuICBpZiAoIWVsZW1lbnQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1N0aWNreVN0YXRlIG5lZWRzIGEgRG9tRWxlbWVudCcpO1xuICB9XG5cbiAgdGhpcy5lbCA9IGVsZW1lbnQ7XG4gIHRoaXMub3B0aW9ucyA9IGFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpO1xuXG4gIHRoaXMuc3RhdGUgPSB7XG4gICAgc3RpY2t5OiBmYWxzZSxcbiAgICBmaXhlZE9mZnNldDoge1xuICAgICAgdG9wOiAwLFxuICAgICAgYm90dG9tOiAwXG4gICAgfSxcbiAgICBib3VuZHM6IHtcbiAgICAgIHRvcDogbnVsbCxcbiAgICAgIGJvdHRvbTogbnVsbCxcbiAgICAgIGhlaWdodDogbnVsbCxcbiAgICAgIHdpZHRoOiBudWxsXG4gICAgfSxcbiAgICByZXN0cmljdDoge1xuICAgICAgdG9wOiBudWxsLFxuICAgICAgYm90dG9tOiBudWxsLFxuICAgICAgaGVpZ2h0OiBudWxsLFxuICAgICAgd2lkdGg6IG51bGxcbiAgICB9LFxuICAgIHN0eWxlOiB7XG4gICAgICB0b3A6IG51bGwsXG4gICAgICBib3R0b206IG51bGxcbiAgICB9LFxuICAgIGRpc2FibGVkOiBmYWxzZVxuICB9O1xuXG4gIHRoaXMuY2hpbGQgPSB0aGlzLmVsO1xuICB0aGlzLnNjcm9sbFRhcmdldCA9IFN0aWNreVN0YXRlLm5hdGl2ZSgpID8gKHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKHRoaXMuZWwucGFyZW50Tm9kZSkub3ZlcmZsb3cgIT09ICdhdXRvJyA/IHdpbmRvdyA6IHRoaXMuZWwucGFyZW50Tm9kZSkgOiB3aW5kb3c7XG4gIHRoaXMuaGFzT3duU2Nyb2xsVGFyZ2V0ID0gdGhpcy5zY3JvbGxUYXJnZXQgIT09IHdpbmRvdztcbiAgdGhpcy5maXJzdFJlbmRlciA9IHRydWU7XG4gIHRoaXMuaGFzRmVhdHVyZSA9IG51bGw7XG4gIHRoaXMub25TY3JvbGwgPSBudWxsO1xuICB0aGlzLnJlc2l6ZUhhbmRsZXIgPSBudWxsO1xuICB0aGlzLmZhc3RTY3JvbGwgPSBudWxsO1xuICB0aGlzLndyYXBwZXIgPSBudWxsO1xuXG4gIHRoaXMucmVuZGVyID0gdGhpcy5yZW5kZXIuYmluZCh0aGlzKTtcblxuICB0aGlzLmFkZFNyb2xsSGFuZGxlcigpO1xuICB0aGlzLmFkZFJlc2l6ZUhhbmRsZXIoKTtcbiAgdGhpcy5yZW5kZXIoKTtcbn07XG5cblN0aWNreVN0YXRlLnByb3RvdHlwZS5zZXRTdGF0ZSA9IGZ1bmN0aW9uKHN0YXRlLCBzaWxlbnQpIHtcbiAgc2lsZW50ID0gc2lsZW50ID09PSB0cnVlO1xuICB0aGlzLnN0YXRlID0gYXNzaWduKHt9LCB0aGlzLnN0YXRlLCBzdGF0ZSk7XG4gIGlmICghc2lsZW50KSB7XG4gICAgdGhpcy5yZW5kZXIoKTtcbiAgfVxufTtcblxuU3RpY2t5U3RhdGUucHJvdG90eXBlLmdldFBvc2l0aW9uU3R5bGUgPSBmdW5jdGlvbigpIHtcblxuICB2YXIgb2JqID0ge1xuICAgIHRvcDogbnVsbCxcbiAgICBib3R0b206IG51bGxcbiAgfTtcblxuICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgdmFyIHZhbHVlID0gcGFyc2VJbnQod2luZG93LmdldENvbXB1dGVkU3R5bGUodGhpcy5lbClba2V5XSk7XG4gICAgdmFsdWUgPSBpc05hTih2YWx1ZSkgPyBudWxsIDogdmFsdWU7XG4gICAgb2JqW2tleV0gPSB2YWx1ZTtcbiAgfVxuXG4gIHJldHVybiBvYmo7XG59O1xuXG5cblN0aWNreVN0YXRlLnByb3RvdHlwZS5nZXRCb3VuZGluZ0NsaWVudFJlY3QgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuZWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG59XG5cblN0aWNreVN0YXRlLnByb3RvdHlwZS5nZXRCb3VuZHMgPSBmdW5jdGlvbihub0NhY2hlKSB7XG5cbiAgdmFyIGNsaWVudFJlY3QgID0gdGhpcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblxuICBpZihub0NhY2hlICE9PSB0cnVlICYmIHRoaXMuc3RhdGUuYm91bmRzLmhlaWdodCAhPT0gbnVsbCkge1xuICAgIGlmIChjbGllbnRSZWN0LmhlaWdodCA9PT0gdGhpcy5zdGF0ZS5ib3VuZHMuaGVpZ2h0KSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBib3VuZHM6IHRoaXMuc3RhdGUuYm91bmRzLFxuICAgICAgICByZXN0cmljdDogdGhpcy5zdGF0ZS5yZXN0cmljdFxuICAgICAgfTtcbiAgICB9XG4gIH1cblxuXG4gIHZhciBzdHlsZSA9IHRoaXMuZ2V0UG9zaXRpb25TdHlsZSgpO1xuICB2YXIgcmVjdDtcbiAgdmFyIHJlc3RyaWN0O1xuICB2YXIgZml4ZWRPZmZzZXQgPSB7XG4gICAgICB0b3A6IDAsXG4gICAgICBib3R0b206IDBcbiAgfTtcblxuICBpZiAoIXRoaXMuY2FuU3RpY2t5KCkpIHtcbiAgICByZWN0ID0gZ2V0QWJzb2x1dEJvdW5kaW5nUmVjdCh0aGlzLmNoaWxkLCBjbGllbnRSZWN0LmhlaWdodCk7XG4gICAgaWYgKHRoaXMuaGFzT3duU2Nyb2xsVGFyZ2V0KSB7XG4gICAgICB2YXIgcGFyZW50UmVjdCA9IGdldEFic29sdXRCb3VuZGluZ1JlY3QodGhpcy5zY3JvbGxUYXJnZXQpO1xuICAgICAgZml4ZWRPZmZzZXQudG9wID0gcGFyZW50UmVjdC50b3A7XG4gICAgICBmaXhlZE9mZnNldC5ib3R0b20gPSBwYXJlbnRSZWN0LmJvdHRvbTtcbiAgICAgIHJlY3QgPSBhZGRCb3VuZHMocmVjdCwgcGFyZW50UmVjdCk7XG4gICAgICByZXN0cmljdCA9IGFzc2lnbih7fSwgcmVjdCk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhciBlbGVtID0gZ2V0UHJldmlvdXNFbGVtZW50U2libGluZyh0aGlzLmNoaWxkKTtcbiAgICB2YXIgb2Zmc2V0ID0gMDtcblxuICAgIGlmIChlbGVtKSB7XG4gICAgICBvZmZzZXQgPSBwYXJzZUludCh3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShlbGVtKVsnbWFyZ2luLWJvdHRvbSddKTtcbiAgICAgIG9mZnNldCA9IG9mZnNldCB8fCAwO1xuICAgICAgcmVjdCA9IGdldEFic29sdXRCb3VuZGluZ1JlY3QoZWxlbSk7XG4gICAgICBpZiAodGhpcy5oYXNPd25TY3JvbGxUYXJnZXQpIHtcbiAgICAgICAgcmVjdCA9IGFkZEJvdW5kcyhyZWN0LCBnZXRBYnNvbHV0Qm91bmRpbmdSZWN0KHRoaXMuc2Nyb2xsVGFyZ2V0KSk7XG4gICAgICB9XG5cbiAgICAgIHJlY3QudG9wID0gcmVjdC5ib3R0b20gKyBvZmZzZXQ7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgZWxlbSA9IHRoaXMuY2hpbGQucGFyZW50Tm9kZTtcbiAgICAgIG9mZnNldCA9IHBhcnNlSW50KHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKGVsZW0pWydwYWRkaW5nLXRvcCddKTtcbiAgICAgIG9mZnNldCA9IG9mZnNldCB8fCAwO1xuICAgICAgcmVjdCA9IGdldEFic29sdXRCb3VuZGluZ1JlY3QoZWxlbSk7XG4gICAgICBpZiAodGhpcy5oYXNPd25TY3JvbGxUYXJnZXQpIHtcbiAgICAgICAgcmVjdCA9IGFkZEJvdW5kcyhyZWN0LCBnZXRBYnNvbHV0Qm91bmRpbmdSZWN0KHRoaXMuc2Nyb2xsVGFyZ2V0KSk7XG4gICAgICB9XG4gICAgICByZWN0LnRvcCA9IHJlY3QudG9wICsgb2Zmc2V0O1xuICAgIH1cblxuICAgIHJlY3QuaGVpZ2h0ID0gdGhpcy5jaGlsZC5jbGllbnRIZWlnaHQ7XG4gICAgcmVjdC53aWR0aCA9IHRoaXMuY2hpbGQuY2xpZW50V2lkdGg7XG4gICAgcmVjdC5ib3R0b20gPSByZWN0LnRvcCArIHJlY3QuaGVpZ2h0O1xuICB9XG5cbiAgcmVzdHJpY3QgPSByZXN0cmljdCB8fCBnZXRBYnNvbHV0Qm91bmRpbmdSZWN0KHRoaXMuY2hpbGQucGFyZW50Tm9kZSk7XG5cbiAgcmV0dXJuIHtcbiAgICBzdHlsZTogc3R5bGUsXG4gICAgZml4ZWRPZmZzZXQ6IGZpeGVkT2Zmc2V0LFxuICAgIGJvdW5kczogcmVjdCxcbiAgICByZXN0cmljdDogcmVzdHJpY3RcbiAgfTtcbn07XG5cblN0aWNreVN0YXRlLnByb3RvdHlwZS51cGRhdGVCb3VuZHMgPSBmdW5jdGlvbihzaWxlbnQpIHtcbiAgc2lsZW50ID0gc2lsZW50ID09PSB0cnVlO1xuICB0aGlzLnNldFN0YXRlKHRoaXMuZ2V0Qm91bmRzKCksIHNpbGVudCk7XG59O1xuXG5TdGlja3lTdGF0ZS5wcm90b3R5cGUuY2FuU3RpY2t5ID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLmhhc0ZlYXR1cmUgIT09IG51bGwpIHtcbiAgICByZXR1cm4gdGhpcy5oYXNGZWF0dXJlO1xuICB9XG4gIHJldHVybiB0aGlzLmhhc0ZlYXR1cmUgPSB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZSh0aGlzLmVsKS5wb3NpdGlvbi5tYXRjaCgnc3RpY2t5Jyk7XG59O1xuXG5TdGlja3lTdGF0ZS5wcm90b3R5cGUuYWRkU3JvbGxIYW5kbGVyID0gZnVuY3Rpb24oKSB7XG4gIGlmICghdGhpcy5vblNjcm9sbCkge1xuICAgIHZhciBoYXNTY3JvbGxUYXJnZXQgPSBGYXN0U2Nyb2xsLmhhc1Njcm9sbFRhcmdldCh0aGlzLnNjcm9sbFRhcmdldCk7XG5cbiAgICB0aGlzLmZhc3RTY3JvbGwgPSBuZXcgRmFzdFNjcm9sbCh0aGlzLnNjcm9sbFRhcmdldCk7XG4gICAgdGhpcy5vblNjcm9sbCA9IHRoaXMudXBkYXRlU3RpY2t5U3RhdGUuYmluZCh0aGlzKTtcbiAgICB0aGlzLmZhc3RTY3JvbGwub24oJ3Njcm9sbDpzdGFydCcsIHRoaXMub25TY3JvbGwpO1xuICAgIHRoaXMuZmFzdFNjcm9sbC5vbignc2Nyb2xsOnByb2dyZXNzJywgdGhpcy5vblNjcm9sbCk7XG4gICAgdGhpcy5mYXN0U2Nyb2xsLm9uKCdzY3JvbGw6c3RvcCcsIHRoaXMub25TY3JvbGwpO1xuICAgIGlmIChoYXNTY3JvbGxUYXJnZXQgJiYgdGhpcy5mYXN0U2Nyb2xsLnNjcm9sbFkgPiAwKSB7XG4gICAgICB0aGlzLmZhc3RTY3JvbGwudHJpZ2dlcignc2Nyb2xsOnByb2dyZXNzJyk7XG4gICAgfVxuICB9XG59O1xuXG5TdGlja3lTdGF0ZS5wcm90b3R5cGUucmVtb3ZlU3JvbGxIYW5kbGVyID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLmZhc3RTY3JvbGwpIHtcbiAgICB0aGlzLmZhc3RTY3JvbGwub2ZmKCdzY3JvbGw6c3RhcnQnLCB0aGlzLm9uU2Nyb2xsKTtcbiAgICB0aGlzLmZhc3RTY3JvbGwub2ZmKCdzY3JvbGw6cHJvZ3Jlc3MnLCB0aGlzLm9uU2Nyb2xsKTtcbiAgICB0aGlzLmZhc3RTY3JvbGwub2ZmKCdzY3JvbGw6c3RvcCcsIHRoaXMub25TY3JvbGwpO1xuICAgIHRoaXMuZmFzdFNjcm9sbC5kZXN0cm95KCk7XG4gICAgdGhpcy5vblNjcm9sbCA9IG51bGw7XG4gICAgdGhpcy5mYXN0U2Nyb2xsID0gbnVsbDtcbiAgfVxufTtcblxuU3RpY2t5U3RhdGUucHJvdG90eXBlLmFkZFJlc2l6ZUhhbmRsZXIgPSBmdW5jdGlvbigpIHtcbiAgaWYgKCF0aGlzLnJlc2l6ZUhhbmRsZXIpIHtcbiAgICB0aGlzLnJlc2l6ZUhhbmRsZXIgPSB0aGlzLm9uUmVzaXplLmJpbmQodGhpcyk7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHRoaXMucmVzaXplSGFuZGxlciwgZmFsc2UpO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdvcmllbnRhdGlvbmNoYW5nZScsIHRoaXMucmVzaXplSGFuZGxlciwgZmFsc2UpO1xuICB9XG59O1xuXG5TdGlja3lTdGF0ZS5wcm90b3R5cGUucmVtb3ZlUmVzaXplSGFuZGxlciA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5yZXNpemVIYW5kbGVyKSB7XG4gICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHRoaXMucmVzaXplSGFuZGxlcik7XG4gICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ29yaWVudGF0aW9uY2hhbmdlJywgdGhpcy5yZXNpemVIYW5kbGVyKTtcbiAgICB0aGlzLnJlc2l6ZUhhbmRsZXIgPSBudWxsO1xuICB9XG59O1xuXG5TdGlja3lTdGF0ZS5wcm90b3R5cGUub25SZXNpemUgPSBmdW5jdGlvbihlKSB7XG4gIHRoaXMudXBkYXRlQm91bmRzKHRydWUpO1xuICB0aGlzLnVwZGF0ZVN0aWNreVN0YXRlKGZhbHNlKTtcbn07XG5cblN0aWNreVN0YXRlLnByb3RvdHlwZS5nZXRTdGlja3lTdGF0ZSA9IGZ1bmN0aW9uKCkge1xuXG4gIGlmKHRoaXMuc3RhdGUuZGlzYWJsZWQpe1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHZhciBzY3JvbGxZID0gdGhpcy5mYXN0U2Nyb2xsLnNjcm9sbFk7XG4gIHZhciB0b3AgPSB0aGlzLnN0YXRlLnN0eWxlLnRvcDtcbiAgdmFyIHN0aWNreSA9IHRoaXMuc3RhdGUuc3RpY2t5O1xuICB2YXIgb2Zmc2V0Qm90dG9tO1xuXG4gIGlmICh0b3AgIT09IG51bGwpIHtcbiAgICBvZmZzZXRCb3R0b20gPSB0aGlzLnN0YXRlLnJlc3RyaWN0LmJvdHRvbSAtIHRoaXMuc3RhdGUuYm91bmRzLmhlaWdodCAtIHRvcDtcbiAgICB0b3AgPSB0aGlzLnN0YXRlLmJvdW5kcy50b3AgLSB0b3A7XG5cbiAgICBpZiAodGhpcy5zdGF0ZS5zdGlja3kgPT09IGZhbHNlICYmIHNjcm9sbFkgPj0gdG9wICYmIHNjcm9sbFkgPD0gb2Zmc2V0Qm90dG9tKSB7XG4gICAgICBzdGlja3kgPSB0cnVlO1xuICAgIH0gZWxzZSBpZiAodGhpcy5zdGF0ZS5zdGlja3kgJiYgKHNjcm9sbFkgPCB0b3AgfHwgc2Nyb2xsWSA+IG9mZnNldEJvdHRvbSkpIHtcbiAgICAgIHN0aWNreSA9IGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gc3RpY2t5O1xuICB9XG5cbiAgc2Nyb2xsWSArPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG4gIHZhciBib3R0b20gPSB0aGlzLnN0YXRlLnN0eWxlLmJvdHRvbTtcbiAgaWYgKGJvdHRvbSAhPT0gbnVsbCkge1xuICAgIG9mZnNldEJvdHRvbSA9IHRoaXMuc3RhdGUucmVzdHJpY3QudG9wICsgdGhpcy5zdGF0ZS5ib3VuZHMuaGVpZ2h0IC0gYm90dG9tO1xuICAgIGJvdHRvbSA9IHRoaXMuc3RhdGUuYm91bmRzLmJvdHRvbSArIGJvdHRvbTtcblxuICAgIGlmICh0aGlzLnN0YXRlLnN0aWNreSA9PT0gZmFsc2UgJiYgc2Nyb2xsWSA8PSBib3R0b20gJiYgc2Nyb2xsWSA+PSBvZmZzZXRCb3R0b20pIHtcbiAgICAgIHN0aWNreSA9IHRydWU7XG4gICAgfSBlbHNlIGlmICh0aGlzLnN0YXRlLnN0aWNreSAmJiAoc2Nyb2xsWSA+IGJvdHRvbSB8fCBzY3JvbGxZIDwgb2Zmc2V0Qm90dG9tKSkge1xuICAgICAgc3RpY2t5ID0gZmFsc2U7XG4gICAgfVxuICB9XG4gIHJldHVybiBzdGlja3k7XG59O1xuXG5TdGlja3lTdGF0ZS5wcm90b3R5cGUudXBkYXRlU3RpY2t5U3RhdGUgPSBmdW5jdGlvbihzaWxlbnQpIHtcbiAgdmFyIHN0aWNreSA9IHRoaXMuZ2V0U3RpY2t5U3RhdGUoKTtcbiAgaWYoc3RpY2t5ICE9PSB0aGlzLnN0YXRlLnN0aWNreSkge1xuICAgIHNpbGVudCA9IHNpbGVudCA9PT0gdHJ1ZTtcbiAgICB2YXIgc3RhdGUgPSB0aGlzLmdldEJvdW5kcygpO1xuICAgIHN0YXRlLnN0aWNreSA9IHN0aWNreTtcbiAgICB0aGlzLnNldFN0YXRlKHN0YXRlLCBzaWxlbnQpO1xuICB9XG59O1xuXG5TdGlja3lTdGF0ZS5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24oKSB7XG5cbiAgaWYgKHRoaXMuZmlyc3RSZW5kZXIpIHtcbiAgICB0aGlzLmZpcnN0UmVuZGVyID0gZmFsc2U7XG5cbiAgICBpZiAoIXRoaXMuY2FuU3RpY2t5KCkpIHtcbiAgICAgIHRoaXMud3JhcHBlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgdGhpcy53cmFwcGVyLmNsYXNzTmFtZSA9ICdzdGlja3ktd3JhcCc7XG4gICAgICB2YXIgcGFyZW50ID0gdGhpcy5lbC5wYXJlbnROb2RlO1xuICAgICAgaWYgKHBhcmVudCkge1xuICAgICAgICBwYXJlbnQuaW5zZXJ0QmVmb3JlKHRoaXMud3JhcHBlciwgdGhpcy5lbCk7XG4gICAgICB9XG4gICAgICB0aGlzLndyYXBwZXIuYXBwZW5kQ2hpbGQodGhpcy5lbCk7XG4gICAgICB0aGlzLmVsLmNsYXNzTmFtZSArPSAnIHN0aWNreS1maXhlZCc7XG4gICAgICB0aGlzLmNoaWxkID0gdGhpcy53cmFwcGVyO1xuICAgIH1cblxuICAgIHRoaXMudXBkYXRlQm91bmRzKHRydWUpO1xuICAgIHRoaXMudXBkYXRlU3RpY2t5U3RhdGUodHJ1ZSk7XG4gIH1cblxuICBpZiAoIXRoaXMuY2FuU3RpY2t5KCkpIHtcbiAgICB2YXIgaGVpZ2h0ID0gKHRoaXMuc3RhdGUuZGlzYWJsZWQgfHwgKCF0aGlzLnN0YXRlLnN0aWNreSB8fCB0aGlzLnN0YXRlLmJvdW5kcy5oZWlnaHQgPT09IG51bGwpKSA/ICdhdXRvJyA6IHRoaXMuc3RhdGUuYm91bmRzLmhlaWdodCArICdweCc7XG5cbiAgICAvLyBpZih0aGlzLnN0YXRlLnN0aWNreSAmJiB0aGlzLnN0YXRlLmZpeGVkT2Zmc2V0LnRvcCAhPT0gMCl7XG4gICAgLy8gICB0aGlzLmVsLnN0eWxlLm1hcmdpblRvcCA9IHRoaXMuc3RhdGUuZml4ZWRPZmZzZXQudG9wKydweCc7XG4gICAgLy8gfVxuXG4gICAgdGhpcy53cmFwcGVyLnN0eWxlLmhlaWdodCA9IGhlaWdodDtcbiAgfVxuXG4gIHZhciBjbGFzc05hbWUgPSB0aGlzLmVsLmNsYXNzTmFtZTtcbiAgdmFyIGhhc1N0YXRlQ2xhc3MgPSBjbGFzc05hbWUuaW5kZXhPZih0aGlzLm9wdGlvbnMuc3RhdGVDbGFzc05hbWUpID4gLTE7XG4gIGlmICh0aGlzLnN0YXRlLnN0aWNreSAmJiAhaGFzU3RhdGVDbGFzcykge1xuICAgIGNsYXNzTmFtZSA9IGNsYXNzTmFtZSArICcgJyArIHRoaXMub3B0aW9ucy5zdGF0ZUNsYXNzTmFtZTtcbiAgfSBlbHNlIGlmICghdGhpcy5zdGF0ZS5zdGlja3kgJiYgaGFzU3RhdGVDbGFzcykge1xuICAgIGNsYXNzTmFtZSA9IGNsYXNzTmFtZS5zcGxpdCh0aGlzLm9wdGlvbnMuc3RhdGVDbGFzc05hbWUpLmpvaW4oJycpO1xuICB9XG5cbiAgaWYgKHRoaXMuZWwuY2xhc3NOYW1lICE9PSBjbGFzc05hbWUpIHtcbiAgICB0aGlzLmVsLmNsYXNzTmFtZSA9IGNsYXNzTmFtZTtcbiAgfVxuXG4gIHJldHVybiB0aGlzLmVsO1xufTtcblxuXG5TdGlja3lTdGF0ZS5uYXRpdmUgPSBmdW5jdGlvbigpIHtcbiAgaWYgKF9nbG9iYWxzLmZlYXR1cmVUZXN0ZWQpIHtcbiAgICByZXR1cm4gX2dsb2JhbHMuY2FuU3RpY2t5O1xuICB9XG4gIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xuXG4gICAgX2dsb2JhbHMuZmVhdHVyZVRlc3RlZCA9IHRydWU7XG5cbiAgICBpZiAod2luZG93Lk1vZGVybml6ciAmJiB3aW5kb3cuTW9kZXJuaXpyLmhhc093blByb3BlcnR5KCdjc3Nwb3NpdGlvbnN0aWNreScpKSB7XG4gICAgICByZXR1cm4gX2dsb2JhbHMuY2FuU3RpY2t5ID0gd2luZG93Lk1vZGVybml6ci5jc3Nwb3NpdGlvbnN0aWNreTtcbiAgICB9XG5cbiAgICB2YXIgdGVzdEVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmFwcGVuZENoaWxkKHRlc3RFbCk7XG4gICAgdmFyIHByZWZpeGVkU3RpY2t5ID0gWydzdGlja3knLCAnLXdlYmtpdC1zdGlja3knLCAnLW1vei1zdGlja3knLCAnLW1zLXN0aWNreScsICctby1zdGlja3knXTtcblxuICAgIF9nbG9iYWxzLmNhblN0aWNreSA9IGZhbHNlO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwcmVmaXhlZFN0aWNreS5sZW5ndGg7IGkrKykge1xuICAgICAgdGVzdEVsLnN0eWxlLnBvc2l0aW9uID0gcHJlZml4ZWRTdGlja3lbaV07XG4gICAgICBfZ2xvYmFscy5jYW5TdGlja3kgPSAhIXdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKHRlc3RFbCkucG9zaXRpb24ubWF0Y2goJ3N0aWNreScpO1xuICAgICAgaWYgKF9nbG9iYWxzLmNhblN0aWNreSkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnJlbW92ZUNoaWxkKHRlc3RFbCk7XG4gIH1cbiAgcmV0dXJuIF9nbG9iYWxzLmNhblN0aWNreTtcbn07XG5cblN0aWNreVN0YXRlLmFwcGx5ID0gZnVuY3Rpb24oZWxlbWVudHMpIHtcbiAgaWYgKGVsZW1lbnRzKSB7XG4gICAgaWYgKGVsZW1lbnRzLmxlbmd0aCkge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbGVtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBuZXcgU3RpY2t5U3RhdGUoZWxlbWVudHNbaV0pO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBuZXcgU3RpY2t5U3RhdGUoZWxlbWVudHMpO1xuICAgIH1cbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTdGlja3lTdGF0ZTtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE0IFPDtm5rZSBLbHV0aFxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHkgb2ZcbiAqIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW5cbiAqIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG9cbiAqIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mXG4gKiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sXG4gKiBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpbiBhbGxcbiAqIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1NcbiAqIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUlxuICogQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSXG4gKiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTlxuICogQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cbiAqKi9cblxuKGZ1bmN0aW9uKGV4cG9ydHMpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIHZhciBkZWxlZ2F0ZSA9IGZ1bmN0aW9uKHRhcmdldCwgaGFuZGxlcikge1xuICAgICAgICAvLyBHZXQgYW55IGV4dHJhIGFyZ3VtZW50cyBmb3IgaGFuZGxlclxuICAgICAgICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKTtcblxuICAgICAgICAvLyBDcmVhdGUgZGVsZWdhdGUgZnVuY3Rpb25cbiAgICAgICAgdmFyIGZuID0gZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgICAgIC8vIENhbGwgaGFuZGxlciB3aXRoIGFyZ3VtZW50c1xuICAgICAgICAgICAgcmV0dXJuIGhhbmRsZXIuYXBwbHkodGFyZ2V0LCBhcmdzKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBSZXR1cm4gdGhlIGRlbGVnYXRlIGZ1bmN0aW9uLlxuICAgICAgICByZXR1cm4gZm47XG4gICAgfTtcblxuXG4gICAgKHR5cGVvZiBtb2R1bGUgIT0gXCJ1bmRlZmluZWRcIiAmJiBtb2R1bGUuZXhwb3J0cykgPyAobW9kdWxlLmV4cG9ydHMgPSBkZWxlZ2F0ZSkgOiAodHlwZW9mIGRlZmluZSAhPSBcInVuZGVmaW5lZFwiID8gKGRlZmluZShmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGRlbGVnYXRlO1xuICAgIH0pKSA6IChleHBvcnRzLmRlbGVnYXRlID0gZGVsZWdhdGUpKTtcblxufSkodGhpcyk7XG4iLCIgJ3VzZSBzdHJpY3QnO1xuXG4gZnVuY3Rpb24gaXNFbXB0eShvYmopIHtcbiAgIGZvciAodmFyIHByb3AgaW4gb2JqKSB7XG4gICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkocHJvcCkpe1xuICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgfVxuICAgfVxuICAgcmV0dXJuIHRydWU7XG4gfVxuXG52YXIgX2luc3RhbmNlTWFwID0ge307XG5cbiB2YXIgRXZlbnREaXNwYXRjaGVyID0gZnVuY3Rpb24oKSB7XG4gICB0aGlzLl9ldmVudE1hcCA9IHt9O1xuICAgdGhpcy5fZGVzdHJveWVkID0gZmFsc2U7XG4gfTtcblxuIEV2ZW50RGlzcGF0Y2hlci5nZXRJbnN0YW5jZSA9IGZ1bmN0aW9uKGtleSl7XG4gIGlmKCFrZXkpe1xuICAgIHRocm93IG5ldyBFcnJvcigna2V5IG11c3QgYmUnKTtcbiAgfVxuICByZXR1cm4gX2luc3RhbmNlTWFwW2tleV0gfHwgKF9pbnN0YW5jZU1hcFtrZXldID0gIG5ldyBFdmVudERpc3BhdGNoZXIoKSk7XG4gfTtcblxuXG4gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKGV2ZW50LCBsaXN0ZW5lcikge1xuICAgdmFyIGxpc3RlbmVycyA9IHRoaXMuZ2V0TGlzdGVuZXIoZXZlbnQpO1xuICAgaWYgKCFsaXN0ZW5lcnMpIHtcbiAgICAgdGhpcy5fZXZlbnRNYXBbZXZlbnRdID0gW2xpc3RlbmVyXTtcbiAgICAgcmV0dXJuIHRydWU7XG4gICB9XG5cbiAgIGlmIChsaXN0ZW5lcnMuaW5kZXhPZihsaXN0ZW5lcikgPT09IC0xKSB7XG4gICAgIGxpc3RlbmVycy5wdXNoKGxpc3RlbmVyKTtcbiAgICAgcmV0dXJuIHRydWU7XG4gICB9XG4gICByZXR1cm4gZmFsc2U7XG4gfTtcblxuIEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUuYWRkTGlzdGVuZXJPbmNlID0gZnVuY3Rpb24oZXZlbnQsIGxpc3RlbmVyKSB7XG4gICB2YXIgcyA9IHRoaXM7XG4gICB2YXIgZjIgPSBmdW5jdGlvbigpIHtcbiAgICAgcy5yZW1vdmVMaXN0ZW5lcihldmVudCwgZjIpO1xuICAgICByZXR1cm4gbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgIH07XG4gICByZXR1cm4gdGhpcy5hZGRMaXN0ZW5lcihldmVudCwgZjIpO1xuIH07XG5cbiBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24oZXZlbnQsIGxpc3RlbmVyKSB7XG5cbiAgaWYodHlwZW9mIGxpc3RlbmVyID09PSAndW5kZWZpbmVkJyl7XG4gICAgcmV0dXJuIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXIoZXZlbnQpO1xuICB9XG5cbiAgIHZhciBsaXN0ZW5lcnMgPSB0aGlzLmdldExpc3RlbmVyKGV2ZW50KTtcbiAgIGlmIChsaXN0ZW5lcnMpIHtcbiAgICAgdmFyIGkgPSBsaXN0ZW5lcnMuaW5kZXhPZihsaXN0ZW5lcik7XG4gICAgIGlmIChpID4gLTEpIHtcbiAgICAgICBsaXN0ZW5lcnMgPSBsaXN0ZW5lcnMuc3BsaWNlKGksIDEpO1xuICAgICAgIGlmICghbGlzdGVuZXJzLmxlbmd0aCkge1xuICAgICAgICAgZGVsZXRlKHRoaXMuX2V2ZW50TWFwW2V2ZW50XSk7XG4gICAgICAgfVxuICAgICAgIHJldHVybiB0cnVlO1xuICAgICB9XG4gICB9XG4gICByZXR1cm4gZmFsc2U7XG4gfTtcblxuIEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXIgPSBmdW5jdGlvbihldmVudCkge1xuICAgdmFyIGxpc3RlbmVycyA9IHRoaXMuZ2V0TGlzdGVuZXIoZXZlbnQpO1xuICAgaWYgKGxpc3RlbmVycykge1xuICAgICB0aGlzLl9ldmVudE1hcFtldmVudF0ubGVuZ3RoID0gMDtcbiAgICAgZGVsZXRlKHRoaXMuX2V2ZW50TWFwW2V2ZW50XSk7XG4gICAgcmV0dXJuIHRydWU7XG4gICB9XG4gICByZXR1cm4gZmFsc2U7XG4gfTtcblxuIEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUuaGFzTGlzdGVuZXIgPSBmdW5jdGlvbihldmVudCkge1xuICAgcmV0dXJuIHRoaXMuZ2V0TGlzdGVuZXIoZXZlbnQpICE9PSBudWxsO1xuIH07XG5cbiBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLmhhc0xpc3RlbmVycyA9IGZ1bmN0aW9uKCkge1xuICAgcmV0dXJuICh0aGlzLl9ldmVudE1hcCAhPT0gbnVsbCAmJiB0aGlzLl9ldmVudE1hcCAhPT0gdW5kZWZpbmVkICYmICFpc0VtcHR5KHRoaXMuX2V2ZW50TWFwKSk7XG4gfTtcblxuIEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUuZGlzcGF0Y2ggPSBmdW5jdGlvbihldmVudFR5cGUsIGV2ZW50T2JqZWN0KSB7XG4gICB2YXIgbGlzdGVuZXJzID0gdGhpcy5nZXRMaXN0ZW5lcihldmVudFR5cGUpO1xuXG4gICBpZiAobGlzdGVuZXJzKSB7XG4gICAgIGV2ZW50T2JqZWN0ID0gZXZlbnRPYmplY3QgfHwge307XG4gICAgIGV2ZW50T2JqZWN0LnR5cGUgPSBldmVudFR5cGU7XG4gICAgIGV2ZW50T2JqZWN0LnRhcmdldCA9IGV2ZW50T2JqZWN0LnRhcmdldCB8fCB0aGlzO1xuXG4gICAgIHZhciBpID0gLTE7XG4gICAgIHdoaWxlICgrK2kgPCBsaXN0ZW5lcnMubGVuZ3RoKSB7XG4gICAgICAgbGlzdGVuZXJzW2ldKGV2ZW50T2JqZWN0KTtcbiAgICAgfVxuICAgICByZXR1cm4gdHJ1ZTtcbiAgIH1cbiAgIHJldHVybiBmYWxzZTtcbiB9O1xuXG4gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5nZXRMaXN0ZW5lciA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICB2YXIgcmVzdWx0ID0gdGhpcy5fZXZlbnRNYXAgPyB0aGlzLl9ldmVudE1hcFtldmVudF0gOiBudWxsO1xuICAgcmV0dXJuIChyZXN1bHQgfHwgbnVsbCk7XG4gfTtcblxuIEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uKCkge1xuICAgaWYgKHRoaXMuX2V2ZW50TWFwKSB7XG4gICAgIGZvciAodmFyIGkgaW4gdGhpcy5fZXZlbnRNYXApIHtcbiAgICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVyKGkpO1xuICAgICB9XG4gICAgIHRoaXMuX2V2ZW50TWFwID0gbnVsbDtcbiAgIH1cbiAgIHRoaXMuX2Rlc3Ryb3llZCA9IHRydWU7XG4gfTtcblxuXG4gLy9NZXRob2QgTWFwXG4gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUuYmluZCA9IEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUuYWRkRXZlbnRMaXN0ZW5lciA9IEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XG4gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5vZmYgPSBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLnVuYmluZCA9IEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUucmVtb3ZlRXZlbnRMaXN0ZW5lciA9IEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXI7XG4gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5vbmNlID0gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5vbmUgPSBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLmFkZExpc3RlbmVyT25jZTtcbiBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLnRyaWdnZXIgPSBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLmRpc3BhdGNoRXZlbnQgPSBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLmRpc3BhdGNoO1xuXG4gbW9kdWxlLmV4cG9ydHMgPSBFdmVudERpc3BhdGNoZXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qXG4gKiBGYXN0U2Nyb2xsXG4gKiBodHRwczovL2dpdGh1Yi5jb20vc29lbmtla2x1dGgvZmFzdHNjcm9sbFxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNCBTw7Zua2UgS2x1dGhcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZS5cbiAqL1xuXG52YXIgZGVsZWdhdGUgPSByZXF1aXJlKCdkZWxlZ2F0ZWpzJyk7XG52YXIgRXZlbnREaXNwYXRjaGVyID0gcmVxdWlyZSgnZXZlbnRkaXNwYXRjaGVyJyk7XG52YXIgX2luc3RhbmNlTWFwID0ge307XG5cbnZhciBGYXN0U2Nyb2xsID0gZnVuY3Rpb24oc2Nyb2xsVGFyZ2V0LCBvcHRpb25zKSB7XG4gIHNjcm9sbFRhcmdldCA9IHNjcm9sbFRhcmdldCB8fCB3aW5kb3c7XG4gIHRoaXMub3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIGlmICghdGhpcy5vcHRpb25zLmhhc093blByb3BlcnR5KCdhbmltYXRpb25GcmFtZScpKSB7XG4gICAgdGhpcy5vcHRpb25zLmFuaW1hdGlvbkZyYW1lID0gdHJ1ZTtcbiAgfVxuXG4gIGlmKHR5cGVvZiB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgdGhpcy5vcHRpb25zLmFuaW1hdGlvbkZyYW1lID0gZmFsc2U7XG4gIH1cblxuICB0aGlzLnNjcm9sbFRhcmdldCA9IHNjcm9sbFRhcmdldDtcbiAgdGhpcy5pbml0KCk7XG59O1xuXG5GYXN0U2Nyb2xsLl9fX2luc3RhbmNlTWFwID0gX2luc3RhbmNlTWFwO1xuXG5GYXN0U2Nyb2xsLmdldEluc3RhbmNlID0gZnVuY3Rpb24oc2Nyb2xsVGFyZ2V0LCBvcHRpb25zKSB7XG4gIHNjcm9sbFRhcmdldCA9IHNjcm9sbFRhcmdldCB8fCB3aW5kb3c7XG4gIHJldHVybiBfaW5zdGFuY2VNYXBbc2Nyb2xsVGFyZ2V0XSB8fCAoX2luc3RhbmNlTWFwW3Njcm9sbFRhcmdldF0gPSBuZXcgRmFzdFNjcm9sbChzY3JvbGxUYXJnZXQsIG9wdGlvbnMpKTtcbn07XG5cbkZhc3RTY3JvbGwuaGFzSW5zdGFuY2UgPSBmdW5jdGlvbihzY3JvbGxUYXJnZXQpIHtcbiAgcmV0dXJuIF9pbnN0YW5jZU1hcFtzY3JvbGxUYXJnZXRdICE9PSB1bmRlZmluZWQ7XG59O1xuXG5cbkZhc3RTY3JvbGwuaGFzU2Nyb2xsVGFyZ2V0ID0gRmFzdFNjcm9sbC5oYXNJbnN0YW5jZTtcblxuRmFzdFNjcm9sbC5jbGVhckluc3RhbmNlID0gZnVuY3Rpb24oc2Nyb2xsVGFyZ2V0KSB7XG4gIHNjcm9sbFRhcmdldCA9IHNjcm9sbFRhcmdldCB8fCB3aW5kb3c7XG4gIGlmIChGYXN0U2Nyb2xsLmhhc0luc3RhbmNlKHNjcm9sbFRhcmdldCkpIHtcbiAgICBGYXN0U2Nyb2xsLmdldEluc3RhbmNlKHNjcm9sbFRhcmdldCkuZGVzdHJveSgpO1xuICAgIGRlbGV0ZShfaW5zdGFuY2VNYXBbc2Nyb2xsVGFyZ2V0XSk7XG4gIH1cbn07XG5cbkZhc3RTY3JvbGwuVVAgPSAndXAnO1xuRmFzdFNjcm9sbC5ET1dOID0gJ2Rvd24nO1xuRmFzdFNjcm9sbC5OT05FID0gJ25vbmUnO1xuRmFzdFNjcm9sbC5MRUZUID0gJ2xlZnQnO1xuRmFzdFNjcm9sbC5SSUdIVCA9ICdyaWdodCc7XG5cbkZhc3RTY3JvbGwucHJvdG90eXBlID0ge1xuXG4gIGRlc3Ryb3llZDogZmFsc2UsXG4gIHNjcm9sbFk6IDAsXG4gIHNjcm9sbFg6IDAsXG4gIGxhc3RTY3JvbGxZOiAwLFxuICBsYXN0U2Nyb2xsWDogMCxcbiAgdGltZW91dDogMCxcbiAgc3BlZWRZOiAwLFxuICBzcGVlZFg6IDAsXG4gIHN0b3BGcmFtZXM6IDUsXG4gIGN1cnJlbnRTdG9wRnJhbWVzOiAwLFxuICBmaXJzdFJlbmRlcjogdHJ1ZSxcbiAgYW5pbWF0aW9uRnJhbWU6IHRydWUsXG4gIGxhc3RFdmVudDoge1xuICAgIHR5cGU6IG51bGwsXG4gICAgc2Nyb2xsWTogMCxcbiAgICBzY3JvbGxYOiAwXG4gIH0sXG5cbiAgc2Nyb2xsaW5nOiBmYWxzZSxcblxuICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmRpc3BhdGNoZXIgPSBuZXcgRXZlbnREaXNwYXRjaGVyKCk7XG4gICAgdGhpcy51cGRhdGVTY3JvbGxQb3NpdGlvbiA9ICh0aGlzLnNjcm9sbFRhcmdldCA9PT0gd2luZG93KSA/IGRlbGVnYXRlKHRoaXMsIHRoaXMudXBkYXRlV2luZG93U2Nyb2xsUG9zaXRpb24pIDogZGVsZWdhdGUodGhpcywgdGhpcy51cGRhdGVFbGVtZW50U2Nyb2xsUG9zaXRpb24pO1xuICAgIHRoaXMudXBkYXRlU2Nyb2xsUG9zaXRpb24oKTtcbiAgICB0aGlzLnRyaWdnZXIgPSB0aGlzLmRpc3BhdGNoRXZlbnQ7XG4gICAgdGhpcy5sYXN0RXZlbnQuc2Nyb2xsWSA9IHRoaXMuc2Nyb2xsWTtcbiAgICB0aGlzLmxhc3RFdmVudC5zY3JvbGxYID0gdGhpcy5zY3JvbGxYO1xuICAgIHRoaXMub25TY3JvbGwgPSBkZWxlZ2F0ZSh0aGlzLCB0aGlzLm9uU2Nyb2xsKTtcbiAgICB0aGlzLm9uTmV4dEZyYW1lID0gZGVsZWdhdGUodGhpcywgdGhpcy5vbk5leHRGcmFtZSk7XG4gICAgaWYgKHRoaXMuc2Nyb2xsVGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIpIHtcbiAgICAgIHRoaXMuc2Nyb2xsVGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNld2hlZWwnLCB0aGlzLm9uU2Nyb2xsLCBmYWxzZSk7XG4gICAgICB0aGlzLnNjcm9sbFRhcmdldC5hZGRFdmVudExpc3RlbmVyKCdzY3JvbGwnLCB0aGlzLm9uU2Nyb2xsLCBmYWxzZSk7XG4gICAgfSBlbHNlIGlmICh0aGlzLnNjcm9sbFRhcmdldC5hdHRhY2hFdmVudCkge1xuICAgICAgdGhpcy5zY3JvbGxUYXJnZXQuYXR0YWNoRXZlbnQoJ29ubW91c2V3aGVlbCcsIHRoaXMub25TY3JvbGwpO1xuICAgICAgdGhpcy5zY3JvbGxUYXJnZXQuYXR0YWNoRXZlbnQoJ3Njcm9sbCcsIHRoaXMub25TY3JvbGwpO1xuICAgIH1cbiAgfSxcblxuICBkZXN0cm95OiBmdW5jdGlvbigpIHtcbiAgICBpZiAoIXRoaXMuZGVzdHJveWVkKSB7XG4gICAgICB0aGlzLmNhbmNlbE5leHRGcmFtZSgpO1xuICAgICAgaWYgKHRoaXMuc2Nyb2xsVGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIpIHtcbiAgICAgICAgdGhpcy5zY3JvbGxUYXJnZXQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2V3aGVlbCcsIHRoaXMub25TY3JvbGwpO1xuICAgICAgICB0aGlzLnNjcm9sbFRhcmdldC5yZW1vdmVFdmVudExpc3RlbmVyKCdzY3JvbGwnLCB0aGlzLm9uU2Nyb2xsKTtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5zY3JvbGxUYXJnZXQuYXR0YWNoRXZlbnQpIHtcbiAgICAgICAgdGhpcy5zY3JvbGxUYXJnZXQuZGV0YWNoRXZlbnQoJ29ubW91c2V3aGVlbCcsIHRoaXMub25TY3JvbGwpO1xuICAgICAgICB0aGlzLnNjcm9sbFRhcmdldC5kZXRhY2hFdmVudCgnc2Nyb2xsJywgdGhpcy5vblNjcm9sbCk7XG4gICAgICB9XG4gICAgICB0aGlzLmRpc3BhdGNoZXIub2ZmKCk7XG4gICAgICB0aGlzLmRpc3BhdGNoZXIgPSBudWxsO1xuICAgICAgdGhpcy5vblNjcm9sbCA9IG51bGw7XG4gICAgICB0aGlzLnVwZGF0ZVNjcm9sbFBvc2l0aW9uID0gbnVsbDtcbiAgICAgIHRoaXMub25OZXh0RnJhbWUgPSBudWxsO1xuICAgICAgdGhpcy5zY3JvbGxUYXJnZXQgPSBudWxsO1xuICAgICAgdGhpcy5kZXN0cm95ZWQgPSB0cnVlO1xuICAgIH1cbiAgfSxcblxuICBnZXRBdHRyaWJ1dGVzOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgc2Nyb2xsWTogdGhpcy5zY3JvbGxZLFxuICAgICAgc2Nyb2xsWDogdGhpcy5zY3JvbGxYLFxuICAgICAgc3BlZWRZOiB0aGlzLnNwZWVkWSxcbiAgICAgIHNwZWVkWDogdGhpcy5zcGVlZFgsXG4gICAgICBhbmdsZTogMCxcbiAgICAgIGRpcmVjdGlvblk6IHRoaXMuc3BlZWRZID09PSAwID8gRmFzdFNjcm9sbC5OT05FIDogKCh0aGlzLnNwZWVkWSA+IDApID8gRmFzdFNjcm9sbC5VUCA6IEZhc3RTY3JvbGwuRE9XTiksXG4gICAgICBkaXJlY3Rpb25YOiB0aGlzLnNwZWVkWCA9PT0gMCA/IEZhc3RTY3JvbGwuTk9ORSA6ICgodGhpcy5zcGVlZFggPiAwKSA/IEZhc3RTY3JvbGwuUklHSFQgOiBGYXN0U2Nyb2xsLkxFRlQpXG4gICAgfTtcbiAgfSxcblxuICB1cGRhdGVXaW5kb3dTY3JvbGxQb3NpdGlvbjogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zY3JvbGxZID0gd2luZG93LnNjcm9sbFkgfHwgd2luZG93LnBhZ2VZT2Zmc2V0IHx8IDA7XG4gICAgdGhpcy5zY3JvbGxYID0gd2luZG93LnNjcm9sbFggfHwgd2luZG93LnBhZ2VYT2Zmc2V0IHx8IDA7XG4gIH0sXG5cbiAgdXBkYXRlRWxlbWVudFNjcm9sbFBvc2l0aW9uOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnNjcm9sbFkgPSB0aGlzLnNjcm9sbFRhcmdldC5zY3JvbGxUb3A7XG4gICAgdGhpcy5zY3JvbGxYID0gdGhpcy5zY3JvbGxUYXJnZXQuc2Nyb2xsTGVmdDtcbiAgfSxcblxuICBvblNjcm9sbDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5jdXJyZW50U3RvcEZyYW1lcyA9IDA7XG4gICAgaWYgKHRoaXMuZmlyc3RSZW5kZXIpIHtcbiAgICAgIHRoaXMuZmlyc3RSZW5kZXIgPSBmYWxzZTtcbiAgICAgIGlmICh0aGlzLnNjcm9sbFkgPiAxKSB7XG4gICAgICAgIHRoaXMudXBkYXRlU2Nyb2xsUG9zaXRpb24oKTtcbiAgICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KCdzY3JvbGw6cHJvZ3Jlc3MnKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICghdGhpcy5zY3JvbGxpbmcpIHtcbiAgICAgIHRoaXMuc2Nyb2xsaW5nID0gdHJ1ZTtcbiAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudCgnc2Nyb2xsOnN0YXJ0Jyk7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmFuaW1hdGlvbkZyYW1lKSB7XG4gICAgICAgIHRoaXMubmV4dEZyYW1lSUQgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUodGhpcy5vbk5leHRGcmFtZSk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICghdGhpcy5vcHRpb25zLmFuaW1hdGlvbkZyYW1lKSB7XG4gICAgICBjbGVhclRpbWVvdXQodGhpcy50aW1lb3V0KTtcbiAgICAgIHRoaXMub25OZXh0RnJhbWUoKTtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHRoaXMudGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIHNlbGYub25TY3JvbGxTdG9wKCk7XG4gICAgICB9LCAxMDApO1xuICAgIH1cbiAgfSxcblxuICBvbk5leHRGcmFtZTogZnVuY3Rpb24oKSB7XG5cbiAgICB0aGlzLnVwZGF0ZVNjcm9sbFBvc2l0aW9uKCk7XG5cbiAgICB0aGlzLnNwZWVkWSA9IHRoaXMubGFzdFNjcm9sbFkgLSB0aGlzLnNjcm9sbFk7XG4gICAgdGhpcy5zcGVlZFggPSB0aGlzLmxhc3RTY3JvbGxYIC0gdGhpcy5zY3JvbGxYO1xuXG4gICAgdGhpcy5sYXN0U2Nyb2xsWSA9IHRoaXMuc2Nyb2xsWTtcbiAgICB0aGlzLmxhc3RTY3JvbGxYID0gdGhpcy5zY3JvbGxYO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5hbmltYXRpb25GcmFtZSAmJiAodGhpcy5zY3JvbGxpbmcgJiYgdGhpcy5zcGVlZFkgPT09IDAgJiYgKHRoaXMuY3VycmVudFN0b3BGcmFtZXMrKyA+IHRoaXMuc3RvcEZyYW1lcykpKSB7XG4gICAgICB0aGlzLm9uU2Nyb2xsU3RvcCgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudCgnc2Nyb2xsOnByb2dyZXNzJyk7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmFuaW1hdGlvbkZyYW1lKSB7XG4gICAgICB0aGlzLm5leHRGcmFtZUlEID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHRoaXMub25OZXh0RnJhbWUpO1xuICAgIH1cbiAgfSxcblxuICBvblNjcm9sbFN0b3A6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc2Nyb2xsaW5nID0gZmFsc2U7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5hbmltYXRpb25GcmFtZSkge1xuICAgICAgdGhpcy5jYW5jZWxOZXh0RnJhbWUoKTtcbiAgICAgIHRoaXMuY3VycmVudFN0b3BGcmFtZXMgPSAwO1xuICAgIH1cbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQoJ3Njcm9sbDpzdG9wJyk7XG4gIH0sXG5cbiAgY2FuY2VsTmV4dEZyYW1lOiBmdW5jdGlvbigpIHtcbiAgICBjYW5jZWxBbmltYXRpb25GcmFtZSh0aGlzLm5leHRGcmFtZUlEKTtcbiAgfSxcblxuICBkaXNwYXRjaEV2ZW50OiBmdW5jdGlvbih0eXBlLCBldmVudE9iamVjdCkge1xuICAgIGV2ZW50T2JqZWN0ID0gZXZlbnRPYmplY3QgfHwgdGhpcy5nZXRBdHRyaWJ1dGVzKCk7XG5cbiAgICBpZiAodGhpcy5sYXN0RXZlbnQudHlwZSA9PT0gdHlwZSAmJiB0aGlzLmxhc3RFdmVudC5zY3JvbGxZID09PSBldmVudE9iamVjdC5zY3JvbGxZICYmIHRoaXMubGFzdEV2ZW50LnNjcm9sbFggPT09IGV2ZW50T2JqZWN0LnNjcm9sbFgpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmxhc3RFdmVudCA9IHtcbiAgICAgIHR5cGU6IHR5cGUsXG4gICAgICBzY3JvbGxZOiBldmVudE9iamVjdC5zY3JvbGxZLFxuICAgICAgc2Nyb2xsWDogZXZlbnRPYmplY3Quc2Nyb2xsWFxuICAgIH07XG5cbiAgICAvLyBldmVudE9iamVjdC5mYXN0U2Nyb2xsID0gdGhpcztcbiAgICBldmVudE9iamVjdC50YXJnZXQgPSB0aGlzLnNjcm9sbFRhcmdldDtcbiAgICB0aGlzLmRpc3BhdGNoZXIuZGlzcGF0Y2godHlwZSwgZXZlbnRPYmplY3QpO1xuICB9LFxuXG4gIG9uOiBmdW5jdGlvbihldmVudCwgbGlzdGVuZXIpIHtcbiAgICByZXR1cm4gdGhpcy5kaXNwYXRjaGVyLmFkZExpc3RlbmVyKGV2ZW50LCBsaXN0ZW5lcik7XG4gIH0sXG5cbiAgb2ZmOiBmdW5jdGlvbihldmVudCwgbGlzdGVuZXIpIHtcbiAgICByZXR1cm4gdGhpcy5kaXNwYXRjaGVyLnJlbW92ZUxpc3RlbmVyKGV2ZW50LCBsaXN0ZW5lcik7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRmFzdFNjcm9sbDtcbiIsIi8qIGVzbGludC1kaXNhYmxlIG5vLXVudXNlZC12YXJzICovXG4ndXNlIHN0cmljdCc7XG52YXIgaGFzT3duUHJvcGVydHkgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xudmFyIHByb3BJc0VudW1lcmFibGUgPSBPYmplY3QucHJvdG90eXBlLnByb3BlcnR5SXNFbnVtZXJhYmxlO1xuXG5mdW5jdGlvbiB0b09iamVjdCh2YWwpIHtcblx0aWYgKHZhbCA9PT0gbnVsbCB8fCB2YWwgPT09IHVuZGVmaW5lZCkge1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ09iamVjdC5hc3NpZ24gY2Fubm90IGJlIGNhbGxlZCB3aXRoIG51bGwgb3IgdW5kZWZpbmVkJyk7XG5cdH1cblxuXHRyZXR1cm4gT2JqZWN0KHZhbCk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbiAodGFyZ2V0LCBzb3VyY2UpIHtcblx0dmFyIGZyb207XG5cdHZhciB0byA9IHRvT2JqZWN0KHRhcmdldCk7XG5cdHZhciBzeW1ib2xzO1xuXG5cdGZvciAodmFyIHMgPSAxOyBzIDwgYXJndW1lbnRzLmxlbmd0aDsgcysrKSB7XG5cdFx0ZnJvbSA9IE9iamVjdChhcmd1bWVudHNbc10pO1xuXG5cdFx0Zm9yICh2YXIga2V5IGluIGZyb20pIHtcblx0XHRcdGlmIChoYXNPd25Qcm9wZXJ0eS5jYWxsKGZyb20sIGtleSkpIHtcblx0XHRcdFx0dG9ba2V5XSA9IGZyb21ba2V5XTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAoT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scykge1xuXHRcdFx0c3ltYm9scyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMoZnJvbSk7XG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHN5bWJvbHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0aWYgKHByb3BJc0VudW1lcmFibGUuY2FsbChmcm9tLCBzeW1ib2xzW2ldKSkge1xuXHRcdFx0XHRcdHRvW3N5bWJvbHNbaV1dID0gZnJvbVtzeW1ib2xzW2ldXTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdHJldHVybiB0bztcbn07XG4iXX0=
