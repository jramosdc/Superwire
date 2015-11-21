'use strict';
// jshint eqeqeq: false

/*!
 * sc-components
 * Copyright(c) 2014 Madhusudhan Srinivasa <madhu@changer.nl>
 * MIT Licensed
 */

/*!
 * Module dependencies.
 */

var express = require('express');
var _url = require('url');
var app = express();

var port = process.env.PORT || 3000;
var items = [];

for (var i = 0; i < 100; i++) {
  items.push({
    id: i,
    name: 'item ' + i,
    description: 'bla bla bla '+ i,
    age: Math.floor(Math.random() * 100)
  });
}

app.use(express.static(__dirname + '/src'));
app.use(express.static(__dirname + '/examples'));
app.use(express.static(__dirname + '/coverage/PhantomJS 1.9.7 (Mac OS X)'));

app.get('/items', function (req, res) {
  var _items = items;
  var url = _url.parse(req.originalUrl, true);
  var exp = req.method + ' ' + url.pathname;
  var params = url.query || {};
  var limit = parseInt(params.limit) || 20;
  var page = parseInt(params.page) || 0;
  var filter = params.filter;
  var sort_by = params.sort_by || 'name';
  var sort_type = parseInt(params.sort_type) || 1;

  // Apply filters
  if (filter) {
    _items = _items.filter(function (item) {
      var regex = new RegExp(filter);
      return regex.test(item.name) || regex.test(item.description);
    });
  }

  // Sort
  _items = _items.sort(function (a, b) {
    return alphanum(a[sort_by], b[sort_by]);
  });
  if (sort_type === -1) {
    _items = _items.reverse();
  }

  _items = _items.slice(limit * page, limit * (page + 1));

  // timeout
  setTimeout(function(){
    res.json(_items);
  }, 2000);
});

app.listen(port);
console.log('Express app started on port ' + port);

/**
 * alphanumeric sorting
 */

function alphanum (a, b) {

  function chunkify(t) {
    var tz = [];
    var x = 0, y = -1, n = 0, i, j;

    while (i = (j = t.charAt(x++)).charCodeAt(0)) {
      var m = (i == 46 || (i >=48 && i <= 57));
      if (m !== n) {
        tz[++y] = '';
        n = m;
      }
      tz[y] += j;
    }
    return tz;
  }

  var aa = chunkify(a.toString());
  var bb = chunkify(b.toString());

  for (var x = 0; aa[x] && bb[x]; x++) {
    if (aa[x] !== bb[x]) {
      var c = Number(aa[x]), d = Number(bb[x]);
      if (c == aa[x] && d == bb[x]) {
        return c - d;
      } else return (aa[x] > bb[x]) ? 1 : -1;
    }
  }
  return aa.length - bb.length;
}
