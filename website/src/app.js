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

d3.selection.prototype.moveToFront = function() {
  return this.each(function() {
    this.parentNode.appendChild(this);
  });
};

(async function() {
  function select_area(selected_ward) {
    document.getElementById("ward-dropdown")
      .value = selected_ward
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
    update_tooltip(selected_ward)
    update_scatter_plot(selected_ward)

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


  var map_svg = d3.select("#map")
    .select("div")
    .select("div")
    .select("svg");
  var g = map_svg.select('g');
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


  // Setup 1d scatter plot

  const padding = 15,
    width = (d3.select("#tooltip-scatter")
      .node()
      .offsetWidth - padding * 2) * 2 / 3,
    height = d3.select("#tooltip-scatter")
    .node()
    .offsetHeight - padding * 2

  const x = d3.scaleLinear()
    .domain(d3.extent(inequality_df, d => parseFloat(d["LE1,2 (years)"])))
    .range([0, width - padding * 2])

  const scatter_svg = d3.select("#tooltip-scatter")
    .append("svg")
    .attr("width", width)
    .attr("height", height)

  const xAxis = d3.axisBottom()
    .scale(x)
    .ticks(5)

  scatter_svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + (height - padding * 2) + ")")
    .call(xAxis)

  scatter_svg
    .append("text")
    .attr("class", "annotation-label")
    .attr("x", d => 0)
    .attr("y", d => 50)
    .text("")

  scatter_svg
    .append("line")
    .attr("class", "annotation-line")
    .attr("x1", d => 0)
    .attr("x2", d => 0)
    .attr("y1", 50)
    .attr("y2", 20)

  function get_wards_in_borough(selected_ward) {
    const ward_data = inequality_df.filter(d => d["2011 Census Ward code"] == selected_ward)[0]
    // Get wards in Borough
    const borough_wards = inequality_df.filter(d => d["Local authority name"] == ward_data["Local authority name"])
      .map(d => ({
        "name": d["2011 Census Ward name"],
        "code": d["2011 Census Ward code"],
        "value": parseFloat(d["LE1,2 (years)"])
      }))

    return borough_wards
  }

  function update_scatter_plot(selected_ward) {
    const borough_wards = get_wards_in_borough(selected_ward)
    const t = d3.transition()
      .duration(500)

    // JOIN
    const dots = scatter_svg.selectAll(".dot")
      .data(borough_wards)

    // EXIT
    dots.exit()
      .transition(t)
      .style("fill-opacity", 1e-6)
      .remove();

    // UPDATE
    dots
      .transition(t)
      .attr("cx", d => x(d["value"]))
      .attr("fill", d => d["code"] == selected_ward ? "red" : "blue")
      .attr("class", d => d["code"] == selected_ward ? "dot selected" : "dot")

    // ENTER
    dots
      .enter()
      .append("circle")
      .attr("class", d => d["code"] == selected_ward ? "dot selected" : "dot")
      .attr("r", 6)
      .attr("cx", 0)
      .attr("cy", 20)
      .style("fill-opacity", 1) //e-6)
      .attr("fill", d => d["code"] == selected_ward ? "red" : "blue")
      .on("mouseover", d => update_tooltip(d["code"]))
      .on("mouseout", d => update_tooltip(selected_ward))
      .transition(t)
      .attr("cx", d => x(d["value"]))
      .style("fill-opacity", 0.7)

    // UPDATE annotation
    scatter_svg.select(".annotation-line")
      .datum(borough_wards.filter(d => d["code"] == selected_ward)[0])
      .enter()
      .transition(t)
      .attr("x1", d => x(d["value"]))
      .attr("x2", d => x(d["value"]))

    scatter_svg.select(".annotation-label")
      .datum(borough_wards.filter(d => d["code"] == selected_ward)[0])
      .enter()
      .transition(t)
      .attr("x", d => x(d["value"]))
      .text(d => d["name"])

    scatter_svg.select(".selected")
      .moveToFront()


  }

  function update_tooltip(ward_id) {
    d3.select("#tooltip-data")
      .html(
        `<span><b>Ward name</b> ${code_name_map[ward_id]}</span>
<span><b>Life expectancy</b> ${inequality_map[ward_id]} years</span>`
      )

  }
})();