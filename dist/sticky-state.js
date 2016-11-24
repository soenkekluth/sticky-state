'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _objectAssign = require('object-assign');

var _objectAssign2 = _interopRequireDefault(_objectAssign);

var _classstring = require('classstring');

var _classstring2 = _interopRequireDefault(_classstring);

var _eventdispatcher = require('eventdispatcher');

var _eventdispatcher2 = _interopRequireDefault(_eventdispatcher);

var _scrollfeatures = require('scrollfeatures');

var _scrollfeatures2 = _interopRequireDefault(_scrollfeatures);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var defaults = {
  disabled: false,
  className: 'sticky',
  stateClassName: 'is-sticky',
  fixedClass: 'sticky-fixed',
  wrapperClass: 'sticky-wrap',
  wrapFixedSticky: true,
  absoluteClass: 'is-absolute',

  scrollClass: {
    down: null,
    up: null,
    none: null,
    persist: false,
    active: false
  }
};

var initialState = {
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
  wrapperStyle: null,
  elementStyle: null,
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

var getAbsolutBoundingRect = function getAbsolutBoundingRect(el, fixedHeight) {
  var rect = el.getBoundingClientRect();
  var top = rect.top + _scrollfeatures2.default.windowY;
  var height = fixedHeight || rect.height;
  return {
    top: top,
    bottom: top + height,
    height: height,
    width: rect.width,
    left: rect.left,
    right: rect.right
  };
};

var addBounds = function addBounds(rect1, rect2) {
  var rect = (0, _objectAssign2.default)({}, rect1);
  rect.top -= rect2.top;
  rect.left -= rect2.left;
  rect.right = rect.left + rect1.width;
  rect.bottom = rect.top + rect1.height;
  return rect;
};

var getPositionStyle = function getPositionStyle(el) {

  var result = {};
  var style = window.getComputedStyle(el, null);

  for (var key in initialState.style) {
    var value = parseInt(style.getPropertyValue(key));
    value = isNaN(value) ? null : value;
    result[key] = value;
  }

  return result;
};

var getPreviousElementSibling = function getPreviousElementSibling(el) {
  var prev = el.previousElementSibling;
  if (prev && prev.tagName.toLocaleLowerCase() === 'script') {
    prev = getPreviousElementSibling(prev);
  }
  return prev;
};

var StickyState = function (_EventDispatcher) {
  _inherits(StickyState, _EventDispatcher);

  function StickyState(element, options) {
    _classCallCheck(this, StickyState);

    var elements;
    if (element instanceof window.NodeList) {
      elements = [].slice.call(element, 1);
      element = element[0];
    }

    var _this = _possibleConstructorReturn(this, _EventDispatcher.call(this, { target: element }));

    _this.el = null;
    _this.firstRender = true;
    _this.scroll = null;
    _this.wrapper = null;
    _this.options = null;


    _this.el = element;

    if (options && options.scrollClass) {
      options.scrollClass = (0, _objectAssign2.default)({}, defaults.scrollClass, options.scrollClass, { active: true });
    }
    _this.options = (0, _objectAssign2.default)({}, defaults, options);

    _this.setState((0, _objectAssign2.default)({}, initialState, { disabled: _this.options.disabled }), true);

    _this.scrollTarget = _scrollfeatures2.default.getScrollParent(_this.el);
    _this.hasOwnScrollTarget = _this.scrollTarget !== window;
    if (_this.hasOwnScrollTarget) {
      _this.updateFixedOffset = _this.updateFixedOffset.bind(_this);
    }

    _this.render = _this.render.bind(_this);
    _this.addSrollHandler();
    _this.addResizeHandler();
    _this.render();

    if (elements && elements.length) {
      var _ret;

      var collection = StickyState.apply(elements, options);
      collection.push(_this);
      return _ret = collection, _possibleConstructorReturn(_this, _ret);
    }
    return _this;
  }

  StickyState.apply = function apply(elements, options) {

    if (elements && elements.length) {
      var arr = new StickyStateCollection();
      for (var i = 0; i < elements.length; i++) {
        arr.push(new StickyState(elements[i], options));
      }
      return arr;
    }

    return new StickyState(elements, options);
  };

  StickyState.prototype.setState = function setState(newState, silent) {
    this.lastState = this.state || newState;
    this.state = (0, _objectAssign2.default)({}, this.state, newState);
    if (silent !== true) {
      this.render();
      this.trigger(this.state.sticky ? 'sticky:on' : 'sticky:off');
    }
  };

  StickyState.prototype.disable = function disable(value) {
    this.setState({ disabled: value }, value);
  };

  StickyState.prototype.getBoundingClientRect = function getBoundingClientRect() {
    return this.el.getBoundingClientRect();
  };

  StickyState.prototype.getBounds = function getBounds(noCache) {

    var clientRect = this.getBoundingClientRect();
    var offsetHeight = _scrollfeatures2.default.documentHeight;
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
    if (!initialStyle) {
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
          offsetY += this.scroll.y;
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
  };

  StickyState.prototype.updateBounds = function updateBounds(silent, noCache) {
    silent = silent === true;
    noCache = noCache === true;
    this.setState(this.getBounds(noCache), silent);
  };

  StickyState.prototype.updateFixedOffset = function updateFixedOffset() {
    this.lastState.fixedOffset = this.state.fixedOffset;
    if (this.state.sticky) {
      this.state.fixedOffset = this.scrollTarget.getBoundingClientRect().top + 'px;';
    } else {
      this.state.fixedOffset = '';
    }
    if (this.lastState.fixedOffset !== this.state.fixedOffset) {
      this.render();
    }
  };

  StickyState.prototype.addSrollHandler = function addSrollHandler() {
    if (!this.scroll) {
      var hasScrollTarget = _scrollfeatures2.default.hasInstance(this.scrollTarget);
      this.scroll = _scrollfeatures2.default.getInstance(this.scrollTarget);
      this.onScroll = this.onScroll.bind(this);
      this.scroll.on('scroll:start', this.onScroll);
      this.scroll.on('scroll:progress', this.onScroll);
      this.scroll.on('scroll:stop', this.onScroll);

      if (this.options.scrollClass.active) {
        this.onScrollDirection = this.onScrollDirection.bind(this);
        this.scroll.on('scroll:up', this.onScrollDirection);
        this.scroll.on('scroll:down', this.onScrollDirection);
        if (!this.options.scrollClass.persist) {
          this.scroll.on('scroll:stop', this.onScrollDirection);
        }
      }
      if (hasScrollTarget && this.scroll.scrollY > 0) {
        this.scroll.trigger('scroll:progress');
      }
    }
  };

  StickyState.prototype.removeSrollHandler = function removeSrollHandler() {
    if (this.scroll) {
      this.scroll.off('scroll:start', this.onScroll);
      this.scroll.off('scroll:progress', this.onScroll);
      this.scroll.off('scroll:stop', this.onScroll);
      if (this.options.scrollClass.active) {
        this.scroll.off('scroll:up', this.onScrollDirection);
        this.scroll.off('scroll:down', this.onScrollDirection);
        this.scroll.off('scroll:stop', this.onScrollDirection);
      }
      if (!this.scroll.hasListeners()) {
        this.scroll.destroy();
      }
      this.onScroll = null;
      this.onScrollDirection = null;
      this.scroll = null;
    }
  };

  StickyState.prototype.addResizeHandler = function addResizeHandler() {
    if (!this.onResize) {
      this.onResize = this.update.bind(this);
      window.addEventListener('sticky:update', this.onResize, false);
      window.addEventListener('resize', this.onResize, false);
      window.addEventListener('orientationchange', this.onResize, false);
    }
  };

  StickyState.prototype.removeResizeHandler = function removeResizeHandler() {
    if (this.onResize) {
      window.removeEventListener('sticky:update', this.onResize);
      window.removeEventListener('resize', this.onResize);
      window.removeEventListener('orientationchange', this.onResize);
      this.onResize = null;
    }
  };

  StickyState.prototype.destroy = function destroy() {
    _EventDispatcher.prototype.destroy.call(this);
    this.removeSrollHandler();
    this.removeResizeHandler();
    this.render = null;
    this.el = null;
    this.state = null;
    this.wrapper = null;
  };

  StickyState.prototype.getScrollClasses = function getScrollClasses(obj) {
    if (this.options.scrollClass.active) {
      obj = obj || {};
      var direction = this.scroll.y <= 0 || this.scroll.y + this.scroll.clientHeight >= this.scroll.scrollHeight ? 0 : this.scroll.directionY;
      obj[this.options.scrollClass.up] = direction < 0;
      obj[this.options.scrollClass.down] = direction > 0;
    }
    return obj;
  };

  StickyState.prototype.onScrollDirection = function onScrollDirection(e) {
    if (this.state.sticky || e.type === _scrollfeatures2.default.events.SCROLL_STOP) {
      this.el.className = (0, _classstring2.default)(this.el.className, this.getScrollClasses());
    }
  };

  StickyState.prototype.onScroll = function onScroll(e) {
    this.updateStickyState(false);
    if (this.hasOwnScrollTarget && !Can.sticky) {
      this.updateFixedOffset();
      if (this.state.sticky && !this.hasWindowScrollListener) {
        this.hasWindowScrollListener = true;
        _scrollfeatures2.default.getInstance(window).on('scroll:progress', this.updateFixedOffset);
      } else if (!this.state.sticky && this.hasWindowScrollListener) {
        this.hasWindowScrollListener = false;
        _scrollfeatures2.default.getInstance(window).off('scroll:progress', this.updateFixedOffset);
      }
    }
  };

  StickyState.prototype.update = function update() {
    this.scroll.updateScrollPosition();
    this.updateBounds(true, true);
    this.updateStickyState(false);
  };

  StickyState.prototype.getStickyState = function getStickyState() {

    if (this.state.disabled) {
      return { sticky: false, absolute: false };
    }

    var scrollY = this.scroll.y;
    var scrollX = this.scroll.x;
    var top = this.state.style.top;
    var bottom = this.state.style.bottom;
    // var left = this.state.style.left;
    // var right = this.state.style.right;
    var sticky = this.state.sticky;
    var absolute = this.state.absolute;

    if (top !== null) {
      var offsetBottom = this.state.restrict.bottom - this.state.bounds.height - top;
      top = this.state.bounds.top - top;

      if (this.state.sticky === false && (scrollY >= top && scrollY <= offsetBottom || top <= 0 && scrollY < top)) {
        sticky = true;
        absolute = false;
      } else if (this.state.sticky && (top > 0 && scrollY < top || scrollY > offsetBottom)) {
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
  };

  StickyState.prototype.updateStickyState = function updateStickyState(silent) {
    var values = this.getStickyState();

    if (values.sticky !== this.state.sticky || values.absolute !== this.state.absolute) {
      silent = silent === true;
      values = (0, _objectAssign2.default)(values, this.getBounds());
      this.setState(values, silent);
    }
  };

  StickyState.prototype.render = function render() {

    if (this.state.disabled) {
      return;
    }

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
        if (this.options.wrapFixedSticky) {
          this.wrapper.appendChild(this.el);
        }
        classNameObj[this.options.fixedClass] = true;
      }

      this.updateBounds(true, true);
      this.updateStickyState(true);
    }

    if (!Can.sticky) {
      var elementStyle = '';
      var height = this.state.disabled || this.state.bounds.height === null || !this.state.sticky && !this.state.absolute ? 'auto;' : this.state.bounds.height + 'px;';
      var wrapperStyle = 'height:' + height;
      wrapperStyle += height === 'auto;' ? '' : (this.state.style['margin-top'] ? 'margin-top:' + this.state.style['margin-top'] + 'px;' : '0;') + (this.state.style['margin-bottom'] ? 'margin-bottom' + this.state.style['margin-bottom'] + 'px;' : '0;');

      if (this.state.absolute !== this.lastState.absolute) {
        wrapperStyle += this.state.absolute ? 'position:relative;' : '';
        classNameObj[this.options.absoluteClass] = this.state.absolute;
        elementStyle += this.state.absolute ? this.state.style.top !== null ? 'margin-top:' + (this.state.restrict.height - (this.state.bounds.height + this.state.style.top) + (this.state.restrict.top - this.state.bounds.top)) + 'px;' : 'margin-top:0;' + (this.state.style.bottom !== null ? 'margin-bottom:' + (this.state.restrict.height - (this.state.bounds.height + this.state.style.bottom) + (this.state.restrict.bottom - this.state.bounds.bottom)) + 'px;' : 'margin-bottom:0;') : 'margin-bottom:0;margin-top:0;';
      }

      if ((this.state.style.top !== null || this.state.style.bottom !== null) && this.hasOwnScrollTarget && !this.state.absolute && this.lastState.fixedOffset !== this.state.fixedOffset) {
        elementStyle += 'margin-top:' + (this.state.fixedOffset ? this.state.fixedOffset : '0;');
      }

      if (this.state.wrapperStyle !== wrapperStyle) {
        this.state.wrapperStyle = wrapperStyle;
        this.wrapper.style.cssText += wrapperStyle;
      }

      if (this.state.elementStyle !== elementStyle) {
        this.state.elementStyle = elementStyle;
        this.el.style.cssText += elementStyle;
      }
    }

    classNameObj[this.options.stateClassName] = this.state.sticky;
    classNameObj = this.getScrollClasses(classNameObj);
    var className = (0, _classstring2.default)(this.el.className, classNameObj);

    if (this.el.className !== className) {
      this.el.className = className;
    }

    return this.el;
  };

  _createClass(StickyState, null, [{
    key: 'native',
    get: function get() {
      return Can.sticky;
    }
  }]);

  return StickyState;
}(_eventdispatcher2.default);

var _canSticky = null;

var Can = function () {
  function Can() {
    _classCallCheck(this, Can);
  }

  _createClass(Can, null, [{
    key: 'sticky',
    get: function get() {
      if (_canSticky !== null) {
        return _canSticky;
      }
      if (typeof window !== 'undefined') {

        if (window.Modernizr && window.Modernizr.hasOwnProperty('csspositionsticky')) {
          return _canSticky = window.Modernizr.csspositionsticky;
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
    }
  }]);

  return Can;
}();

var StickyStateCollection = function (_EventDispatcher2) {
  _inherits(StickyStateCollection, _EventDispatcher2);

  function StickyStateCollection() {
    _classCallCheck(this, StickyStateCollection);

    var _this2 = _possibleConstructorReturn(this, _EventDispatcher2.call(this));

    _this2.items = [];
    return _this2;
  }

  StickyStateCollection.prototype.push = function push(item) {
    this.items.push(item);
  };

  StickyStateCollection.prototype.update = function update() {
    var i = -1;
    while (++i < this.items.length) {
      this.items[i].update();
    }
  };

  StickyStateCollection.prototype.addListener = function addListener(event, listener) {

    var i = -1;
    while (++i < this.items.length) {
      this.items[i].addListener(event, listener);
    }
    return this;
  };

  StickyStateCollection.prototype.removeListener = function removeListener(event, listener) {
    var i = -1;
    while (++i < this.items.length) {
      this.items[i].removeListener(event, listener);
    }
    return this;
  };

  return StickyStateCollection;
}(_eventdispatcher2.default);

exports.default = StickyState;
module.exports = exports['default'];