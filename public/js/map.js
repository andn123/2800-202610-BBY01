
/*
const MAPTILER_KEY = window.MAPTILER_KEY;

let map;
let markers = [];
let markersVisible = true;
let userMarker = null;

let markersByEnv = {
  sunny: [],
  shaded: [],
  indoors: [],
};

const ENV_COLORS = {
  sunny: "#FFD700",
  shaded: "#228B22",
  indoors: "#1E90FF",
};

function showMap() {
  map = new maplibregl.Map({
    container: "map",
    style:
      "https://api.maptiler.com/maps/streets/style.json?key=" + MAPTILER_KEY,
    center: [-123.00163752324765, 49.25324576104826],
    zoom: 10,
  });

  map.addControl(new maplibregl.NavigationControl(), "top-right");
  map.on("load", function () {
    map.resize();

    setTimeout(function () {
      map.resize();
    }, 300);

    loadMarkers();
    addUserLocationMarker();
  });
}

function addUserLocationMarker() {
  if (!navigator.geolocation) {
    return;
  }

  navigator.geolocation.watchPosition(
    function (position) {
      const lng = position.coords.longitude;
      const lat = position.coords.latitude;

      if (!userMarker) {
        const el = document.createElement("div");
        el.className = "user-location-marker";
        el.innerHTML = `
          <div class="pulse"></div>
          <div class="dot"></div>
        `;
        userMarker = new maplibregl.Marker({
          element: el,
        })
          .setLngLat([lng, lat])
          .addTo(map);
      } else {
        userMarker.setLngLat([lng, lat]);
      }
    },

    function (err) {
      console.log("Geolocation denied:", err);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 10000,
    },
  );
}

function loadMarkers() {
  fetch("/api/posts")
    .then(function (res) {
      return res.json();
    })

    .then(function (posts) {
      posts.forEach(function (post) {
        if (post.lat && post.lng) {
          let color = ENV_COLORS[post.environment] || "red";
          let marker = new maplibregl.Marker({
            color: color,
          })
            .setLngLat([post.lng, post.lat])
            .addTo(map);
          marker.getElement().addEventListener("click", function () {
            openSidePanel(post, color);
          });

          markers.push(marker);

          if (markersByEnv[post.environment]) {
            markersByEnv[post.environment].push(marker);
          }
        }
      });
    })

    .catch(function (err) {
      console.error("Error loading markers:", err);
    });
}

function openSidePanel(post, color) {
  const panel = document.getElementById("sidePanel");
  const content = document.getElementById("panelContent");

  const createdAt = post.createdAt
    ? new Date(post.createdAt).toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Unknown";

  content.innerHTML = `
    <strong>${post.location}</strong>

    <br><br>

    <img
      src="/uploads/${post.image}"
      alt="Post image"
    >
    <strong>Description:</strong>
    <p>${post.description}</p>

    <p>
      <strong>Environment:</strong>

      <span
        style="
          color:${color};
          font-weight:bold;
        "
      >
        ${post.environment}
      </span>
    </p>

    <p>
      <strong>Posted by:</strong>
      ${post.username}
    </p>
    
    <p>
      <strong>Posted on:</strong>
      ${createdAt}
    </p>
  `;

  panel.classList.remove("closed");
}

function closePanel() {
  const panel = document.getElementById("sidePanel");

  panel.classList.add("closed");
}

function filterMarkers(env) {
  markers.forEach(function (marker) {
    marker.remove();
  });

  if (env === "all") {
    markers.forEach(function (marker) {
      marker.addTo(map);
    });

    return;
  }

  if (markersByEnv[env]) {
    markersByEnv[env].forEach(function (marker) {
      marker.addTo(map);
    });
  }
}

function toggleMarkers() {
  const button = document.getElementById("toggleMarkers");

  if (markersVisible) {
    markers.forEach(function (marker) {
      marker.remove();
    });

    button.innerText = "Show Markers";

    markersVisible = false;
  } else {
    markers.forEach(function (marker) {
      marker.addTo(map);
    });

    button.innerText = "Hide Markers";

    markersVisible = true;
  }
}

document
  .getElementById("toggleMarkers")
  .addEventListener("click", toggleMarkers);

showMap();

window.addEventListener("resize", function () {
  if (map) {
    setTimeout(function () {
      map.resize();
    }, 300);
  }
});

window.addEventListener("orientationchange", function () {
  if (map) {
    setTimeout(function () {
      map.resize();
    }, 500);
  }
});
*/

const mapApi = window.mapApi;

