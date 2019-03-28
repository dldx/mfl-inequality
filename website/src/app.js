import * as d3 from 'd3'

(async function() {
  // Loading external data
  const inequality_df = await d3.csv('/data/table2.csv')
  const census_wards_geojson = await d3.json('/data/census_wards_london.geojson')

  const inequality_map = inequality_df.reduce((map, obj) => {
    map[obj["2011 Census Ward code"]] = parseFloat(obj["LE1,2 (years)"]);
    return map
  }, {})

  // Inequality color scale
  var fill_color_scale = d3.scaleQuantile()
    .range(["rgb(237, 248, 233)", "rgb(186, 228, 179)", "rgb(116,196,118)", "rgb(49,163,84)", "rgb(0,109,44)"]);

  fill_color_scale.domain([d3.min(inequality_df, d => parseFloat(d["LE1,2 (years)"])), d3.max(inequality_df, d => parseFloat(d["LE1,2 (years)"]))])

  var map = L.map('map').setView([51.5, -0.11], 10);

  var OpenStreetMap_BlackAndWhite = L.tileLayer('http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  });

  OpenStreetMap_BlackAndWhite.addTo(map);

  L.geoJSON(census_wards_geojson, {
      style: function(feature) {
        return {
          color: fill_color_scale(inequality_map[feature.properties.cmwd11cd]),
          fillColor: fill_color_scale(inequality_map[feature.properties.cmwd11cd])
        }
      }
    })
    .bindTooltip(function(layer) {
      return `<b>Ward name</b> ${layer.feature.properties.cmwd11nm}<br/>
      <b>Life expectancy</b> ${inequality_map[layer.feature.properties.cmwd11cd]} years`;
    })
    .addTo(map)
})();
