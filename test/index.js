var jsdom = require('jsdom');
var path = require('path');
var StickyState = require('../dist/stickystate');


var p = path.resolve(__dirname, 'index.html');


jsdom.env({
  file: p,
  done: function(err, window) {

    global.window = window;
    global.document = window.document;

    var stickies = new StickyState(window.document.querySelectorAll('.sticky'), {
        scrollClass: {
          down: 'sticky-scroll-down',
          up: 'sticky-scroll-up'
        }
      })
      .on('sticky:on', function(e) { console.log('sticky:on', e.target.id); })
      .on('sticky:off', function(e) { console.log('sticky:off', e.target.id); });

      console.log(StickyState.native);

  }
});
