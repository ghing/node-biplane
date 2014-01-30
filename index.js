var request = require('request');
var querystring = require('querystring');
var oogle = require('./oogle');
var csv = require('csv');

function parseUserProfileId(s) {
  var matches = s.match(/\d+/);
  return matches ? matches[0] : null;
}

function parsePrice(s, dft) {
  dft = dft || null;
  var matches = s.match(/\d+\.\d{2}/);
  return matches ? parseFloat(matches[0]) : dft;
}

var Biplane = module.exports.Biplane = function(opts) {
  this.options = opts;
  this._baseUrl = this.options.baseUrl;
};

Biplane.prototype.parseJobRow = function(row) {
  var job = {};
  var matches;

  // deliver_to.when.after
  job.deliverAfter = row[2]; 

  // order_date
  job.orderDate = row[5];

  // created
  job.created = row[32];

  // deliver_to.when.before
  job.deliverBefore = row[36];

  // owner
  // Currently in the form "Key('UserProfile', 22001)".  Use a regex to parse
  // out just the ID.
  job.ownerId = row[6] ? parseUserProfileId(row[6]) : null;

  // payment.order_total
  job.orderTotal = parsePrice(row[7]);

  // id
  job.id = row[8];

  // deliver_to.where.street
  job.deliverTo = row[9];

  // client
  // Currently in the form "Key('UserProfile', 22001)".  Use a regex to parse
  // out just the ID.
  job.clientId = row[13] ? parseUserProfileId(row[13]) : null;

  // status 
  job.status = row[17];

  // payment.tip (watch out for values like "Will tip with cash")
  job.tip = parsePrice(row[18], row[18]);

  // payment.method
  job.paymentMethod = row[25];

  // payment.delivery_fee
  job.deliveryFee = parsePrice(row[38]);

  return job;
};

Biplane.prototype.parseJobsCSV = function(body, callback) {
  var that = this;

  csv().from.string(body)
  .to.array(function(data) {
    var jobs = [];
    // i starts at 1 to skip header row
    for (var i = 1; i < data.length; i++) {
      jobs.push(that.parseJobRow(data[i]));
    }
    callback(jobs);
  });
};

Biplane.prototype.export = function(opts, callback) {
  var that = this;
  var url = this._baseUrl + 'jobs/export' + '?' +  querystring.stringify(opts);

  if (!this._authenticated) {
    oogle({
      startUrl: this._baseUrl + 'login_rider',
      url: url,
      username: this.options.username,
      password: this.options.password
    }, function(error, response, body) {
       that._authenticated = true;
       that.parseJobsCSV(body, callback);
    });
  }
  else {
    request(url, function(error, response, body) {
      that.parseJobsCSV(body, callback);
    });
  }
};
