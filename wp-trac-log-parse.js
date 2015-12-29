#!/usr/bin/env node

/**
 * Parser for WordPress Trac Logs
 */
var $ = require("cheerio");
var _ = require("underscore");
var async = require("async");
var https = require('https');
var request = require('request');
var url = require('url');
var util = require('util');
var querystring = require('querystring');
var startRevision = 3000;
var stopRevision = 3200;
var revisionLimit = 400;
var logHTML = '';
var changesets = [];
var report = '';

/**
 * Gets the HTML generated by the Trac report.
 *
 * @returns {String} The HTML of the Trac report.
 */
function getRemoteLogHtml() {
  var tracUrl;
  var remoteHtml = '';

  var baseUrl = 'https://core.trac.wordpress.org/log';
  var queryArgs = {
    rev: startRevision,
    stop_rev: stopRevision,
    limit: revisionLimit,
    verbose: 'on'
  };
  tracUrl = baseUrl + '?' + querystring.stringify(queryArgs);

  console.log("Downloading from %s…", tracUrl);

  https.get(tracUrl, function (res) {
    //console.log("statusCode: ", res.statusCode);
    //console.dir(res.headers, {depth: null, colors: true});

    res.on('data', function (chunk) {
      //console.log('got %d bytes of data', chunk.length);
      //process.stdout.write(chunk);
      remoteHtml += chunk;
      //console.log( 'on data: %s', remoteHtml);
    });
    res.on('end', function () {
      console.log('HTML retrieved from remote server.');
      logHTML = remoteHtml;
      //console.log('html end: %s', logHTML);
      buildChangesets.call(logHTML);
    });

    // res.resume();

  }).on('error', function (e) {
    console.error(e.message);
  });

  //console.log('html from getRemoteLogHtml: %s', logHTML);
  //async.apply(buildChangesets);
}

/**
 * Builds the changesets based on the HTML from Trac.
 *
 * @returns {Array} An array of changesets.
 */
