let xhr = new XMLHttpRequest();
xhr.open('GET', 'census_wards_london.geojson');
xhr.setRequestHeader('Content-Type', 'application/json');
xhr.responseType = 'json';
xhr.onload = function() {
  if (xhr.status !== 200) return
  var map = L.map('map').setView([51.5, -0.11], 10);

  var OpenStreetMap_BlackAndWhite = L.tileLayer('http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  });

  OpenStreetMap_BlackAndWhite.addTo(map);

  L.geoJSON(xhr.response, {
    style: function(feature) {
      return {
        color: "red"
      } //feature.properties.color};
    }
  }).addTo(map)
};
xhr.send();
