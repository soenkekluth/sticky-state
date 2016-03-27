(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.StickyState = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var assign = require('object-assign');
var FastScroll = require('fastscroll');

var _globals = {
  featureTested: false
};

var defaults = {
  disabled:       false,
  className:      'sticky',
  stateClassName: 'is-sticky',
  fixedClass:     'sticky-fixed',
  wrapperClass:   'sticky-wrap',
  absoluteClass:  'is-absolute'
};

function getSrollPosition() {
  return (window.scrollY || window.pageYOffset || 0);
}

function getDocumentHeight() {
  return Math.max( document.body.scrollHeight, document.body.offsetHeight,  document.documentElement.clientHeight, document.documentElement.scrollHeight, document.documentElement.offsetHeight );
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

function getPositionStyle(el) {
  var obj = {
    top: null,
    bottom: null
  };

  for (var key in obj) {
    var value = parseInt(window.getComputedStyle(el)[key]);
    value = isNaN(value) ? null : value;
    obj[key] = value;
  }

  return obj;
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

  this.setState({
    sticky: false,
    absolute: false,
    fixedOffset: '',
    offsetHeight: 0,
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
    disabled: this.options.disabled
  }, true);

  this.scrollTarget = (window.getComputedStyle(this.el.parentNode).overflow !== 'auto' ? window : this.el.parentNode);
  this.hasOwnScrollTarget = this.scrollTarget !== window;
  if (this.hasOwnScrollTarget) {
    this.updateFixedOffset = this.updateFixedOffset.bind(this);
  }
  this.firstRender = true;
  this.resizeHandler = null;
  this.fastScroll = null;
  this.wrapper = null;

  this.render = this.render.bind(this);

  this.addSrollHandler();
  this.addResizeHandler();
  this.render();
};

StickyState.prototype.setState = function(newState, silent) {
  this.lastState = this.state || newState;
  this.state = assign({}, this.state, newState);
  if (silent !== true) {
    this.render();
  }
};

StickyState.prototype.getBoundingClientRect = function() {
  return this.el.getBoundingClientRect();
};

StickyState.prototype.getBounds = function(noCache) {

  var clientRect = this.getBoundingClientRect();
  var offsetHeight = getDocumentHeight();

  if (noCache !== true && this.state.bounds.height !== null) {
    if (this.state.offsetHeight === offsetHeight && clientRect.height === this.state.bounds.height) {
      return {
        offsetHeight: offsetHeight,
        style: this.state.style,
        bounds: this.state.bounds,
        restrict: this.state.restrict
      };
    }
  }

  var style = getPositionStyle(this.el);
  var child = this.wrapper || this.el;
  var rect;
  var restrict;
  var offset = 0;

  if (!this.canSticky()) {
    rect = getAbsolutBoundingRect(child, clientRect.height);
    if (this.hasOwnScrollTarget) {
      var parentRect = getAbsolutBoundingRect(this.scrollTarget);
      offset = this.fastScroll.scrollY;
      rect = addBounds(rect, parentRect);
      restrict = parentRect;
      restrict.top = 0;
      restrict.height = this.scrollTarget.scrollHeight || restrict.height;
      restrict.bottom = restrict.height;
    }
  } else {
    var elem = getPreviousElementSibling(child);
    offset = 0;

    if (elem) {
      offset = parseInt(window.getComputedStyle(elem)['margin-bottom']);
      offset = offset || 0;
      rect = getAbsolutBoundingRect(elem);
      if (this.hasOwnScrollTarget) {
        rect = addBounds(rect, getAbsolutBoundingRect(this.scrollTarget));
        offset += this.fastScroll.scrollY;
      }
      rect.top = rect.bottom + offset;

    } else {
      elem = child.parentNode;
      offset = parseInt(window.getComputedStyle(elem)['padding-top']);
      offset = offset || 0;
      rect = getAbsolutBoundingRect(elem);
      if (this.hasOwnScrollTarget) {
        rect = addBounds(rect, getAbsolutBoundingRect(this.scrollTarget));
        offset += this.fastScroll.scrollY;
      }
      rect.top = rect.top + offset;
    }
    if (this.hasOwnScrollTarget) {
      restrict = getAbsolutBoundingRect(this.scrollTarget);
      restrict.top = 0;
      restrict.height = this.scrollTarget.scrollHeight || restrict.height;
      restrict.bottom = restrict.height;
    }

    rect.height = child.clientHeight;
    rect.width = child.clientWidth;
    rect.bottom = rect.top + rect.height;
  }

  restrict = restrict || getAbsolutBoundingRect(child.parentNode);

  return {
    offsetHeight: offsetHeight,
    style: style,
    bounds: rect,
    restrict: restrict
  };
};


StickyState.prototype.updateBounds = function(silent) {
  silent = silent === true;
  this.setState(this.getBounds(), silent);
};

StickyState.prototype.updateFixedOffset = function() {
  this.lastState.fixedOffset = this.state.fixedOffset;
  if (this.state.sticky) {
    this.state.fixedOffset = this.scrollTarget.getBoundingClientRect().top + 'px';
  } else {
    this.state.fixedOffset = '';
  }
  if (this.lastState.fixedOffset !== this.state.fixedOffset) {
    this.render();
  }
};

StickyState.prototype.canSticky = function() {

  return StickyState.native();
};

StickyState.prototype.addSrollHandler = function() {
  if (!this.fastScroll) {
    var hasScrollTarget = FastScroll.hasScrollTarget(this.scrollTarget);

    this.fastScroll = FastScroll.getInstance(this.scrollTarget);
    this.onScroll = this.onScroll.bind(this);
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

StickyState.prototype.onScroll = function(e) {
  this.updateStickyState(false);
  if (this.hasOwnScrollTarget && !this.canSticky()) {
    this.updateFixedOffset();
    if (this.state.sticky && !this.hasWindowScrollListener) {
      this.hasWindowScrollListener = true;
      FastScroll.getInstance(window).on('scroll:progress', this.updateFixedOffset);
    } else if (!this.state.sticky && this.hasWindowScrollListener) {
      this.hasWindowScrollListener = false;
      FastScroll.getInstance(window).off('scroll:progress', this.updateFixedOffset);
    }
  }
};

StickyState.prototype.onResize = function(e) {
  this.updateBounds(true);
  this.updateStickyState(false);
};

StickyState.prototype.getStickyState = function() {

  if (this.state.disabled) {
    return {sticky: false, absolute: false};
  }

  var scrollY = this.fastScroll.scrollY;
  var top = this.state.style.top;
  var bottom = this.state.style.bottom;
  var sticky = this.state.sticky;
  var absolute = this.state.absolute;

  if (top !== null) {
    var offsetBottom = this.state.restrict.bottom - this.state.bounds.height - top;
    top = this.state.bounds.top - top;
    if (this.state.sticky === false && scrollY >= top && scrollY <= offsetBottom) {
      sticky = true;
      absolute = false;
    } else if (this.state.sticky && (scrollY < top || scrollY > offsetBottom)) {
      sticky = false;
      absolute = scrollY > offsetBottom;
    }
  } else if (bottom !== null) {

    scrollY += window.innerHeight;
    var offsetTop = this.state.restrict.top + this.state.bounds.height - bottom;
    bottom = this.state.bounds.bottom + bottom;

    if (this.state.sticky === false && scrollY <= bottom && scrollY >= offsetTop) {
      sticky = true;
      absolute = false;
    } else if (this.state.sticky && (scrollY > bottom || scrollY < offsetTop)) {
      sticky = false;
      absolute = scrollY <= offsetTop;
    }
  }
  return {sticky: sticky, absolute: absolute};
};

StickyState.prototype.updateStickyState = function(silent) {
  var values = this.getStickyState();

  if (values.sticky !== this.state.sticky || values.absolute !== this.state.absolute) {
    silent = silent === true;
    values = assign(values, this.getBounds());
    this.setState(values, silent);
  }
};

StickyState.prototype.render = function() {

  var className = this.el.className;

  if (this.firstRender) {
    this.firstRender = false;

    if (!this.canSticky()) {
      this.wrapper = document.createElement('div');
      this.wrapper.className = this.options.wrapperClass;
      var parent = this.el.parentNode;
      if (parent) {
        parent.insertBefore(this.wrapper, this.el);
      }
      this.wrapper.appendChild(this.el);
      className += (' ' + this.options.fixedClass);
    }

    this.updateBounds(true);
    this.updateStickyState(true);
  }

  if (!this.canSticky()) {
    var height = (this.state.disabled || this.state.bounds.height === null || (!this.state.sticky && !this.state.absolute)) ? 'auto' : this.state.bounds.height + 'px';
    this.wrapper.style.height = height;

    if (this.state.absolute !== this.lastState.absolute) {
      this.wrapper.style.position = this.state.absolute ?  'relative' : '';

      className = className.indexOf(this.options.absoluteClass) === -1 && this.state.absolute ? className + (' ' + this.options.absoluteClass) : className.split((' ' + this.options.absoluteClass)).join('');
      this.el.style.marginTop = (this.state.absolute && this.state.style.top !== null) ? ( this.state.restrict.height - (this.state.bounds.height + this.state.style.top) + (this.state.restrict.top - this.state.bounds.top)) + 'px' : '';
      this.el.style.marginBottom = (this.state.absolute && this.state.style.bottom !== null) ?  (this.state.restrict.height - (this.state.bounds.height + this.state.style.bottom) + (this.state.restrict.bottom - this.state.bounds.bottom)) + 'px' : '';
    }

    if (this.hasOwnScrollTarget && !this.state.absolute && this.lastState.fixedOffset !== this.state.fixedOffset) {
      this.el.style.marginTop = this.state.fixedOffset;
    }
  }

  var hasStateClass = className.indexOf(this.options.stateClassName) > -1;
  if (this.state.sticky && !hasStateClass) {
    className += (' ' + this.options.stateClassName);
  } else if (!this.state.sticky && hasStateClass) {
    className = className.split((' ' + this.options.stateClassName)).join('');
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

  if(FastScroll.hasScrollTarget(scrollTarget)) {
    return FastScroll.getInstance(scrollTarget);
  }

  _instanceMap[scrollTarget] = this;

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
  return _instanceMap[scrollTarget] || (new FastScroll(scrollTarget, options));
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9kZWxlZ2F0ZWpzL2RlbGVnYXRlLmpzIiwibm9kZV9tb2R1bGVzL2V2ZW50ZGlzcGF0Y2hlci9zcmMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZmFzdHNjcm9sbC9zcmMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvb2JqZWN0LWFzc2lnbi9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25iQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIGFzc2lnbiA9IHJlcXVpcmUoJ29iamVjdC1hc3NpZ24nKTtcbnZhciBGYXN0U2Nyb2xsID0gcmVxdWlyZSgnZmFzdHNjcm9sbCcpO1xuXG52YXIgX2dsb2JhbHMgPSB7XG4gIGZlYXR1cmVUZXN0ZWQ6IGZhbHNlXG59O1xuXG52YXIgZGVmYXVsdHMgPSB7XG4gIGRpc2FibGVkOiAgICAgICBmYWxzZSxcbiAgY2xhc3NOYW1lOiAgICAgICdzdGlja3knLFxuICBzdGF0ZUNsYXNzTmFtZTogJ2lzLXN0aWNreScsXG4gIGZpeGVkQ2xhc3M6ICAgICAnc3RpY2t5LWZpeGVkJyxcbiAgd3JhcHBlckNsYXNzOiAgICdzdGlja3ktd3JhcCcsXG4gIGFic29sdXRlQ2xhc3M6ICAnaXMtYWJzb2x1dGUnXG59O1xuXG5mdW5jdGlvbiBnZXRTcm9sbFBvc2l0aW9uKCkge1xuICByZXR1cm4gKHdpbmRvdy5zY3JvbGxZIHx8IHdpbmRvdy5wYWdlWU9mZnNldCB8fCAwKTtcbn1cblxuZnVuY3Rpb24gZ2V0RG9jdW1lbnRIZWlnaHQoKSB7XG4gIHJldHVybiBNYXRoLm1heCggZG9jdW1lbnQuYm9keS5zY3JvbGxIZWlnaHQsIGRvY3VtZW50LmJvZHkub2Zmc2V0SGVpZ2h0LCAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudEhlaWdodCwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbEhlaWdodCwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50Lm9mZnNldEhlaWdodCApO1xufVxuXG5mdW5jdGlvbiBnZXRBYnNvbHV0Qm91bmRpbmdSZWN0KGVsLCBmaXhlZEhlaWdodCkge1xuICB2YXIgcmVjdCA9IGVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICB2YXIgdG9wID0gcmVjdC50b3AgKyBnZXRTcm9sbFBvc2l0aW9uKCk7XG4gIHZhciBoZWlnaHQgPSBmaXhlZEhlaWdodCB8fCByZWN0LmhlaWdodDtcbiAgcmV0dXJuIHtcbiAgICB0b3A6IHRvcCxcbiAgICBib3R0b206IHRvcCArIGhlaWdodCxcbiAgICBoZWlnaHQ6IGhlaWdodCxcbiAgICB3aWR0aDogcmVjdC53aWR0aFxuICB9O1xufVxuXG5mdW5jdGlvbiBhZGRCb3VuZHMocmVjdDEsIHJlY3QyKSB7XG4gIHZhciByZWN0ID0gYXNzaWduKHt9LCByZWN0MSk7XG4gIHJlY3QudG9wIC09IHJlY3QyLnRvcDtcbiAgcmVjdC5ib3R0b20gPSByZWN0LnRvcCArIHJlY3QxLmhlaWdodDtcbiAgcmV0dXJuIHJlY3Q7XG59XG5cbmZ1bmN0aW9uIGdldFBvc2l0aW9uU3R5bGUoZWwpIHtcbiAgdmFyIG9iaiA9IHtcbiAgICB0b3A6IG51bGwsXG4gICAgYm90dG9tOiBudWxsXG4gIH07XG5cbiAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgIHZhciB2YWx1ZSA9IHBhcnNlSW50KHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKGVsKVtrZXldKTtcbiAgICB2YWx1ZSA9IGlzTmFOKHZhbHVlKSA/IG51bGwgOiB2YWx1ZTtcbiAgICBvYmpba2V5XSA9IHZhbHVlO1xuICB9XG5cbiAgcmV0dXJuIG9iajtcbn1cblxuZnVuY3Rpb24gZ2V0UHJldmlvdXNFbGVtZW50U2libGluZyhlbCkge1xuICB2YXIgcHJldiA9IGVsLnByZXZpb3VzRWxlbWVudFNpYmxpbmc7XG4gIGlmIChwcmV2ICYmIHByZXYudGFnTmFtZS50b0xvY2FsZUxvd2VyQ2FzZSgpID09PSAnc2NyaXB0Jykge1xuICAgIHByZXYgPSBnZXRQcmV2aW91c0VsZW1lbnRTaWJsaW5nKHByZXYpO1xuICB9XG4gIHJldHVybiBwcmV2O1xufVxuXG52YXIgU3RpY2t5U3RhdGUgPSBmdW5jdGlvbihlbGVtZW50LCBvcHRpb25zKSB7XG4gIGlmICghZWxlbWVudCkge1xuICAgIHRocm93IG5ldyBFcnJvcignU3RpY2t5U3RhdGUgbmVlZHMgYSBEb21FbGVtZW50Jyk7XG4gIH1cblxuICB0aGlzLmVsID0gZWxlbWVudDtcbiAgdGhpcy5vcHRpb25zID0gYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucyk7XG5cbiAgdGhpcy5zZXRTdGF0ZSh7XG4gICAgc3RpY2t5OiBmYWxzZSxcbiAgICBhYnNvbHV0ZTogZmFsc2UsXG4gICAgZml4ZWRPZmZzZXQ6ICcnLFxuICAgIG9mZnNldEhlaWdodDogMCxcbiAgICBib3VuZHM6IHtcbiAgICAgIHRvcDogbnVsbCxcbiAgICAgIGJvdHRvbTogbnVsbCxcbiAgICAgIGhlaWdodDogbnVsbCxcbiAgICAgIHdpZHRoOiBudWxsXG4gICAgfSxcbiAgICByZXN0cmljdDoge1xuICAgICAgdG9wOiBudWxsLFxuICAgICAgYm90dG9tOiBudWxsLFxuICAgICAgaGVpZ2h0OiBudWxsLFxuICAgICAgd2lkdGg6IG51bGxcbiAgICB9LFxuICAgIHN0eWxlOiB7XG4gICAgICB0b3A6IG51bGwsXG4gICAgICBib3R0b206IG51bGxcbiAgICB9LFxuICAgIGRpc2FibGVkOiB0aGlzLm9wdGlvbnMuZGlzYWJsZWRcbiAgfSwgdHJ1ZSk7XG5cbiAgdGhpcy5zY3JvbGxUYXJnZXQgPSAod2luZG93LmdldENvbXB1dGVkU3R5bGUodGhpcy5lbC5wYXJlbnROb2RlKS5vdmVyZmxvdyAhPT0gJ2F1dG8nID8gd2luZG93IDogdGhpcy5lbC5wYXJlbnROb2RlKTtcbiAgdGhpcy5oYXNPd25TY3JvbGxUYXJnZXQgPSB0aGlzLnNjcm9sbFRhcmdldCAhPT0gd2luZG93O1xuICBpZiAodGhpcy5oYXNPd25TY3JvbGxUYXJnZXQpIHtcbiAgICB0aGlzLnVwZGF0ZUZpeGVkT2Zmc2V0ID0gdGhpcy51cGRhdGVGaXhlZE9mZnNldC5iaW5kKHRoaXMpO1xuICB9XG4gIHRoaXMuZmlyc3RSZW5kZXIgPSB0cnVlO1xuICB0aGlzLnJlc2l6ZUhhbmRsZXIgPSBudWxsO1xuICB0aGlzLmZhc3RTY3JvbGwgPSBudWxsO1xuICB0aGlzLndyYXBwZXIgPSBudWxsO1xuXG4gIHRoaXMucmVuZGVyID0gdGhpcy5yZW5kZXIuYmluZCh0aGlzKTtcblxuICB0aGlzLmFkZFNyb2xsSGFuZGxlcigpO1xuICB0aGlzLmFkZFJlc2l6ZUhhbmRsZXIoKTtcbiAgdGhpcy5yZW5kZXIoKTtcbn07XG5cblN0aWNreVN0YXRlLnByb3RvdHlwZS5zZXRTdGF0ZSA9IGZ1bmN0aW9uKG5ld1N0YXRlLCBzaWxlbnQpIHtcbiAgdGhpcy5sYXN0U3RhdGUgPSB0aGlzLnN0YXRlIHx8IG5ld1N0YXRlO1xuICB0aGlzLnN0YXRlID0gYXNzaWduKHt9LCB0aGlzLnN0YXRlLCBuZXdTdGF0ZSk7XG4gIGlmIChzaWxlbnQgIT09IHRydWUpIHtcbiAgICB0aGlzLnJlbmRlcigpO1xuICB9XG59O1xuXG5TdGlja3lTdGF0ZS5wcm90b3R5cGUuZ2V0Qm91bmRpbmdDbGllbnRSZWN0ID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xufTtcblxuU3RpY2t5U3RhdGUucHJvdG90eXBlLmdldEJvdW5kcyA9IGZ1bmN0aW9uKG5vQ2FjaGUpIHtcblxuICB2YXIgY2xpZW50UmVjdCA9IHRoaXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gIHZhciBvZmZzZXRIZWlnaHQgPSBnZXREb2N1bWVudEhlaWdodCgpO1xuXG4gIGlmIChub0NhY2hlICE9PSB0cnVlICYmIHRoaXMuc3RhdGUuYm91bmRzLmhlaWdodCAhPT0gbnVsbCkge1xuICAgIGlmICh0aGlzLnN0YXRlLm9mZnNldEhlaWdodCA9PT0gb2Zmc2V0SGVpZ2h0ICYmIGNsaWVudFJlY3QuaGVpZ2h0ID09PSB0aGlzLnN0YXRlLmJvdW5kcy5oZWlnaHQpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG9mZnNldEhlaWdodDogb2Zmc2V0SGVpZ2h0LFxuICAgICAgICBzdHlsZTogdGhpcy5zdGF0ZS5zdHlsZSxcbiAgICAgICAgYm91bmRzOiB0aGlzLnN0YXRlLmJvdW5kcyxcbiAgICAgICAgcmVzdHJpY3Q6IHRoaXMuc3RhdGUucmVzdHJpY3RcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgdmFyIHN0eWxlID0gZ2V0UG9zaXRpb25TdHlsZSh0aGlzLmVsKTtcbiAgdmFyIGNoaWxkID0gdGhpcy53cmFwcGVyIHx8IHRoaXMuZWw7XG4gIHZhciByZWN0O1xuICB2YXIgcmVzdHJpY3Q7XG4gIHZhciBvZmZzZXQgPSAwO1xuXG4gIGlmICghdGhpcy5jYW5TdGlja3koKSkge1xuICAgIHJlY3QgPSBnZXRBYnNvbHV0Qm91bmRpbmdSZWN0KGNoaWxkLCBjbGllbnRSZWN0LmhlaWdodCk7XG4gICAgaWYgKHRoaXMuaGFzT3duU2Nyb2xsVGFyZ2V0KSB7XG4gICAgICB2YXIgcGFyZW50UmVjdCA9IGdldEFic29sdXRCb3VuZGluZ1JlY3QodGhpcy5zY3JvbGxUYXJnZXQpO1xuICAgICAgb2Zmc2V0ID0gdGhpcy5mYXN0U2Nyb2xsLnNjcm9sbFk7XG4gICAgICByZWN0ID0gYWRkQm91bmRzKHJlY3QsIHBhcmVudFJlY3QpO1xuICAgICAgcmVzdHJpY3QgPSBwYXJlbnRSZWN0O1xuICAgICAgcmVzdHJpY3QudG9wID0gMDtcbiAgICAgIHJlc3RyaWN0LmhlaWdodCA9IHRoaXMuc2Nyb2xsVGFyZ2V0LnNjcm9sbEhlaWdodCB8fCByZXN0cmljdC5oZWlnaHQ7XG4gICAgICByZXN0cmljdC5ib3R0b20gPSByZXN0cmljdC5oZWlnaHQ7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhciBlbGVtID0gZ2V0UHJldmlvdXNFbGVtZW50U2libGluZyhjaGlsZCk7XG4gICAgb2Zmc2V0ID0gMDtcblxuICAgIGlmIChlbGVtKSB7XG4gICAgICBvZmZzZXQgPSBwYXJzZUludCh3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShlbGVtKVsnbWFyZ2luLWJvdHRvbSddKTtcbiAgICAgIG9mZnNldCA9IG9mZnNldCB8fCAwO1xuICAgICAgcmVjdCA9IGdldEFic29sdXRCb3VuZGluZ1JlY3QoZWxlbSk7XG4gICAgICBpZiAodGhpcy5oYXNPd25TY3JvbGxUYXJnZXQpIHtcbiAgICAgICAgcmVjdCA9IGFkZEJvdW5kcyhyZWN0LCBnZXRBYnNvbHV0Qm91bmRpbmdSZWN0KHRoaXMuc2Nyb2xsVGFyZ2V0KSk7XG4gICAgICAgIG9mZnNldCArPSB0aGlzLmZhc3RTY3JvbGwuc2Nyb2xsWTtcbiAgICAgIH1cbiAgICAgIHJlY3QudG9wID0gcmVjdC5ib3R0b20gKyBvZmZzZXQ7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgZWxlbSA9IGNoaWxkLnBhcmVudE5vZGU7XG4gICAgICBvZmZzZXQgPSBwYXJzZUludCh3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShlbGVtKVsncGFkZGluZy10b3AnXSk7XG4gICAgICBvZmZzZXQgPSBvZmZzZXQgfHwgMDtcbiAgICAgIHJlY3QgPSBnZXRBYnNvbHV0Qm91bmRpbmdSZWN0KGVsZW0pO1xuICAgICAgaWYgKHRoaXMuaGFzT3duU2Nyb2xsVGFyZ2V0KSB7XG4gICAgICAgIHJlY3QgPSBhZGRCb3VuZHMocmVjdCwgZ2V0QWJzb2x1dEJvdW5kaW5nUmVjdCh0aGlzLnNjcm9sbFRhcmdldCkpO1xuICAgICAgICBvZmZzZXQgKz0gdGhpcy5mYXN0U2Nyb2xsLnNjcm9sbFk7XG4gICAgICB9XG4gICAgICByZWN0LnRvcCA9IHJlY3QudG9wICsgb2Zmc2V0O1xuICAgIH1cbiAgICBpZiAodGhpcy5oYXNPd25TY3JvbGxUYXJnZXQpIHtcbiAgICAgIHJlc3RyaWN0ID0gZ2V0QWJzb2x1dEJvdW5kaW5nUmVjdCh0aGlzLnNjcm9sbFRhcmdldCk7XG4gICAgICByZXN0cmljdC50b3AgPSAwO1xuICAgICAgcmVzdHJpY3QuaGVpZ2h0ID0gdGhpcy5zY3JvbGxUYXJnZXQuc2Nyb2xsSGVpZ2h0IHx8IHJlc3RyaWN0LmhlaWdodDtcbiAgICAgIHJlc3RyaWN0LmJvdHRvbSA9IHJlc3RyaWN0LmhlaWdodDtcbiAgICB9XG5cbiAgICByZWN0LmhlaWdodCA9IGNoaWxkLmNsaWVudEhlaWdodDtcbiAgICByZWN0LndpZHRoID0gY2hpbGQuY2xpZW50V2lkdGg7XG4gICAgcmVjdC5ib3R0b20gPSByZWN0LnRvcCArIHJlY3QuaGVpZ2h0O1xuICB9XG5cbiAgcmVzdHJpY3QgPSByZXN0cmljdCB8fCBnZXRBYnNvbHV0Qm91bmRpbmdSZWN0KGNoaWxkLnBhcmVudE5vZGUpO1xuXG4gIHJldHVybiB7XG4gICAgb2Zmc2V0SGVpZ2h0OiBvZmZzZXRIZWlnaHQsXG4gICAgc3R5bGU6IHN0eWxlLFxuICAgIGJvdW5kczogcmVjdCxcbiAgICByZXN0cmljdDogcmVzdHJpY3RcbiAgfTtcbn07XG5cblxuU3RpY2t5U3RhdGUucHJvdG90eXBlLnVwZGF0ZUJvdW5kcyA9IGZ1bmN0aW9uKHNpbGVudCkge1xuICBzaWxlbnQgPSBzaWxlbnQgPT09IHRydWU7XG4gIHRoaXMuc2V0U3RhdGUodGhpcy5nZXRCb3VuZHMoKSwgc2lsZW50KTtcbn07XG5cblN0aWNreVN0YXRlLnByb3RvdHlwZS51cGRhdGVGaXhlZE9mZnNldCA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmxhc3RTdGF0ZS5maXhlZE9mZnNldCA9IHRoaXMuc3RhdGUuZml4ZWRPZmZzZXQ7XG4gIGlmICh0aGlzLnN0YXRlLnN0aWNreSkge1xuICAgIHRoaXMuc3RhdGUuZml4ZWRPZmZzZXQgPSB0aGlzLnNjcm9sbFRhcmdldC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS50b3AgKyAncHgnO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuc3RhdGUuZml4ZWRPZmZzZXQgPSAnJztcbiAgfVxuICBpZiAodGhpcy5sYXN0U3RhdGUuZml4ZWRPZmZzZXQgIT09IHRoaXMuc3RhdGUuZml4ZWRPZmZzZXQpIHtcbiAgICB0aGlzLnJlbmRlcigpO1xuICB9XG59O1xuXG5TdGlja3lTdGF0ZS5wcm90b3R5cGUuY2FuU3RpY2t5ID0gZnVuY3Rpb24oKSB7XG5cbiAgcmV0dXJuIFN0aWNreVN0YXRlLm5hdGl2ZSgpO1xufTtcblxuU3RpY2t5U3RhdGUucHJvdG90eXBlLmFkZFNyb2xsSGFuZGxlciA9IGZ1bmN0aW9uKCkge1xuICBpZiAoIXRoaXMuZmFzdFNjcm9sbCkge1xuICAgIHZhciBoYXNTY3JvbGxUYXJnZXQgPSBGYXN0U2Nyb2xsLmhhc1Njcm9sbFRhcmdldCh0aGlzLnNjcm9sbFRhcmdldCk7XG5cbiAgICB0aGlzLmZhc3RTY3JvbGwgPSBGYXN0U2Nyb2xsLmdldEluc3RhbmNlKHRoaXMuc2Nyb2xsVGFyZ2V0KTtcbiAgICB0aGlzLm9uU2Nyb2xsID0gdGhpcy5vblNjcm9sbC5iaW5kKHRoaXMpO1xuICAgIHRoaXMuZmFzdFNjcm9sbC5vbignc2Nyb2xsOnN0YXJ0JywgdGhpcy5vblNjcm9sbCk7XG4gICAgdGhpcy5mYXN0U2Nyb2xsLm9uKCdzY3JvbGw6cHJvZ3Jlc3MnLCB0aGlzLm9uU2Nyb2xsKTtcbiAgICB0aGlzLmZhc3RTY3JvbGwub24oJ3Njcm9sbDpzdG9wJywgdGhpcy5vblNjcm9sbCk7XG4gICAgaWYgKGhhc1Njcm9sbFRhcmdldCAmJiB0aGlzLmZhc3RTY3JvbGwuc2Nyb2xsWSA+IDApIHtcbiAgICAgIHRoaXMuZmFzdFNjcm9sbC50cmlnZ2VyKCdzY3JvbGw6cHJvZ3Jlc3MnKTtcbiAgICB9XG4gIH1cbn07XG5cblN0aWNreVN0YXRlLnByb3RvdHlwZS5yZW1vdmVTcm9sbEhhbmRsZXIgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuZmFzdFNjcm9sbCkge1xuICAgIHRoaXMuZmFzdFNjcm9sbC5vZmYoJ3Njcm9sbDpzdGFydCcsIHRoaXMub25TY3JvbGwpO1xuICAgIHRoaXMuZmFzdFNjcm9sbC5vZmYoJ3Njcm9sbDpwcm9ncmVzcycsIHRoaXMub25TY3JvbGwpO1xuICAgIHRoaXMuZmFzdFNjcm9sbC5vZmYoJ3Njcm9sbDpzdG9wJywgdGhpcy5vblNjcm9sbCk7XG4gICAgdGhpcy5mYXN0U2Nyb2xsLmRlc3Ryb3koKTtcbiAgICB0aGlzLmZhc3RTY3JvbGwgPSBudWxsO1xuICB9XG59O1xuXG5TdGlja3lTdGF0ZS5wcm90b3R5cGUuYWRkUmVzaXplSGFuZGxlciA9IGZ1bmN0aW9uKCkge1xuICBpZiAoIXRoaXMucmVzaXplSGFuZGxlcikge1xuICAgIHRoaXMucmVzaXplSGFuZGxlciA9IHRoaXMub25SZXNpemUuYmluZCh0aGlzKTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgdGhpcy5yZXNpemVIYW5kbGVyLCBmYWxzZSk7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ29yaWVudGF0aW9uY2hhbmdlJywgdGhpcy5yZXNpemVIYW5kbGVyLCBmYWxzZSk7XG4gIH1cbn07XG5cblN0aWNreVN0YXRlLnByb3RvdHlwZS5yZW1vdmVSZXNpemVIYW5kbGVyID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLnJlc2l6ZUhhbmRsZXIpIHtcbiAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncmVzaXplJywgdGhpcy5yZXNpemVIYW5kbGVyKTtcbiAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcignb3JpZW50YXRpb25jaGFuZ2UnLCB0aGlzLnJlc2l6ZUhhbmRsZXIpO1xuICAgIHRoaXMucmVzaXplSGFuZGxlciA9IG51bGw7XG4gIH1cbn07XG5cblN0aWNreVN0YXRlLnByb3RvdHlwZS5vblNjcm9sbCA9IGZ1bmN0aW9uKGUpIHtcbiAgdGhpcy51cGRhdGVTdGlja3lTdGF0ZShmYWxzZSk7XG4gIGlmICh0aGlzLmhhc093blNjcm9sbFRhcmdldCAmJiAhdGhpcy5jYW5TdGlja3koKSkge1xuICAgIHRoaXMudXBkYXRlRml4ZWRPZmZzZXQoKTtcbiAgICBpZiAodGhpcy5zdGF0ZS5zdGlja3kgJiYgIXRoaXMuaGFzV2luZG93U2Nyb2xsTGlzdGVuZXIpIHtcbiAgICAgIHRoaXMuaGFzV2luZG93U2Nyb2xsTGlzdGVuZXIgPSB0cnVlO1xuICAgICAgRmFzdFNjcm9sbC5nZXRJbnN0YW5jZSh3aW5kb3cpLm9uKCdzY3JvbGw6cHJvZ3Jlc3MnLCB0aGlzLnVwZGF0ZUZpeGVkT2Zmc2V0KTtcbiAgICB9IGVsc2UgaWYgKCF0aGlzLnN0YXRlLnN0aWNreSAmJiB0aGlzLmhhc1dpbmRvd1Njcm9sbExpc3RlbmVyKSB7XG4gICAgICB0aGlzLmhhc1dpbmRvd1Njcm9sbExpc3RlbmVyID0gZmFsc2U7XG4gICAgICBGYXN0U2Nyb2xsLmdldEluc3RhbmNlKHdpbmRvdykub2ZmKCdzY3JvbGw6cHJvZ3Jlc3MnLCB0aGlzLnVwZGF0ZUZpeGVkT2Zmc2V0KTtcbiAgICB9XG4gIH1cbn07XG5cblN0aWNreVN0YXRlLnByb3RvdHlwZS5vblJlc2l6ZSA9IGZ1bmN0aW9uKGUpIHtcbiAgdGhpcy51cGRhdGVCb3VuZHModHJ1ZSk7XG4gIHRoaXMudXBkYXRlU3RpY2t5U3RhdGUoZmFsc2UpO1xufTtcblxuU3RpY2t5U3RhdGUucHJvdG90eXBlLmdldFN0aWNreVN0YXRlID0gZnVuY3Rpb24oKSB7XG5cbiAgaWYgKHRoaXMuc3RhdGUuZGlzYWJsZWQpIHtcbiAgICByZXR1cm4ge3N0aWNreTogZmFsc2UsIGFic29sdXRlOiBmYWxzZX07XG4gIH1cblxuICB2YXIgc2Nyb2xsWSA9IHRoaXMuZmFzdFNjcm9sbC5zY3JvbGxZO1xuICB2YXIgdG9wID0gdGhpcy5zdGF0ZS5zdHlsZS50b3A7XG4gIHZhciBib3R0b20gPSB0aGlzLnN0YXRlLnN0eWxlLmJvdHRvbTtcbiAgdmFyIHN0aWNreSA9IHRoaXMuc3RhdGUuc3RpY2t5O1xuICB2YXIgYWJzb2x1dGUgPSB0aGlzLnN0YXRlLmFic29sdXRlO1xuXG4gIGlmICh0b3AgIT09IG51bGwpIHtcbiAgICB2YXIgb2Zmc2V0Qm90dG9tID0gdGhpcy5zdGF0ZS5yZXN0cmljdC5ib3R0b20gLSB0aGlzLnN0YXRlLmJvdW5kcy5oZWlnaHQgLSB0b3A7XG4gICAgdG9wID0gdGhpcy5zdGF0ZS5ib3VuZHMudG9wIC0gdG9wO1xuICAgIGlmICh0aGlzLnN0YXRlLnN0aWNreSA9PT0gZmFsc2UgJiYgc2Nyb2xsWSA+PSB0b3AgJiYgc2Nyb2xsWSA8PSBvZmZzZXRCb3R0b20pIHtcbiAgICAgIHN0aWNreSA9IHRydWU7XG4gICAgICBhYnNvbHV0ZSA9IGZhbHNlO1xuICAgIH0gZWxzZSBpZiAodGhpcy5zdGF0ZS5zdGlja3kgJiYgKHNjcm9sbFkgPCB0b3AgfHwgc2Nyb2xsWSA+IG9mZnNldEJvdHRvbSkpIHtcbiAgICAgIHN0aWNreSA9IGZhbHNlO1xuICAgICAgYWJzb2x1dGUgPSBzY3JvbGxZID4gb2Zmc2V0Qm90dG9tO1xuICAgIH1cbiAgfSBlbHNlIGlmIChib3R0b20gIT09IG51bGwpIHtcblxuICAgIHNjcm9sbFkgKz0gd2luZG93LmlubmVySGVpZ2h0O1xuICAgIHZhciBvZmZzZXRUb3AgPSB0aGlzLnN0YXRlLnJlc3RyaWN0LnRvcCArIHRoaXMuc3RhdGUuYm91bmRzLmhlaWdodCAtIGJvdHRvbTtcbiAgICBib3R0b20gPSB0aGlzLnN0YXRlLmJvdW5kcy5ib3R0b20gKyBib3R0b207XG5cbiAgICBpZiAodGhpcy5zdGF0ZS5zdGlja3kgPT09IGZhbHNlICYmIHNjcm9sbFkgPD0gYm90dG9tICYmIHNjcm9sbFkgPj0gb2Zmc2V0VG9wKSB7XG4gICAgICBzdGlja3kgPSB0cnVlO1xuICAgICAgYWJzb2x1dGUgPSBmYWxzZTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuc3RhdGUuc3RpY2t5ICYmIChzY3JvbGxZID4gYm90dG9tIHx8IHNjcm9sbFkgPCBvZmZzZXRUb3ApKSB7XG4gICAgICBzdGlja3kgPSBmYWxzZTtcbiAgICAgIGFic29sdXRlID0gc2Nyb2xsWSA8PSBvZmZzZXRUb3A7XG4gICAgfVxuICB9XG4gIHJldHVybiB7c3RpY2t5OiBzdGlja3ksIGFic29sdXRlOiBhYnNvbHV0ZX07XG59O1xuXG5TdGlja3lTdGF0ZS5wcm90b3R5cGUudXBkYXRlU3RpY2t5U3RhdGUgPSBmdW5jdGlvbihzaWxlbnQpIHtcbiAgdmFyIHZhbHVlcyA9IHRoaXMuZ2V0U3RpY2t5U3RhdGUoKTtcblxuICBpZiAodmFsdWVzLnN0aWNreSAhPT0gdGhpcy5zdGF0ZS5zdGlja3kgfHwgdmFsdWVzLmFic29sdXRlICE9PSB0aGlzLnN0YXRlLmFic29sdXRlKSB7XG4gICAgc2lsZW50ID0gc2lsZW50ID09PSB0cnVlO1xuICAgIHZhbHVlcyA9IGFzc2lnbih2YWx1ZXMsIHRoaXMuZ2V0Qm91bmRzKCkpO1xuICAgIHRoaXMuc2V0U3RhdGUodmFsdWVzLCBzaWxlbnQpO1xuICB9XG59O1xuXG5TdGlja3lTdGF0ZS5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24oKSB7XG5cbiAgdmFyIGNsYXNzTmFtZSA9IHRoaXMuZWwuY2xhc3NOYW1lO1xuXG4gIGlmICh0aGlzLmZpcnN0UmVuZGVyKSB7XG4gICAgdGhpcy5maXJzdFJlbmRlciA9IGZhbHNlO1xuXG4gICAgaWYgKCF0aGlzLmNhblN0aWNreSgpKSB7XG4gICAgICB0aGlzLndyYXBwZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgIHRoaXMud3JhcHBlci5jbGFzc05hbWUgPSB0aGlzLm9wdGlvbnMud3JhcHBlckNsYXNzO1xuICAgICAgdmFyIHBhcmVudCA9IHRoaXMuZWwucGFyZW50Tm9kZTtcbiAgICAgIGlmIChwYXJlbnQpIHtcbiAgICAgICAgcGFyZW50Lmluc2VydEJlZm9yZSh0aGlzLndyYXBwZXIsIHRoaXMuZWwpO1xuICAgICAgfVxuICAgICAgdGhpcy53cmFwcGVyLmFwcGVuZENoaWxkKHRoaXMuZWwpO1xuICAgICAgY2xhc3NOYW1lICs9ICgnICcgKyB0aGlzLm9wdGlvbnMuZml4ZWRDbGFzcyk7XG4gICAgfVxuXG4gICAgdGhpcy51cGRhdGVCb3VuZHModHJ1ZSk7XG4gICAgdGhpcy51cGRhdGVTdGlja3lTdGF0ZSh0cnVlKTtcbiAgfVxuXG4gIGlmICghdGhpcy5jYW5TdGlja3koKSkge1xuICAgIHZhciBoZWlnaHQgPSAodGhpcy5zdGF0ZS5kaXNhYmxlZCB8fCB0aGlzLnN0YXRlLmJvdW5kcy5oZWlnaHQgPT09IG51bGwgfHwgKCF0aGlzLnN0YXRlLnN0aWNreSAmJiAhdGhpcy5zdGF0ZS5hYnNvbHV0ZSkpID8gJ2F1dG8nIDogdGhpcy5zdGF0ZS5ib3VuZHMuaGVpZ2h0ICsgJ3B4JztcbiAgICB0aGlzLndyYXBwZXIuc3R5bGUuaGVpZ2h0ID0gaGVpZ2h0O1xuXG4gICAgaWYgKHRoaXMuc3RhdGUuYWJzb2x1dGUgIT09IHRoaXMubGFzdFN0YXRlLmFic29sdXRlKSB7XG4gICAgICB0aGlzLndyYXBwZXIuc3R5bGUucG9zaXRpb24gPSB0aGlzLnN0YXRlLmFic29sdXRlID8gICdyZWxhdGl2ZScgOiAnJztcblxuICAgICAgY2xhc3NOYW1lID0gY2xhc3NOYW1lLmluZGV4T2YodGhpcy5vcHRpb25zLmFic29sdXRlQ2xhc3MpID09PSAtMSAmJiB0aGlzLnN0YXRlLmFic29sdXRlID8gY2xhc3NOYW1lICsgKCcgJyArIHRoaXMub3B0aW9ucy5hYnNvbHV0ZUNsYXNzKSA6IGNsYXNzTmFtZS5zcGxpdCgoJyAnICsgdGhpcy5vcHRpb25zLmFic29sdXRlQ2xhc3MpKS5qb2luKCcnKTtcbiAgICAgIHRoaXMuZWwuc3R5bGUubWFyZ2luVG9wID0gKHRoaXMuc3RhdGUuYWJzb2x1dGUgJiYgdGhpcy5zdGF0ZS5zdHlsZS50b3AgIT09IG51bGwpID8gKCB0aGlzLnN0YXRlLnJlc3RyaWN0LmhlaWdodCAtICh0aGlzLnN0YXRlLmJvdW5kcy5oZWlnaHQgKyB0aGlzLnN0YXRlLnN0eWxlLnRvcCkgKyAodGhpcy5zdGF0ZS5yZXN0cmljdC50b3AgLSB0aGlzLnN0YXRlLmJvdW5kcy50b3ApKSArICdweCcgOiAnJztcbiAgICAgIHRoaXMuZWwuc3R5bGUubWFyZ2luQm90dG9tID0gKHRoaXMuc3RhdGUuYWJzb2x1dGUgJiYgdGhpcy5zdGF0ZS5zdHlsZS5ib3R0b20gIT09IG51bGwpID8gICh0aGlzLnN0YXRlLnJlc3RyaWN0LmhlaWdodCAtICh0aGlzLnN0YXRlLmJvdW5kcy5oZWlnaHQgKyB0aGlzLnN0YXRlLnN0eWxlLmJvdHRvbSkgKyAodGhpcy5zdGF0ZS5yZXN0cmljdC5ib3R0b20gLSB0aGlzLnN0YXRlLmJvdW5kcy5ib3R0b20pKSArICdweCcgOiAnJztcbiAgICB9XG5cbiAgICBpZiAodGhpcy5oYXNPd25TY3JvbGxUYXJnZXQgJiYgIXRoaXMuc3RhdGUuYWJzb2x1dGUgJiYgdGhpcy5sYXN0U3RhdGUuZml4ZWRPZmZzZXQgIT09IHRoaXMuc3RhdGUuZml4ZWRPZmZzZXQpIHtcbiAgICAgIHRoaXMuZWwuc3R5bGUubWFyZ2luVG9wID0gdGhpcy5zdGF0ZS5maXhlZE9mZnNldDtcbiAgICB9XG4gIH1cblxuICB2YXIgaGFzU3RhdGVDbGFzcyA9IGNsYXNzTmFtZS5pbmRleE9mKHRoaXMub3B0aW9ucy5zdGF0ZUNsYXNzTmFtZSkgPiAtMTtcbiAgaWYgKHRoaXMuc3RhdGUuc3RpY2t5ICYmICFoYXNTdGF0ZUNsYXNzKSB7XG4gICAgY2xhc3NOYW1lICs9ICgnICcgKyB0aGlzLm9wdGlvbnMuc3RhdGVDbGFzc05hbWUpO1xuICB9IGVsc2UgaWYgKCF0aGlzLnN0YXRlLnN0aWNreSAmJiBoYXNTdGF0ZUNsYXNzKSB7XG4gICAgY2xhc3NOYW1lID0gY2xhc3NOYW1lLnNwbGl0KCgnICcgKyB0aGlzLm9wdGlvbnMuc3RhdGVDbGFzc05hbWUpKS5qb2luKCcnKTtcbiAgfVxuXG4gIGlmICh0aGlzLmVsLmNsYXNzTmFtZSAhPT0gY2xhc3NOYW1lKSB7XG4gICAgdGhpcy5lbC5jbGFzc05hbWUgPSBjbGFzc05hbWU7XG4gIH1cblxuICByZXR1cm4gdGhpcy5lbDtcbn07XG5cblN0aWNreVN0YXRlLm5hdGl2ZSA9IGZ1bmN0aW9uKCkge1xuICBpZiAoX2dsb2JhbHMuZmVhdHVyZVRlc3RlZCkge1xuICAgIHJldHVybiBfZ2xvYmFscy5jYW5TdGlja3k7XG4gIH1cbiAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG5cbiAgICBfZ2xvYmFscy5mZWF0dXJlVGVzdGVkID0gdHJ1ZTtcblxuICAgIGlmICh3aW5kb3cuTW9kZXJuaXpyICYmIHdpbmRvdy5Nb2Rlcm5penIuaGFzT3duUHJvcGVydHkoJ2Nzc3Bvc2l0aW9uc3RpY2t5JykpIHtcbiAgICAgIHJldHVybiBfZ2xvYmFscy5jYW5TdGlja3kgPSB3aW5kb3cuTW9kZXJuaXpyLmNzc3Bvc2l0aW9uc3RpY2t5O1xuICAgIH1cblxuICAgIHZhciB0ZXN0RWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuYXBwZW5kQ2hpbGQodGVzdEVsKTtcbiAgICB2YXIgcHJlZml4ZWRTdGlja3kgPSBbJ3N0aWNreScsICctd2Via2l0LXN0aWNreScsICctbW96LXN0aWNreScsICctbXMtc3RpY2t5JywgJy1vLXN0aWNreSddO1xuXG4gICAgX2dsb2JhbHMuY2FuU3RpY2t5ID0gZmFsc2U7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHByZWZpeGVkU3RpY2t5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICB0ZXN0RWwuc3R5bGUucG9zaXRpb24gPSBwcmVmaXhlZFN0aWNreVtpXTtcbiAgICAgIF9nbG9iYWxzLmNhblN0aWNreSA9ICEhd2luZG93LmdldENvbXB1dGVkU3R5bGUodGVzdEVsKS5wb3NpdGlvbi5tYXRjaCgnc3RpY2t5Jyk7XG4gICAgICBpZiAoX2dsb2JhbHMuY2FuU3RpY2t5KSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQucmVtb3ZlQ2hpbGQodGVzdEVsKTtcbiAgfVxuICByZXR1cm4gX2dsb2JhbHMuY2FuU3RpY2t5O1xufTtcblxuU3RpY2t5U3RhdGUuYXBwbHkgPSBmdW5jdGlvbihlbGVtZW50cykge1xuICBpZiAoZWxlbWVudHMpIHtcbiAgICBpZiAoZWxlbWVudHMubGVuZ3RoKSB7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGVsZW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG5ldyBTdGlja3lTdGF0ZShlbGVtZW50c1tpXSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIG5ldyBTdGlja3lTdGF0ZShlbGVtZW50cyk7XG4gICAgfVxuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFN0aWNreVN0YXRlO1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQgU8O2bmtlIEtsdXRoXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weSBvZlxuICogdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpblxuICogdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0b1xuICogdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2ZcbiAqIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbyxcbiAqIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluIGFsbFxuICogY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTU1xuICogRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SXG4gKiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVJcbiAqIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOXG4gKiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuICoqL1xuXG4oZnVuY3Rpb24oZXhwb3J0cykge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgdmFyIGRlbGVnYXRlID0gZnVuY3Rpb24odGFyZ2V0LCBoYW5kbGVyKSB7XG4gICAgICAgIC8vIEdldCBhbnkgZXh0cmEgYXJndW1lbnRzIGZvciBoYW5kbGVyXG4gICAgICAgIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpO1xuXG4gICAgICAgIC8vIENyZWF0ZSBkZWxlZ2F0ZSBmdW5jdGlvblxuICAgICAgICB2YXIgZm4gPSBmdW5jdGlvbigpIHtcblxuICAgICAgICAgICAgLy8gQ2FsbCBoYW5kbGVyIHdpdGggYXJndW1lbnRzXG4gICAgICAgICAgICByZXR1cm4gaGFuZGxlci5hcHBseSh0YXJnZXQsIGFyZ3MpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFJldHVybiB0aGUgZGVsZWdhdGUgZnVuY3Rpb24uXG4gICAgICAgIHJldHVybiBmbjtcbiAgICB9O1xuXG5cbiAgICAodHlwZW9mIG1vZHVsZSAhPSBcInVuZGVmaW5lZFwiICYmIG1vZHVsZS5leHBvcnRzKSA/IChtb2R1bGUuZXhwb3J0cyA9IGRlbGVnYXRlKSA6ICh0eXBlb2YgZGVmaW5lICE9IFwidW5kZWZpbmVkXCIgPyAoZGVmaW5lKGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gZGVsZWdhdGU7XG4gICAgfSkpIDogKGV4cG9ydHMuZGVsZWdhdGUgPSBkZWxlZ2F0ZSkpO1xuXG59KSh0aGlzKTtcbiIsIiAndXNlIHN0cmljdCc7XG5cbiBmdW5jdGlvbiBpc0VtcHR5KG9iaikge1xuICAgZm9yICh2YXIgcHJvcCBpbiBvYmopIHtcbiAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShwcm9wKSl7XG4gICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICB9XG4gICB9XG4gICByZXR1cm4gdHJ1ZTtcbiB9XG5cbnZhciBfaW5zdGFuY2VNYXAgPSB7fTtcblxuIHZhciBFdmVudERpc3BhdGNoZXIgPSBmdW5jdGlvbigpIHtcbiAgIHRoaXMuX2V2ZW50TWFwID0ge307XG4gICB0aGlzLl9kZXN0cm95ZWQgPSBmYWxzZTtcbiB9O1xuXG4gRXZlbnREaXNwYXRjaGVyLmdldEluc3RhbmNlID0gZnVuY3Rpb24oa2V5KXtcbiAgaWYoIWtleSl7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdrZXkgbXVzdCBiZScpO1xuICB9XG4gIHJldHVybiBfaW5zdGFuY2VNYXBba2V5XSB8fCAoX2luc3RhbmNlTWFwW2tleV0gPSAgbmV3IEV2ZW50RGlzcGF0Y2hlcigpKTtcbiB9O1xuXG5cbiBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24oZXZlbnQsIGxpc3RlbmVyKSB7XG4gICB2YXIgbGlzdGVuZXJzID0gdGhpcy5nZXRMaXN0ZW5lcihldmVudCk7XG4gICBpZiAoIWxpc3RlbmVycykge1xuICAgICB0aGlzLl9ldmVudE1hcFtldmVudF0gPSBbbGlzdGVuZXJdO1xuICAgICByZXR1cm4gdHJ1ZTtcbiAgIH1cblxuICAgaWYgKGxpc3RlbmVycy5pbmRleE9mKGxpc3RlbmVyKSA9PT0gLTEpIHtcbiAgICAgbGlzdGVuZXJzLnB1c2gobGlzdGVuZXIpO1xuICAgICByZXR1cm4gdHJ1ZTtcbiAgIH1cbiAgIHJldHVybiBmYWxzZTtcbiB9O1xuXG4gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lck9uY2UgPSBmdW5jdGlvbihldmVudCwgbGlzdGVuZXIpIHtcbiAgIHZhciBzID0gdGhpcztcbiAgIHZhciBmMiA9IGZ1bmN0aW9uKCkge1xuICAgICBzLnJlbW92ZUxpc3RlbmVyKGV2ZW50LCBmMik7XG4gICAgIHJldHVybiBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgfTtcbiAgIHJldHVybiB0aGlzLmFkZExpc3RlbmVyKGV2ZW50LCBmMik7XG4gfTtcblxuIEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbihldmVudCwgbGlzdGVuZXIpIHtcblxuICBpZih0eXBlb2YgbGlzdGVuZXIgPT09ICd1bmRlZmluZWQnKXtcbiAgICByZXR1cm4gdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcihldmVudCk7XG4gIH1cblxuICAgdmFyIGxpc3RlbmVycyA9IHRoaXMuZ2V0TGlzdGVuZXIoZXZlbnQpO1xuICAgaWYgKGxpc3RlbmVycykge1xuICAgICB2YXIgaSA9IGxpc3RlbmVycy5pbmRleE9mKGxpc3RlbmVyKTtcbiAgICAgaWYgKGkgPiAtMSkge1xuICAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5zcGxpY2UoaSwgMSk7XG4gICAgICAgaWYgKCFsaXN0ZW5lcnMubGVuZ3RoKSB7XG4gICAgICAgICBkZWxldGUodGhpcy5fZXZlbnRNYXBbZXZlbnRdKTtcbiAgICAgICB9XG4gICAgICAgcmV0dXJuIHRydWU7XG4gICAgIH1cbiAgIH1cbiAgIHJldHVybiBmYWxzZTtcbiB9O1xuXG4gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lciA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICB2YXIgbGlzdGVuZXJzID0gdGhpcy5nZXRMaXN0ZW5lcihldmVudCk7XG4gICBpZiAobGlzdGVuZXJzKSB7XG4gICAgIHRoaXMuX2V2ZW50TWFwW2V2ZW50XS5sZW5ndGggPSAwO1xuICAgICBkZWxldGUodGhpcy5fZXZlbnRNYXBbZXZlbnRdKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgIH1cbiAgIHJldHVybiBmYWxzZTtcbiB9O1xuXG4gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5oYXNMaXN0ZW5lciA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICByZXR1cm4gdGhpcy5nZXRMaXN0ZW5lcihldmVudCkgIT09IG51bGw7XG4gfTtcblxuIEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUuaGFzTGlzdGVuZXJzID0gZnVuY3Rpb24oKSB7XG4gICByZXR1cm4gKHRoaXMuX2V2ZW50TWFwICE9PSBudWxsICYmIHRoaXMuX2V2ZW50TWFwICE9PSB1bmRlZmluZWQgJiYgIWlzRW1wdHkodGhpcy5fZXZlbnRNYXApKTtcbiB9O1xuXG4gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5kaXNwYXRjaCA9IGZ1bmN0aW9uKGV2ZW50VHlwZSwgZXZlbnRPYmplY3QpIHtcbiAgIHZhciBsaXN0ZW5lcnMgPSB0aGlzLmdldExpc3RlbmVyKGV2ZW50VHlwZSk7XG5cbiAgIGlmIChsaXN0ZW5lcnMpIHtcbiAgICAgZXZlbnRPYmplY3QgPSBldmVudE9iamVjdCB8fCB7fTtcbiAgICAgZXZlbnRPYmplY3QudHlwZSA9IGV2ZW50VHlwZTtcbiAgICAgZXZlbnRPYmplY3QudGFyZ2V0ID0gZXZlbnRPYmplY3QudGFyZ2V0IHx8IHRoaXM7XG5cbiAgICAgdmFyIGkgPSAtMTtcbiAgICAgd2hpbGUgKCsraSA8IGxpc3RlbmVycy5sZW5ndGgpIHtcbiAgICAgICBsaXN0ZW5lcnNbaV0oZXZlbnRPYmplY3QpO1xuICAgICB9XG4gICAgIHJldHVybiB0cnVlO1xuICAgfVxuICAgcmV0dXJuIGZhbHNlO1xuIH07XG5cbiBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLmdldExpc3RlbmVyID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgIHZhciByZXN1bHQgPSB0aGlzLl9ldmVudE1hcCA/IHRoaXMuX2V2ZW50TWFwW2V2ZW50XSA6IG51bGw7XG4gICByZXR1cm4gKHJlc3VsdCB8fCBudWxsKTtcbiB9O1xuXG4gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24oKSB7XG4gICBpZiAodGhpcy5fZXZlbnRNYXApIHtcbiAgICAgZm9yICh2YXIgaSBpbiB0aGlzLl9ldmVudE1hcCkge1xuICAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXIoaSk7XG4gICAgIH1cbiAgICAgdGhpcy5fZXZlbnRNYXAgPSBudWxsO1xuICAgfVxuICAgdGhpcy5fZGVzdHJveWVkID0gdHJ1ZTtcbiB9O1xuXG5cbiAvL01ldGhvZCBNYXBcbiBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLm9uID0gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5iaW5kID0gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5hZGRFdmVudExpc3RlbmVyID0gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcbiBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLm9mZiA9IEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUudW5iaW5kID0gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5yZW1vdmVFdmVudExpc3RlbmVyID0gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lcjtcbiBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLm9uY2UgPSBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLm9uZSA9IEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUuYWRkTGlzdGVuZXJPbmNlO1xuIEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUudHJpZ2dlciA9IEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUuZGlzcGF0Y2hFdmVudCA9IEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUuZGlzcGF0Y2g7XG5cbiBtb2R1bGUuZXhwb3J0cyA9IEV2ZW50RGlzcGF0Y2hlcjtcbiIsIid1c2Ugc3RyaWN0JztcblxuLypcbiAqIEZhc3RTY3JvbGxcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9zb2Vua2VrbHV0aC9mYXN0c2Nyb2xsXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE0IFPDtm5rZSBLbHV0aFxuICogTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlLlxuICovXG5cbnZhciBkZWxlZ2F0ZSA9IHJlcXVpcmUoJ2RlbGVnYXRlanMnKTtcbnZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKCdldmVudGRpc3BhdGNoZXInKTtcbnZhciBfaW5zdGFuY2VNYXAgPSB7fTtcblxudmFyIEZhc3RTY3JvbGwgPSBmdW5jdGlvbihzY3JvbGxUYXJnZXQsIG9wdGlvbnMpIHtcblxuICBzY3JvbGxUYXJnZXQgPSBzY3JvbGxUYXJnZXQgfHwgd2luZG93O1xuXG4gIGlmKEZhc3RTY3JvbGwuaGFzU2Nyb2xsVGFyZ2V0KHNjcm9sbFRhcmdldCkpIHtcbiAgICByZXR1cm4gRmFzdFNjcm9sbC5nZXRJbnN0YW5jZShzY3JvbGxUYXJnZXQpO1xuICB9XG5cbiAgX2luc3RhbmNlTWFwW3Njcm9sbFRhcmdldF0gPSB0aGlzO1xuXG4gIHRoaXMub3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgaWYgKCF0aGlzLm9wdGlvbnMuaGFzT3duUHJvcGVydHkoJ2FuaW1hdGlvbkZyYW1lJykpIHtcbiAgICB0aGlzLm9wdGlvbnMuYW5pbWF0aW9uRnJhbWUgPSB0cnVlO1xuICB9XG5cbiAgaWYodHlwZW9mIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgIT09ICdmdW5jdGlvbicpIHtcbiAgICB0aGlzLm9wdGlvbnMuYW5pbWF0aW9uRnJhbWUgPSBmYWxzZTtcbiAgfVxuXG4gIHRoaXMuc2Nyb2xsVGFyZ2V0ID0gc2Nyb2xsVGFyZ2V0O1xuICB0aGlzLmluaXQoKTtcbn07XG5cbkZhc3RTY3JvbGwuX19faW5zdGFuY2VNYXAgPSBfaW5zdGFuY2VNYXA7XG5cbkZhc3RTY3JvbGwuZ2V0SW5zdGFuY2UgPSBmdW5jdGlvbihzY3JvbGxUYXJnZXQsIG9wdGlvbnMpIHtcbiAgc2Nyb2xsVGFyZ2V0ID0gc2Nyb2xsVGFyZ2V0IHx8IHdpbmRvdztcbiAgcmV0dXJuIF9pbnN0YW5jZU1hcFtzY3JvbGxUYXJnZXRdIHx8IChuZXcgRmFzdFNjcm9sbChzY3JvbGxUYXJnZXQsIG9wdGlvbnMpKTtcbn07XG5cbkZhc3RTY3JvbGwuaGFzSW5zdGFuY2UgPSBmdW5jdGlvbihzY3JvbGxUYXJnZXQpIHtcbiAgcmV0dXJuIF9pbnN0YW5jZU1hcFtzY3JvbGxUYXJnZXRdICE9PSB1bmRlZmluZWQ7XG59O1xuXG5GYXN0U2Nyb2xsLmhhc1Njcm9sbFRhcmdldCA9IEZhc3RTY3JvbGwuaGFzSW5zdGFuY2U7XG5cbkZhc3RTY3JvbGwuY2xlYXJJbnN0YW5jZSA9IGZ1bmN0aW9uKHNjcm9sbFRhcmdldCkge1xuICBzY3JvbGxUYXJnZXQgPSBzY3JvbGxUYXJnZXQgfHwgd2luZG93O1xuICBpZiAoRmFzdFNjcm9sbC5oYXNJbnN0YW5jZShzY3JvbGxUYXJnZXQpKSB7XG4gICAgRmFzdFNjcm9sbC5nZXRJbnN0YW5jZShzY3JvbGxUYXJnZXQpLmRlc3Ryb3koKTtcbiAgICBkZWxldGUoX2luc3RhbmNlTWFwW3Njcm9sbFRhcmdldF0pO1xuICB9XG59O1xuXG5GYXN0U2Nyb2xsLlVQID0gJ3VwJztcbkZhc3RTY3JvbGwuRE9XTiA9ICdkb3duJztcbkZhc3RTY3JvbGwuTk9ORSA9ICdub25lJztcbkZhc3RTY3JvbGwuTEVGVCA9ICdsZWZ0JztcbkZhc3RTY3JvbGwuUklHSFQgPSAncmlnaHQnO1xuXG5GYXN0U2Nyb2xsLnByb3RvdHlwZSA9IHtcblxuICBkZXN0cm95ZWQ6IGZhbHNlLFxuICBzY3JvbGxZOiAwLFxuICBzY3JvbGxYOiAwLFxuICBsYXN0U2Nyb2xsWTogMCxcbiAgbGFzdFNjcm9sbFg6IDAsXG4gIHRpbWVvdXQ6IDAsXG4gIHNwZWVkWTogMCxcbiAgc3BlZWRYOiAwLFxuICBzdG9wRnJhbWVzOiA1LFxuICBjdXJyZW50U3RvcEZyYW1lczogMCxcbiAgZmlyc3RSZW5kZXI6IHRydWUsXG4gIGFuaW1hdGlvbkZyYW1lOiB0cnVlLFxuICBsYXN0RXZlbnQ6IHtcbiAgICB0eXBlOiBudWxsLFxuICAgIHNjcm9sbFk6IDAsXG4gICAgc2Nyb2xsWDogMFxuICB9LFxuXG4gIHNjcm9sbGluZzogZmFsc2UsXG5cbiAgaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5kaXNwYXRjaGVyID0gbmV3IEV2ZW50RGlzcGF0Y2hlcigpO1xuICAgIHRoaXMudXBkYXRlU2Nyb2xsUG9zaXRpb24gPSAodGhpcy5zY3JvbGxUYXJnZXQgPT09IHdpbmRvdykgPyBkZWxlZ2F0ZSh0aGlzLCB0aGlzLnVwZGF0ZVdpbmRvd1Njcm9sbFBvc2l0aW9uKSA6IGRlbGVnYXRlKHRoaXMsIHRoaXMudXBkYXRlRWxlbWVudFNjcm9sbFBvc2l0aW9uKTtcbiAgICB0aGlzLnVwZGF0ZVNjcm9sbFBvc2l0aW9uKCk7XG4gICAgdGhpcy50cmlnZ2VyID0gdGhpcy5kaXNwYXRjaEV2ZW50O1xuICAgIHRoaXMubGFzdEV2ZW50LnNjcm9sbFkgPSB0aGlzLnNjcm9sbFk7XG4gICAgdGhpcy5sYXN0RXZlbnQuc2Nyb2xsWCA9IHRoaXMuc2Nyb2xsWDtcbiAgICB0aGlzLm9uU2Nyb2xsID0gZGVsZWdhdGUodGhpcywgdGhpcy5vblNjcm9sbCk7XG4gICAgdGhpcy5vbk5leHRGcmFtZSA9IGRlbGVnYXRlKHRoaXMsIHRoaXMub25OZXh0RnJhbWUpO1xuICAgIGlmICh0aGlzLnNjcm9sbFRhcmdldC5hZGRFdmVudExpc3RlbmVyKSB7XG4gICAgICB0aGlzLnNjcm9sbFRhcmdldC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXdoZWVsJywgdGhpcy5vblNjcm9sbCwgZmFsc2UpO1xuICAgICAgdGhpcy5zY3JvbGxUYXJnZXQuYWRkRXZlbnRMaXN0ZW5lcignc2Nyb2xsJywgdGhpcy5vblNjcm9sbCwgZmFsc2UpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5zY3JvbGxUYXJnZXQuYXR0YWNoRXZlbnQpIHtcbiAgICAgIHRoaXMuc2Nyb2xsVGFyZ2V0LmF0dGFjaEV2ZW50KCdvbm1vdXNld2hlZWwnLCB0aGlzLm9uU2Nyb2xsKTtcbiAgICAgIHRoaXMuc2Nyb2xsVGFyZ2V0LmF0dGFjaEV2ZW50KCdzY3JvbGwnLCB0aGlzLm9uU2Nyb2xsKTtcbiAgICB9XG4gIH0sXG5cbiAgZGVzdHJveTogZnVuY3Rpb24oKSB7XG4gICAgaWYgKCF0aGlzLmRlc3Ryb3llZCkge1xuICAgICAgdGhpcy5jYW5jZWxOZXh0RnJhbWUoKTtcbiAgICAgIGlmICh0aGlzLnNjcm9sbFRhcmdldC5hZGRFdmVudExpc3RlbmVyKSB7XG4gICAgICAgIHRoaXMuc2Nyb2xsVGFyZ2V0LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ21vdXNld2hlZWwnLCB0aGlzLm9uU2Nyb2xsKTtcbiAgICAgICAgdGhpcy5zY3JvbGxUYXJnZXQucmVtb3ZlRXZlbnRMaXN0ZW5lcignc2Nyb2xsJywgdGhpcy5vblNjcm9sbCk7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMuc2Nyb2xsVGFyZ2V0LmF0dGFjaEV2ZW50KSB7XG4gICAgICAgIHRoaXMuc2Nyb2xsVGFyZ2V0LmRldGFjaEV2ZW50KCdvbm1vdXNld2hlZWwnLCB0aGlzLm9uU2Nyb2xsKTtcbiAgICAgICAgdGhpcy5zY3JvbGxUYXJnZXQuZGV0YWNoRXZlbnQoJ3Njcm9sbCcsIHRoaXMub25TY3JvbGwpO1xuICAgICAgfVxuICAgICAgdGhpcy5kaXNwYXRjaGVyLm9mZigpO1xuICAgICAgdGhpcy5kaXNwYXRjaGVyID0gbnVsbDtcbiAgICAgIHRoaXMub25TY3JvbGwgPSBudWxsO1xuICAgICAgdGhpcy51cGRhdGVTY3JvbGxQb3NpdGlvbiA9IG51bGw7XG4gICAgICB0aGlzLm9uTmV4dEZyYW1lID0gbnVsbDtcbiAgICAgIHRoaXMuc2Nyb2xsVGFyZ2V0ID0gbnVsbDtcbiAgICAgIHRoaXMuZGVzdHJveWVkID0gdHJ1ZTtcbiAgICB9XG4gIH0sXG5cbiAgZ2V0QXR0cmlidXRlczogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHNjcm9sbFk6IHRoaXMuc2Nyb2xsWSxcbiAgICAgIHNjcm9sbFg6IHRoaXMuc2Nyb2xsWCxcbiAgICAgIHNwZWVkWTogdGhpcy5zcGVlZFksXG4gICAgICBzcGVlZFg6IHRoaXMuc3BlZWRYLFxuICAgICAgYW5nbGU6IDAsXG4gICAgICBkaXJlY3Rpb25ZOiB0aGlzLnNwZWVkWSA9PT0gMCA/IEZhc3RTY3JvbGwuTk9ORSA6ICgodGhpcy5zcGVlZFkgPiAwKSA/IEZhc3RTY3JvbGwuVVAgOiBGYXN0U2Nyb2xsLkRPV04pLFxuICAgICAgZGlyZWN0aW9uWDogdGhpcy5zcGVlZFggPT09IDAgPyBGYXN0U2Nyb2xsLk5PTkUgOiAoKHRoaXMuc3BlZWRYID4gMCkgPyBGYXN0U2Nyb2xsLlJJR0hUIDogRmFzdFNjcm9sbC5MRUZUKVxuICAgIH07XG4gIH0sXG5cbiAgdXBkYXRlV2luZG93U2Nyb2xsUG9zaXRpb246IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc2Nyb2xsWSA9IHdpbmRvdy5zY3JvbGxZIHx8IHdpbmRvdy5wYWdlWU9mZnNldCB8fCAwO1xuICAgIHRoaXMuc2Nyb2xsWCA9IHdpbmRvdy5zY3JvbGxYIHx8IHdpbmRvdy5wYWdlWE9mZnNldCB8fCAwO1xuICB9LFxuXG4gIHVwZGF0ZUVsZW1lbnRTY3JvbGxQb3NpdGlvbjogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zY3JvbGxZID0gdGhpcy5zY3JvbGxUYXJnZXQuc2Nyb2xsVG9wO1xuICAgIHRoaXMuc2Nyb2xsWCA9IHRoaXMuc2Nyb2xsVGFyZ2V0LnNjcm9sbExlZnQ7XG4gIH0sXG5cbiAgb25TY3JvbGw6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuY3VycmVudFN0b3BGcmFtZXMgPSAwO1xuICAgIGlmICh0aGlzLmZpcnN0UmVuZGVyKSB7XG4gICAgICB0aGlzLmZpcnN0UmVuZGVyID0gZmFsc2U7XG4gICAgICBpZiAodGhpcy5zY3JvbGxZID4gMSkge1xuICAgICAgICB0aGlzLnVwZGF0ZVNjcm9sbFBvc2l0aW9uKCk7XG4gICAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudCgnc2Nyb2xsOnByb2dyZXNzJyk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuc2Nyb2xsaW5nKSB7XG4gICAgICB0aGlzLnNjcm9sbGluZyA9IHRydWU7XG4gICAgICB0aGlzLmRpc3BhdGNoRXZlbnQoJ3Njcm9sbDpzdGFydCcpO1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5hbmltYXRpb25GcmFtZSkge1xuICAgICAgICB0aGlzLm5leHRGcmFtZUlEID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHRoaXMub25OZXh0RnJhbWUpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoIXRoaXMub3B0aW9ucy5hbmltYXRpb25GcmFtZSkge1xuICAgICAgY2xlYXJUaW1lb3V0KHRoaXMudGltZW91dCk7XG4gICAgICB0aGlzLm9uTmV4dEZyYW1lKCk7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB0aGlzLnRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICBzZWxmLm9uU2Nyb2xsU3RvcCgpO1xuICAgICAgfSwgMTAwKTtcbiAgICB9XG4gIH0sXG5cbiAgb25OZXh0RnJhbWU6IGZ1bmN0aW9uKCkge1xuXG4gICAgdGhpcy51cGRhdGVTY3JvbGxQb3NpdGlvbigpO1xuXG4gICAgdGhpcy5zcGVlZFkgPSB0aGlzLmxhc3RTY3JvbGxZIC0gdGhpcy5zY3JvbGxZO1xuICAgIHRoaXMuc3BlZWRYID0gdGhpcy5sYXN0U2Nyb2xsWCAtIHRoaXMuc2Nyb2xsWDtcblxuICAgIHRoaXMubGFzdFNjcm9sbFkgPSB0aGlzLnNjcm9sbFk7XG4gICAgdGhpcy5sYXN0U2Nyb2xsWCA9IHRoaXMuc2Nyb2xsWDtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuYW5pbWF0aW9uRnJhbWUgJiYgKHRoaXMuc2Nyb2xsaW5nICYmIHRoaXMuc3BlZWRZID09PSAwICYmICh0aGlzLmN1cnJlbnRTdG9wRnJhbWVzKysgPiB0aGlzLnN0b3BGcmFtZXMpKSkge1xuICAgICAgdGhpcy5vblNjcm9sbFN0b3AoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQoJ3Njcm9sbDpwcm9ncmVzcycpO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5hbmltYXRpb25GcmFtZSkge1xuICAgICAgdGhpcy5uZXh0RnJhbWVJRCA9IHJlcXVlc3RBbmltYXRpb25GcmFtZSh0aGlzLm9uTmV4dEZyYW1lKTtcbiAgICB9XG4gIH0sXG5cbiAgb25TY3JvbGxTdG9wOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnNjcm9sbGluZyA9IGZhbHNlO1xuICAgIGlmICh0aGlzLm9wdGlvbnMuYW5pbWF0aW9uRnJhbWUpIHtcbiAgICAgIHRoaXMuY2FuY2VsTmV4dEZyYW1lKCk7XG4gICAgICB0aGlzLmN1cnJlbnRTdG9wRnJhbWVzID0gMDtcbiAgICB9XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KCdzY3JvbGw6c3RvcCcpO1xuICB9LFxuXG4gIGNhbmNlbE5leHRGcmFtZTogZnVuY3Rpb24oKSB7XG4gICAgY2FuY2VsQW5pbWF0aW9uRnJhbWUodGhpcy5uZXh0RnJhbWVJRCk7XG4gIH0sXG5cbiAgZGlzcGF0Y2hFdmVudDogZnVuY3Rpb24odHlwZSwgZXZlbnRPYmplY3QpIHtcbiAgICBldmVudE9iamVjdCA9IGV2ZW50T2JqZWN0IHx8IHRoaXMuZ2V0QXR0cmlidXRlcygpO1xuXG4gICAgaWYgKHRoaXMubGFzdEV2ZW50LnR5cGUgPT09IHR5cGUgJiYgdGhpcy5sYXN0RXZlbnQuc2Nyb2xsWSA9PT0gZXZlbnRPYmplY3Quc2Nyb2xsWSAmJiB0aGlzLmxhc3RFdmVudC5zY3JvbGxYID09PSBldmVudE9iamVjdC5zY3JvbGxYKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5sYXN0RXZlbnQgPSB7XG4gICAgICB0eXBlOiB0eXBlLFxuICAgICAgc2Nyb2xsWTogZXZlbnRPYmplY3Quc2Nyb2xsWSxcbiAgICAgIHNjcm9sbFg6IGV2ZW50T2JqZWN0LnNjcm9sbFhcbiAgICB9O1xuXG4gICAgLy8gZXZlbnRPYmplY3QuZmFzdFNjcm9sbCA9IHRoaXM7XG4gICAgZXZlbnRPYmplY3QudGFyZ2V0ID0gdGhpcy5zY3JvbGxUYXJnZXQ7XG4gICAgdGhpcy5kaXNwYXRjaGVyLmRpc3BhdGNoKHR5cGUsIGV2ZW50T2JqZWN0KTtcbiAgfSxcblxuICBvbjogZnVuY3Rpb24oZXZlbnQsIGxpc3RlbmVyKSB7XG4gICAgcmV0dXJuIHRoaXMuZGlzcGF0Y2hlci5hZGRMaXN0ZW5lcihldmVudCwgbGlzdGVuZXIpO1xuICB9LFxuXG4gIG9mZjogZnVuY3Rpb24oZXZlbnQsIGxpc3RlbmVyKSB7XG4gICAgcmV0dXJuIHRoaXMuZGlzcGF0Y2hlci5yZW1vdmVMaXN0ZW5lcihldmVudCwgbGlzdGVuZXIpO1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZhc3RTY3JvbGw7XG4iLCIvKiBlc2xpbnQtZGlzYWJsZSBuby11bnVzZWQtdmFycyAqL1xuJ3VzZSBzdHJpY3QnO1xudmFyIGhhc093blByb3BlcnR5ID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcbnZhciBwcm9wSXNFbnVtZXJhYmxlID0gT2JqZWN0LnByb3RvdHlwZS5wcm9wZXJ0eUlzRW51bWVyYWJsZTtcblxuZnVuY3Rpb24gdG9PYmplY3QodmFsKSB7XG5cdGlmICh2YWwgPT09IG51bGwgfHwgdmFsID09PSB1bmRlZmluZWQpIHtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdPYmplY3QuYXNzaWduIGNhbm5vdCBiZSBjYWxsZWQgd2l0aCBudWxsIG9yIHVuZGVmaW5lZCcpO1xuXHR9XG5cblx0cmV0dXJuIE9iamVjdCh2YWwpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gKHRhcmdldCwgc291cmNlKSB7XG5cdHZhciBmcm9tO1xuXHR2YXIgdG8gPSB0b09iamVjdCh0YXJnZXQpO1xuXHR2YXIgc3ltYm9scztcblxuXHRmb3IgKHZhciBzID0gMTsgcyA8IGFyZ3VtZW50cy5sZW5ndGg7IHMrKykge1xuXHRcdGZyb20gPSBPYmplY3QoYXJndW1lbnRzW3NdKTtcblxuXHRcdGZvciAodmFyIGtleSBpbiBmcm9tKSB7XG5cdFx0XHRpZiAoaGFzT3duUHJvcGVydHkuY2FsbChmcm9tLCBrZXkpKSB7XG5cdFx0XHRcdHRvW2tleV0gPSBmcm9tW2tleV07XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMpIHtcblx0XHRcdHN5bWJvbHMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKGZyb20pO1xuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBzeW1ib2xzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdGlmIChwcm9wSXNFbnVtZXJhYmxlLmNhbGwoZnJvbSwgc3ltYm9sc1tpXSkpIHtcblx0XHRcdFx0XHR0b1tzeW1ib2xzW2ldXSA9IGZyb21bc3ltYm9sc1tpXV07XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gdG87XG59O1xuIl19