function buildChangesets() {
  //console.log('buildChangesets logHTML: %s', logHTML);
  var logEntries = $.load(logHTML)('tr.verbose');

  // Each Changeset has two Rows. We Parse them both at once.
  for (var i = 0, l = logEntries.length; i < l; i += 2) {
    var changeset = {},
        props, description, related;

    if (util.isNull(logEntries[i + 1])) {
      break;
    }

    changeset.revision = $(logEntries[i]).find('td.rev').text().trim().replace(/@(.*)/, '[$1]');
    changeset.author = $(logEntries[i]).find('td.author').text().trim();

    description = $(logEntries[i + 1]).find('td.log');

    // Re-add `` for code segments.
    $(description).find('tt').each(function () {
      $(this).replaceWith('`' + $(this).text() + '`');
    });

    // Store "Fixes" or "See" tickets.
    changeset.related = [];
    changeset.component = [];
    $(description).find('a.ticket').each(function () {
      var ticket = $(this).text().trim().replace(/#(.*)/, '$1');
      changeset.related.push(ticket);
    });

    // Create base description
    changeset.description = description.text();

    // Try to grab the component from the commit
    //var matches = /([\w\/]+:)/gi.exec(changeset.description.toString());
    //if(matches[0] !== null){
    //  console.dir(matches[0]);
    //}
    //changeset.component = util.isNullOrUndefined(matches[1]) ? '' : matches[1];

    // For now, get rid of Fixes and See notes. Should we annotate in summary?
    changeset.description = changeset.description.replace(/[\n|, ]Fixes(.*)/i, '');
    changeset.description = changeset.description.replace(/\nSee(.*)/i, '');

    // Extract Props
    var propsRegex = /(?:Props:?\s+)(.*)\.?/mi;
    changeset.props = [];

    props = changeset.description.match(propsRegex);
    if (props !== null) {
      changeset.props = cleanProps(props[1]);
    }

    // Remove Props
    changeset.description = changeset.description.replace(propsRegex, '');

    // Limit to 2 consecutive carriage returns
    changeset.description = changeset.description.replace(/\n\n\n+/g, '\n\n');
    changeset.description = changeset.description.trim();

    changesets.push(changeset);
  }

  //console.log('changesets from buildChangesets');
  //console.dir(changesets, {depth: null, colors: false});

  //gatherComponentsFromChangesets(changesets);
  //buildOutput.call(changesets);
  buildOutput();
}

/**
 * Grabs the components from Trac for a given changeset.
 *
 * @returns {Array} The changeset list with added components when able.
 */
function gatherComponentsFromChangesets() {
  var ticketPath = "https://core.trac.wordpress.org/ticket/";
  var component = '';
  if (process.env.debug) {
    request.debug = true;
  }

  async.eachSeries(changesets, function getRelatedTickets(changeset) {
        async.each(changeset['related'], function getTicketComponent(ticket) {
              request(ticketPath + ticket, {
                timeout: 4400,
                gzip: true,
                jar: true
              }, function (error, response, body) {
                if (!error && response.statusCode === 200) {
                  console.info('loading changeset data for: %s', changeset.revision);
                  component = $.load(body)("#h_component").next("td").text().trim();
                  changeset['component'].push(component.toString());
                  console.log('changeset %s updated to component "%s"', changeset.revision, component);
                  console.dir(changeset, {depth: null, colors: true});
                }
              });
            },
            function (err) {
              if (err) {
                console.error(err);
              } else {
                console.dir(changeset.related);
                console.log('related tickets for %s updated', changeset.revision);
              }
            });
      },
      function (err) {
        if (err) {
          console.error(err);
        } else {
          console.log('changesets after gatherComponentsFromChangesets');
          console.dir(changesets, {depth: null, colors: true});
          //async.apply(buildOutput);
          buildOutput.call(changesets);
        }
      });
}

/**
 * Build the markdown output from the collected changesets.
 *
 * @returns {String} A markdown-like report from Trac.
 */
function buildOutput() {
// Reconstitute Log and Collect Props
  var propsOutput;
  var changesetOutput = '';
  var props = [];
  var categories = {};
  var category = '';

  async.map(changesets,
      function (item) {
        category = item.component;

        if (!category) {
          category = 'Misc';
        }

        if (!categories[category]) {
          categories[category] = [];
        }

        categories[item.component].push(item);
      }
  );

  _.each(categories, function (category) {
    changesetOutput += "### " + category[0].component + "\n";

    _.each(category, function (changeset) {
      changesetOutput += '* ' +
          changeset.description.trim() + ' ' +
          changeset.revision + ' ' +
          '#' + changeset.related.join(', #') + "\n";

      // Make sure Committers get credit
      props.push(changeset.author);

      // Sometimes Committers write their own code.
      // When this happens, there are no additional props.
      if (changeset.props.length !== 0) {
        props = props.concat(changeset.props);
      }

    });
  });

  // Collect Props and sort them.
  props = _.uniq(props.sort(function (a, b) {
    return a.toLowerCase().localeCompare(b.toLowerCase());
  }), true);

  //TODO: check for invalidUserNames() in props

  propsOutput = util.format(
      'Thanks to @%s, and @%s for their contributions!',
      _.without(props, _.last(props)).join(', @'),
      _.last(props)
  );

  // Output!
  //report = changesetOutput + "\n\n" + propsOutput;
  report += "## Code Changes\n\n" + changesetOutput;
  report += "\n## Props\n\n" + propsOutput;
  process.stdout.write(report);
}

/**
 * Takes a string of names from the Props line in a changeset
 * and cleans it up for further use.
 *
 * @param {String} props The list of names from a changeset.
 * @return {Array} The (maybe) cleaned up list of names as an array.
 */
function cleanProps(props) {
  var _props = props
      .replace(/(for.*(,))/ig, '') //for the thing, anothername
      .replace(/(for.*(\.))/, '') //for the thing.
      .replace(/\./gmi, '')
      .trim()
      .replace(/\s/g, ',')
      .split(/\s*,\s*/);

  return _.without(_props, '');
}

/**
 * The main function to kick off the report generation.
 *
 * @param {Number} start The newest (highest-numbered) changeset.
 * @param {Number} stop The oldest (lowest-numbered) changeset.
 * @param {Number} [limit] Optional. The max number of revisions to get. Default 400.
 * @returns {string|String|*} The generated report in markdown.
 */
function processLogs(start, stop, limit) {
  start = parseInt(start, 10);
  stop = parseInt(stop, 10);
  limit = parseInt(limit, 10);

  startRevision = isNaN(start) ? startRevision : start;
  stopRevision = isNaN(stop) ? stopRevision : stop;
  revisionLimit = isNaN(limit) ? revisionLimit : limit;

  console.log('start: %s, stop: %s, limit: %s', startRevision, stopRevision, revisionLimit);

  getRemoteLogHtml();

  console.log(report);
  return report;
}

function getReport() {
  "use strict";
  return report;
}

module.exports.getLogs = processLogs;
module.exports.getReport = getReport;
