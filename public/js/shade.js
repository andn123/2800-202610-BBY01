//vancouver cords latitude:49.xxxxxx longitude:-123.xxxxxx

const overpassAPI = "https://overpass-api.de/api/interpreter?data="; //is this needed here

/* START OF LEAFLET API MAP*/
const map = L.map("map", {
  zoomControl: false,
  scrollWheelZoom: false,
  doubleClickZoom: false,
  touchZoom: false,
  boxZoom: false,
  keyboard: false,
}).setView([latitude, longitude], 18);
map.panBy([0, 150], { animate: false });

const radius = 10;
const treeArr = [];
const shelterArr = [];
//const amenitiesArr = [];

/*Takes this tilelayer and adds it to map above. */
L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
  {
    maxZoom: 19,
    attribution: "&copy; CARTO",
    subdomains: "abcd",
  },
).addTo(map);

/* Start of markers */
const greenIcon = L.icon({
  iconUrl: "/img/shade/tree2.png",
  iconSize: [24, 24],
  iconAnchor: [12, 24],
  popupAnchor: [0, -24],
  className: "no-pointer",
});

// in public trees 0:lon, 1:lat
// in leaflet, it uses lat first
console.log(trees.length);
trees.forEach((tree) => {
  const marker = L.marker(
    [tree.geom.geometry.coordinates[1], tree.geom.geometry.coordinates[0]],
    { icon: greenIcon },
  ).addTo(map);

  treeArr.push({
    lat: tree.geom.geometry.coordinates[1],
    lng: tree.geom.geometry.coordinates[0],
  });
});
//console.log(markers);
const shelterIcon = L.icon({
  iconUrl: "/img/shade/shelter.png",
  iconSize: [24, 24],
  iconAnchor: [12, 20],
  popupAnchor: [0, -24],
});
if (shelter !== null) {
  L.marker([shelter.center.lat, shelter.center.lon], {
    icon: shelterIcon,
  }).addTo(map);

  shelterArr.push({ lat: shelter.center.lat, lng: shelter.center.lon });
}
/* End of markers */

/*start of features */
function shadeScore(trees, shelter) {
  if (shelter > 0) {
    return "high";
  } else if (trees > 10) {
    return "high";
  } else if (trees > 2) {
    return "medium";
  } else {
    return "low";
  }
}

document.getElementById("backBtn").addEventListener("click", function (e) {
  // This goes to the actual previous page in the session history
  window.history.back();
});

map.on("click", function (e) {
  let treeCount = 0;
  let shelterCount = 0;

  const circle = L.circle(e.latlng, {
    radius: radius,
    color: "green",
    fillColor: "green",
    fillOpacity: 0.2,
  }).addTo(map);
  console.log(circle.getElement());
  setTimeout(() => {
    circle.getElement().classList.add("circle-fade");

    setTimeout(() => {
      circle.remove();
    }, 1000);
  }, 1000);

  treeArr.forEach((tree) => {
    const distance = e.latlng.distanceTo(L.latLng(tree.lat, tree.lng)); //this is comparing to all trees in park
    if (distance <= radius) {
      treeCount++;
    }
  });

  shelterArr.forEach((shelter) => {
    const distance = e.latlng.distanceTo(L.latLng(shelter.lat, shelter.lng));
    if (distance <= radius) {
      shelterCount++;
    }
  });

  document
    .getElementById("firstTimeView")
    ?.style.setProperty("display", "none");
  document.getElementById("view").style.display = "block";
  document.getElementById("shadevalue").textContent = shadeScore(
    treeCount,
    shelterCount,
  );
  document.getElementById("treesvalue").textContent = treeCount;
  if (shelterCount == 0) {
    document.getElementById("sheltervalue").textContent = "none";
  } else {
    document.getElementById("sheltervalue").textContent =
      shelter.tags.shelter_type;
  }
});
/*end of features */

/* END OF LEAFLET API MAP */
