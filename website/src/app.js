import * as d3 from 'd3'
import "./styles/main.scss";


(async function() {
  // Loading external data
  const inequality_df = await d3.csv('./data/table2.csv')
  const census_wards_geojson = await d3.json('./data/census_wards_london.geojson')

  const inequality_map = inequality_df.reduce((map, obj) => {
    map[obj["2011 Census Ward code"]] = parseFloat(obj["LE1,2 (years)"]);
    return map
  }, {})

  const code_name_map = inequality_df.reduce((map, obj) => {
    map[obj["2011 Census Ward code"]] = obj["2011 Census Ward name"];
    return map
  }, {})

  const london_regions = inequality_df
    .filter(d => d["Region"] == "London")
    .map(d => ({
      code: d["2011 Census Ward code"],
      name: d["2011 Census Ward name"]
    }))
    .sort((a, b) => a.name < b.name ? -1 : 1)

  d3.select("#ward-dropdown")
    .selectAll("option")
    .data(london_regions)
    .enter()
    .append("option")
    .attr("value", d => d.code)
    .html(d => d.name)
  d3.select("#ward-dropdown")
    .on("change", function() {
      const selected_ward = this.value
      areas.attr("fill", function() {
        const ward_id = d3.select(this)
          .attr("id")
        if (ward_id == selected_ward) {
          return "white" //fill_color_scale(inequality_map[feature.properties.cmwd11cd])
        } else {
          return fill_color_scale(inequality_map[ward_id])
        }
      })
      areas.attr("fill-opacity", function() {
        const ward_id = d3.select(this)
          .attr("id")
        if (ward_id == selected_ward) {
          return 0.9
        } else {
          return 0.6
        }
      })
    })

  // Inequality color scale
  var fill_color_scale = d3.scaleQuantile()
    .range(["rgb(237, 248, 233)", "rgb(186, 228, 179)", "rgb(116,196,118)", "rgb(49,163,84)", "rgb(0,109,44)"]);

  fill_color_scale.domain([d3.min(inequality_df, d => parseFloat(d["LE1,2 (years)"])),
    d3.max(inequality_df, d => parseFloat(d["LE1,2 (years)"]))
  ])

  var map = L.map('map', {
      minZoom: 10,
      maxZoom: 15
    })
    .setView([51.5, -0.11], 10)

  var OpenStreetMap_BlackAndWhite = L.tileLayer('http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  });

  OpenStreetMap_BlackAndWhite.addTo(map);

  var geoJSONLayer = L.geoJSON(census_wards_geojson, {
      style: function(feature) {
        return {
          color: "rgb(25,25,25)", //fill_color_scale(inequality_map[feature.properties.cmwd11cd]),
          weight: 1,
          fillColor: fill_color_scale(inequality_map[feature.properties.cmwd11cd]),
          fillOpacity: 0.7
        }
      }
    })
    .addTo(map)

  geoJSONLayer.eachLayer(function(layer) {
    if (typeof layer._path != 'undefined') {
      layer._path.id = layer.feature.properties.cmwd11cd;
    } else {
      layer.eachLayer(function(layer2) {
        layer2._path.id = layer.feature.properties.cmwd11cd;
      });
    }
  });


  var svg = d3.select("#map")
    .select("div")
    .select("div")
    .select("svg");
  var g = svg.select('g');
  var areas = d3.selectAll("path.leaflet-interactive")

  areas.on("mouseover", function() {
    const ward_id = d3.select(this)
      .attr("id")
    d3.select("#tooltip")
      .html(
        `<span><b>Ward name</b> ${code_name_map[ward_id]}</span>
    <span><b>Life expectancy</b> ${inequality_map[ward_id]} years</span>`
      )
  })
})();