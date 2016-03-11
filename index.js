var assign = require('object-assign');
var FastScroll = require('fastscroll');

var _globals = {
  featureTested: false
};

var defaults = {
  top: null,
  bottom: null,
  disabled: false,
  restrict: null,
  className: 'sticky',
  useAnimationFrame: false,
  stateclassName: 'is-sticky'
};


function getAbsolutPosition(el) {
  var rect = el.getBoundingClientRect();
  var scrollPos = (window.scrollY || window.pageYOffset || 0);
  var top = rect.top + scrollPos;
  return {
      top: top,
      bottom: top + rect.height,
      height: rect.height,
      width: rect.width
    };
};

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

function getFastScroll() {
  if (!_globals.fastScroll) {
    _globals.fastScroll = new FastScroll();
  }
  return _globals.fastScroll;
}

var StickyState = function(element, options) {
  if (!element) {
    throw new Error('StickyState needs a DomElement');
    return;
  }
  this.el = element;
  this.options = assign({}, defaults, options);

  this.state = assign({}, this.options, {
    sticky: false,
    height: null
  });

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
  this.state = assign({},this.state, values);
  if (!silent) {
    this.render();
  }
};

StickyState.prototype.getTop = function() {
  var top = this.options.top;
  if (top === null) {
    top = getAbsolutPosition(this.el).top - parseInt(window.getComputedStyle(this.el).top);
  }
  return top;
};

StickyState.prototype.getBottom = function() {
  var bottom = this.options.bottom;
  if (bottom === null) {
    bottom = getAbsolutPosition(this.el).bottom - parseInt(window.getComputedStyle(this.el).bottom);
  }
  return bottom;
};


StickyState.prototype.updateHeight = function(silent) {
  silent = silent === true ? true : false;
  var height = parseInt(this.el.getBoundingClientRect().height);
  if (height !== this.state.height) {
    this.updateState({height: height}, silent);
  }
  return this.state.height;
};

StickyState.prototype.updateBounds = function(silent) {
  silent = silent === true ? true : false;

  var top = this.getTop();
  if (top !== this.state.top) {
    this.updateState({top: top, restrict: getAbsolutPosition(this.child.parentNode)}, silent);
  }
  return this.state.top;
};

StickyState.prototype.canSticky = function() {
  if (this.hasFeature !== null) {
    return this.hasFeature;
  }
  return this.hasFeature = window.getComputedStyle(this.el).position.match('sticky');
  //return canSticky(this.options.className);
};

StickyState.prototype.addSrollHandler = function() {
  if (!this.scrollHandler) {
    this.fastScroll = this.fastScroll || getFastScroll();
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
  var height = this.state.height;
  var top = this.getTop();
  if (!this.canSticky()) {
    height = parseInt(this.el.getBoundingClientRect().height);
  }
  if (height !== this.state.height || top !== this.state.top) {
    this.updateState({
      top: top,
      height: height
    });

    this.updateStickyState(false);
  }
};

StickyState.prototype.updateStickyState = function(silent) {

  var child = this.child;
  if (!child) {
    return false;
  }


  silent = silent === true ? true : false;
  var top = this.state.top;

  if (isNaN(top)) {
    return;
  }


  var scrollY = this.fastScroll.scrollY;
  var offsetBottom = this.state.restrict.bottom - this.state.height;

  if (this.state.sticky === false && scrollY >= top && scrollY <= offsetBottom ) {
    this.updateState({
      sticky: true,
      height: parseInt(this.el.clientHeight)
    }, silent);
  } else if (this.state.sticky && (scrollY < top || scrollY > offsetBottom)) {
    this.updateState({
      sticky: false,
      height: parseInt(this.el.clientHeight)
    }, silent);
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
    this.updateHeight(true);
    this.updateStickyState(true);

  }
  if (isNaN(this.state.top)) {
    return;
  }

  if (!this.canSticky()) {
    var height = this.state.height;
    height = (this.state.sticky || height === null) ? 'auto' : height + 'px';
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
    }else {
      new StickyState(elements);
    }
  }
};

module.exports = StickyState;
