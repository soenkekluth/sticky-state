#StickyState

StickyState adds state to position:sticky elements and also polyfills the missing native sticky feature.

Today's browsers do not all support the position:sticky feature (which by the way is being used (polyfilled) on pretty much every site you visit) - moreover the native supported feature itself comes without a readable state. Something like `a:hover => div:sticky` to add different styles to the element in its sticky state - or to read the state if needed in JavaScript. 

Unlike almost all polyfills you can find in the wild, StickyState is highly performant. The calculations are reduced to a minimum by persisting several attributes.

### Dependencies
none!

### Browser support
IE >= 9, *

### install
```
npm install sticky-state
```
### demo
https://rawgit.com/soenkekluth/sticky-state/master/examples/index.html

### css
Your css should contain the following lines: 
(you can specify the classNames in js)
```css
.sticky {
  position: sticky;
}

.sticky.sticky-fixed.is-sticky {
  position: fixed;
  backface-visibility: hidden;
}

.sticky.sticky-fixed.is-absolute {
  position: absolute;
}
```

### js
```javascript

var StickyState = require('sticky-state');

new StickyState(yourElement);
// or for all elements with class .sticky
StickyState.apply(document.querySelectorAll('.sticky'));

// stickyOptions shows the props you can set.

var stickyOptions = {
  disabled:       false,
  className:      'sticky',
  stateClassName: 'is-sticky',
  fixedClass:     'sticky-fixed',
  wrapperClass:   'sticky-wrap',
  absoluteClass:  'is-absolute'
};

new StickyState(yourElement, stickyOptions);
// or for all elements with class .sticky
StickyState.apply(document.querySelectorAll('.sticky'), stickyOptions);
// for example
```

### React Component
https://github.com/soenkekluth/react-sticky-state
