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
