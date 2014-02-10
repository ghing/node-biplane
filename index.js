var request = require('request');
var querystring = require('querystring');
var oogle = require('./oogle');
var csv = require('csv');
var cheerio = require('cheerio');

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

  // completed
  job.completed = row[20];

  // deliver_to.when.before
  job.deliverBefore = row[36];

  // owner
  // Currently in the form "Key('UserProfile', 22001)".  Use a regex to parse
  // out just the ID.
  job.ownerId = row[6] ? parseUserProfileId(row[6]) : null;

  // payment.order_total
  job.orderTotal = row[7] ? parsePrice(row[7]) : null;

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
  job.tip = row[18] ? parsePrice(row[18], row[18]) : null;

  // payment.method
  job.paymentMethod = row[25];

  // payment.delivery_fee
  job.deliveryFee = row[38] ? parsePrice(row[38]) : null;

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

var parseRole = function(text) {
  var re = /.*(Administrator|Client|Inactive|Staff).*/i;
  var result = re.exec(text);

  if (result === null) {
    return null;
  }

  return result[1];
};

var parseContactInfo = function(text) {
  var contactInfo = {};
  var lines = text.split('\n');
  var parts;

  for (var i = 0; i < lines.length; i++) {
    parts = lines[i].split(':');
    if (parts.length > 1) {
      contactInfo[parts[0].trim().toLowerCase()] = parts[1].trim();
    }
  }

  return contactInfo;
};

Biplane.prototype.parseProfiles = function(body, callback) {
  var that = this;
  var $ = cheerio.load(body);
  var profiles = [];

  $('table').first().find('tr').each(function(i, elem) {
    // First row is the header
    if (i > 0) {
      var $row = $(this);
      var profile = {
        id: $row.find('td').eq(0).text(),
        name: $row.find('td').eq(1).text(),
        role: parseRole($row.find('td').eq(3).text())
      };
      var contactInfo = parseContactInfo($row.find('td').eq(2).text());

      if (contactInfo.phone) {
        profile.phone = contactInfo.phone;
      }

      if (contactInfo.email) {
        profile.email = contactInfo.email;
      }

      profiles.push(profile);
    }
  });

  callback(profiles);
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

Biplane.prototype.profiles = function(callback) {
  var that = this;
  var url = this._baseUrl + 'profiles';

  if (!this._authenticated) {
    oogle({
      startUrl: this._baseUrl + 'login_rider',
      url: url,
      username: this.options.username,
      password: this.options.password
    }, function(error, response, body) {
       that._authenticated = true;
       that.parseProfiles(body, callback);
    });
  }
  else {
    request(url, function(error, response, body) {
      that.parseProfiles(body, callback);
    });
  }
};

