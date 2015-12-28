var express = require('express');
var router = express.Router();
var parser = require('wp-trac-log-parse');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/helloworld', function(req, res) {
  "use strict";
  res.render('helloworld', {title: 'Hello, World!'});
});

/* GET log page. */
router.get('/trac', function (req, res) {
  "use strict";


  res.render('trac', {
    title: 'WP Trac Report',
    markup: 'This is where the log data will appear.'
  });
});

module.exports = router;
