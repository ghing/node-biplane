node-biplane
============

A Node.js wrapper around [TCB Courier's](http://www.tcbcourier.com/) Airplanes in the Sky dispatch system that allows programatic access to the data in the web-based views that don't have endpoints in the [official API](https://github.com/tcbcourier/airplanes-php).

Example
-------

```
var biplane = require('biplane');

var api = new biplane.Biplane({
  baseUrl: 'https://airplaneinthesky.appspot.com',
  username: process.env.AIRPLANE_USERNAME,
  password: process.env.AIRPLANE_PASSWORD
});

// Get a list of today's jobs and output them to the console. 
api.export({
  date: 'today'
}, function(jobs) {
  console.dir(jobs);
});
```

LICENSE
-------

MIT
