"use strict";

const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch');
const url = require("url");
const fs = require("fs");
const async = require("async");

module.exports = function(tilelive, opts) {

  const Pixelmatch = function(uri, callback) {
    this.uri = url.parse(uri, true);
    var self = this;
    const sourceUris = this.uri.query.source || this.uri.query.sources;
    if (!Array.isArray(sourceUris)) {
      return setImmediate(callback, new Error("Two or more sources must be provided: " + JSON.stringify(uri)));
    }

    sourceUris.forEach(tilelive.auto);
    return async.map(sourceUris, tilelive.load, function(err, sources) {
      if (err) {
        return callback(err);
      }

      return async.map(sources, function(src, next) {
        return src.getInfo(next);
      }, function(err, info) {
        self.sources = sourceUris.map(function(uri, i) {
          return {
            info: info[i],
            uri: uri
          };
        });

        return callback(null, self);
      });
    });
  };

  function getPNGTile(src, z, x, y, callback) {
      return async.waterfall([
        async.apply(tilelive.load, src.uri),
        function(source, next) {
          return source.getTile(z, x, y, next);
        },
        function(tile, headers, next) {
          return new PNG().parse(tile, next);
        }
      ], callback);
  }

  function getDiffTile(sources, z, x, y, callback) {
      return async.map(sources, function(src, done) {
        return getPNGTile(src, z, x, y, done);
      }, function(err, tiles) {
          if(err) return callback(err);
          const tile1 = tiles[0];
          const tile2 = tiles[1];
          const diffTile = new PNG({width: tile1.width, height: tile1.height});

          const diffs = pixelmatch(tile1.data, tile2.data, diffTile.data, diffTile.width, diffTile.height);
          const buffer = PNG.sync.write(diffTile);
          callback(null, buffer);
      });
  }

  Pixelmatch.prototype.getTile = function(z, x, y, callback) {
    return getDiffTile(this.sources, z, x, y, function(err, tile) {
      if (err) return callback(err);
      return callback(null, tile, {
        "Content-Type": "image/png",
      });
    });
  };


  Pixelmatch.prototype.getInfo = function(callback) {
  var info = this.sources
    .map(function(x) {
      return x.info;
    }).reduce(function(a, b, i) {
      var info = {};

      a.id = a.id || "unknown_" + i - 1;
      b.id = b.id || "unknown_" + i;

      if (a.attribution === b.attribution) {
        info.attribution = a.attribution;
      } else {
        info.attribution = [a.attribution, b.attribution].join(", ");
      }

      if (a.description === b.description) {
        info.description = a.description;
      } else {
        info.description = [a.description, b.description].join(", ");
      }

      info.bounds = [
        Math.min(a.bounds[0], b.bounds[0]),
        Math.min(a.bounds[1], b.bounds[1]),
        Math.max(a.bounds[2], b.bounds[2]),
        Math.max(a.bounds[3], b.bounds[3])
      ];

      info.autoscale = a.autoscale && b.autoscale;
      info.center = a.center;
      info.format = a.format;
      info.maskLevel = Math.max(a.maskLevel || a.maxzoom, b.maskLevel || b.maxzoom);
      info.maxzoom = Math.max(a.maxzoom, b.maxzoom);
      info.minzoom = Math.min(a.minzoom, b.minzoom);
      info.name = [a.name, b.name].join(" + ");
      info.private = a.private || b.private;
      info.scheme = a.scheme;
      info.tilejson = a.tilejson;
      info.id = [a.id, b.id].join(",");

      return info;
    });

    if (info.maskLevel === info.maxzoom) {
      delete info.maskLevel;
    }

    return setImmediate(callback, null, info);
  };

  Pixelmatch.prototype.close = function(callback) {
    return callback && setImmediate(callback);
  };

  Pixelmatch.registerProtocols = function(_tilelive) {
    _tilelive.protocols["pixelmatch:"] = Pixelmatch;
  }

  Pixelmatch.registerProtocols(tilelive);
  return Pixelmatch;
};
