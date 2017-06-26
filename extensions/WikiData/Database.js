var http = require('http');
var difflib = require('difflib');
var cheerio = require('cheerio');

const URL = 'hearthstone.wikia.com';
const SEARCH = '/api/v1/Search/List?query=';
const SEARCH_LIMIT = '&limit=';

const MATCH_RATIO = 0.6;

var exports = module.exports = function Database(bot) {

    function request(path, callback) {
        var options = {
            host: URL,
            port: 80,
            path: path,
        };

        http.get(options, function (res) {
            if (res.statusCode != 200) {
                callback(null, new Error('Request (' + URL + path + ') responded with status code ' + res.statusCode));
            } else {
                res.setEncoding('utf8');

                var body = '';

                res.on('data', function (chunk) {
                    body += chunk;
                }).on('end', function () {
                    callback(body);
                }).on('error', function (e) {
                    callback(null, e);
                });
            }
        });
    }

    function search(name, limit, callback) {
        request(SEARCH + encodeURIComponent(name) + SEARCH_LIMIT + encodeURIComponent(limit), function (res, e) {
            if (e) {
                bot.exception(e);
            } else {
                var data = JSON.parse(res);
                var sequenceMatcher = new difflib.SequenceMatcher(null, '', '');
                sequenceMatcher.setSeq2(name.toLowerCase());

                if (!data.items) {
                    return;
                }

                var match = null;
                var mratio = 0;
                data.items.forEach(function (item) {

                    sequenceMatcher.setSeq1(item.title.toLowerCase());
                    var ratio = sequenceMatcher.ratio();
                    if (ratio >= MATCH_RATIO && ratio > mratio) {
                        mratio = ratio;
                        match = item;
                    }
                });

                if (match !== null) callback(match);
            }
        });
    }

    function parseCardData(url, callback) {
        request(url, function (res, e) {
            if (e) {
                bot.exception(e);
            } else {
                var $ = cheerio.load(res.replace("Un'Goro", "UnGoro"));

                var infobox = $('aside.portable-infobox').first();
                if (infobox.length) {
                    var entry = {};
                    entry.title = infobox.find('h2').first().text();
                    entry.image = infobox.find('nav').first().find('img').first().attr('src');
                    infobox.find('div.pi-item').each(function () {
                        var datum = $(this);
                        var key = datum.find('h3').first().text().trim().slice(0, -1).replace(' ', '_').toLowerCase();
                        var value = $("<span>" + datum.find('div').first().html().replace(/<br>/g, '. ') + "</span>").text().replace(/<(.*?)>/g, '').trim();
                        entry[key] = value;
                    });

                    callback(entry);
                }
            }
        });
    }

    this.search = function (name, callback) {
        search(name, 10, function (data) {
            parseCardData(data.url, callback);
        });
    }
}