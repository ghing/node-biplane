var request = require('request');
var cheerio = require('cheerio');
var url = require('url');

/**
 * Make an HTTP Request a page protected by Google's Auth System.
 *
 * This is a workaround for scraping AppEngine applications that don't
 * implement an API with OAuth authentication.  It's a terrible hack
 * and should be avoided if at all possible.
 */
var oogle = module.exports = function(options, callback) {
  options.jar = options.jar || true;
  request({
    url: options.startUrl || options.url, 
    method: options.method || "GET",
    jar: options.jar 
  }, function(error, response, body) {
    var $ = cheerio.load(body);
    var $form = $('form#gaia_loginform');
    var formUrl = $form.attr('action');
    var form = {};
    $form.find('input').each(function() {
      var $input = $(this);
      var name = $input.attr('name');
      if (name == 'Email') {
        form[name] = options.username;
      }
      else if (name == 'Passwd') {
        form[name] = options.password;
      }
      else {
        form[name] = $input.val();
      }
    });

    request.post({
      url: formUrl,
      form: form,
      jar: options.jar, 
      followAllRedirects: true
    }, function(error, response, body) {
      var $ = cheerio.load(body);
      var $form = $('form').first();
      var formUrl = $form.attr('action');
      var form = {};
      $form.find('input').each(function() {
        var $input = $(this);
        var name = $input.attr('name');
        if (name !== 'submit_false') {
          form[name] = $input.val();
        }
      });
      request.post({
        url: formUrl,
        form: form,
        jar: options.jar
      }, function(error, response, body) {
        if (url.format(this.uri) === options.url) {
          callback(error, response, body);
        }
        else {
          request({
            url: options.url,
            jar: options.jar
          }, callback);
        }
      });
    });
  });
};
