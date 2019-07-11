import * as d3 from 'd3'
import "./styles/main.scss";

function objectFlip(obj) {
  const ret = {};
  Object.keys(obj)
    .forEach((key) => {
      ret[obj[key]] = key;
    });
  return ret;
}


(async function() {
  function select_area(selected_ward) {
    document.getElementById("ward-dropdown")
      .value = selected_ward
    d3.select("#tooltip")
      .html(
        `<span><b>Ward name</b> ${code_name_map[selected_ward]}</span>
    <span><b>Life expectancy</b> ${inequality_map[selected_ward]} years</span>`
      )
    areas.attr("fill", function() {
      const ward_id = d3.select(this)
        .attr("id")
      if (ward_id == selected_ward) {
        return "rgba(255,255,255,0.7)" //fill_color_scale(inequality_map[feature.properties.cmwd11cd])
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

  }

  function click_then_select_area(selected_ward) {
    code_layer_map[selected_ward].fire("click")
    select_area(selected_ward)
  }
  // Loading external data
  const inequality_df = await d3.csv('./data/table2.csv')
  const census_wards_geojson = await d3.json('./data/census_wards_london.geojson')

  const inequality_map = inequality_df.reduce((map, obj) => {
    map[obj["2011 Census Ward code"]] = parseFloat(obj["LE1,2 (years)"]);
    return map
  }, {})

  const code_name_map = inequality_df.reduce((map, obj) => {
    map[obj["2011 Census Ward code"]] = `${obj["2011 Census Ward name"]} (${obj["Local authority name"]})`;
    return map
  }, {})

  const name_code_map = inequality_df.reduce((map, obj) => {
    map[obj["2011 Census Ward name"]] = obj["2011 Census Ward code"];
    return map
  }, {})

  const london_regions = inequality_df
    .filter(d => d["Region"] == "London")
    .map(d => ({
      code: d["2011 Census Ward code"],
      name: `${d["2011 Census Ward name"]} (${d["Local authority name"]})`
    }))
    .sort((a, b) => a.name < b.name ? -1 : 1)

  const postcode_input = document.getElementById("postcode-input");
  postcode_input.addEventListener("keydown", function(e) {
    if (e.keyCode === 13) {
      // Fetch Local authority for postcode
      d3.json("https://mapit.mysociety.org/postcode/" + postcode_input.value)
        .then(postcode_results => {

          const ward_name = Object.entries(postcode_results["areas"])
            .map(d => d[1])
            .filter(d => d["type"] == "LBW")[0]["name"]

          click_then_select_area(name_code_map[ward_name])
          document.getElementById("ward-dropdown")
            .value = name_code_map[ward_name]
        })

    }
  });


  d3.select("#ward-dropdown")
    .selectAll("option")
    .data(london_regions)
    .enter()
    .append("option")
    .attr("value", d => d.code)
    .html(d => d.name)

  d3.select("#ward-dropdown")
    .on("change", function() {
      click_then_select_area(this.value)
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
      },
      onEachFeature: function(feature, layer) {
        // assign bounds to feature
        feature.properties.bounds_calculated = layer.getBounds()
          .getCenter();
        layer.on("click", function(e) {
          select_area(layer.feature.properties.cmwd11cd)

          map.flyTo(layer.getBounds()
            .getCenter(), 12)
        })
      }
    })
    .addTo(map)

  const code_layer_map = {}

  geoJSONLayer.eachLayer(function(layer) {
    code_layer_map[layer.feature.properties.cmwd11cd] = layer
    if (typeof layer._path != 'undefined') {
      layer._path.id = layer.feature.properties.cmwd11cd;
    } else {
      layer.eachLayer(function(layer2) {
        layer2._path.id = layer.feature.properties.cmwd11cd;
      });
    }
  })


  var svg = d3.select("#map")
    .select("div")
    .select("div")
    .select("svg");
  var g = svg.select('g');
  var areas = d3.selectAll("path.leaflet-interactive")

  areas.on("mouseover", function() {
    update_tooltip(d3.select(this)
      .attr("id"))
  })

  areas.on("mouseout", function() {
    const selected_ward_id = document.getElementById("ward-dropdown")
      .value
    update_tooltip(selected_ward_id)
  })


  function update_tooltip(ward_id) {
    d3.select("#tooltip")
      .html(
        `<span><b>Ward name</b> ${code_name_map[ward_id]}</span>
<span><b>Life expectancy</b> ${inequality_map[ward_id]} years</span>`
      )

  }
})();