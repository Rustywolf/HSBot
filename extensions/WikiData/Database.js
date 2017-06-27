var http = require('http');
var difflib = require('difflib');
var cheerio = require('cheerio');

const URL = 'hearthstone.gamepedia.com';
const SEARCH = '/api.php?format=json&action=query&list=search&srsearch=incategory:All_Card_Data%20';

const MATCH_RATIO = 0.5;

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

    function search(name, callback) {
        request(SEARCH + encodeURIComponent(name), function (res, e) {
            if (e) {
                bot.exception(e);
            } else {
                var data = JSON.parse(res);
                if (!data.query || data.query.searchinfo.totalhits <= 0) return;
                if (!data.query.search || data.query.search.length <= 0) return;
                
                var sequenceMatcher = new difflib.SequenceMatcher(null, '', '');
                sequenceMatcher.setSeq2(name.toLowerCase());

                var match = null;
                var mratio = 0;
                data.query.search.forEach(function (item) {

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
                var $ = cheerio.load(res);

                var infobox = $('.stdinfobox').first();
                if (infobox.length) {
                    var entry = {};
                    entry.title = infobox.find('div.title').first().text();
                    entry.image = infobox.find('div.image').first().find('img').first().attr('src');
                    infobox.find('div.body').find('tbody').first().find('tr').each(function () {
                        var datum = $(this);
                        var key = datum.find('th').first().text().trim().slice(0, -1).replace(' ', '_').toLowerCase();
                        var value = datum.find('td').first().text().trim();//$("<span>" + datum.find('td').first().html().replace(/<br>/g, '. ') + "</span>").text().replace(/<(.*?)>/g, '').trim();
                        entry[key] = value;
                    });
                    
                    entry.text = $("<span>" + infobox.find('p').first().html().replace(/(\s*)<br>(\s*)/g, '. ') + "</span>").text();

                    callback(entry);
                }
            }
        });
    }

    this.search = function (name, callback) {
        search(name, function (data) {
            parseCardData("/" + encodeURIComponent(data.title.replace(/ /g, "_")), callback);
        });
    }
}