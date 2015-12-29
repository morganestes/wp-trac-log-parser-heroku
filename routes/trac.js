var express = require('express');
var router = express.Router();
var tracParser = require('../wp-trac-log-parse');


/* GET log page. */
router.get('/', function (req, res) {
  "use strict";
  console.log(req.query);
  res.render('trac', {
    title: 'Requesting logs for changesets %1$s to %2$s'.replace('%1$s', req.query.stopRevision).replace('%2$s', req.query.startRevision),
    logData: 'Please use the form on the homepage to submit queries.'
  });

}).post('/', function (req, res) {
  "use strict";
  var newest = parseInt(req.body.startRevision, 10);
  var oldest = parseInt(req.body.stopRevision, 10);
  var tracLogs = tracParser.getLogs(newest, oldest);

  console.info('posted to /trac: from %d to %d', newest, oldest);

 // console.dir(res, {depth: null, colors: true});

  res.render('trac', {
    title: 'Logs parsed for revisions %1$s to %2$s'.replace('%1$s', oldest.toString()).replace('%2$s', newest.toString()),
    logData: tracLogs,
    tracReportUrl: ''
  });
  res.end();
});

module.exports = router;