/* =======================
   MAP INIT
======================= */
const map = new maplibregl.Map({
  container: "map",
  style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${mapApi}`,
  center: [-123.1207, 49.2827],
  zoom: 11,
});

map.addControl(new maplibregl.NavigationControl());

const el = document.getElementById("map");
const locations = JSON.parse(el.dataset.locations);

/* =======================
   GLOBAL STATE
======================= */
let recentLocations = [];
let hasInfo = false;

let unit = localStorage.getItem("tempUnit") || "C";

let currentWeather = null;
let currentLocationName = "";

navigator.geolocation.getCurrentPosition((position) => {
  const lat = position.coords.latitude;
  const lon = position.coords.longitude;

  map.flyTo({
    center: [lon, lat],
    zoom: 14,
  });

  new maplibregl.Marker({
    color: "red",
  })
    .setLngLat([lon, lat])
    .setPopup(new maplibregl.Popup().setHTML("Your current location"))
    .addTo(map);
});

/* =======================
   GLOBAL SWITCH LISTENER
======================= */
document.addEventListener("change", (e) => {
  if (e.target && e.target.id === "tempSwitch") {
    unit = e.target.checked ? "F" : "C";

    localStorage.setItem("tempUnit", unit);

    if (currentWeather) {
      renderWeather(currentWeather, currentLocationName);
    }
  }
});

/* =======================
   PANEL SETUP
======================= */
const panel = document.getElementById("panelBox");

const COLLAPSED = 120;
const HALF = window.innerHeight * 0.45;
const FULL = window.innerHeight * 0.75;

let currentHeight = COLLAPSED;

/* initial height */
if (window.innerWidth <= 768) {
  panel.style.height = COLLAPSED + "px";
} else {
  panel.style.height = "100vh";
}

/* =======================
   MAP LOAD
======================= */
map.on("load", () => {
  map.addSource("locations", {
    type: "geojson",
    data: locations,
  });

  map.addLayer({
    id: "points",
    type: "circle",
    source: "locations",
    paint: {
      "circle-radius": 8,
      "circle-color": "#007cbf",
      "circle-stroke-width": 2,
      "circle-stroke-color": "#fff",
    },
  });

  map.on("click", "points", async (e) => {
    const f = e.features[0];
    const lat = e.lngLat.lat;
    const lon = e.lngLat.lng;
    hasInfo = true;

    recentLocations.unshift(f.properties);
    recentLocations = recentLocations.slice(0, 10);

    if (window.innerWidth <= 768) {
      setPanelHeight(HALF);
    }

    let loader = document.getElementById("loading");
    try {
      if (loader) loader.style.display = "block";
      const res = await fetch(`/weatherapi?lat=${lat}&lon=${lon}`);
      const data = await res.json();

      if (!data || !data.current) return;

      currentWeather = data;
      currentLocationName = f.properties.name;

      switchToInfo();
      renderWeather(data, currentLocationName);
    } catch (err) {
      console.error(err);
    } finally {
      if (loader) loader.style.display = "none";
    }
  });
});

/* =======================
   RENDER WEATHER
======================= */
function renderWeather(data, name) {
  const tempC = data.current.temp_c;
  const feelsC = data.current.feelslike_c;

  const temp = unit === "C" ? tempC : (tempC * 9) / 5 + 32;

  const feels = unit === "C" ? feelsC : (feelsC * 9) / 5 + 32;

  const symbol = unit === "C" ? "°C" : "°F";

  document.getElementById("panel").innerHTML = `
    <div class="weather-card">

      <h4 class="fw-bold text-center">${name}</h4>

      <div class="form-check form-switch m-0 temp-toggle">
        <input class="form-check-input" type="checkbox" id="tempSwitch"
          ${unit === "F" ? "checked" : ""}>
        <label class="form-check-label" for="tempSwitch">
          <span class="label-c">°C</span>
          <span class="label-f">°F</span>
        </label>
      </div>

      <div class="temp">
        🌡️ ${temp.toFixed(1)}${symbol}
        <small class="text-muted">(Feels like ${feels.toFixed(1)}${symbol})</small>
      </div>

      <div class="details">
        🌤️ ${data.current.condition.text}<br>
        💨 Wind: ${data.current.wind_kph} km/h<br>
        💧 Humidity: ${data.current.humidity}%
      </div>

    </div>
    <div id="loading" class="loader"></div>
  `;
}

/* =======================
   PANEL HEIGHT
======================= */
function setPanelHeight(value) {
  if (window.innerWidth <= 768) {
    value = Math.max(COLLAPSED, Math.min(FULL, value));
    panel.style.height = value + "px";
    currentHeight = value;
  } else {
    panel.style.height = "100vh";
    currentHeight = value;
  }
}

/* =======================
   DRAG SYSTEM (MOBILE ONLY)
======================= */
let isMobile = window.innerWidth <= 768;

let startY = 0;
let startHeight = 0;

function enableDrag() {
  panel.addEventListener("touchstart", touchStart);
  panel.addEventListener("touchmove", touchMove);
  panel.addEventListener("touchend", touchEnd);

  panel.addEventListener("mousedown", mouseDown);
}

function disableDrag() {
  panel.removeEventListener("touchstart", touchStart);
  panel.removeEventListener("touchmove", touchMove);
  panel.removeEventListener("touchend", touchEnd);

  panel.removeEventListener("mousedown", mouseDown);
}

/* TOUCH */
function touchStart(e) {
  startY = e.touches[0].clientY;
  startHeight = panel.offsetHeight;
}

function touchMove(e) {
  const delta = startY - e.touches[0].clientY;
  let newHeight = startHeight + delta;

  setPanelHeight(newHeight);
}

function touchEnd() {
  snap();
}

/* MOUSE */
function mouseDown(e) {
  startY = e.clientY;
  startHeight = panel.offsetHeight;

  function move(e) {
    const delta = startY - e.clientY;
    let newHeight = startHeight + delta;

    setPanelHeight(newHeight);
  }

  function up() {
    document.removeEventListener("mousemove", move);
    document.removeEventListener("mouseup", up);
    snap();
  }

  document.addEventListener("mousemove", move);
  document.addEventListener("mouseup", up);
}

/* =======================
   DEVICE CHECK
======================= */
function checkDevice() {
  isMobile = window.innerWidth <= 768;

  if (isMobile) {
    setPanelHeight(COLLAPSED);
    enableDrag();
  } else {
    disableDrag();
    setPanelHeight(100);
  }
}

/* =======================
   SNAP
======================= */
function snap() {
  let target;

  if (currentHeight < (COLLAPSED + HALF) / 2) {
    target = COLLAPSED;
  } else if (currentHeight < (HALF + FULL) / 2) {
    target = HALF;
  } else {
    target = FULL;
  }

  panel.style.transition = "height 0.3s ease";
  setPanelHeight(target);

  setTimeout(() => {
    panel.style.transition = "";
  }, 300);
}

/* =======================
   TABS
======================= */
function showTab(tab, event) {
  document
    .querySelectorAll(".nav-link")
    .forEach((btn) => btn.classList.remove("active"));

  if (event) event.target.classList.add("active");

  const panelContent = document.getElementById("panel");

  if (tab === "info") {
    if (hasInfo) {
      renderWeather(currentWeather, currentLocationName);
    } else {
      panelContent.innerHTML = `
      <div>Click a location</div>
          <div id="loading" class="loader"></div>`;
    }
  } else if (tab === "post") {
    if (hasInfo) {
      panelContent.innerHTML = `No posts yet — create one to get started!
      <div id="loading" class="loader"></div>`;
    } else {
      panelContent.innerHTML = `<div>Click a location to see post!</div>
          <div id="loading" class="loader"></div>`;
    }
  } else if (tab === "recent") {
    panelContent.innerHTML = recentLocations.length
      ? recentLocations.map((l) => `<p>🕒 ${l.name}</p>`).join("")
      : `<p>No recent locations</p>`;
  }
}

function switchToInfo() {
  document
    .querySelectorAll(".nav-link")
    .forEach((btn) => btn.classList.remove("active"));
  document.querySelector(".nav-link").classList.add("active");
}

/* =======================
   SAVE
======================= */
function saveLocation(name) {
  savedLocations.push(name);
  alert("Saved!");
}

/* =======================
   RESIZE
======================= */
window.addEventListener("resize", () => {
  map.resize();
  checkDevice();
});

/* =======================
   FIRST TIME GUIDE
======================= */

function showGuide() {
  const guide = document.createElement("div");

  guide.id = "guideTooltip";

  guide.innerHTML = `
    <div class="guide-box">
      <h5>👋 Welcome</h5>

      <p>• Click map locations to see weather info</p>

      <p>• Switch tabs to view posts and recent places</p>

      <p>• Drag the panel upward on mobile</p>

      <p>• Switch on the switch to see temperature in °F</p>

      <button id="closeGuide">
        Got it
      </button>
    </div>
  `;

  document.body.appendChild(guide);

  document.getElementById("closeGuide").addEventListener("click", () => {
    guide.remove();

    localStorage.setItem("guideSeen", "true");
  });
}

/* show only first time */
if (!localStorage.getItem("guideSeen")) {
  setTimeout(showGuide, 1000);
}

/* =======================
   INIT
======================= */
checkDevice();
