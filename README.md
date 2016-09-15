#StickyState

StickyState adds state to position:sticky elements and also polyfills the missing native sticky feature.

Dependency free, pure Javascript for IE9+.

Today's browsers do not all support the position:sticky feature (which by the way is being used (polyfilled) on pretty much every site you visit) - moreover the native supported feature itself comes without a readable state. Something like `a:hover => div:sticky` to add different styles to the element in its sticky state - or to read the state if needed in JavaScript. 

Unlike almost all polyfills you can find in the wild, StickyState is highly performant. The calculations are reduced to a minimum by persisting several attributes.

In some cases you also need to know in which direction the user scrolls - for example if you want to hide a sticky header when the user scrolls up. if you set the scrollClass property of the options StickyState will add your choosen classNames to the element when it is sticky and scrolling.

As a standalone Library its 6.9kb gzipped. 

### Dependencies
none!

### Browser support
IE >= 9, *

### install
```
npm install sticky-state
```
### demo
#### all you can eat
https://rawgit.com/soenkekluth/sticky-state/master/examples/index.html

#### headroom style
https://rawgit.com/soenkekluth/sticky-state/master/examples/headroom.html

### css
Your css should contain the following lines: 
(you can specify the classNames in js)
```css
.sticky {
  position: -webkit-sticky;
  position: sticky;
}

.sticky.sticky-fixed.is-sticky {
  position: fixed;
  -webkit-backface-visibility: hidden;
  -moz-backface-visibility: hidden;
  backface-visibility: hidden;
}

.sticky.sticky-fixed.is-sticky:not([style*="margin-top"]) {
  margin-top: 0 !important;
}
.sticky.sticky-fixed.is-sticky:not([style*="margin-bottom"]) {
  margin-bottom: 0 !important;
}

.sticky.sticky-fixed.is-absolute{
  position: absolute;
}

```

### js
```javascript

var StickyState = require('sticky-state');

new StickyState(yourElement);

//  all elements with class .sticky will have sticky state:
new StickyState(document.querySelectorAll('.sticky'))

// the props you can set:
var stickyOptions = {
  disabled:       false,
  className:      'sticky',
  stateClassName: 'is-sticky',
  fixedClass:     'sticky-fixed',
  wrapperClass:   'sticky-wrap',
  absoluteClass:  'is-absolute',
  scrollClass:{
    down: 'sticky-scroll-down',
    up: 'sticky-scroll-up'
  }
};

// instantiate with options
var stickyElements = new StickyState(document.querySelectorAll('.sticky'), stickyOptions);

// events:
stickyElements
  .on('sticky:on', function(e){console.log('sticky:on', e.target);})
  .on('sticky:off', function(e){console.log('sticky:off' ,e.target);});
  
```

### React Component
https://github.com/soenkekluth/react-sticky-state
