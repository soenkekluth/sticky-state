#StickyState

StickyState ads state to position:sticky elements and also polyfills the missing native sticky feature.
StickyState is high perfomant. all attributes needed to calculate the position and determine the state of the DOM element are persistant. only updated on resize or if you force them to.

###install
```
npm install sticky-state
```
### demo
https://rawgit.com/soenkekluth/sticky-state/master/examples/index.html

###css
your css should contain the following lines: 
(you can specify the classNames in js)
```css
.sticky {
  position: sticky;
  top: 0;
}

.sticky.sticky-fixed.is-sticky {
  position: fixed;
  backface-visibility: hidden;
}
```

###js
```javascript
var StickyState = require('sticky-state');
new StickyState(yourElement, yourOptions);
```
