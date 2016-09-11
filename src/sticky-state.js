import assign from 'object-assign';
import classname from 'classname';
import EventDispatcher from 'eventdispatcher';
import delegate from 'delegatejs';
import Scroll from 'scroll-events';

const defaults = {
  disabled: false,
  className: 'sticky',
  stateClassName: 'is-sticky',
  fixedClass: 'sticky-fixed',
  wrapperClass: 'sticky-wrap',
  absoluteClass: 'is-absolute',

  scrollClass: {
    down: null,
    up: null,
    none: null,
    persist: false
  }
};


const initialState = {
  sticky: false,
  absolute: false,
  fixedOffset: '',
  offsetHeight: 0,
  bounds: {
    top: null,
    left: null,
    right: null,
    bottom: null,
    height: null,
    width: null
  },
  restrict: {
    top: null,
    left: null,
    right: null,
    bottom: null,
    height: null,
    width: null
  },
  initialStyle: null,
  style: {
    top: null,
    bottom: null,
    left: null,
    right: null,
    'margin-top': 0,
    'margin-bottom': 0,
    'margin-left': 0,
    'margin-right': 0
  },
  disabled: false
};

function getAbsolutBoundingRect(el, fixedHeight) {
  var rect = el.getBoundingClientRect();
  var top = rect.top + Scroll.windowScrollY;
  var height = fixedHeight || rect.height;
  return {
    top: top,
    bottom: top + height,
    height: height,
    width: rect.width,
    left: rect.left,
    right: rect.right
  };
}

function addBounds(rect1, rect2) {
  var rect = assign({}, rect1);
  rect.top -= rect2.top;
  rect.left -= rect2.left;
  rect.right = rect.left + rect1.width;
  rect.bottom = rect.top + rect1.height;
  return rect;
}

function getPositionStyle(el) {

  var result = {};
  var style = window.getComputedStyle(el, null);

  for (var key in initialState.style) {
    var value = parseInt(style.getPropertyValue(key));
    value = isNaN(value) ? null : value;
    result[key] = value;
  }

  return result;
}

function getPreviousElementSibling(el) {
  var prev = el.previousElementSibling;
  if (prev && prev.tagName.toLocaleLowerCase() === 'script') {
    prev = getPreviousElementSibling(prev);
  }
  return prev;
}

export default class StickyState extends EventDispatcher {

  constructor(element, options) {

    var elements;
    if (element instanceof window.NodeList) {
      elements = [].slice.call(element, 1);
      element = element[0];
    }

    super();

    this.el = element;

    if (options && options.scrollClass) {
      options.scrollClass = assign({}, defaults.scrollClass, options.scrollClass);
    }
    this.options = assign({}, defaults, options);

    this.setState(initialState, true);

    this.scrollTarget = Scroll.getScrollParent(this.el);
    this.hasOwnScrollTarget = this.scrollTarget !== window;
    if (this.hasOwnScrollTarget) {
      this.updateFixedOffset = delegate(this, this.updateFixedOffset);
    }

    this.firstRender = true;
    this.resizeHandler = null;
    this.scroll = null;
    this.wrapper = null;
    this.eventObject = {
      target: this.el,
      currentTarget: this
    };

    this.render = delegate(this, this.render);

    this.addSrollHandler();
    this.addResizeHandler();
    this.render();

    if (elements && elements.length) {
      var collection = StickyState.apply(elements, options);
      collection.push(this);
      return collection;
    }
  }

  static apply(elements, options) {

    if (elements && elements.length) {
      var arr = new StickyStateCollection();
      for (var i = 0; i < elements.length; i++) {
        arr.push(new StickyState(elements[i], options));
      }
      return arr;
    }

    return new StickyState(elements, options);
  }

  static get native() {
    return Can.sticky;
  }

