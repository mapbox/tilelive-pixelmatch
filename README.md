# tilelive-pixelmatch

*Work in progress*

A readonly tilelive source for visually diffing two raster tile sources using [pixelmatch](https://github.com/mapbox/pixelmatch). This enables visual regression testing for maps.

![Browsable map diff](http://lukasmartinelli.ch/media/osm_bright_visual_diff.gif)

## Usage

```js
var tilelive = require("tilelive");
require('tilelive-http')(tilelive).registerProtocols(tilelive);
require('@mapbox/tilelive-pixelmatch')(tilelive).registerProtocols(tilelive);

const source1 = "https://api.mapbox.com/styles/v1/morgenkaffee/cix7xgxah00aw2pnoh7nwsozf/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoibW9yZ2Vua2FmZmVlIiwiYSI6IjIzcmN0NlkifQ.0LRTNgCc-envt9d5MzR75w";
const source2 = "https://api.mapbox.com/styles/v1/morgenkaffee/cixyw0h9300612rql81d6r83d/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoibW9yZ2Vua2FmZmVlIiwiYSI6IjIzcmN0NlkifQ.0LRTNgCc-envt9d5MzR75w";

function copyTiles(source, target) {
  tilelive.copy(source, target, {
    type: 'scanline',
        minzoom: 0,
        maxzoom: 4
  }, function(err) {
    if (err) throw err;
  });
}

const sourceUri = "pixelmatch:?source=" + source1 + "&source=" + source2;
const targetUri = "file://./diffs";
copyTiles(sourceUri, targetUri);
```
