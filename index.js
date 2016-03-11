var assign = require('object-assign');
var FastScroll = require('fastscroll');

var _globals = {
  featureTested: false
};

var defaults = {
  top: null,
  bottom: null,
  disabled: false,
  className: 'sticky',
  useAnimationFrame: false,
  stateclassName: 'is-sticky'
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

var Sticky = function(element, options) {
  if (!element) {
    throw new Error('Sticky needs a DomElement');
    return;
  }
  this.el = element;
  this.options = assign({}, defaults, options);

  this.state = assign({}, this.options, {
    sticky: this.options.top === 0,
    height: 'auto'
  });

  this.firstRender = true;
  this.hasFeature = null;
  this.scrollHandler = null;
  this.resizeHandler = null;
  this.fastScroll = null;
  this.wrapper = null;

  this.updateDom = this.updateDom.bind(this);
  this.render = (this.state.useAnimationFrame && window && window.requestAnimationFrame) ? this.renderOnAnimationFrame.bind(this) : this.updateDom;

  if (this.state.top !== 0) {
    this.addSrollHandler();
  }
  this.addResizeHandler();
  this.render();
};

Sticky.prototype.updateState = function(values, silent) {
  this.state = assign({},this.state, values);
  if (!silent) {
    this.render();
  }
};

Sticky.prototype.getTop = function() {
  var top = this.options.top;
  if (top === null) {
    top = parseInt(window.getComputedStyle(this.el).top);
  }
  return top;
};

Sticky.prototype.updateHeight = function(silent) {
  silent = silent === true ? true : false;
  var height = this.el.clientHeight;
  if (height !== this.state.height) {
    this.updateState({height: height}, silent);
  }
  return this.state.height;
};

Sticky.prototype.updateTop = function(silent) {
  silent = silent === true ? true : false;

  var top = this.getTop();
  if (top !== this.state.top) {
    if (top !== 0) {
      this.addSrollHandler();
    }
    this.updateState({top: top}, silent);
  }
  return this.state.top;
};

Sticky.prototype.canSticky = function() {
  if (this.hasFeature !== null) {
    return this.hasFeature;
  }
  return this.hasFeature = window.getComputedStyle(this.el).position.match('sticky');
  //return canSticky(this.options.className);
};

Sticky.prototype.addSrollHandler = function() {
  if (!this.scrollHandler) {
    this.fastScroll = this.fastScroll || getFastScroll();
    this.scrollHandler = this.updateStickyState.bind(this);
    this.fastScroll.on('scroll:start', this.scrollHandler);
    this.fastScroll.on('scroll:progress', this.scrollHandler);
    this.fastScroll.on('scroll:stop', this.scrollHandler);
  }
};

Sticky.prototype.removeSrollHandler = function() {
  if (this.fastScroll) {
    this.fastScroll.off('scroll:start', this.scrollHandler);
    this.fastScroll.off('scroll:progress', this.scrollHandler);
    this.fastScroll.off('scroll:stop', this.scrollHandler);
    this.fastScroll.destroy();
    this.scrollHandler = null;
    this.fastScroll = null;
  }
};

Sticky.prototype.addResizeHandler = function() {
  if (!this.resizeHandler) {
    this.resizeHandler = this.onResize.bind(this);
    window.addEventListener('resize', this.resizeHandler, false);
    window.addEventListener('orientationchange', this.resizeHandler, false);
  }
};

Sticky.prototype.removeResizeHandler = function() {
  if (this.resizeHandler) {
    window.removeEventListener('resize', this.resizeHandler);
    window.removeEventListener('orientationchange', this.resizeHandler);
    this.resizeHandler = null;
  }
};

Sticky.prototype.onResize = function(e) {
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

Sticky.prototype.updateStickyState = function(silent) {

  var child = this.canSticky() ? this.el : this.wrapper;
  if (!child) {
    return false;
  }

  silent = silent === true ? true : false;
  var top = this.state.top;

  if (top === 0) {
    if (this.state.sticky === false) {
      this.updateState({
        sticky: true,
        height: parseInt(this.el.clientHeight)
      }, silent);
    }
    return;
  }

  var scrollY = -this.fastScroll.scrollY;
  if (this.state.sticky === false && scrollY <= top) {
    this.updateState({
      sticky: true,
      height: parseInt(child.clientHeight)
    }, silent);
  } else if (this.state.sticky && scrollY > top) {
    this.updateState({
      sticky: false,
      height: 'auto'
    }, silent);
  }
};

Sticky.prototype.renderOnAnimationFrame = function() {
  window.requestAnimationFrame(this.updateDom);
};

Sticky.prototype.updateDom = function() {

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
    }

    this.updateTop(true);
    this.updateHeight(true);
    this.updateStickyState(true);
  }

  if (!this.canSticky()) {
    var height = this.state.height;
    height = height === 'auto' ? height : height + 'px';
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

module.exports = Sticky;
