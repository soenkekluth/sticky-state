(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.StickyState = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
function classname () {
    var result = {},
        objects = {},
        resultString = "";

    function add (strings) {
        classname.each(strings.split(" "), function (string) {
            result[string] = !!string;
        });
    }

    classname.each([].slice.call(arguments), function (x) {
        switch (classname.getType(x)) {
        case "string":
        case "number":
            add(x);
            break;

        case "array":
            add(classname.apply(null, x));
            break;

        case "element":
            add(classname(x.className || ""));
            break;

        case "nodelist":
            add(classname.apply(null, [].slice.call(x)));
            break;

        case "jquery":
            add(classname.apply(null, x.get()));
            break;

        case "object":
            objects = classname.extend(objects, x);
            break;
        }
    });

    result = classname.extend(result, objects);

    classname.each(result, function (val, key) {
        if (val) {
            resultString += " " + key;
        }
    });

    return resultString.substr(1);
}

classname.setTo = function (elements) {
    var type = classname.getType(elements);

    if (type === "element") {
        elements = [elements];
    }

    if (type === "jquery") {
        elements = elements.get();
    }

    if (type === "nodelist") {
        elements = [].slice.call(elements);
    }

    return function () {
        var classNames = classname.apply(null, arguments);

        classname.each(elements, function (element) {
            element.className = classNames;
        });
    };
};

classname.each = function (arr, fn) {
    var type = classname.getType(arr);

    if (type === "array") {
        for (var i = 0; i < arr.length; i++) {
            fn(arr[i], i);
        }
    }

    if (type === "object") {
        for (var key in arr) {
            fn(arr[key], key);
        }
    }
};

classname.getType = function (x) {
    var type = Object.prototype.toString.call(x).slice(8, -1).toLowerCase();

    if (type === "object" && x.jquery) {
        return "jquery";
    }

    if (type.indexOf("element") > 1) {
        return "element";
    }

    return type;
};

classname.extend = function (obj1, obj2) {
    var result = {},
        objs = [obj1, obj2];

    classname.each(objs, function (obj) {
        classname.each(obj, function (val, key) {
            if (obj.hasOwnProperty(key)) {
                result[key] = val;
            }
        });
    });

    return result;
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = classname;
}

},{}],2:[function(_dereq_,module,exports){
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

},{}],3:[function(_dereq_,module,exports){
'use strict';Object.defineProperty(exports,'__esModule',{value:true});function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError('Cannot call a class as a function')}}function isEmpty(obj){for(var prop in obj){if(obj.hasOwnProperty(prop)){return false}}return true}var _instanceMap={};var EventDispatcher=function(){function EventDispatcher(){_classCallCheck(this,EventDispatcher);this._eventMap={};this._destroyed=false;//Method Map
this.on=this.bind=this.addEventListener=this.addListener;this.off=this.unbind=this.removeEventListener=this.removeListener;this.once=this.one=this.addListenerOnce;this.emmit=this.trigger=this.dispatchEvent=this.dispatch}EventDispatcher.getInstance=function getInstance(key){if(!key){throw new Error('key must be')}return _instanceMap[key]||(_instanceMap[key]=new EventDispatcher)};EventDispatcher.prototype.addListener=function addListener(event,listener){var listeners=this.getListener(event);if(!listeners){this._eventMap[event]=[listener]}else if(listeners.indexOf(listener)===-1){listeners.push(listener)}return this};EventDispatcher.prototype.addListenerOnce=function addListenerOnce(event,listener){var _this=this,_arguments=arguments;var s=this;var f2=function f2(){s.removeListener(event,f2);return listener.apply(_this,_arguments)};return this.addListener(event,f2)};EventDispatcher.prototype.removeListener=function removeListener(event,listener){if(typeof listener==='undefined'){return this.removeAllListener(event)}var listeners=this.getListener(event);if(listeners){var i=listeners.indexOf(listener);if(i>-1){listeners=listeners.splice(i,1);if(!listeners.length){delete this._eventMap[event]}}}return this};EventDispatcher.prototype.removeAllListener=function removeAllListener(event){var listeners=this.getListener(event);if(listeners){this._eventMap[event].length=0;delete this._eventMap[event]}return this};EventDispatcher.prototype.hasListener=function hasListener(event){return this.getListener(event)!==null};EventDispatcher.prototype.hasListeners=function hasListeners(){return this._eventMap!==null&&this._eventMap!==undefined&&!isEmpty(this._eventMap)};EventDispatcher.prototype.dispatch=function dispatch(eventType,eventObject){var listeners=this.getListener(eventType);if(listeners){eventObject=eventObject||{};eventObject.type=eventType;eventObject.target=eventObject.target||this;var i=-1;while(++i<listeners.length){listeners[i](eventObject)}// return true;
}return this};EventDispatcher.prototype.getListener=function getListener(event){var result=this._eventMap?this._eventMap[event]:null;return result||null};EventDispatcher.prototype.destroy=function destroy(){if(this._eventMap){for(var i in this._eventMap){this.removeAllListener(i)}this._eventMap=null}this._destroyed=true;return this};return EventDispatcher}();exports.default=EventDispatcher;module.exports=exports['default'];
},{}],4:[function(_dereq_,module,exports){
'use strict';
/* eslint-disable no-unused-vars */
var hasOwnProperty = Object.prototype.hasOwnProperty;
var propIsEnumerable = Object.prototype.propertyIsEnumerable;

function toObject(val) {
	if (val === null || val === undefined) {
		throw new TypeError('Object.assign cannot be called with null or undefined');
	}

	return Object(val);
}

function shouldUseNative() {
	try {
		if (!Object.assign) {
			return false;
		}

		// Detect buggy property enumeration order in older V8 versions.

		// https://bugs.chromium.org/p/v8/issues/detail?id=4118
		var test1 = new String('abc');  // eslint-disable-line
		test1[5] = 'de';
		if (Object.getOwnPropertyNames(test1)[0] === '5') {
			return false;
		}

		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
		var test2 = {};
		for (var i = 0; i < 10; i++) {
			test2['_' + String.fromCharCode(i)] = i;
		}
		var order2 = Object.getOwnPropertyNames(test2).map(function (n) {
			return test2[n];
		});
		if (order2.join('') !== '0123456789') {
			return false;
		}

		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
		var test3 = {};
		'abcdefghijklmnopqrst'.split('').forEach(function (letter) {
			test3[letter] = letter;
		});
		if (Object.keys(Object.assign({}, test3)).join('') !==
				'abcdefghijklmnopqrst') {
			return false;
		}

		return true;
	} catch (e) {
		// We don't expect any of the above to throw, but better to be safe.
		return false;
	}
}

module.exports = shouldUseNative() ? Object.assign : function (target, source) {
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

},{}],5:[function(_dereq_,module,exports){
'use strict';Object.defineProperty(exports,'__esModule',{value:true});exports.default=undefined;var _createClass=function(){function defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if('value'in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}return function(Constructor,protoProps,staticProps){if(protoProps)defineProperties(Constructor.prototype,protoProps);if(staticProps)defineProperties(Constructor,staticProps);return Constructor}}();var _delegatejs=_dereq_('delegatejs');var _delegatejs2=_interopRequireDefault(_delegatejs);var _eventdispatcher=_dereq_('eventdispatcher');var _eventdispatcher2=_interopRequireDefault(_eventdispatcher);function _interopRequireDefault(obj){return obj&&obj.__esModule?obj:{default:obj}}function _defaults(obj,defaults){var keys=Object.getOwnPropertyNames(defaults);for(var i=0;i<keys.length;i++){var key=keys[i];var value=Object.getOwnPropertyDescriptor(defaults,key);if(value&&value.configurable&&obj[key]===undefined){Object.defineProperty(obj,key,value)}}return obj}function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError('Cannot call a class as a function')}}function _possibleConstructorReturn(self,call){if(!self){throw new ReferenceError('this hasn\'t been initialised - super() hasn\'t been called')}return call&&(typeof call==='object'||typeof call==='function')?call:self}function _inherits(subClass,superClass){if(typeof superClass!=='function'&&superClass!==null){throw new TypeError('Super expression must either be null or a function, not '+typeof superClass)}subClass.prototype=Object.create(superClass&&superClass.prototype,{constructor:{value:subClass,enumerable:false,writable:true,configurable:true}});if(superClass)Object.setPrototypeOf?Object.setPrototypeOf(subClass,superClass):_defaults(subClass,superClass)}var _instanceMap={};var ScrollEvents=function(_EventDispatcher){_inherits(ScrollEvents,_EventDispatcher);ScrollEvents.directionToString=function directionToString(direction){switch(direction){case ScrollEvents.UP:return'up';case ScrollEvents.DOWN:return'down';case ScrollEvents.NONE:return'none';case ScrollEvents.LEFT:return'left';case ScrollEvents.RIGHT:return'right';}};_createClass(ScrollEvents,null,[{key:'documentHeight',get:function get(){return Math.max(document.body.scrollHeight,document.body.offsetHeight,document.documentElement.clientHeight,document.documentElement.scrollHeight,document.documentElement.offsetHeight)}},{key:'documentWidth',get:function get(){return Math.max(document.body.scrollWidth,document.body.offsetWidth,document.documentElement.clientWidth,document.documentElement.scrollWidth,document.documentElement.offsetWidth)}}]);function ScrollEvents(){var scrollTarget=arguments.length<=0||arguments[0]===undefined?window:arguments[0];var options=arguments.length<=1||arguments[1]===undefined?{}:arguments[1];_classCallCheck(this,ScrollEvents);var _this=_possibleConstructorReturn(this,_EventDispatcher.call(this));if(ScrollEvents.hasScrollTarget(scrollTarget)){var _ret;return _ret=ScrollEvents.getInstance(scrollTarget),_possibleConstructorReturn(_this,_ret)}_this._scrollTarget=scrollTarget;_this.options=options;_instanceMap[scrollTarget]=_this;_this.options.animationFrame=Can.animationFrame;if(_this.options.animationFrame){ScrollEvents.unprefixAnimationFrame()}_this._destroyed=false;_this._scrollY=0;_this._scrollX=0;_this._timeout=0;_this._speedY=0;_this._speedX=0;_this._lastSpeed=0;_this._lastDirection=ScrollEvents.NONE;_this._stopFrames=3;_this._currentStopFrames=0;_this._firstRender=true;_this._directionY=ScrollEvents.NONE;_this._directionX=ScrollEvents.NONE;_this._scrolling=false;_this.init();return _this}ScrollEvents.prototype.init=function init(){this.getScrollPosition=this._scrollTarget===window?(0,_delegatejs2.default)(this,this._getWindowScrollPosition):(0,_delegatejs2.default)(this,this._getElementScrollPosition);this.onScroll=(0,_delegatejs2.default)(this,this.onScroll);this.onResize=(0,_delegatejs2.default)(this,this.onResize);this.onNextFrame=(0,_delegatejs2.default)(this,this.onNextFrame);this.updateScrollPosition();if(this._scrollTarget.addEventListener){// this._scrollTarget.addEventListener('mousewheel', this.onScroll, Can.passiveEvents ? { passive: true } : false);
this._scrollTarget.addEventListener('scroll',this.onScroll,Can.passiveEvents?{passive:true}:false);this._scrollTarget.addEventListener('resize',this.onResize,false)}else if(this._scrollTarget.attachEvent){// this._scrollTarget.attachEvent('onmousewheel', this.onScroll);
this._scrollTarget.attachEvent('scroll',this.onScroll);this._scrollTarget.attachEvent('resize',this.onResize)}};ScrollEvents.prototype.update=function update(){var scrollY=this._scrollY;this.updateScrollPosition();if(scrollY!==this.y){this.dispatchEvent(ScrollEvents.EVENT_SCROLL_PROGRESS)}};ScrollEvents.prototype.destroy=function destroy(){if(!this._destroyed){this._cancelNextFrame();_EventDispatcher.prototype.destroy.call(this);if(this._scrollTarget.addEventListener){// this._scrollTarget.removeEventListener('mousewheel', this.onScroll);
this._scrollTarget.removeEventListener('scroll',this.onScroll);this._scrollTarget.removeEventListener('resize',this.onResize)}else if(this._scrollTarget.attachEvent){// this._scrollTarget.detachEvent('onmousewheel', this.onScroll);
this._scrollTarget.detachEvent('scroll',this.onScroll);this._scrollTarget.detachEvent('resize',this.onResize)}this.onResize=null;this.onScroll=null;this.getScrollPosition=null;this.onNextFrame=null;this._scrollTarget=null;this._destroyed=true}};ScrollEvents.prototype.updateScrollPosition=function updateScrollPosition(){this._scrollY=this.scrollY;// this._scrollX = this.scrollX;
};ScrollEvents.prototype._getWindowScrollPosition=function _getWindowScrollPosition(){return{y:window.pageYOffset||window.scrollY||0}};ScrollEvents.prototype._getElementScrollPosition=function _getElementScrollPosition(){return{y:this._scrollTarget.scrollTop}};ScrollEvents.prototype.onResize=function onResize(){this.dispatchEvent(ScrollEvents.EVENT_SCROLL_RESIZE)};ScrollEvents.prototype.onScroll=function onScroll(){this._currentStopFrames=0;if(this._firstRender){this._firstRender=false;if(this.scrollY>1){this.updateScrollPosition();this.dispatchEvent(ScrollEvents.EVENT_SCROLL_PROGRESS);return}}if(!this._scrolling){this._scrolling=true;this.dispatchEvent(ScrollEvents.EVENT_SCROLL_START);if(this.options.animationFrame){this.nextFrameID=window.requestAnimationFrame(this.onNextFrame)}else{clearTimeout(this._timeout);this.onNextFrame();var self=this;this._timeout=setTimeout(function(){self.onScrollStop()},100)}}};ScrollEvents.prototype.onNextFrame=function onNextFrame(){this._lastDirection=this.directionY;// this._lastSpeed = this.speedY;
this._speedY=this._scrollY-this.scrollY;// this._speedX = this._scrollX - this.scrollX;
// if(this.options.animationFrame && this._scrolling && ((this._scrollY === this.scrollY ) && (this._lastSpeed === 0 && this.speedY === 0) && (this.directionY === this._lastDirection) && (++this._currentStopFrames > this._stopFrames) /*&& this.directionY === this._lastDirection*/) ){
//   this.onScrollStop();
//   return;
// }
if(this.options.animationFrame&&this._scrolling&&this.speedY===0&&this._currentStopFrames++>this._stopFrames){this.onScrollStop();return}this.updateScrollPosition();// console.log(this._lastDirection, this.directionY);
if(this._lastDirection!==this.directionY){this.dispatchEvent('scroll:'+ScrollEvents.directionToString(this.directionY))}this.dispatchEvent(ScrollEvents.EVENT_SCROLL_PROGRESS);if(this.options.animationFrame){this.nextFrameID=window.requestAnimationFrame(this.onNextFrame)}};ScrollEvents.prototype.onScrollStop=function onScrollStop(){this._scrolling=false;this.updateScrollPosition();this.dispatchEvent(ScrollEvents.EVENT_SCROLL_STOP);if(this.scrollY<=0){this.dispatchEvent(ScrollEvents.EVENT_SCROLL_TOP)}else{if(this.scrollY+this.clientHeight>=this.scrollHeight){this.dispatchEvent(ScrollEvents.EVENT_SCROLL_BOTTOM)}}// this.dispatchEvent('scroll:none');
// this._scrollX = this.scrollX;
if(this.options.animationFrame){this._cancelNextFrame();this._currentStopFrames=0}};ScrollEvents.prototype._cancelNextFrame=function _cancelNextFrame(){window.cancelAnimationFrame(this.nextFrameID);this.nextFrameID=0};_createClass(ScrollEvents,[{key:'destroyed',get:function get(){return this._destroyed}},{key:'attr',get:function get(){return{scrollY:this.scrollY,// scrollX: this.scrollX,
speedY:this.speedY,// speedX: this.speedX,
// angle: 0,
directionY:this.directionY// directionX: this.directionX
}}},{key:'scrollPosition',get:function get(){return this.getScrollPosition()}},{key:'directionY',get:function get(){if(this.speedY===0&&!this._scrolling){this._directionY=ScrollEvents.NONE}else{if(this.speedY>0){this._directionY=ScrollEvents.UP}else if(this.speedY<0){this._directionY=ScrollEvents.DOWN}}return this._directionY}},{key:'directionX',get:function get(){if(this.speedX===0&&!this._scrolling){this._directionX=ScrollEvents.NONE}else{if(this.speedX>0){this._directionX=ScrollEvents.RIGHT}else if(this.speedX<0){this._directionX=ScrollEvents.LEFT}}return this._directionX}},{key:'scrollTarget',get:function get(){return this._scrollTarget}},{key:'delta',get:function get(){return this.directionY}},{key:'scrolling',get:function get(){return this._scrolling}},{key:'speedY',get:function get(){return this._speedY}},{key:'speedX',get:function get(){return this._speedX}},{key:'scrollY',get:function get(){return this.scrollPosition.y}},{key:'y',get:function get(){return this.scrollY}},{key:'scrollX',get:function get(){return this.scrollPosition.x}},{key:'x',get:function get(){return this.scrollX}},{key:'clientHeight',get:function get(){return this._scrollTarget===window?window.innerHeight:this._scrollTarget.clientHeight;//document.documentElement.clientHeight
}},{key:'clientWidth',get:function get(){return this._scrollTarget===window?window.innerWidth:this._scrollTarget.clientWidth;//document.documentElement.clientHeight
}},{key:'scrollHeight',get:function get(){return this._scrollTarget===window?ScrollEvents.documentHeight:this._scrollTarget.scrollHeight}},{key:'scrollWidth',get:function get(){return this._scrollTarget===window?ScrollEvents.documentHeight:this._scrollTarget.scrollHeight}}]);return ScrollEvents}(_eventdispatcher2.default);ScrollEvents.getInstance=function(_scrollTarget,options){if(!_instanceMap[_scrollTarget]){_instanceMap[_scrollTarget]=new ScrollEvents(_scrollTarget,options)}return _instanceMap[_scrollTarget]};ScrollEvents.hasInstance=function(_scrollTarget){return typeof _instanceMap[_scrollTarget]!=='undefined'};ScrollEvents.hasScrollTarget=ScrollEvents.hasInstance;ScrollEvents.clearInstance=function(){var _scrollTarget=arguments.length<=0||arguments[0]===undefined?window:arguments[0];if(ScrollEvents.hasInstance(_scrollTarget)){ScrollEvents.getInstance(_scrollTarget).destroy();delete _instanceMap[_scrollTarget]}};ScrollEvents.unprefixAnimationFrame=function(){window.requestAnimationFrame=window.requestAnimationFrame||window.mozRequestAnimationFrame||window.webkitRequestAnimationFrame||window.msRequestAnimationFrame;window.cancelAnimationFrame=window.cancelAnimationFrame||window.mozCancelAnimationFrame||window.webkitCancelAnimationFrame||window.msCancelAnimationFrame};ScrollEvents.UP=-1;ScrollEvents.DOWN=1;ScrollEvents.NONE=0;ScrollEvents.LEFT=-2;ScrollEvents.RIGHT=2;ScrollEvents.EVENT_SCROLL_PROGRESS='scroll:progress';ScrollEvents.EVENT_SCROLL_START='scroll:start';ScrollEvents.EVENT_SCROLL_STOP='scroll:stop';ScrollEvents.EVENT_SCROLL_DOWN='scroll:down';ScrollEvents.EVENT_SCROLL_UP='scroll:up';ScrollEvents.EVENT_SCROLL_TOP='scroll:top';ScrollEvents.EVENT_SCROLL_BOTTOM='scroll:bottom';ScrollEvents.EVENT_SCROLL_RESIZE='scroll:resize';exports.default=ScrollEvents;var passiveEvents=null;var Can=function(){function Can(){_classCallCheck(this,Can)}_createClass(Can,null,[{key:'animationFrame',get:function get(){return!!(window.requestAnimationFrame||window.mozRequestAnimationFrame||window.webkitRequestAnimationFrame||window.msRequestAnimationFrame)}},{key:'passiveEvents',get:function get(){if(passiveEvents!==null){return passiveEvents}try{var opts=Object.defineProperty({},'passive',{get:function get(){passiveEvents=true}});window.addEventListener('test',null,opts)}catch(e){passiveEvents=false}}}]);return Can}();module.exports=exports['default'];
},{"delegatejs":2,"eventdispatcher":3}],6:[function(_dereq_,module,exports){
'use strict';Object.defineProperty(exports,'__esModule',{value:true});exports.default=undefined;var _createClass=function(){function defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if('value'in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}return function(Constructor,protoProps,staticProps){if(protoProps)defineProperties(Constructor.prototype,protoProps);if(staticProps)defineProperties(Constructor,staticProps);return Constructor}}();var _objectAssign=_dereq_('object-assign');var _objectAssign2=_interopRequireDefault(_objectAssign);var _classname=_dereq_('classname');var _classname2=_interopRequireDefault(_classname);var _scrollEvents=_dereq_('scroll-events');var _scrollEvents2=_interopRequireDefault(_scrollEvents);var _eventdispatcher=_dereq_('eventdispatcher');var _eventdispatcher2=_interopRequireDefault(_eventdispatcher);function _interopRequireDefault(obj){return obj&&obj.__esModule?obj:{default:obj}}function _defaults(obj,defaults){var keys=Object.getOwnPropertyNames(defaults);for(var i=0;i<keys.length;i++){var key=keys[i];var value=Object.getOwnPropertyDescriptor(defaults,key);if(value&&value.configurable&&obj[key]===undefined){Object.defineProperty(obj,key,value)}}return obj}function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError('Cannot call a class as a function')}}function _possibleConstructorReturn(self,call){if(!self){throw new ReferenceError('this hasn\'t been initialised - super() hasn\'t been called')}return call&&(typeof call==='object'||typeof call==='function')?call:self}function _inherits(subClass,superClass){if(typeof superClass!=='function'&&superClass!==null){throw new TypeError('Super expression must either be null or a function, not '+typeof superClass)}subClass.prototype=Object.create(superClass&&superClass.prototype,{constructor:{value:subClass,enumerable:false,writable:true,configurable:true}});if(superClass)Object.setPrototypeOf?Object.setPrototypeOf(subClass,superClass):_defaults(subClass,superClass)}var defaults={disabled:false,className:'sticky',stateClassName:'is-sticky',fixedClass:'sticky-fixed',wrapperClass:'sticky-wrap',absoluteClass:'is-absolute',scrollClass:{down:null,up:null,none:null,persist:false}};function getScrollPosition(){return window.scrollY||window.pageYOffset||0}function getAbsolutBoundingRect(el,fixedHeight){var rect=el.getBoundingClientRect();var top=rect.top+getScrollPosition();var height=fixedHeight||rect.height;return{top:top,bottom:top+height,height:height,width:rect.width}}function addBounds(rect1,rect2){var rect=(0,_objectAssign2.default)({},rect1);rect.top-=rect2.top;rect.bottom=rect.top+rect1.height;return rect}function getPositionStyle(el){var obj={top:null,bottom:null};for(var key in obj){var value=parseInt(window.getComputedStyle(el)[key]);value=isNaN(value)?null:value;obj[key]=value}return obj}function getPreviousElementSibling(el){var prev=el.previousElementSibling;if(prev&&prev.tagName.toLocaleLowerCase()==='script'){prev=getPreviousElementSibling(prev)}return prev}var StickyState=function(_EventDispatcher){_inherits(StickyState,_EventDispatcher);function StickyState(element,options){_classCallCheck(this,StickyState);if(!element){throw new Error('StickyState needs a DomElement')}var _this=_possibleConstructorReturn(this,_EventDispatcher.call(this));if(element instanceof window.NodeList){if(element.length>1){var _ret;return _ret=StickyState.apply(element,options),_possibleConstructorReturn(_this,_ret)}else{element=element[0]}}_this.el=element;if(options&&options.scrollClass){options.scrollClass=(0,_objectAssign2.default)({},defaults.scrollClass,options.scrollClass)}_this.options=(0,_objectAssign2.default)({},defaults,options);_this.setState({sticky:false,absolute:false,fixedOffset:'',offsetHeight:0,bounds:{top:null,bottom:null,height:null,width:null},restrict:{top:null,bottom:null,height:null,width:null},style:{top:null,bottom:null},disabled:_this.options.disabled},true);_this.scrollTarget=window.getComputedStyle(_this.el.parentNode).overflow!=='auto'?window:_this.el.parentNode;_this.hasOwnScrollTarget=_this.scrollTarget!==window;if(_this.hasOwnScrollTarget){_this.updateFixedOffset=_this.updateFixedOffset.bind(_this)}_this.firstRender=true;_this.resizeHandler=null;_this.scroll=null;_this.wrapper=null;_this.eventObject={target:_this.el,currentTarget:_this};_this.render=_this.render.bind(_this);_this.addSrollHandler();_this.addResizeHandler();_this.render();return _this}StickyState.apply=function apply(elements,options){if(elements){if(elements.length){var arr=new StickyStateCollection;for(var i=0;i<elements.length;i++){arr.push(new StickyState(elements[i],options))}return arr}else{return new StickyState(elements,options)}}return null};StickyState.prototype.setState=function setState(newState,silent){this.lastState=this.state||newState;this.state=(0,_objectAssign2.default)({},this.state,newState);if(silent!==true){this.render();this.trigger(this.state.sticky?'sticky:on':'sticky:off',this.eventObject)}};StickyState.prototype.getBoundingClientRect=function getBoundingClientRect(){return this.el.getBoundingClientRect()};StickyState.prototype.getBounds=function getBounds(noCache){var clientRect=this.getBoundingClientRect();var offsetHeight=_scrollEvents2.default.documentHeight;noCache=noCache===true;if(noCache!==true&&this.state.bounds.height!==null){if(this.state.offsetHeight===offsetHeight&&clientRect.height===this.state.bounds.height){return{offsetHeight:offsetHeight,style:this.state.style,bounds:this.state.bounds,restrict:this.state.restrict}}}var style=noCache?this.state.style:getPositionStyle(this.el);var child=this.wrapper||this.el;var rect;var restrict;var offset=0;if(!Can.sticky){rect=getAbsolutBoundingRect(child,clientRect.height);if(this.hasOwnScrollTarget){var parentRect=getAbsolutBoundingRect(this.scrollTarget);offset=this.scroll.y;rect=addBounds(rect,parentRect);restrict=parentRect;restrict.top=0;restrict.height=this.scroll.scrollHeight||restrict.height;restrict.bottom=restrict.height}}else{var elem=getPreviousElementSibling(child);offset=0;if(elem){offset=parseInt(window.getComputedStyle(elem)['margin-bottom']);offset=offset||0;rect=getAbsolutBoundingRect(elem);if(this.hasOwnScrollTarget){rect=addBounds(rect,getAbsolutBoundingRect(this.scrollTarget));offset+=this.scroll.y}rect.top=rect.bottom+offset}else{elem=child.parentNode;offset=parseInt(window.getComputedStyle(elem)['padding-top']);offset=offset||0;rect=getAbsolutBoundingRect(elem);if(this.hasOwnScrollTarget){rect=addBounds(rect,getAbsolutBoundingRect(this.scrollTarget));offset+=this.scroll.scrollY}rect.top=rect.top+offset}if(this.hasOwnScrollTarget){restrict=getAbsolutBoundingRect(this.scrollTarget);restrict.top=0;restrict.height=this.scroll.scrollHeight||restrict.height;restrict.bottom=restrict.height}rect.height=child.clientHeight;rect.width=child.clientWidth;rect.bottom=rect.top+rect.height}restrict=restrict||getAbsolutBoundingRect(child.parentNode);return{offsetHeight:offsetHeight,style:style,bounds:rect,restrict:restrict}};StickyState.prototype.updateBounds=function updateBounds(silent,noCache){silent=silent===true;noCache=noCache===true;this.setState(this.getBounds(noCache),silent)};StickyState.prototype.updateFixedOffset=function updateFixedOffset(){this.lastState.fixedOffset=this.state.fixedOffset;if(this.state.sticky){this.state.fixedOffset=this.scrollTarget.getBoundingClientRect().top+'px'}else{this.state.fixedOffset=''}if(this.lastState.fixedOffset!==this.state.fixedOffset){this.render()}};StickyState.prototype.addSrollHandler=function addSrollHandler(){if(!this.scroll){var hasScrollTarget=_scrollEvents2.default.hasScrollTarget(this.scrollTarget);this.scroll=_scrollEvents2.default.getInstance(this.scrollTarget);this.onScroll=this.onScroll.bind(this);this.onScrollDirection=this.onScrollDirection.bind(this);this.scroll.on('scroll:start',this.onScroll);this.scroll.on('scroll:progress',this.onScroll);this.scroll.on('scroll:stop',this.onScroll);this.scroll.on('scroll:up',this.onScrollDirection);this.scroll.on('scroll:down',this.onScrollDirection);if(!this.options.scrollClass.persist){this.scroll.on('scroll:stop',this.onScrollDirection)}if(hasScrollTarget&&this.scroll.scrollY>0){this.scroll.trigger('scroll:progress')}}};StickyState.prototype.removeSrollHandler=function removeSrollHandler(){if(this.scroll){this.scroll.off('scroll:start',this.onScroll);this.scroll.off('scroll:progress',this.onScroll);this.scroll.off('scroll:stop',this.onScroll);this.scroll.off('scroll:up',this.onScrollDirection);this.scroll.off('scroll:down',this.onScrollDirection);this.scroll.off('scroll:stop',this.onScrollDirection);this.scroll.destroy();this.scroll=null}};StickyState.prototype.addResizeHandler=function addResizeHandler(){if(!this.resizeHandler){this.resizeHandler=this.onResize.bind(this);window.addEventListener('resize',this.resizeHandler,false);window.addEventListener('orientationchange',this.resizeHandler,false)}};StickyState.prototype.removeResizeHandler=function removeResizeHandler(){if(this.resizeHandler){window.removeEventListener('resize',this.resizeHandler);window.removeEventListener('orientationchange',this.resizeHandler);this.resizeHandler=null}};StickyState.prototype.getScrollClassObj=function getScrollClassObj(obj){obj=obj||{};var direction=this.scroll.directionY;if(this.options.scrollClass.up||this.options.scrollClass.down){obj[this.options.scrollClass.up]=direction<0;obj[this.options.scrollClass.down]=direction>0}return obj};StickyState.prototype.onScrollDirection=function onScrollDirection(e){if(this.state.sticky||e.type===_scrollEvents2.default.EVENT_SCROLL_STOP){this.el.className=(0,_classname2.default)(this.el.className,this.getScrollClassObj())}};StickyState.prototype.onScroll=function onScroll(e){this.updateStickyState(false);if(this.hasOwnScrollTarget&&!Can.sticky){this.updateFixedOffset();if(this.state.sticky&&!this.hasWindowScrollListener){this.hasWindowScrollListener=true;_scrollEvents2.default.getInstance(window).on('scroll:progress',this.updateFixedOffset)}else if(!this.state.sticky&&this.hasWindowScrollListener){this.hasWindowScrollListener=false;_scrollEvents2.default.getInstance(window).off('scroll:progress',this.updateFixedOffset)}}};StickyState.prototype.update=function update(){this.updateBounds(true,true);this.updateStickyState(false)};StickyState.prototype.onResize=function onResize(e){this.update()};StickyState.prototype.getStickyState=function getStickyState(){if(this.state.disabled){return{sticky:false,absolute:false}}var scrollY=this.scroll.y;var top=this.state.style.top;var bottom=this.state.style.bottom;var sticky=this.state.sticky;var absolute=this.state.absolute;if(top!==null){var offsetBottom=this.state.restrict.bottom-this.state.bounds.height-top;top=this.state.bounds.top-top;if(this.state.sticky===false&&scrollY>=top&&scrollY<=offsetBottom){sticky=true;absolute=false}else if(this.state.sticky&&(scrollY<top||scrollY>offsetBottom)){sticky=false;absolute=scrollY>offsetBottom}}else if(bottom!==null){scrollY+=window.innerHeight;var offsetTop=this.state.restrict.top+this.state.bounds.height-bottom;bottom=this.state.bounds.bottom+bottom;if(this.state.sticky===false&&scrollY<=bottom&&scrollY>=offsetTop){sticky=true;absolute=false}else if(this.state.sticky&&(scrollY>bottom||scrollY<offsetTop)){sticky=false;absolute=scrollY<=offsetTop}}return{sticky:sticky,absolute:absolute}};StickyState.prototype.updateStickyState=function updateStickyState(silent){var values=this.getStickyState();if(values.sticky!==this.state.sticky||values.absolute!==this.state.absolute){silent=silent===true;values=(0,_objectAssign2.default)(values,this.getBounds());this.setState(values,silent)}};StickyState.prototype.render=function render(){var className=this.el.className;var classNameObj={};if(this.firstRender){this.firstRender=false;if(!Can.sticky){this.wrapper=document.createElement('div');this.wrapper.className=this.options.wrapperClass;var parent=this.el.parentNode;if(parent){parent.insertBefore(this.wrapper,this.el)}this.wrapper.appendChild(this.el);classNameObj[this.options.fixedClass]=true}this.updateBounds(true);this.updateStickyState(true)}if(!Can.sticky){var height=this.state.disabled||this.state.bounds.height===null||!this.state.sticky&&!this.state.absolute?'auto':this.state.bounds.height+'px';this.wrapper.style.height=height;if(this.state.absolute!==this.lastState.absolute){this.wrapper.style.position=this.state.absolute?'relative':'';classNameObj[this.options.absoluteClass]=this.state.absolute;this.el.style.marginTop=this.state.absolute&&this.state.style.top!==null?this.state.restrict.height-(this.state.bounds.height+this.state.style.top)+(this.state.restrict.top-this.state.bounds.top)+'px':'';this.el.style.marginBottom=this.state.absolute&&this.state.style.bottom!==null?this.state.restrict.height-(this.state.bounds.height+this.state.style.bottom)+(this.state.restrict.bottom-this.state.bounds.bottom)+'px':''}if(this.hasOwnScrollTarget&&!this.state.absolute&&this.lastState.fixedOffset!==this.state.fixedOffset){this.el.style.marginTop=this.state.fixedOffset}}classNameObj[this.options.stateClassName]=this.state.sticky;classNameObj=this.getScrollClassObj(classNameObj);className=(0,_classname2.default)(className,classNameObj);if(this.el.className!==className){this.el.className=className}return this.el};_createClass(StickyState,null,[{key:'native',get:function get(){return Can.sticky}}]);return StickyState}(_eventdispatcher2.default);exports.default=StickyState;var _canSticky=null;var _passiveEvents=null;var Can=function(){function Can(){_classCallCheck(this,Can)}_createClass(Can,null,[{key:'sticky',get:function get(){if(_canSticky!==null){return _canSticky}if(typeof window!=='undefined'){if(window.Modernizr&&window.Modernizr.hasOwnProperty('csspositionsticky')){return _globals.canSticky=window.Modernizr.csspositionsticky}var testEl=document.createElement('div');document.documentElement.appendChild(testEl);var prefixedSticky=['sticky','-webkit-sticky','-moz-sticky','-ms-sticky','-o-sticky'];_canSticky=false;for(var i=0;i<prefixedSticky.length;i++){testEl.style.position=prefixedSticky[i];_canSticky=!!window.getComputedStyle(testEl).position.match('sticky');if(_canSticky){break}}document.documentElement.removeChild(testEl)}return _canSticky}},{key:'passiveEvents',get:function get(){if(_passiveEvents!==null){return _passiveEvents}try{var opts=Object.defineProperty({},'passive',{get:function get(){_passiveEvents=true}});window.addEventListener('test',null,opts)}catch(e){_passiveEvents=false}}}]);return Can}();var StickyStateCollection=function(_EventDispatcher2){_inherits(StickyStateCollection,_EventDispatcher2);function StickyStateCollection(){_classCallCheck(this,StickyStateCollection);var _this2=_possibleConstructorReturn(this,_EventDispatcher2.call(this));_this2.items=[];return _this2}StickyStateCollection.prototype.push=function push(item){this.items.push(item)};StickyStateCollection.prototype.addListener=function addListener(event,listener){var i=-1;while(++i<this.items.length){this.items[i].addListener(event,listener)}return this};StickyStateCollection.prototype.removeListener=function removeListener(event,listener){var i=-1;while(++i<this.items.length){this.items[i].removeListener(event,listener)}return this};return StickyStateCollection}(_eventdispatcher2.default);module.exports=exports['default'];

},{"classname":1,"eventdispatcher":3,"object-assign":4,"scroll-events":5}]},{},[6])(6)
});