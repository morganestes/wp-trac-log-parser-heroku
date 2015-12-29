var express = require('express');
var router = express.Router();

var tracParser = require('../wp-trac-log-parse');
var marked = require('marked');

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', {title: 'WP Trac Log Parser'});
});

router.post('/', function (req, res) {
  var newest = req.body['startRevision'];
  var oldest = parseInt(req.body['stopRevision'], 10);
  var limit = parseInt(req.body['revisionLimit'], 10);

  tracParser.getLogs(newest, oldest, limit);

  this.setTimeout(function () {
    var report = tracParser.getReport();
    console.dir(report, {depth: null, colors: true});

    res.render('trac', {
      title: 'Logs parsed for revisions %1$s to %2$s'.replace('%1$s', oldest.toString()).replace('%2$s', newest.toString()),
      log: {html: marked(report), raw: report}
    });
    res.end();
  }, 8000);
});

module.exports = router;