  setState(newState, silent) {
    this.lastState = this.state || newState;
    this.state = assign({}, this.state, newState);
    if (silent !== true) {
      this.render();
      this.trigger(this.state.sticky ? 'sticky:on' : 'sticky:off', this.eventObject);
    }
  }

  getBoundingClientRect() {
    return this.el.getBoundingClientRect();
  }

  getBounds(noCache) {

    var clientRect = this.getBoundingClientRect();
    var offsetHeight = Scroll.documentHeight;
    noCache = noCache === true;

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

    // var style = noCache ? this.state.style : getPositionStyle(this.el);
    var initialStyle = this.state.initialStyle;
    if(!initialStyle){
      initialStyle = getPositionStyle(this.el);
    }

    var style = initialStyle;
    var child = this.wrapper || this.el;
    var rect;
    var restrict;
    var offsetY = 0;
    var offsetX = 0;

    if (!Can.sticky) {
      rect = getAbsolutBoundingRect(child, clientRect.height);
      if (this.hasOwnScrollTarget) {
        var parentRect = getAbsolutBoundingRect(this.scrollTarget);
        offsetY = this.scroll.y;
        rect = addBounds(rect, parentRect);
        restrict = parentRect;
        restrict.top = 0;
        restrict.height = this.scroll.scrollHeight || restrict.height;
        restrict.bottom = restrict.height;
      }
    } else {
      var elem = getPreviousElementSibling(child);
      offsetY = 0;

      if (elem) {
        offsetY = parseInt(window.getComputedStyle(elem)['margin-bottom']);
        offsetY = offsetY || 0;
        rect = getAbsolutBoundingRect(elem);
        if (this.hasOwnScrollTarget) {
          rect = addBounds(rect, getAbsolutBoundingRect(this.scrollTarget));
          offsetY += this.scroll.y;
        }
        rect.top = rect.bottom + offsetY;

      } else {
        elem = child.parentNode;
        offsetY = parseInt(window.getComputedStyle(elem)['padding-top']);
        offsetY = offsetY || 0;
        rect = getAbsolutBoundingRect(elem);
        if (this.hasOwnScrollTarget) {
          rect = addBounds(rect, getAbsolutBoundingRect(this.scrollTarget));
          offsetY += this.scroll.scrollY;
        }
        rect.top = rect.top + offsetY;
      }
      if (this.hasOwnScrollTarget) {
        restrict = getAbsolutBoundingRect(this.scrollTarget);
        restrict.top = 0;
        restrict.height = this.scroll.scrollHeight || restrict.height;
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
      initialStyle: initialStyle,
      restrict: restrict
    };
  }

  updateBounds(silent, noCache) {
    silent = silent === true;
    noCache = noCache === true;
    this.setState(this.getBounds(noCache), silent);
  }

  updateFixedOffset() {
    this.lastState.fixedOffset = this.state.fixedOffset;
    if (this.state.sticky) {
      this.state.fixedOffset = this.scrollTarget.getBoundingClientRect().top + 'px';
    } else {
      this.state.fixedOffset = '';
    }
    if (this.lastState.fixedOffset !== this.state.fixedOffset) {
      this.render();
    }
  }

  addSrollHandler() {
    if (!this.scroll) {
      var hasScrollTarget = Scroll.hasScrollTarget(this.scrollTarget);
      this.scroll = Scroll.getInstance(this.scrollTarget);
      this.onScroll = delegate(this, this.onScroll);
      this.onScrollDirection = delegate(this, this.onScrollDirection);
      this.scroll.on('scroll:start', this.onScroll);
      this.scroll.on('scroll:progress', this.onScroll);
      this.scroll.on('scroll:stop', this.onScroll);
      this.scroll.on('scroll:up', this.onScrollDirection);
      this.scroll.on('scroll:down', this.onScrollDirection);
      if (!this.options.scrollClass.persist) {
        this.scroll.on('scroll:stop', this.onScrollDirection);
      } else {
        // this.scroll.on('scroll:top', this.onScrollDirection);
      }

      if (hasScrollTarget && this.scroll.scrollY > 0) {
        this.scroll.trigger('scroll:progress');
      }
    }
  }

  removeSrollHandler() {
    if (this.scroll) {
      this.scroll.off('scroll:start', this.onScroll);
      this.scroll.off('scroll:progress', this.onScroll);
      this.scroll.off('scroll:stop', this.onScroll);
      this.scroll.off('scroll:up', this.onScrollDirection);
      this.scroll.off('scroll:down', this.onScrollDirection);
      this.scroll.off('scroll:stop', this.onScrollDirection);
      this.scroll.destroy();
      this.scroll = null;
    }
  }

  addResizeHandler() {
    if (!this.resizeHandler) {
      // this.resizeHandler = this.onResize.bind(this);
      this.resizeHandler = delegate(this, this.onResize);
      window.addEventListener('sticky:update', this.resizeHandler, false);
      window.addEventListener('resize', this.resizeHandler, false);
      window.addEventListener('orientationchange', this.resizeHandler, false);
    }
  }

  removeResizeHandler() {
    if (this.resizeHandler) {
      window.removeEventListener('sticky:update', this.resizeHandler);
      window.removeEventListener('resize', this.resizeHandler);
      window.removeEventListener('orientationchange', this.resizeHandler);
      this.resizeHandler = null;
    }
  }

  getScrollClassObj(obj) {
    obj = obj || {};
    var direction = (this.scroll.y <= 0 || this.scroll.y + this.scroll.clientHeight >= this.scroll.scrollHeight) ? 0 : this.scroll.directionY;
    if (this.options.scrollClass.up || this.options.scrollClass.down) {
      obj[this.options.scrollClass.up] = direction < 0;
      obj[this.options.scrollClass.down] = direction > 0;
    }
    return obj;
  }

  onScrollDirection(e) {
    if (this.state.sticky || e.type === Scroll.EVENT_SCROLL_STOP) {
      this.el.className = classname(this.el.className, this.getScrollClassObj());
    }
  }

  onScroll(e) {
    this.updateStickyState(false);
    if (this.hasOwnScrollTarget && !Can.sticky) {
      this.updateFixedOffset();
      if (this.state.sticky && !this.hasWindowScrollListener) {
        this.hasWindowScrollListener = true;
        Scroll.getInstance(window).on('scroll:progress', this.updateFixedOffset);
      } else if (!this.state.sticky && this.hasWindowScrollListener) {
        this.hasWindowScrollListener = false;
        Scroll.getInstance(window).off('scroll:progress', this.updateFixedOffset);
      }
    }
  }

  update() {
    this.scroll.updateScrollPosition();
    this.updateBounds(true, true);
    this.updateStickyState(false);
  }

  onResize(e) {
    this.update();
  }

  getStickyState() {

    if (this.state.disabled) {
      return { sticky: false, absolute: false };
    }

    var scrollY = this.scroll.y;
    var scrollX = this.scroll.x;
    var top = this.state.style.top;
    var bottom = this.state.style.bottom;
    var left = this.state.style.left;
    var right = this.state.style.right;
    var sticky = this.state.sticky;
    var absolute = this.state.absolute;

    if (top !== null) {
      var offsetBottom = this.state.restrict.bottom - this.state.bounds.height - top;
      top = this.state.bounds.top - top;

      if (this.state.sticky === false && ((scrollY >= top && scrollY <= offsetBottom) || (top <= 0 && scrollY < top))) {
        sticky = true;
        absolute = false;
      } else if (this.state.sticky && (top > 0 && scrollY < top  || scrollY > offsetBottom)) {
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
    return { sticky: sticky, absolute: absolute };
  }

  updateStickyState(silent) {
    var values = this.getStickyState();

    if (values.sticky !== this.state.sticky || values.absolute !== this.state.absolute) {
      silent = silent === true;
      values = assign(values, this.getBounds());
      this.setState(values, silent);
    }
  }

  render() {

    var className = this.el.className;

    var classNameObj = {};

    if (this.firstRender) {
      this.firstRender = false;

      if (!Can.sticky) {
        this.wrapper = document.createElement('div');
        this.wrapper.className = this.options.wrapperClass;
        var parent = this.el.parentNode;
        if (parent) {
          parent.insertBefore(this.wrapper, this.el);
        }
        this.wrapper.appendChild(this.el);
        classNameObj[this.options.fixedClass] = true;
      }

      this.updateBounds(true, true);
      this.updateStickyState(true);
    }

    if (!Can.sticky) {
      var height = (this.state.disabled || this.state.bounds.height === null || (!this.state.sticky && !this.state.absolute)) ? 'auto' : this.state.bounds.height + 'px';
      this.wrapper.style.height = height;
      this.wrapper.style.marginTop = height === 'auto' ? '' : this.state.style['margin-top']+'px';
      this.wrapper.style.marginBottom = height === 'auto' ? '' : this.state.style['margin-bottom']+'px';

      if (this.state.absolute !== this.lastState.absolute) {
        this.wrapper.style.position = this.state.absolute ? 'relative' : '';
        classNameObj[this.options.absoluteClass] = this.state.absolute;
        this.el.style.marginTop = (this.state.absolute && this.state.style.top !== null) ? (this.state.restrict.height - (this.state.bounds.height + this.state.style.top) + (this.state.restrict.top - this.state.bounds.top)) + 'px' : '';
        this.el.style.marginBottom = (this.state.absolute && this.state.style.bottom !== null) ? (this.state.restrict.height - (this.state.bounds.height + this.state.style.bottom) + (this.state.restrict.bottom - this.state.bounds.bottom)) + 'px' : '';
      }

      if ((this.state.style.top !== null || this.state.style.bottom !== null) && (this.hasOwnScrollTarget && !this.state.absolute && this.lastState.fixedOffset !== this.state.fixedOffset)) {
        this.el.style.marginTop = this.state.fixedOffset;
      }
    }

    classNameObj[this.options.stateClassName] = this.state.sticky;
    classNameObj = this.getScrollClassObj(classNameObj);
    className = classname(className, classNameObj);

    if (this.el.className !== className) {
      this.el.className = className;
    }

    return this.el;
  }

}

var _canSticky = null;

class Can {

  static get sticky() {
    if (_canSticky !== null) {
      return _canSticky;
    }
    if (typeof window !== 'undefined') {

      if (window.Modernizr && window.Modernizr.hasOwnProperty('csspositionsticky')) {
        return _globals.canSticky = window.Modernizr.csspositionsticky;
      }

      var documentFragment = document.documentElement;
      var testEl = document.createElement('div');
      documentFragment.appendChild(testEl);
      var prefixedSticky = ['sticky', '-webkit-sticky'];

      _canSticky = false;

      for (var i = 0; i < prefixedSticky.length; i++) {
        testEl.style.position = prefixedSticky[i];
        _canSticky = !!window.getComputedStyle(testEl).position.match('sticky');
        if (_canSticky) {
          break;
        }
      }
      documentFragment.removeChild(testEl);
    }
    return _canSticky;
  };

}

class StickyStateCollection extends EventDispatcher {

  constructor() {
    super();
    this.items = [];
  }

  push(item) {
    this.items.push(item);
  }

  update() {
    window.dispatchEvent(new Event('sticky:update'));
  }

  addListener(event, listener) {

    var i = -1;
    while (++i < this.items.length) {
      this.items[i].addListener(event, listener);
    }
    return this;
  }

  removeListener(event, listener) {
    var i = -1;
    while (++i < this.items.length) {
      this.items[i].removeListener(event, listener);
    }
    return this;
  }

}
