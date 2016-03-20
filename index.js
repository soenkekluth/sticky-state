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
