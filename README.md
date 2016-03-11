#StickyState

StickyState ads state to position:sticky elements and also polyfills the missing sticky feature
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
