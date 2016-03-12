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
    this.fastScroll = getFastScroll(this.scrollTarget);
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
