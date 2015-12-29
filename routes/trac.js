var express = require('express');
var router = express.Router();
var tracParser = require('../wp-trac-log-parse');


/* GET log page. */
router.get('/', function (req, res) {
  console.log(req.query);
  res.render('trac', {
    title: 'Requesting logs for changesets %1$s to %2$s'.replace('%1$s', req.query.stopRevision).replace('%2$s', req.query.startRevision),
    logData: 'Please use the form on the homepage to submit queries.'
  });

}).post('/', function (req, res) {
  var newest = req.body['startRevision'];
  var oldest = parseInt(req.body['stopRevision'], 10);

  tracParser.getLogs(newest, oldest);

  this.setTimeout(function () {
    console.info('posted to /trac: from %d to %d', oldest, newest);
    console.dir(process.children, {depth: null, colors: true});
    var report = tracParser.getReport();
    console.dir(report, {depth: null, colors: true});

    res.render('trac', {
      title: 'Logs parsed for revisions %1$s to %2$s'.replace('%1$s', oldest.toString()).replace('%2$s', newest.toString()),
      logData: report
    });
    res.end();
  }, 8000);
});

module.exports = router;
