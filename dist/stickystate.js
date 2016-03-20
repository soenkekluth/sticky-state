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

  this.setState({
    sticky: false,
    marginTop: '',
    marginBottom: '',
    fixedOffset: '',
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
  }, true);


  this.child = this.el;
  this.scrollTarget = (window.getComputedStyle(this.el.parentNode).overflow !== 'auto' ? window : this.el.parentNode);
  this.hasOwnScrollTarget = this.scrollTarget !== window;
  if (this.hasOwnScrollTarget) {
    this.updateFixedOffset = this.updateFixedOffset.bind(this);
  }
  this.firstRender = true;
  this.hasFeature = null;
  this.resizeHandler = null;
  this.fastScroll = null;
  this.wrapper = null;

  this.render = this.render.bind(this);

  this.addSrollHandler();
  this.addResizeHandler();
  this.render();
};

StickyState.prototype.setState = function(newState, silent) {
  silent = silent === true;
  this.lastState = this.state || newState;
  this.state = assign({}, this.state, newState);
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

  var clientRect = this.getBoundingClientRect();

  if (noCache !== true && this.state.bounds.height !== null) {
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
  var offset = 0;


  if (!this.canSticky()) {
    rect = getAbsolutBoundingRect(this.child, clientRect.height);
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
    var elem = getPreviousElementSibling(this.child);
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
      elem = this.child.parentNode;
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
  if (this.hasFeature !== null) {
    return this.hasFeature;
  }
  return this.hasFeature = window.getComputedStyle(this.el).position.match('sticky');
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
    return { sticky: false, marginTop: '', marginBottom: '' };
  }

  var scrollY = this.fastScroll.scrollY;
  var top = this.state.style.top;
  var bottom = this.state.style.bottom;
  var marginTop = this.state.marginTop;
  var marginBottom = this.state.marginBottom;
  var sticky = this.state.sticky;


  if (top !== null) {
    var offsetBottom = this.state.restrict.bottom - this.state.bounds.height - top;
    top = this.state.bounds.top - top;
    if (this.state.sticky === false && scrollY >= top && scrollY <= offsetBottom) {
      sticky = true;
      marginTop = '';
    } else if (this.state.sticky && (scrollY < top || scrollY > offsetBottom)) {
      sticky = false;

      if (scrollY > offsetBottom && this.state.marginTop === '') {
        marginTop = (this.state.restrict.height - this.state.restrict.top - this.state.style.top - this.state.bounds.height +2 ) + 'px';
      }
    }
  } else if (bottom !== null) {

    scrollY += window.innerHeight;
    var offsetTop = this.state.restrict.top + this.state.bounds.height - bottom;
    bottom = this.state.bounds.bottom + bottom;

    if (this.state.sticky === false && scrollY <= bottom && scrollY >= offsetTop) {
      sticky = true;
      marginBottom = '';
    } else if (this.state.sticky && (scrollY > bottom || scrollY < offsetTop)) {
      sticky = false;
      if (scrollY < offsetTop && this.state.marginBottom === '') {
        marginBottom = (this.state.restrict.height - this.state.bounds.height * 2 + 2) + 'px';
      }
    }
  }
  return { sticky: sticky, marginTop: marginTop, marginBottom: marginBottom };
};

StickyState.prototype.updateStickyState = function(silent) {
  var state = this.getStickyState();
  if (state.sticky !== this.state.sticky) {
    silent = silent === true;
    var bounds = this.getBounds();
    bounds.sticky = state.sticky;
    bounds.marginTop = state.marginTop;
    bounds.marginBottom = state.marginBottom;
    this.setState(bounds, silent);
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


  var className = this.el.className;

  if (!this.canSticky()) {
    var height = (this.state.disabled || (!this.state.sticky || this.state.bounds.height === null)) ? 'auto' : this.state.bounds.height + 'px';
    this.wrapper.style.height = height;

    if (this.hasOwnScrollTarget && this.lastState.fixedOffset !== this.state.fixedOffset) {
      this.el.style.marginTop = this.state.fixedOffset;
    }

    if (this.state.marginTop !== this.lastState.marginTop || this.state.marginBottom !== this.lastState.marginBottom) {
      var hasAbsoluteClass = className.indexOf('is-absolute') > -1;
      if (!hasAbsoluteClass && (this.state.marginTop !== '' || this.state.marginBottom !== '' )) {
        className += ' is-absolute';
        this.wrapper.style.position = 'relative';
      } else {
        className = className.split(' is-absolute').join('');
        this.wrapper.style.position = '';
      }
      this.el.style.marginTop = this.state.marginTop;
      this.el.style.marginBottom = this.state.marginBottom;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9kZWxlZ2F0ZWpzL2RlbGVnYXRlLmpzIiwibm9kZV9tb2R1bGVzL2V2ZW50ZGlzcGF0Y2hlci9zcmMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZmFzdHNjcm9sbC9zcmMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvb2JqZWN0LWFzc2lnbi9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JjQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgYXNzaWduID0gcmVxdWlyZSgnb2JqZWN0LWFzc2lnbicpO1xudmFyIEZhc3RTY3JvbGwgPSByZXF1aXJlKCdmYXN0c2Nyb2xsJyk7XG5cbnZhciBfZ2xvYmFscyA9IHtcbiAgZmVhdHVyZVRlc3RlZDogZmFsc2Vcbn07XG5cbnZhciBkZWZhdWx0cyA9IHtcbiAgZGlzYWJsZWQ6IGZhbHNlLFxuICBjbGFzc05hbWU6ICdzdGlja3knLFxuICBmaXhlZENsYXNzOiAnc3RpY2t5LWZpeGVkJyxcbiAgc3RhdGVDbGFzc05hbWU6ICdpcy1zdGlja3knXG59O1xuXG5mdW5jdGlvbiBnZXRTcm9sbFBvc2l0aW9uKCkge1xuICByZXR1cm4gKHdpbmRvdy5zY3JvbGxZIHx8IHdpbmRvdy5wYWdlWU9mZnNldCB8fCAwKTtcbn1cblxuZnVuY3Rpb24gZ2V0QWJzb2x1dEJvdW5kaW5nUmVjdChlbCwgZml4ZWRIZWlnaHQpIHtcbiAgdmFyIHJlY3QgPSBlbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgdmFyIHRvcCA9IHJlY3QudG9wICsgZ2V0U3JvbGxQb3NpdGlvbigpO1xuICB2YXIgaGVpZ2h0ID0gZml4ZWRIZWlnaHQgfHwgcmVjdC5oZWlnaHQ7XG4gIHJldHVybiB7XG4gICAgdG9wOiB0b3AsXG4gICAgYm90dG9tOiB0b3AgKyBoZWlnaHQsXG4gICAgaGVpZ2h0OiBoZWlnaHQsXG4gICAgd2lkdGg6IHJlY3Qud2lkdGhcbiAgfTtcbn1cblxuZnVuY3Rpb24gYWRkQm91bmRzKHJlY3QxLCByZWN0Mikge1xuICB2YXIgcmVjdCA9IGFzc2lnbih7fSwgcmVjdDEpO1xuICByZWN0LnRvcCAtPSByZWN0Mi50b3A7XG4gIHJlY3QuYm90dG9tID0gcmVjdC50b3AgKyByZWN0MS5oZWlnaHQ7XG4gIHJldHVybiByZWN0O1xufVxuXG5mdW5jdGlvbiBnZXRQcmV2aW91c0VsZW1lbnRTaWJsaW5nKGVsKSB7XG4gIHZhciBwcmV2ID0gZWwucHJldmlvdXNFbGVtZW50U2libGluZztcbiAgaWYgKHByZXYgJiYgcHJldi50YWdOYW1lLnRvTG9jYWxlTG93ZXJDYXNlKCkgPT09ICdzY3JpcHQnKSB7XG4gICAgcHJldiA9IGdldFByZXZpb3VzRWxlbWVudFNpYmxpbmcocHJldik7XG4gIH1cbiAgcmV0dXJuIHByZXY7XG59XG5cblxudmFyIFN0aWNreVN0YXRlID0gZnVuY3Rpb24oZWxlbWVudCwgb3B0aW9ucykge1xuICBpZiAoIWVsZW1lbnQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1N0aWNreVN0YXRlIG5lZWRzIGEgRG9tRWxlbWVudCcpO1xuICB9XG5cbiAgdGhpcy5lbCA9IGVsZW1lbnQ7XG4gIHRoaXMub3B0aW9ucyA9IGFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpO1xuXG4gIHRoaXMuc2V0U3RhdGUoe1xuICAgIHN0aWNreTogZmFsc2UsXG4gICAgbWFyZ2luVG9wOiAnJyxcbiAgICBtYXJnaW5Cb3R0b206ICcnLFxuICAgIGZpeGVkT2Zmc2V0OiAnJyxcbiAgICBib3VuZHM6IHtcbiAgICAgIHRvcDogbnVsbCxcbiAgICAgIGJvdHRvbTogbnVsbCxcbiAgICAgIGhlaWdodDogbnVsbCxcbiAgICAgIHdpZHRoOiBudWxsXG4gICAgfSxcbiAgICByZXN0cmljdDoge1xuICAgICAgdG9wOiBudWxsLFxuICAgICAgYm90dG9tOiBudWxsLFxuICAgICAgaGVpZ2h0OiBudWxsLFxuICAgICAgd2lkdGg6IG51bGxcbiAgICB9LFxuICAgIHN0eWxlOiB7XG4gICAgICB0b3A6IG51bGwsXG4gICAgICBib3R0b206IG51bGxcbiAgICB9LFxuICAgIGRpc2FibGVkOiBmYWxzZVxuICB9LCB0cnVlKTtcblxuXG4gIHRoaXMuY2hpbGQgPSB0aGlzLmVsO1xuICB0aGlzLnNjcm9sbFRhcmdldCA9ICh3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZSh0aGlzLmVsLnBhcmVudE5vZGUpLm92ZXJmbG93ICE9PSAnYXV0bycgPyB3aW5kb3cgOiB0aGlzLmVsLnBhcmVudE5vZGUpO1xuICB0aGlzLmhhc093blNjcm9sbFRhcmdldCA9IHRoaXMuc2Nyb2xsVGFyZ2V0ICE9PSB3aW5kb3c7XG4gIGlmICh0aGlzLmhhc093blNjcm9sbFRhcmdldCkge1xuICAgIHRoaXMudXBkYXRlRml4ZWRPZmZzZXQgPSB0aGlzLnVwZGF0ZUZpeGVkT2Zmc2V0LmJpbmQodGhpcyk7XG4gIH1cbiAgdGhpcy5maXJzdFJlbmRlciA9IHRydWU7XG4gIHRoaXMuaGFzRmVhdHVyZSA9IG51bGw7XG4gIHRoaXMucmVzaXplSGFuZGxlciA9IG51bGw7XG4gIHRoaXMuZmFzdFNjcm9sbCA9IG51bGw7XG4gIHRoaXMud3JhcHBlciA9IG51bGw7XG5cbiAgdGhpcy5yZW5kZXIgPSB0aGlzLnJlbmRlci5iaW5kKHRoaXMpO1xuXG4gIHRoaXMuYWRkU3JvbGxIYW5kbGVyKCk7XG4gIHRoaXMuYWRkUmVzaXplSGFuZGxlcigpO1xuICB0aGlzLnJlbmRlcigpO1xufTtcblxuU3RpY2t5U3RhdGUucHJvdG90eXBlLnNldFN0YXRlID0gZnVuY3Rpb24obmV3U3RhdGUsIHNpbGVudCkge1xuICBzaWxlbnQgPSBzaWxlbnQgPT09IHRydWU7XG4gIHRoaXMubGFzdFN0YXRlID0gdGhpcy5zdGF0ZSB8fCBuZXdTdGF0ZTtcbiAgdGhpcy5zdGF0ZSA9IGFzc2lnbih7fSwgdGhpcy5zdGF0ZSwgbmV3U3RhdGUpO1xuICBpZiAoIXNpbGVudCkge1xuICAgIHRoaXMucmVuZGVyKCk7XG4gIH1cbn07XG5cblN0aWNreVN0YXRlLnByb3RvdHlwZS5nZXRQb3NpdGlvblN0eWxlID0gZnVuY3Rpb24oKSB7XG5cbiAgdmFyIG9iaiA9IHtcbiAgICB0b3A6IG51bGwsXG4gICAgYm90dG9tOiBudWxsXG4gIH07XG5cbiAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgIHZhciB2YWx1ZSA9IHBhcnNlSW50KHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKHRoaXMuZWwpW2tleV0pO1xuICAgIHZhbHVlID0gaXNOYU4odmFsdWUpID8gbnVsbCA6IHZhbHVlO1xuICAgIG9ialtrZXldID0gdmFsdWU7XG4gIH1cblxuICByZXR1cm4gb2JqO1xufTtcblxuXG5TdGlja3lTdGF0ZS5wcm90b3R5cGUuZ2V0Qm91bmRpbmdDbGllbnRSZWN0ID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xufVxuXG5TdGlja3lTdGF0ZS5wcm90b3R5cGUuZ2V0Qm91bmRzID0gZnVuY3Rpb24obm9DYWNoZSkge1xuXG4gIHZhciBjbGllbnRSZWN0ID0gdGhpcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblxuICBpZiAobm9DYWNoZSAhPT0gdHJ1ZSAmJiB0aGlzLnN0YXRlLmJvdW5kcy5oZWlnaHQgIT09IG51bGwpIHtcbiAgICBpZiAoY2xpZW50UmVjdC5oZWlnaHQgPT09IHRoaXMuc3RhdGUuYm91bmRzLmhlaWdodCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgYm91bmRzOiB0aGlzLnN0YXRlLmJvdW5kcyxcbiAgICAgICAgcmVzdHJpY3Q6IHRoaXMuc3RhdGUucmVzdHJpY3RcbiAgICAgIH07XG4gICAgfVxuICB9XG5cblxuICB2YXIgc3R5bGUgPSB0aGlzLmdldFBvc2l0aW9uU3R5bGUoKTtcbiAgdmFyIHJlY3Q7XG4gIHZhciByZXN0cmljdDtcbiAgdmFyIG9mZnNldCA9IDA7XG5cblxuICBpZiAoIXRoaXMuY2FuU3RpY2t5KCkpIHtcbiAgICByZWN0ID0gZ2V0QWJzb2x1dEJvdW5kaW5nUmVjdCh0aGlzLmNoaWxkLCBjbGllbnRSZWN0LmhlaWdodCk7XG4gICAgaWYgKHRoaXMuaGFzT3duU2Nyb2xsVGFyZ2V0KSB7XG4gICAgICB2YXIgcGFyZW50UmVjdCA9IGdldEFic29sdXRCb3VuZGluZ1JlY3QodGhpcy5zY3JvbGxUYXJnZXQpO1xuICAgICAgb2Zmc2V0ID0gdGhpcy5mYXN0U2Nyb2xsLnNjcm9sbFk7XG4gICAgICByZWN0ID0gYWRkQm91bmRzKHJlY3QsIHBhcmVudFJlY3QpO1xuICAgICAgcmVzdHJpY3QgPSBwYXJlbnRSZWN0O1xuICAgICAgcmVzdHJpY3QudG9wID0gMDtcbiAgICAgIHJlc3RyaWN0LmhlaWdodCA9IHRoaXMuc2Nyb2xsVGFyZ2V0LnNjcm9sbEhlaWdodCB8fCByZXN0cmljdC5oZWlnaHQ7XG4gICAgICByZXN0cmljdC5ib3R0b20gPSByZXN0cmljdC5oZWlnaHQ7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhciBlbGVtID0gZ2V0UHJldmlvdXNFbGVtZW50U2libGluZyh0aGlzLmNoaWxkKTtcbiAgICBvZmZzZXQgPSAwO1xuXG4gICAgaWYgKGVsZW0pIHtcbiAgICAgIG9mZnNldCA9IHBhcnNlSW50KHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKGVsZW0pWydtYXJnaW4tYm90dG9tJ10pO1xuICAgICAgb2Zmc2V0ID0gb2Zmc2V0IHx8IDA7XG4gICAgICByZWN0ID0gZ2V0QWJzb2x1dEJvdW5kaW5nUmVjdChlbGVtKTtcbiAgICAgIGlmICh0aGlzLmhhc093blNjcm9sbFRhcmdldCkge1xuICAgICAgICByZWN0ID0gYWRkQm91bmRzKHJlY3QsIGdldEFic29sdXRCb3VuZGluZ1JlY3QodGhpcy5zY3JvbGxUYXJnZXQpKTtcbiAgICAgICAgb2Zmc2V0ICs9IHRoaXMuZmFzdFNjcm9sbC5zY3JvbGxZO1xuICAgICAgfVxuICAgICAgcmVjdC50b3AgPSByZWN0LmJvdHRvbSArIG9mZnNldDtcblxuICAgIH0gZWxzZSB7XG4gICAgICBlbGVtID0gdGhpcy5jaGlsZC5wYXJlbnROb2RlO1xuICAgICAgb2Zmc2V0ID0gcGFyc2VJbnQod2luZG93LmdldENvbXB1dGVkU3R5bGUoZWxlbSlbJ3BhZGRpbmctdG9wJ10pO1xuICAgICAgb2Zmc2V0ID0gb2Zmc2V0IHx8IDA7XG4gICAgICByZWN0ID0gZ2V0QWJzb2x1dEJvdW5kaW5nUmVjdChlbGVtKTtcbiAgICAgIGlmICh0aGlzLmhhc093blNjcm9sbFRhcmdldCkge1xuICAgICAgICByZWN0ID0gYWRkQm91bmRzKHJlY3QsIGdldEFic29sdXRCb3VuZGluZ1JlY3QodGhpcy5zY3JvbGxUYXJnZXQpKTtcbiAgICAgICAgb2Zmc2V0ICs9IHRoaXMuZmFzdFNjcm9sbC5zY3JvbGxZO1xuICAgICAgfVxuICAgICAgcmVjdC50b3AgPSByZWN0LnRvcCArIG9mZnNldDtcbiAgICB9XG4gICAgaWYgKHRoaXMuaGFzT3duU2Nyb2xsVGFyZ2V0KSB7XG4gICAgICByZXN0cmljdCA9IGdldEFic29sdXRCb3VuZGluZ1JlY3QodGhpcy5zY3JvbGxUYXJnZXQpO1xuICAgICAgcmVzdHJpY3QudG9wID0gMDtcbiAgICAgIHJlc3RyaWN0LmhlaWdodCA9IHRoaXMuc2Nyb2xsVGFyZ2V0LnNjcm9sbEhlaWdodCB8fCByZXN0cmljdC5oZWlnaHQ7XG4gICAgICByZXN0cmljdC5ib3R0b20gPSByZXN0cmljdC5oZWlnaHQ7XG4gICAgfVxuXG4gICAgcmVjdC5oZWlnaHQgPSB0aGlzLmNoaWxkLmNsaWVudEhlaWdodDtcbiAgICByZWN0LndpZHRoID0gdGhpcy5jaGlsZC5jbGllbnRXaWR0aDtcbiAgICByZWN0LmJvdHRvbSA9IHJlY3QudG9wICsgcmVjdC5oZWlnaHQ7XG4gIH1cblxuICByZXN0cmljdCA9IHJlc3RyaWN0IHx8IGdldEFic29sdXRCb3VuZGluZ1JlY3QodGhpcy5jaGlsZC5wYXJlbnROb2RlKTtcblxuICByZXR1cm4ge1xuICAgIHN0eWxlOiBzdHlsZSxcbiAgICBib3VuZHM6IHJlY3QsXG4gICAgcmVzdHJpY3Q6IHJlc3RyaWN0XG4gIH07XG59O1xuXG5TdGlja3lTdGF0ZS5wcm90b3R5cGUudXBkYXRlQm91bmRzID0gZnVuY3Rpb24oc2lsZW50KSB7XG4gIHNpbGVudCA9IHNpbGVudCA9PT0gdHJ1ZTtcbiAgdGhpcy5zZXRTdGF0ZSh0aGlzLmdldEJvdW5kcygpLCBzaWxlbnQpO1xufTtcblxuU3RpY2t5U3RhdGUucHJvdG90eXBlLnVwZGF0ZUZpeGVkT2Zmc2V0ID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMubGFzdFN0YXRlLmZpeGVkT2Zmc2V0ID0gdGhpcy5zdGF0ZS5maXhlZE9mZnNldDtcbiAgaWYgKHRoaXMuc3RhdGUuc3RpY2t5KSB7XG4gICAgdGhpcy5zdGF0ZS5maXhlZE9mZnNldCA9IHRoaXMuc2Nyb2xsVGFyZ2V0LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLnRvcCArICdweCc7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5zdGF0ZS5maXhlZE9mZnNldCA9ICcnO1xuICB9XG4gIGlmICh0aGlzLmxhc3RTdGF0ZS5maXhlZE9mZnNldCAhPT0gdGhpcy5zdGF0ZS5maXhlZE9mZnNldCkge1xuICAgIHRoaXMucmVuZGVyKCk7XG4gIH1cbn07XG5cblN0aWNreVN0YXRlLnByb3RvdHlwZS5jYW5TdGlja3kgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuaGFzRmVhdHVyZSAhPT0gbnVsbCkge1xuICAgIHJldHVybiB0aGlzLmhhc0ZlYXR1cmU7XG4gIH1cbiAgcmV0dXJuIHRoaXMuaGFzRmVhdHVyZSA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKHRoaXMuZWwpLnBvc2l0aW9uLm1hdGNoKCdzdGlja3knKTtcbn07XG5cblN0aWNreVN0YXRlLnByb3RvdHlwZS5hZGRTcm9sbEhhbmRsZXIgPSBmdW5jdGlvbigpIHtcbiAgaWYgKCF0aGlzLmZhc3RTY3JvbGwpIHtcbiAgICB2YXIgaGFzU2Nyb2xsVGFyZ2V0ID0gRmFzdFNjcm9sbC5oYXNTY3JvbGxUYXJnZXQodGhpcy5zY3JvbGxUYXJnZXQpO1xuXG4gICAgdGhpcy5mYXN0U2Nyb2xsID0gRmFzdFNjcm9sbC5nZXRJbnN0YW5jZSh0aGlzLnNjcm9sbFRhcmdldCk7XG4gICAgdGhpcy5vblNjcm9sbCA9IHRoaXMub25TY3JvbGwuYmluZCh0aGlzKTtcbiAgICB0aGlzLmZhc3RTY3JvbGwub24oJ3Njcm9sbDpzdGFydCcsIHRoaXMub25TY3JvbGwpO1xuICAgIHRoaXMuZmFzdFNjcm9sbC5vbignc2Nyb2xsOnByb2dyZXNzJywgdGhpcy5vblNjcm9sbCk7XG4gICAgdGhpcy5mYXN0U2Nyb2xsLm9uKCdzY3JvbGw6c3RvcCcsIHRoaXMub25TY3JvbGwpO1xuICAgIGlmIChoYXNTY3JvbGxUYXJnZXQgJiYgdGhpcy5mYXN0U2Nyb2xsLnNjcm9sbFkgPiAwKSB7XG4gICAgICB0aGlzLmZhc3RTY3JvbGwudHJpZ2dlcignc2Nyb2xsOnByb2dyZXNzJyk7XG4gICAgfVxuICB9XG59O1xuXG5TdGlja3lTdGF0ZS5wcm90b3R5cGUucmVtb3ZlU3JvbGxIYW5kbGVyID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLmZhc3RTY3JvbGwpIHtcbiAgICB0aGlzLmZhc3RTY3JvbGwub2ZmKCdzY3JvbGw6c3RhcnQnLCB0aGlzLm9uU2Nyb2xsKTtcbiAgICB0aGlzLmZhc3RTY3JvbGwub2ZmKCdzY3JvbGw6cHJvZ3Jlc3MnLCB0aGlzLm9uU2Nyb2xsKTtcbiAgICB0aGlzLmZhc3RTY3JvbGwub2ZmKCdzY3JvbGw6c3RvcCcsIHRoaXMub25TY3JvbGwpO1xuICAgIHRoaXMuZmFzdFNjcm9sbC5kZXN0cm95KCk7XG4gICAgdGhpcy5mYXN0U2Nyb2xsID0gbnVsbDtcbiAgfVxufTtcblxuU3RpY2t5U3RhdGUucHJvdG90eXBlLmFkZFJlc2l6ZUhhbmRsZXIgPSBmdW5jdGlvbigpIHtcbiAgaWYgKCF0aGlzLnJlc2l6ZUhhbmRsZXIpIHtcbiAgICB0aGlzLnJlc2l6ZUhhbmRsZXIgPSB0aGlzLm9uUmVzaXplLmJpbmQodGhpcyk7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHRoaXMucmVzaXplSGFuZGxlciwgZmFsc2UpO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdvcmllbnRhdGlvbmNoYW5nZScsIHRoaXMucmVzaXplSGFuZGxlciwgZmFsc2UpO1xuICB9XG59O1xuXG5TdGlja3lTdGF0ZS5wcm90b3R5cGUucmVtb3ZlUmVzaXplSGFuZGxlciA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5yZXNpemVIYW5kbGVyKSB7XG4gICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHRoaXMucmVzaXplSGFuZGxlcik7XG4gICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ29yaWVudGF0aW9uY2hhbmdlJywgdGhpcy5yZXNpemVIYW5kbGVyKTtcbiAgICB0aGlzLnJlc2l6ZUhhbmRsZXIgPSBudWxsO1xuICB9XG59O1xuXG5TdGlja3lTdGF0ZS5wcm90b3R5cGUub25TY3JvbGwgPSBmdW5jdGlvbihlKSB7XG4gIHRoaXMudXBkYXRlU3RpY2t5U3RhdGUoZmFsc2UpO1xuICBpZiAodGhpcy5oYXNPd25TY3JvbGxUYXJnZXQgJiYgIXRoaXMuY2FuU3RpY2t5KCkpIHtcbiAgICB0aGlzLnVwZGF0ZUZpeGVkT2Zmc2V0KCk7XG4gICAgaWYgKHRoaXMuc3RhdGUuc3RpY2t5ICYmICF0aGlzLmhhc1dpbmRvd1Njcm9sbExpc3RlbmVyKSB7XG4gICAgICB0aGlzLmhhc1dpbmRvd1Njcm9sbExpc3RlbmVyID0gdHJ1ZTtcbiAgICAgIEZhc3RTY3JvbGwuZ2V0SW5zdGFuY2Uod2luZG93KS5vbignc2Nyb2xsOnByb2dyZXNzJywgdGhpcy51cGRhdGVGaXhlZE9mZnNldCk7XG4gICAgfSBlbHNlIGlmICghdGhpcy5zdGF0ZS5zdGlja3kgJiYgdGhpcy5oYXNXaW5kb3dTY3JvbGxMaXN0ZW5lcikge1xuICAgICAgdGhpcy5oYXNXaW5kb3dTY3JvbGxMaXN0ZW5lciA9IGZhbHNlO1xuICAgICAgRmFzdFNjcm9sbC5nZXRJbnN0YW5jZSh3aW5kb3cpLm9mZignc2Nyb2xsOnByb2dyZXNzJywgdGhpcy51cGRhdGVGaXhlZE9mZnNldCk7XG4gICAgfVxuICB9XG59O1xuXG5cblN0aWNreVN0YXRlLnByb3RvdHlwZS5vblJlc2l6ZSA9IGZ1bmN0aW9uKGUpIHtcbiAgdGhpcy51cGRhdGVCb3VuZHModHJ1ZSk7XG4gIHRoaXMudXBkYXRlU3RpY2t5U3RhdGUoZmFsc2UpO1xufTtcblxuU3RpY2t5U3RhdGUucHJvdG90eXBlLmdldFN0aWNreVN0YXRlID0gZnVuY3Rpb24oKSB7XG5cbiAgaWYgKHRoaXMuc3RhdGUuZGlzYWJsZWQpIHtcbiAgICByZXR1cm4geyBzdGlja3k6IGZhbHNlLCBtYXJnaW5Ub3A6ICcnLCBtYXJnaW5Cb3R0b206ICcnIH07XG4gIH1cblxuICB2YXIgc2Nyb2xsWSA9IHRoaXMuZmFzdFNjcm9sbC5zY3JvbGxZO1xuICB2YXIgdG9wID0gdGhpcy5zdGF0ZS5zdHlsZS50b3A7XG4gIHZhciBib3R0b20gPSB0aGlzLnN0YXRlLnN0eWxlLmJvdHRvbTtcbiAgdmFyIG1hcmdpblRvcCA9IHRoaXMuc3RhdGUubWFyZ2luVG9wO1xuICB2YXIgbWFyZ2luQm90dG9tID0gdGhpcy5zdGF0ZS5tYXJnaW5Cb3R0b207XG4gIHZhciBzdGlja3kgPSB0aGlzLnN0YXRlLnN0aWNreTtcblxuXG4gIGlmICh0b3AgIT09IG51bGwpIHtcbiAgICB2YXIgb2Zmc2V0Qm90dG9tID0gdGhpcy5zdGF0ZS5yZXN0cmljdC5ib3R0b20gLSB0aGlzLnN0YXRlLmJvdW5kcy5oZWlnaHQgLSB0b3A7XG4gICAgdG9wID0gdGhpcy5zdGF0ZS5ib3VuZHMudG9wIC0gdG9wO1xuICAgIGlmICh0aGlzLnN0YXRlLnN0aWNreSA9PT0gZmFsc2UgJiYgc2Nyb2xsWSA+PSB0b3AgJiYgc2Nyb2xsWSA8PSBvZmZzZXRCb3R0b20pIHtcbiAgICAgIHN0aWNreSA9IHRydWU7XG4gICAgICBtYXJnaW5Ub3AgPSAnJztcbiAgICB9IGVsc2UgaWYgKHRoaXMuc3RhdGUuc3RpY2t5ICYmIChzY3JvbGxZIDwgdG9wIHx8IHNjcm9sbFkgPiBvZmZzZXRCb3R0b20pKSB7XG4gICAgICBzdGlja3kgPSBmYWxzZTtcblxuICAgICAgaWYgKHNjcm9sbFkgPiBvZmZzZXRCb3R0b20gJiYgdGhpcy5zdGF0ZS5tYXJnaW5Ub3AgPT09ICcnKSB7XG4gICAgICAgIG1hcmdpblRvcCA9ICh0aGlzLnN0YXRlLnJlc3RyaWN0LmhlaWdodCAtIHRoaXMuc3RhdGUucmVzdHJpY3QudG9wIC0gdGhpcy5zdGF0ZS5zdHlsZS50b3AgLSB0aGlzLnN0YXRlLmJvdW5kcy5oZWlnaHQgKzIgKSArICdweCc7XG4gICAgICB9XG4gICAgfVxuICB9IGVsc2UgaWYgKGJvdHRvbSAhPT0gbnVsbCkge1xuXG4gICAgc2Nyb2xsWSArPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG4gICAgdmFyIG9mZnNldFRvcCA9IHRoaXMuc3RhdGUucmVzdHJpY3QudG9wICsgdGhpcy5zdGF0ZS5ib3VuZHMuaGVpZ2h0IC0gYm90dG9tO1xuICAgIGJvdHRvbSA9IHRoaXMuc3RhdGUuYm91bmRzLmJvdHRvbSArIGJvdHRvbTtcblxuICAgIGlmICh0aGlzLnN0YXRlLnN0aWNreSA9PT0gZmFsc2UgJiYgc2Nyb2xsWSA8PSBib3R0b20gJiYgc2Nyb2xsWSA+PSBvZmZzZXRUb3ApIHtcbiAgICAgIHN0aWNreSA9IHRydWU7XG4gICAgICBtYXJnaW5Cb3R0b20gPSAnJztcbiAgICB9IGVsc2UgaWYgKHRoaXMuc3RhdGUuc3RpY2t5ICYmIChzY3JvbGxZID4gYm90dG9tIHx8IHNjcm9sbFkgPCBvZmZzZXRUb3ApKSB7XG4gICAgICBzdGlja3kgPSBmYWxzZTtcbiAgICAgIGlmIChzY3JvbGxZIDwgb2Zmc2V0VG9wICYmIHRoaXMuc3RhdGUubWFyZ2luQm90dG9tID09PSAnJykge1xuICAgICAgICBtYXJnaW5Cb3R0b20gPSAodGhpcy5zdGF0ZS5yZXN0cmljdC5oZWlnaHQgLSB0aGlzLnN0YXRlLmJvdW5kcy5oZWlnaHQgKiAyICsgMikgKyAncHgnO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4geyBzdGlja3k6IHN0aWNreSwgbWFyZ2luVG9wOiBtYXJnaW5Ub3AsIG1hcmdpbkJvdHRvbTogbWFyZ2luQm90dG9tIH07XG59O1xuXG5TdGlja3lTdGF0ZS5wcm90b3R5cGUudXBkYXRlU3RpY2t5U3RhdGUgPSBmdW5jdGlvbihzaWxlbnQpIHtcbiAgdmFyIHN0YXRlID0gdGhpcy5nZXRTdGlja3lTdGF0ZSgpO1xuICBpZiAoc3RhdGUuc3RpY2t5ICE9PSB0aGlzLnN0YXRlLnN0aWNreSkge1xuICAgIHNpbGVudCA9IHNpbGVudCA9PT0gdHJ1ZTtcbiAgICB2YXIgYm91bmRzID0gdGhpcy5nZXRCb3VuZHMoKTtcbiAgICBib3VuZHMuc3RpY2t5ID0gc3RhdGUuc3RpY2t5O1xuICAgIGJvdW5kcy5tYXJnaW5Ub3AgPSBzdGF0ZS5tYXJnaW5Ub3A7XG4gICAgYm91bmRzLm1hcmdpbkJvdHRvbSA9IHN0YXRlLm1hcmdpbkJvdHRvbTtcbiAgICB0aGlzLnNldFN0YXRlKGJvdW5kcywgc2lsZW50KTtcbiAgfVxufTtcblxuU3RpY2t5U3RhdGUucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uKCkge1xuXG4gIGlmICh0aGlzLmZpcnN0UmVuZGVyKSB7XG4gICAgdGhpcy5maXJzdFJlbmRlciA9IGZhbHNlO1xuXG4gICAgaWYgKCF0aGlzLmNhblN0aWNreSgpKSB7XG4gICAgICB0aGlzLndyYXBwZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgIHRoaXMud3JhcHBlci5jbGFzc05hbWUgPSAnc3RpY2t5LXdyYXAnO1xuICAgICAgdmFyIHBhcmVudCA9IHRoaXMuZWwucGFyZW50Tm9kZTtcbiAgICAgIGlmIChwYXJlbnQpIHtcbiAgICAgICAgcGFyZW50Lmluc2VydEJlZm9yZSh0aGlzLndyYXBwZXIsIHRoaXMuZWwpO1xuICAgICAgfVxuICAgICAgdGhpcy53cmFwcGVyLmFwcGVuZENoaWxkKHRoaXMuZWwpO1xuICAgICAgdGhpcy5lbC5jbGFzc05hbWUgKz0gJyBzdGlja3ktZml4ZWQnO1xuICAgICAgdGhpcy5jaGlsZCA9IHRoaXMud3JhcHBlcjtcbiAgICB9XG5cbiAgICB0aGlzLnVwZGF0ZUJvdW5kcyh0cnVlKTtcbiAgICB0aGlzLnVwZGF0ZVN0aWNreVN0YXRlKHRydWUpO1xuICB9XG5cblxuICB2YXIgY2xhc3NOYW1lID0gdGhpcy5lbC5jbGFzc05hbWU7XG5cbiAgaWYgKCF0aGlzLmNhblN0aWNreSgpKSB7XG4gICAgdmFyIGhlaWdodCA9ICh0aGlzLnN0YXRlLmRpc2FibGVkIHx8ICghdGhpcy5zdGF0ZS5zdGlja3kgfHwgdGhpcy5zdGF0ZS5ib3VuZHMuaGVpZ2h0ID09PSBudWxsKSkgPyAnYXV0bycgOiB0aGlzLnN0YXRlLmJvdW5kcy5oZWlnaHQgKyAncHgnO1xuICAgIHRoaXMud3JhcHBlci5zdHlsZS5oZWlnaHQgPSBoZWlnaHQ7XG5cbiAgICBpZiAodGhpcy5oYXNPd25TY3JvbGxUYXJnZXQgJiYgdGhpcy5sYXN0U3RhdGUuZml4ZWRPZmZzZXQgIT09IHRoaXMuc3RhdGUuZml4ZWRPZmZzZXQpIHtcbiAgICAgIHRoaXMuZWwuc3R5bGUubWFyZ2luVG9wID0gdGhpcy5zdGF0ZS5maXhlZE9mZnNldDtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5zdGF0ZS5tYXJnaW5Ub3AgIT09IHRoaXMubGFzdFN0YXRlLm1hcmdpblRvcCB8fCB0aGlzLnN0YXRlLm1hcmdpbkJvdHRvbSAhPT0gdGhpcy5sYXN0U3RhdGUubWFyZ2luQm90dG9tKSB7XG4gICAgICB2YXIgaGFzQWJzb2x1dGVDbGFzcyA9IGNsYXNzTmFtZS5pbmRleE9mKCdpcy1hYnNvbHV0ZScpID4gLTE7XG4gICAgICBpZiAoIWhhc0Fic29sdXRlQ2xhc3MgJiYgKHRoaXMuc3RhdGUubWFyZ2luVG9wICE9PSAnJyB8fCB0aGlzLnN0YXRlLm1hcmdpbkJvdHRvbSAhPT0gJycgKSkge1xuICAgICAgICBjbGFzc05hbWUgKz0gJyBpcy1hYnNvbHV0ZSc7XG4gICAgICAgIHRoaXMud3JhcHBlci5zdHlsZS5wb3NpdGlvbiA9ICdyZWxhdGl2ZSc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjbGFzc05hbWUgPSBjbGFzc05hbWUuc3BsaXQoJyBpcy1hYnNvbHV0ZScpLmpvaW4oJycpO1xuICAgICAgICB0aGlzLndyYXBwZXIuc3R5bGUucG9zaXRpb24gPSAnJztcbiAgICAgIH1cbiAgICAgIHRoaXMuZWwuc3R5bGUubWFyZ2luVG9wID0gdGhpcy5zdGF0ZS5tYXJnaW5Ub3A7XG4gICAgICB0aGlzLmVsLnN0eWxlLm1hcmdpbkJvdHRvbSA9IHRoaXMuc3RhdGUubWFyZ2luQm90dG9tO1xuICAgIH1cblxuICB9XG5cbiAgdmFyIGhhc1N0YXRlQ2xhc3MgPSBjbGFzc05hbWUuaW5kZXhPZih0aGlzLm9wdGlvbnMuc3RhdGVDbGFzc05hbWUpID4gLTE7XG4gIGlmICh0aGlzLnN0YXRlLnN0aWNreSAmJiAhaGFzU3RhdGVDbGFzcykge1xuICAgIGNsYXNzTmFtZSArPSAoJyAnICsgdGhpcy5vcHRpb25zLnN0YXRlQ2xhc3NOYW1lKTtcbiAgfSBlbHNlIGlmICghdGhpcy5zdGF0ZS5zdGlja3kgJiYgaGFzU3RhdGVDbGFzcykge1xuICAgIGNsYXNzTmFtZSA9IGNsYXNzTmFtZS5zcGxpdCgoJyAnICsgdGhpcy5vcHRpb25zLnN0YXRlQ2xhc3NOYW1lKSkuam9pbignJyk7XG4gIH1cblxuICBpZiAodGhpcy5lbC5jbGFzc05hbWUgIT09IGNsYXNzTmFtZSkge1xuICAgIHRoaXMuZWwuY2xhc3NOYW1lID0gY2xhc3NOYW1lO1xuICB9XG5cbiAgcmV0dXJuIHRoaXMuZWw7XG59O1xuXG5cblN0aWNreVN0YXRlLm5hdGl2ZSA9IGZ1bmN0aW9uKCkge1xuICBpZiAoX2dsb2JhbHMuZmVhdHVyZVRlc3RlZCkge1xuICAgIHJldHVybiBfZ2xvYmFscy5jYW5TdGlja3k7XG4gIH1cbiAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG5cbiAgICBfZ2xvYmFscy5mZWF0dXJlVGVzdGVkID0gdHJ1ZTtcblxuICAgIGlmICh3aW5kb3cuTW9kZXJuaXpyICYmIHdpbmRvdy5Nb2Rlcm5penIuaGFzT3duUHJvcGVydHkoJ2Nzc3Bvc2l0aW9uc3RpY2t5JykpIHtcbiAgICAgIHJldHVybiBfZ2xvYmFscy5jYW5TdGlja3kgPSB3aW5kb3cuTW9kZXJuaXpyLmNzc3Bvc2l0aW9uc3RpY2t5O1xuICAgIH1cblxuICAgIHZhciB0ZXN0RWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuYXBwZW5kQ2hpbGQodGVzdEVsKTtcbiAgICB2YXIgcHJlZml4ZWRTdGlja3kgPSBbJ3N0aWNreScsICctd2Via2l0LXN0aWNreScsICctbW96LXN0aWNreScsICctbXMtc3RpY2t5JywgJy1vLXN0aWNreSddO1xuXG4gICAgX2dsb2JhbHMuY2FuU3RpY2t5ID0gZmFsc2U7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHByZWZpeGVkU3RpY2t5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICB0ZXN0RWwuc3R5bGUucG9zaXRpb24gPSBwcmVmaXhlZFN0aWNreVtpXTtcbiAgICAgIF9nbG9iYWxzLmNhblN0aWNreSA9ICEhd2luZG93LmdldENvbXB1dGVkU3R5bGUodGVzdEVsKS5wb3NpdGlvbi5tYXRjaCgnc3RpY2t5Jyk7XG4gICAgICBpZiAoX2dsb2JhbHMuY2FuU3RpY2t5KSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQucmVtb3ZlQ2hpbGQodGVzdEVsKTtcbiAgfVxuICByZXR1cm4gX2dsb2JhbHMuY2FuU3RpY2t5O1xufTtcblxuU3RpY2t5U3RhdGUuYXBwbHkgPSBmdW5jdGlvbihlbGVtZW50cykge1xuICBpZiAoZWxlbWVudHMpIHtcbiAgICBpZiAoZWxlbWVudHMubGVuZ3RoKSB7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGVsZW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG5ldyBTdGlja3lTdGF0ZShlbGVtZW50c1tpXSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIG5ldyBTdGlja3lTdGF0ZShlbGVtZW50cyk7XG4gICAgfVxuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFN0aWNreVN0YXRlO1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTQgU8O2bmtlIEtsdXRoXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weSBvZlxuICogdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpblxuICogdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0b1xuICogdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2ZcbiAqIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbyxcbiAqIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluIGFsbFxuICogY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTU1xuICogRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SXG4gKiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVJcbiAqIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOXG4gKiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuICoqL1xuXG4oZnVuY3Rpb24oZXhwb3J0cykge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgdmFyIGRlbGVnYXRlID0gZnVuY3Rpb24odGFyZ2V0LCBoYW5kbGVyKSB7XG4gICAgICAgIC8vIEdldCBhbnkgZXh0cmEgYXJndW1lbnRzIGZvciBoYW5kbGVyXG4gICAgICAgIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpO1xuXG4gICAgICAgIC8vIENyZWF0ZSBkZWxlZ2F0ZSBmdW5jdGlvblxuICAgICAgICB2YXIgZm4gPSBmdW5jdGlvbigpIHtcblxuICAgICAgICAgICAgLy8gQ2FsbCBoYW5kbGVyIHdpdGggYXJndW1lbnRzXG4gICAgICAgICAgICByZXR1cm4gaGFuZGxlci5hcHBseSh0YXJnZXQsIGFyZ3MpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFJldHVybiB0aGUgZGVsZWdhdGUgZnVuY3Rpb24uXG4gICAgICAgIHJldHVybiBmbjtcbiAgICB9O1xuXG5cbiAgICAodHlwZW9mIG1vZHVsZSAhPSBcInVuZGVmaW5lZFwiICYmIG1vZHVsZS5leHBvcnRzKSA/IChtb2R1bGUuZXhwb3J0cyA9IGRlbGVnYXRlKSA6ICh0eXBlb2YgZGVmaW5lICE9IFwidW5kZWZpbmVkXCIgPyAoZGVmaW5lKGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gZGVsZWdhdGU7XG4gICAgfSkpIDogKGV4cG9ydHMuZGVsZWdhdGUgPSBkZWxlZ2F0ZSkpO1xuXG59KSh0aGlzKTtcbiIsIiAndXNlIHN0cmljdCc7XG5cbiBmdW5jdGlvbiBpc0VtcHR5KG9iaikge1xuICAgZm9yICh2YXIgcHJvcCBpbiBvYmopIHtcbiAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShwcm9wKSl7XG4gICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICB9XG4gICB9XG4gICByZXR1cm4gdHJ1ZTtcbiB9XG5cbnZhciBfaW5zdGFuY2VNYXAgPSB7fTtcblxuIHZhciBFdmVudERpc3BhdGNoZXIgPSBmdW5jdGlvbigpIHtcbiAgIHRoaXMuX2V2ZW50TWFwID0ge307XG4gICB0aGlzLl9kZXN0cm95ZWQgPSBmYWxzZTtcbiB9O1xuXG4gRXZlbnREaXNwYXRjaGVyLmdldEluc3RhbmNlID0gZnVuY3Rpb24oa2V5KXtcbiAgaWYoIWtleSl7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdrZXkgbXVzdCBiZScpO1xuICB9XG4gIHJldHVybiBfaW5zdGFuY2VNYXBba2V5XSB8fCAoX2luc3RhbmNlTWFwW2tleV0gPSAgbmV3IEV2ZW50RGlzcGF0Y2hlcigpKTtcbiB9O1xuXG5cbiBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24oZXZlbnQsIGxpc3RlbmVyKSB7XG4gICB2YXIgbGlzdGVuZXJzID0gdGhpcy5nZXRMaXN0ZW5lcihldmVudCk7XG4gICBpZiAoIWxpc3RlbmVycykge1xuICAgICB0aGlzLl9ldmVudE1hcFtldmVudF0gPSBbbGlzdGVuZXJdO1xuICAgICByZXR1cm4gdHJ1ZTtcbiAgIH1cblxuICAgaWYgKGxpc3RlbmVycy5pbmRleE9mKGxpc3RlbmVyKSA9PT0gLTEpIHtcbiAgICAgbGlzdGVuZXJzLnB1c2gobGlzdGVuZXIpO1xuICAgICByZXR1cm4gdHJ1ZTtcbiAgIH1cbiAgIHJldHVybiBmYWxzZTtcbiB9O1xuXG4gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lck9uY2UgPSBmdW5jdGlvbihldmVudCwgbGlzdGVuZXIpIHtcbiAgIHZhciBzID0gdGhpcztcbiAgIHZhciBmMiA9IGZ1bmN0aW9uKCkge1xuICAgICBzLnJlbW92ZUxpc3RlbmVyKGV2ZW50LCBmMik7XG4gICAgIHJldHVybiBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgfTtcbiAgIHJldHVybiB0aGlzLmFkZExpc3RlbmVyKGV2ZW50LCBmMik7XG4gfTtcblxuIEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbihldmVudCwgbGlzdGVuZXIpIHtcblxuICBpZih0eXBlb2YgbGlzdGVuZXIgPT09ICd1bmRlZmluZWQnKXtcbiAgICByZXR1cm4gdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcihldmVudCk7XG4gIH1cblxuICAgdmFyIGxpc3RlbmVycyA9IHRoaXMuZ2V0TGlzdGVuZXIoZXZlbnQpO1xuICAgaWYgKGxpc3RlbmVycykge1xuICAgICB2YXIgaSA9IGxpc3RlbmVycy5pbmRleE9mKGxpc3RlbmVyKTtcbiAgICAgaWYgKGkgPiAtMSkge1xuICAgICAgIGxpc3RlbmVycyA9IGxpc3RlbmVycy5zcGxpY2UoaSwgMSk7XG4gICAgICAgaWYgKCFsaXN0ZW5lcnMubGVuZ3RoKSB7XG4gICAgICAgICBkZWxldGUodGhpcy5fZXZlbnRNYXBbZXZlbnRdKTtcbiAgICAgICB9XG4gICAgICAgcmV0dXJuIHRydWU7XG4gICAgIH1cbiAgIH1cbiAgIHJldHVybiBmYWxzZTtcbiB9O1xuXG4gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lciA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICB2YXIgbGlzdGVuZXJzID0gdGhpcy5nZXRMaXN0ZW5lcihldmVudCk7XG4gICBpZiAobGlzdGVuZXJzKSB7XG4gICAgIHRoaXMuX2V2ZW50TWFwW2V2ZW50XS5sZW5ndGggPSAwO1xuICAgICBkZWxldGUodGhpcy5fZXZlbnRNYXBbZXZlbnRdKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgIH1cbiAgIHJldHVybiBmYWxzZTtcbiB9O1xuXG4gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5oYXNMaXN0ZW5lciA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICByZXR1cm4gdGhpcy5nZXRMaXN0ZW5lcihldmVudCkgIT09IG51bGw7XG4gfTtcblxuIEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUuaGFzTGlzdGVuZXJzID0gZnVuY3Rpb24oKSB7XG4gICByZXR1cm4gKHRoaXMuX2V2ZW50TWFwICE9PSBudWxsICYmIHRoaXMuX2V2ZW50TWFwICE9PSB1bmRlZmluZWQgJiYgIWlzRW1wdHkodGhpcy5fZXZlbnRNYXApKTtcbiB9O1xuXG4gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5kaXNwYXRjaCA9IGZ1bmN0aW9uKGV2ZW50VHlwZSwgZXZlbnRPYmplY3QpIHtcbiAgIHZhciBsaXN0ZW5lcnMgPSB0aGlzLmdldExpc3RlbmVyKGV2ZW50VHlwZSk7XG5cbiAgIGlmIChsaXN0ZW5lcnMpIHtcbiAgICAgZXZlbnRPYmplY3QgPSBldmVudE9iamVjdCB8fCB7fTtcbiAgICAgZXZlbnRPYmplY3QudHlwZSA9IGV2ZW50VHlwZTtcbiAgICAgZXZlbnRPYmplY3QudGFyZ2V0ID0gZXZlbnRPYmplY3QudGFyZ2V0IHx8IHRoaXM7XG5cbiAgICAgdmFyIGkgPSAtMTtcbiAgICAgd2hpbGUgKCsraSA8IGxpc3RlbmVycy5sZW5ndGgpIHtcbiAgICAgICBsaXN0ZW5lcnNbaV0oZXZlbnRPYmplY3QpO1xuICAgICB9XG4gICAgIHJldHVybiB0cnVlO1xuICAgfVxuICAgcmV0dXJuIGZhbHNlO1xuIH07XG5cbiBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLmdldExpc3RlbmVyID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgIHZhciByZXN1bHQgPSB0aGlzLl9ldmVudE1hcCA/IHRoaXMuX2V2ZW50TWFwW2V2ZW50XSA6IG51bGw7XG4gICByZXR1cm4gKHJlc3VsdCB8fCBudWxsKTtcbiB9O1xuXG4gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24oKSB7XG4gICBpZiAodGhpcy5fZXZlbnRNYXApIHtcbiAgICAgZm9yICh2YXIgaSBpbiB0aGlzLl9ldmVudE1hcCkge1xuICAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXIoaSk7XG4gICAgIH1cbiAgICAgdGhpcy5fZXZlbnRNYXAgPSBudWxsO1xuICAgfVxuICAgdGhpcy5fZGVzdHJveWVkID0gdHJ1ZTtcbiB9O1xuXG5cbiAvL01ldGhvZCBNYXBcbiBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLm9uID0gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5iaW5kID0gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5hZGRFdmVudExpc3RlbmVyID0gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcbiBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLm9mZiA9IEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUudW5iaW5kID0gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5yZW1vdmVFdmVudExpc3RlbmVyID0gRXZlbnREaXNwYXRjaGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lcjtcbiBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLm9uY2UgPSBFdmVudERpc3BhdGNoZXIucHJvdG90eXBlLm9uZSA9IEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUuYWRkTGlzdGVuZXJPbmNlO1xuIEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUudHJpZ2dlciA9IEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUuZGlzcGF0Y2hFdmVudCA9IEV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUuZGlzcGF0Y2g7XG5cbiBtb2R1bGUuZXhwb3J0cyA9IEV2ZW50RGlzcGF0Y2hlcjtcbiIsIid1c2Ugc3RyaWN0JztcblxuLypcbiAqIEZhc3RTY3JvbGxcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9zb2Vua2VrbHV0aC9mYXN0c2Nyb2xsXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE0IFPDtm5rZSBLbHV0aFxuICogTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlLlxuICovXG5cbnZhciBkZWxlZ2F0ZSA9IHJlcXVpcmUoJ2RlbGVnYXRlanMnKTtcbnZhciBFdmVudERpc3BhdGNoZXIgPSByZXF1aXJlKCdldmVudGRpc3BhdGNoZXInKTtcbnZhciBfaW5zdGFuY2VNYXAgPSB7fTtcblxudmFyIEZhc3RTY3JvbGwgPSBmdW5jdGlvbihzY3JvbGxUYXJnZXQsIG9wdGlvbnMpIHtcbiAgc2Nyb2xsVGFyZ2V0ID0gc2Nyb2xsVGFyZ2V0IHx8IHdpbmRvdztcbiAgdGhpcy5vcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgaWYgKCF0aGlzLm9wdGlvbnMuaGFzT3duUHJvcGVydHkoJ2FuaW1hdGlvbkZyYW1lJykpIHtcbiAgICB0aGlzLm9wdGlvbnMuYW5pbWF0aW9uRnJhbWUgPSB0cnVlO1xuICB9XG5cbiAgaWYodHlwZW9mIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgIT09ICdmdW5jdGlvbicpIHtcbiAgICB0aGlzLm9wdGlvbnMuYW5pbWF0aW9uRnJhbWUgPSBmYWxzZTtcbiAgfVxuXG4gIHRoaXMuc2Nyb2xsVGFyZ2V0ID0gc2Nyb2xsVGFyZ2V0O1xuICB0aGlzLmluaXQoKTtcbn07XG5cbkZhc3RTY3JvbGwuX19faW5zdGFuY2VNYXAgPSBfaW5zdGFuY2VNYXA7XG5cbkZhc3RTY3JvbGwuZ2V0SW5zdGFuY2UgPSBmdW5jdGlvbihzY3JvbGxUYXJnZXQsIG9wdGlvbnMpIHtcbiAgc2Nyb2xsVGFyZ2V0ID0gc2Nyb2xsVGFyZ2V0IHx8IHdpbmRvdztcbiAgcmV0dXJuIF9pbnN0YW5jZU1hcFtzY3JvbGxUYXJnZXRdIHx8IChfaW5zdGFuY2VNYXBbc2Nyb2xsVGFyZ2V0XSA9IG5ldyBGYXN0U2Nyb2xsKHNjcm9sbFRhcmdldCwgb3B0aW9ucykpO1xufTtcblxuRmFzdFNjcm9sbC5oYXNJbnN0YW5jZSA9IGZ1bmN0aW9uKHNjcm9sbFRhcmdldCkge1xuICByZXR1cm4gX2luc3RhbmNlTWFwW3Njcm9sbFRhcmdldF0gIT09IHVuZGVmaW5lZDtcbn07XG5cblxuRmFzdFNjcm9sbC5oYXNTY3JvbGxUYXJnZXQgPSBGYXN0U2Nyb2xsLmhhc0luc3RhbmNlO1xuXG5GYXN0U2Nyb2xsLmNsZWFySW5zdGFuY2UgPSBmdW5jdGlvbihzY3JvbGxUYXJnZXQpIHtcbiAgc2Nyb2xsVGFyZ2V0ID0gc2Nyb2xsVGFyZ2V0IHx8IHdpbmRvdztcbiAgaWYgKEZhc3RTY3JvbGwuaGFzSW5zdGFuY2Uoc2Nyb2xsVGFyZ2V0KSkge1xuICAgIEZhc3RTY3JvbGwuZ2V0SW5zdGFuY2Uoc2Nyb2xsVGFyZ2V0KS5kZXN0cm95KCk7XG4gICAgZGVsZXRlKF9pbnN0YW5jZU1hcFtzY3JvbGxUYXJnZXRdKTtcbiAgfVxufTtcblxuRmFzdFNjcm9sbC5VUCA9ICd1cCc7XG5GYXN0U2Nyb2xsLkRPV04gPSAnZG93bic7XG5GYXN0U2Nyb2xsLk5PTkUgPSAnbm9uZSc7XG5GYXN0U2Nyb2xsLkxFRlQgPSAnbGVmdCc7XG5GYXN0U2Nyb2xsLlJJR0hUID0gJ3JpZ2h0JztcblxuRmFzdFNjcm9sbC5wcm90b3R5cGUgPSB7XG5cbiAgZGVzdHJveWVkOiBmYWxzZSxcbiAgc2Nyb2xsWTogMCxcbiAgc2Nyb2xsWDogMCxcbiAgbGFzdFNjcm9sbFk6IDAsXG4gIGxhc3RTY3JvbGxYOiAwLFxuICB0aW1lb3V0OiAwLFxuICBzcGVlZFk6IDAsXG4gIHNwZWVkWDogMCxcbiAgc3RvcEZyYW1lczogNSxcbiAgY3VycmVudFN0b3BGcmFtZXM6IDAsXG4gIGZpcnN0UmVuZGVyOiB0cnVlLFxuICBhbmltYXRpb25GcmFtZTogdHJ1ZSxcbiAgbGFzdEV2ZW50OiB7XG4gICAgdHlwZTogbnVsbCxcbiAgICBzY3JvbGxZOiAwLFxuICAgIHNjcm9sbFg6IDBcbiAgfSxcblxuICBzY3JvbGxpbmc6IGZhbHNlLFxuXG4gIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuZGlzcGF0Y2hlciA9IG5ldyBFdmVudERpc3BhdGNoZXIoKTtcbiAgICB0aGlzLnVwZGF0ZVNjcm9sbFBvc2l0aW9uID0gKHRoaXMuc2Nyb2xsVGFyZ2V0ID09PSB3aW5kb3cpID8gZGVsZWdhdGUodGhpcywgdGhpcy51cGRhdGVXaW5kb3dTY3JvbGxQb3NpdGlvbikgOiBkZWxlZ2F0ZSh0aGlzLCB0aGlzLnVwZGF0ZUVsZW1lbnRTY3JvbGxQb3NpdGlvbik7XG4gICAgdGhpcy51cGRhdGVTY3JvbGxQb3NpdGlvbigpO1xuICAgIHRoaXMudHJpZ2dlciA9IHRoaXMuZGlzcGF0Y2hFdmVudDtcbiAgICB0aGlzLmxhc3RFdmVudC5zY3JvbGxZID0gdGhpcy5zY3JvbGxZO1xuICAgIHRoaXMubGFzdEV2ZW50LnNjcm9sbFggPSB0aGlzLnNjcm9sbFg7XG4gICAgdGhpcy5vblNjcm9sbCA9IGRlbGVnYXRlKHRoaXMsIHRoaXMub25TY3JvbGwpO1xuICAgIHRoaXMub25OZXh0RnJhbWUgPSBkZWxlZ2F0ZSh0aGlzLCB0aGlzLm9uTmV4dEZyYW1lKTtcbiAgICBpZiAodGhpcy5zY3JvbGxUYXJnZXQuYWRkRXZlbnRMaXN0ZW5lcikge1xuICAgICAgdGhpcy5zY3JvbGxUYXJnZXQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V3aGVlbCcsIHRoaXMub25TY3JvbGwsIGZhbHNlKTtcbiAgICAgIHRoaXMuc2Nyb2xsVGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIoJ3Njcm9sbCcsIHRoaXMub25TY3JvbGwsIGZhbHNlKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuc2Nyb2xsVGFyZ2V0LmF0dGFjaEV2ZW50KSB7XG4gICAgICB0aGlzLnNjcm9sbFRhcmdldC5hdHRhY2hFdmVudCgnb25tb3VzZXdoZWVsJywgdGhpcy5vblNjcm9sbCk7XG4gICAgICB0aGlzLnNjcm9sbFRhcmdldC5hdHRhY2hFdmVudCgnc2Nyb2xsJywgdGhpcy5vblNjcm9sbCk7XG4gICAgfVxuICB9LFxuXG4gIGRlc3Ryb3k6IGZ1bmN0aW9uKCkge1xuICAgIGlmICghdGhpcy5kZXN0cm95ZWQpIHtcbiAgICAgIHRoaXMuY2FuY2VsTmV4dEZyYW1lKCk7XG4gICAgICBpZiAodGhpcy5zY3JvbGxUYXJnZXQuYWRkRXZlbnRMaXN0ZW5lcikge1xuICAgICAgICB0aGlzLnNjcm9sbFRhcmdldC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZXdoZWVsJywgdGhpcy5vblNjcm9sbCk7XG4gICAgICAgIHRoaXMuc2Nyb2xsVGFyZ2V0LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Njcm9sbCcsIHRoaXMub25TY3JvbGwpO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLnNjcm9sbFRhcmdldC5hdHRhY2hFdmVudCkge1xuICAgICAgICB0aGlzLnNjcm9sbFRhcmdldC5kZXRhY2hFdmVudCgnb25tb3VzZXdoZWVsJywgdGhpcy5vblNjcm9sbCk7XG4gICAgICAgIHRoaXMuc2Nyb2xsVGFyZ2V0LmRldGFjaEV2ZW50KCdzY3JvbGwnLCB0aGlzLm9uU2Nyb2xsKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuZGlzcGF0Y2hlci5vZmYoKTtcbiAgICAgIHRoaXMuZGlzcGF0Y2hlciA9IG51bGw7XG4gICAgICB0aGlzLm9uU2Nyb2xsID0gbnVsbDtcbiAgICAgIHRoaXMudXBkYXRlU2Nyb2xsUG9zaXRpb24gPSBudWxsO1xuICAgICAgdGhpcy5vbk5leHRGcmFtZSA9IG51bGw7XG4gICAgICB0aGlzLnNjcm9sbFRhcmdldCA9IG51bGw7XG4gICAgICB0aGlzLmRlc3Ryb3llZCA9IHRydWU7XG4gICAgfVxuICB9LFxuXG4gIGdldEF0dHJpYnV0ZXM6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB7XG4gICAgICBzY3JvbGxZOiB0aGlzLnNjcm9sbFksXG4gICAgICBzY3JvbGxYOiB0aGlzLnNjcm9sbFgsXG4gICAgICBzcGVlZFk6IHRoaXMuc3BlZWRZLFxuICAgICAgc3BlZWRYOiB0aGlzLnNwZWVkWCxcbiAgICAgIGFuZ2xlOiAwLFxuICAgICAgZGlyZWN0aW9uWTogdGhpcy5zcGVlZFkgPT09IDAgPyBGYXN0U2Nyb2xsLk5PTkUgOiAoKHRoaXMuc3BlZWRZID4gMCkgPyBGYXN0U2Nyb2xsLlVQIDogRmFzdFNjcm9sbC5ET1dOKSxcbiAgICAgIGRpcmVjdGlvblg6IHRoaXMuc3BlZWRYID09PSAwID8gRmFzdFNjcm9sbC5OT05FIDogKCh0aGlzLnNwZWVkWCA+IDApID8gRmFzdFNjcm9sbC5SSUdIVCA6IEZhc3RTY3JvbGwuTEVGVClcbiAgICB9O1xuICB9LFxuXG4gIHVwZGF0ZVdpbmRvd1Njcm9sbFBvc2l0aW9uOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnNjcm9sbFkgPSB3aW5kb3cuc2Nyb2xsWSB8fCB3aW5kb3cucGFnZVlPZmZzZXQgfHwgMDtcbiAgICB0aGlzLnNjcm9sbFggPSB3aW5kb3cuc2Nyb2xsWCB8fCB3aW5kb3cucGFnZVhPZmZzZXQgfHwgMDtcbiAgfSxcblxuICB1cGRhdGVFbGVtZW50U2Nyb2xsUG9zaXRpb246IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc2Nyb2xsWSA9IHRoaXMuc2Nyb2xsVGFyZ2V0LnNjcm9sbFRvcDtcbiAgICB0aGlzLnNjcm9sbFggPSB0aGlzLnNjcm9sbFRhcmdldC5zY3JvbGxMZWZ0O1xuICB9LFxuXG4gIG9uU2Nyb2xsOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmN1cnJlbnRTdG9wRnJhbWVzID0gMDtcbiAgICBpZiAodGhpcy5maXJzdFJlbmRlcikge1xuICAgICAgdGhpcy5maXJzdFJlbmRlciA9IGZhbHNlO1xuICAgICAgaWYgKHRoaXMuc2Nyb2xsWSA+IDEpIHtcbiAgICAgICAgdGhpcy51cGRhdGVTY3JvbGxQb3NpdGlvbigpO1xuICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQoJ3Njcm9sbDpwcm9ncmVzcycpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLnNjcm9sbGluZykge1xuICAgICAgdGhpcy5zY3JvbGxpbmcgPSB0cnVlO1xuICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KCdzY3JvbGw6c3RhcnQnKTtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuYW5pbWF0aW9uRnJhbWUpIHtcbiAgICAgICAgdGhpcy5uZXh0RnJhbWVJRCA9IHJlcXVlc3RBbmltYXRpb25GcmFtZSh0aGlzLm9uTmV4dEZyYW1lKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCF0aGlzLm9wdGlvbnMuYW5pbWF0aW9uRnJhbWUpIHtcbiAgICAgIGNsZWFyVGltZW91dCh0aGlzLnRpbWVvdXQpO1xuICAgICAgdGhpcy5vbk5leHRGcmFtZSgpO1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdGhpcy50aW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgc2VsZi5vblNjcm9sbFN0b3AoKTtcbiAgICAgIH0sIDEwMCk7XG4gICAgfVxuICB9LFxuXG4gIG9uTmV4dEZyYW1lOiBmdW5jdGlvbigpIHtcblxuICAgIHRoaXMudXBkYXRlU2Nyb2xsUG9zaXRpb24oKTtcblxuICAgIHRoaXMuc3BlZWRZID0gdGhpcy5sYXN0U2Nyb2xsWSAtIHRoaXMuc2Nyb2xsWTtcbiAgICB0aGlzLnNwZWVkWCA9IHRoaXMubGFzdFNjcm9sbFggLSB0aGlzLnNjcm9sbFg7XG5cbiAgICB0aGlzLmxhc3RTY3JvbGxZID0gdGhpcy5zY3JvbGxZO1xuICAgIHRoaXMubGFzdFNjcm9sbFggPSB0aGlzLnNjcm9sbFg7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmFuaW1hdGlvbkZyYW1lICYmICh0aGlzLnNjcm9sbGluZyAmJiB0aGlzLnNwZWVkWSA9PT0gMCAmJiAodGhpcy5jdXJyZW50U3RvcEZyYW1lcysrID4gdGhpcy5zdG9wRnJhbWVzKSkpIHtcbiAgICAgIHRoaXMub25TY3JvbGxTdG9wKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KCdzY3JvbGw6cHJvZ3Jlc3MnKTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuYW5pbWF0aW9uRnJhbWUpIHtcbiAgICAgIHRoaXMubmV4dEZyYW1lSUQgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUodGhpcy5vbk5leHRGcmFtZSk7XG4gICAgfVxuICB9LFxuXG4gIG9uU2Nyb2xsU3RvcDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zY3JvbGxpbmcgPSBmYWxzZTtcbiAgICBpZiAodGhpcy5vcHRpb25zLmFuaW1hdGlvbkZyYW1lKSB7XG4gICAgICB0aGlzLmNhbmNlbE5leHRGcmFtZSgpO1xuICAgICAgdGhpcy5jdXJyZW50U3RvcEZyYW1lcyA9IDA7XG4gICAgfVxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudCgnc2Nyb2xsOnN0b3AnKTtcbiAgfSxcblxuICBjYW5jZWxOZXh0RnJhbWU6IGZ1bmN0aW9uKCkge1xuICAgIGNhbmNlbEFuaW1hdGlvbkZyYW1lKHRoaXMubmV4dEZyYW1lSUQpO1xuICB9LFxuXG4gIGRpc3BhdGNoRXZlbnQ6IGZ1bmN0aW9uKHR5cGUsIGV2ZW50T2JqZWN0KSB7XG4gICAgZXZlbnRPYmplY3QgPSBldmVudE9iamVjdCB8fCB0aGlzLmdldEF0dHJpYnV0ZXMoKTtcblxuICAgIGlmICh0aGlzLmxhc3RFdmVudC50eXBlID09PSB0eXBlICYmIHRoaXMubGFzdEV2ZW50LnNjcm9sbFkgPT09IGV2ZW50T2JqZWN0LnNjcm9sbFkgJiYgdGhpcy5sYXN0RXZlbnQuc2Nyb2xsWCA9PT0gZXZlbnRPYmplY3Quc2Nyb2xsWCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMubGFzdEV2ZW50ID0ge1xuICAgICAgdHlwZTogdHlwZSxcbiAgICAgIHNjcm9sbFk6IGV2ZW50T2JqZWN0LnNjcm9sbFksXG4gICAgICBzY3JvbGxYOiBldmVudE9iamVjdC5zY3JvbGxYXG4gICAgfTtcblxuICAgIC8vIGV2ZW50T2JqZWN0LmZhc3RTY3JvbGwgPSB0aGlzO1xuICAgIGV2ZW50T2JqZWN0LnRhcmdldCA9IHRoaXMuc2Nyb2xsVGFyZ2V0O1xuICAgIHRoaXMuZGlzcGF0Y2hlci5kaXNwYXRjaCh0eXBlLCBldmVudE9iamVjdCk7XG4gIH0sXG5cbiAgb246IGZ1bmN0aW9uKGV2ZW50LCBsaXN0ZW5lcikge1xuICAgIHJldHVybiB0aGlzLmRpc3BhdGNoZXIuYWRkTGlzdGVuZXIoZXZlbnQsIGxpc3RlbmVyKTtcbiAgfSxcblxuICBvZmY6IGZ1bmN0aW9uKGV2ZW50LCBsaXN0ZW5lcikge1xuICAgIHJldHVybiB0aGlzLmRpc3BhdGNoZXIucmVtb3ZlTGlzdGVuZXIoZXZlbnQsIGxpc3RlbmVyKTtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBGYXN0U2Nyb2xsO1xuIiwiLyogZXNsaW50LWRpc2FibGUgbm8tdW51c2VkLXZhcnMgKi9cbid1c2Ugc3RyaWN0JztcbnZhciBoYXNPd25Qcm9wZXJ0eSA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG52YXIgcHJvcElzRW51bWVyYWJsZSA9IE9iamVjdC5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGU7XG5cbmZ1bmN0aW9uIHRvT2JqZWN0KHZhbCkge1xuXHRpZiAodmFsID09PSBudWxsIHx8IHZhbCA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignT2JqZWN0LmFzc2lnbiBjYW5ub3QgYmUgY2FsbGVkIHdpdGggbnVsbCBvciB1bmRlZmluZWQnKTtcblx0fVxuXG5cdHJldHVybiBPYmplY3QodmFsKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBPYmplY3QuYXNzaWduIHx8IGZ1bmN0aW9uICh0YXJnZXQsIHNvdXJjZSkge1xuXHR2YXIgZnJvbTtcblx0dmFyIHRvID0gdG9PYmplY3QodGFyZ2V0KTtcblx0dmFyIHN5bWJvbHM7XG5cblx0Zm9yICh2YXIgcyA9IDE7IHMgPCBhcmd1bWVudHMubGVuZ3RoOyBzKyspIHtcblx0XHRmcm9tID0gT2JqZWN0KGFyZ3VtZW50c1tzXSk7XG5cblx0XHRmb3IgKHZhciBrZXkgaW4gZnJvbSkge1xuXHRcdFx0aWYgKGhhc093blByb3BlcnR5LmNhbGwoZnJvbSwga2V5KSkge1xuXHRcdFx0XHR0b1trZXldID0gZnJvbVtrZXldO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmIChPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKSB7XG5cdFx0XHRzeW1ib2xzID0gT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyhmcm9tKTtcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgc3ltYm9scy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRpZiAocHJvcElzRW51bWVyYWJsZS5jYWxsKGZyb20sIHN5bWJvbHNbaV0pKSB7XG5cdFx0XHRcdFx0dG9bc3ltYm9sc1tpXV0gPSBmcm9tW3N5bWJvbHNbaV1dO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHRvO1xufTtcbiJdfQ==
