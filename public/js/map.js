const mapApi = window.mapApi;
let firstTimeMode = window.firstTimeMode === "true";

let markers = [];
let markersVisible = true;
let userMarker = null;

let markersByEnv = {
  sunny: [],
  shaded: [],
  indoors: [],
  none: [], // ✅ NEW: grey markers with no environment
};

const ENV_COLORS = {
  sunny: "#FFD700",
  shaded: "#228B22",
  indoors: "#1E90FF",
};

const backBtn = document.getElementById("back-btn");

let currentPosts = [];
let selectedLat = null;
let selectedLon = null;

// ── CHAT STATE ──────────────────────────────────────────────────
let chatHistory = [];
// ───────────────────────────────────────────────────────────────

/* =======================
   SHADE FUNCTIONS AND LOGIC
======================= */
async function isPark(lat, lng) {
  const parksPolygonAPI =
    "https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/parks-polygon-representation/records";
  const parkQuery = new URLSearchParams({
    select: "park_name,geom",
    where: `intersects(geom, geom'POINT(${lng} ${lat})')`,
    limit: "1",
  });
  const res = await fetch(`${parksPolygonAPI}?${parkQuery}`);
  const data = await res.json();

  if (data.total_count == 0) {
    return false;
  } else {
    return true;
  }
}

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
const locations = JSON.parse(decodeURIComponent(el.dataset.locations));
const posts = JSON.parse(decodeURIComponent(el.dataset.posts));

/* =======================
   GLOBAL STATE
======================= */
let hasInfo = false;
let firstSystemPrompt = true;

let unit = localStorage.getItem("tempUnit") || "C";

let currentWeather = null;
let currentLocationName = "";
let currentProps = {};
let chatMode = "simple";
const circle = document.createElement("div");
circle.className = "circle-marker";

navigator.geolocation.getCurrentPosition((position) => {
  const lat = position.coords.latitude;
  const lon = position.coords.longitude;

  map.flyTo({
    center: [lon, lat],
    zoom: 14,
  });

  new maplibregl.Marker({ element: circle })
    .setLngLat([lon, lat])
    .setPopup(
      new maplibregl.Popup({ offset: 25 }).setHTML("Your current location"),
    )
    .addTo(map);
  const el = document.createElement("div");
  el.className = "circle-marker";

  const popup = new maplibregl.Popup({ offset: 10 }).setHTML(
    "Your current location",
  );

  new maplibregl.Marker({ element: el })
    .setLngLat([lon, lat])
    .setPopup(popup)
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
      renderWeather(
        currentWeather,
        currentLocationName,
        selectedLat,
        selectedLon,
        currentProps,
      );
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
  loadMarkers(locations);
  loadMarkers(posts);

  map.on("click", "points", async (e) => {
    const f = e.features[0];
    const lat = e.lngLat.lat;
    const lon = e.lngLat.lng;
    hasInfo = true;

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
      currentProps = f.properties;

      selectedLat = lat;
      selectedLon = lon;

      currentPosts = posts.filter((post) => {
        if (post.lat == null || post.lng == null) return false;

        return (
          Math.abs(post.lat - lat) < 0.0005 && Math.abs(post.lng - lon) < 0.0005
        );
      });

      switchToInfo();

      renderWeather(
        data,
        currentLocationName,
        selectedLat,
        selectedLon,
        currentProps,
      );
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
async function renderWeather(data, name, selectedLat, selectedLon, props = {}) {
  const panelContent = document.getElementById("panel");

  // Weather block
  let weatherBlock = "";
  if (data && data.current) {
    const tempC = data.current.temp_c;
    const feelsC = data.current.feelslike_c;
    const temp = unit === "C" ? tempC : (tempC * 9) / 5 + 32;
    const feels = unit === "C" ? feelsC : (feelsC * 9) / 5 + 32;
    const symbol = unit === "C" ? "°C" : "°F";

    weatherBlock = `
      <div class="form-check form-switch m-0 temp-toggle mt-2">
        <input class="form-check-input" type="checkbox" id="tempSwitch"
          ${unit === "F" ? "checked" : ""}>
        <label class="form-check-label" for="tempSwitch">
          <span class="label-c">°C</span>
          <span class="label-f">°F</span>
        </label>
      </div>
      <div class="temp">
        🌡️ ${temp.toFixed(1)}${unit === "C" ? "°C" : "°F"}
        <small class="text-muted">(Feels like ${feels.toFixed(1)}${unit === "C" ? "°C" : "°F"})</small>
      </div>
      <div class="details">
        🌤️ ${data.current.condition.text}<br>
        💨 Wind: ${data.current.wind_kph} km/h<br>
        💧 Humidity: ${data.current.humidity}%
      </div>
    `;
  }

  // Event fields — only shown if they exist on props

  const eventImage =
    props.image && props.image.startsWith("https")
      ? `<img src="${props.image}" class="event-card-img" alt="${props.name || ""}">`
      : "";

  const eventVenue = props.venue
    ? `<div class="event-detail">🏟️ Venue: <span>${props.venue}</span></div>`
    : "";

  const eventCity = props.city
    ? `<div class="event-detail">📍 Location: <span>${props.city}</span></div>`
    : "";

  const eventDate = props.date
    ? `<div class="event-detail">📅 Date: <span>${new Date(props.date).toLocaleDateString("en-CA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span></div>`
    : "";

  const eventDetailsBlock =
    props.venue || props.city || props.date
      ? `<div class="event-details-block">${eventVenue}${eventCity}${eventDate}</div>`
      : "";

  if (await isPark(selectedLat, selectedLon)) {
    panelContent.innerHTML = `
      <div class="weather-card">
        ${eventImage}
        <h4 class="fw-bold text-center mt-2">${name}</h4>
        ${eventDetailsBlock}
        ${weatherBlock}
        <br>
        <button id="toShadeMap" class="btn explore-btn w-100 position-relative">
          <img src="/img/shade/leaf.png" class="leaf-icon position-absolute top-50 start-0 translate-middle-y ms-3">
          <span>Explore Park</span>
          <span class="position-absolute top-50 end-0 translate-middle-y me-3 arrow">›</span>
        </button>
      </div>
      <div id="loading" class="loader"></div>
    `;
    document.getElementById("toShadeMap").addEventListener("click", () => {
      location.href = `/shademapLoad?lat=${selectedLat}&lon=${selectedLon}`;
    });
  } else {
    panelContent.innerHTML = `
      <div class="weather-card">
        ${eventImage}
        <h4 class="fw-bold text-center mt-2">${name}</h4>
        ${eventDetailsBlock}
        ${weatherBlock}
      </div>
      <div id="loading" class="loader"></div>
    `;
  }
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
      renderWeather(
        currentWeather,
        currentLocationName,
        selectedLat,
        selectedLon,
        currentProps,
      );
    } else {
      panelContent.innerHTML = `
        <div>Click a location</div>
        <div id="loading" class="loader"></div>
      `;
    }
  } else if (tab === "post") {
    if (!hasInfo) {
      panelContent.innerHTML = `
        <div class="alert alert-secondary">
          Click a location first.
        </div>
        <div id="loading" class="loader"></div>
      `;
      return;
    }

    if (!currentPosts || currentPosts.length === 0) {
      panelContent.innerHTML = `
        <div class="alert alert-secondary">
          No posts for this location.
        </div>
        <div id="loading" class="loader"></div>
      `;
      return;
    }

    // Sort by most recent first
    currentPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    panelContent.innerHTML = currentPosts
      .map((post) => {
        const color = ENV_COLORS[post.environment] || "#6C757D";

        const createdAt = post.createdAt
          ? new Date(post.createdAt).toLocaleString()
          : "Unknown";

        return `
        <div class="card shadow-sm border-0 mb-3">

          <img
            src="/image/${post.image}"
            class="card-img-top"
            style="height:250px; object-fit:cover;"
          >

          <div class="card-body">

            <h5 class="card-title fw-bold">
              ${post.location}
            </h5>

            <span class="fw-semibold">Description:</span>
            <p>${post.description}</p>

            <div class="mb-2">
              <span class="fw-semibold">Environment:</span>
              <span class="badge" style="background:${color}; color:white;">
                ${post.environment}
              </span>
            </div>

            <p><strong>Posted by:</strong> ${post.username}</p>
            <p class="text-muted small">Posted on: ${createdAt}</p>

          </div>
        </div>
        <div id="loading" class="loader"></div>
      `;
      })
      .join("");
  } else if (tab === "ai") {
    // ── CHAT TAB ───────────────────────────────────────────────
    renderChat();
    // ──────────────────────────────────────────────────────────
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
      <h5><b>👋 Welcome to VanCooler Map!</b></h5><br>
      <p>📍 Click a location marker to view event's details, weather information, and post uploaded by other users</p>
      <p>🧭 Use the filter buttons to display only the locations you want</p>
      <p>📝 Browse community uploads and recommendations in the Posts tab</p>
      <p>🤖 Ask questions in the AI Chat Bot tab to get quick information and travel tips about the selected location</p>
      <p>💬 The AI Chat Bot can answer things like best time to visit, what to bring, nearby attractions, and activities</p>
      <p>📱 Drag the information panel upward for a better mobile view</p>
      <p>🌡️ Turn on the temperature switch to view weather in °F</p>
      <p>🔄 Refresh the page if map data or posts are not loading properly</p>
      <button id="closeGuide">
        Got it
      </button>
    </div>
  `;

  document.body.appendChild(guide);

  document.getElementById("closeGuide").addEventListener("click", () => {
    guide.remove();
    backBtn.style.display = "";
  });
}

/* show only first time */
if (firstTimeMode) {
  backBtn.style.display = "none";
  setTimeout(showGuide, 1000);
}

async function loadMarkers(data) {
  let items = [];

  // GeoJSON format
  if (data.features) {
    items = data.features.map((feature) => ({
      coords: feature.geometry.coordinates,
      props: feature.properties,
    }));
  }

  // MongoDB posts array
  else if (Array.isArray(data)) {
    items = data.map((post) => ({
      coords: [Number(post.lng), Number(post.lat)],
      props: post,
    }));
  }

  items.forEach(({ coords, props }) => {
    // validate coordinates
    if (
      !coords ||
      coords.length !== 2 ||
      isNaN(coords[0]) ||
      isNaN(coords[1])
    ) {
      console.log("Invalid coords:", props);
      return;
    }

    const marker = new maplibregl.Marker({
      color: ENV_COLORS[props.environment] || "#6C757D",
    })
      .setLngLat(coords)
      .addTo(map);

    // ✅ NEW: Store marker in its environment bucket (or "none" if unrecognised)
    const envKey =
      markersByEnv[props.environment] !== undefined
        ? props.environment
        : "none";
    markersByEnv[envKey].push(marker);

    marker.getElement().addEventListener("click", async (e) => {
      e.stopPropagation();

      const lat = coords[1];
      const lon = coords[0];

      hasInfo = true;

      if (window.innerWidth <= 768) {
        setPanelHeight(HALF);
      }

      currentPosts = posts.filter((post) => {
        if (post.lat == null || post.lng == null) return false;
        return (
          Math.abs(post.lat - lat) < 0.0005 && Math.abs(post.lng - lon) < 0.0005
        );
      });

      selectedLat = lat;
      selectedLon = lon;
      currentProps = props;

      let loader = document.getElementById("loading");

      try {
        if (loader) loader.style.display = "block";

        const res = await fetch(`/weatherapi?lat=${lat}&lon=${lon}`);

        const weatherData = await res.json();

        if (!weatherData || !weatherData.current) return;

        currentWeather = weatherData;

        currentLocationName = props.name || props.location;

        switchToInfo();
        renderWeather(
          weatherData,
          currentLocationName,
          selectedLat,
          selectedLon,
          currentProps,
        );
      } catch (err) {
        console.error(err);
      } finally {
        if (loader) loader.style.display = "none";
      }
    });

    markers.push(marker);
  });
}

/* =======================
   FILTER MARKERS ✅ NEW
======================= */
function filterMarkers(env) {
  // Highlight the active filter button
  document.querySelectorAll(".map-legend button").forEach((btn) => {
    btn.classList.remove("active-filter");
  });
  event.target.classList.add("active-filter");

  if (env === "all") {
    // Show every marker
    markers.forEach((m) => (m.getElement().style.display = ""));
  } else {
    // Hide all first, then show only the matching env
    markers.forEach((m) => (m.getElement().style.display = "none"));
    (markersByEnv[env] || []).forEach(
      (m) => (m.getElement().style.display = ""),
    );
  }
}

function setChatMode(mode, btn) {
  chatMode = mode;
  document
    .querySelectorAll(".chat-mode-btn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
}

/* =======================
   AI CHAT
======================= */
function renderChat() {
  const panelContent = document.getElementById("panel");

  // Seed a greeting on first open (history persists for the whole session)
  if (chatHistory.length === 0) {
    chatHistory.push({
      role: "assistant",
      content: currentLocationName
        ? `Hey! I'm your VanCooler guide 🌊 Ask me anything about ${currentLocationName} — best times to visit, what to bring, nearby spots, and more.`
        : "Hey! I'm your VanCooler guide 🌊 Click a location on the map, then ask me anything about it — or just ask about Vancouver in general!",
    });
  }

  // Context-aware chips based on whether a location is selected
  const chips = currentLocationName
    ? [
        {
          label: "⏰ Best time to visit",
          prompt: `What's the best time to visit ${currentLocationName}?`,
        },
        {
          label: "🎒 What to bring",
          prompt: `What should I bring to ${currentLocationName}?`,
        },
        {
          label: "📍 Nearby spots",
          prompt: `What spots are worth checking out near ${currentLocationName}?`,
        },
      ]
    : [
        {
          label: "🌿 Best parks",
          prompt: "What are the coolest parks in Vancouver?",
        },
        {
          label: "☀️ Find shade",
          prompt: "Where can I find shade on a hot day in Vancouver?",
        },
        {
          label: "🌧️ Rainy day ideas",
          prompt: "What's fun to do in Vancouver on a rainy day?",
        },
      ];

  panelContent.innerHTML = `
    <div class="chat-shell">
      ${
        currentLocationName
          ? `
        <div class="chat-context-pill">
          <span class="chat-context-dot"></span>
          Chatting about: ${currentLocationName}
        </div>`
          : ""
      }

      <div class="chat-feed" id="chatFeed">
        ${chatHistory
          .map(
            (msg) => `
          <div class="chat-bubble ${msg.role === "user" ? "user" : "ai"}">
            ${msg.content}
          </div>`,
          )
          .join("")}
      </div>

      <div class="chat-chips" id="chatChips">
        ${chips
          .map(
            (c) =>
              `<button class="chat-chip" onclick="sendChip('${c.prompt.replace(/'/g, "\\'")}')">${c.label}</button>`,
          )
          .join("")}
      </div>

      <div class="chat-mode-row">
          <button class="chat-mode-btn active" data-mode="simple" onclick="setChatMode('simple', this)">Simple</button>
          <button class="chat-mode-btn" data-mode="detailed" onclick="setChatMode('detailed', this)">Detailed</button>
      </div>

      <div class="chat-input-row">
        <textarea
          class="chat-input"
          id="chatInput"
          rows="1"
          placeholder="Ask about this spot…"
          onkeydown="handleChatKey(event)"
          oninput="autogrow(this)"
        ></textarea>
        <button class="chat-send-btn" id="chatSendBtn" onclick="sendChatMessage()">➤</button>
      </div>
    </div>
  `;

  scrollChatToBottom();
}

function scrollChatToBottom() {
  const feed = document.getElementById("chatFeed");
  if (feed) feed.scrollTop = feed.scrollHeight;
}

function handleChatKey(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendChatMessage();
  }
}

function autogrow(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 96) + "px";
}

async function sendChip(prompt) {
  document.getElementById("chatInput").value = prompt;
  await sendChatMessage();
}

async function sendChatMessage() {
  const input = document.getElementById("chatInput");
  const sendBtn = document.getElementById("chatSendBtn");
  const feed = document.getElementById("chatFeed");
  if (!input || !feed) return;

  const text = input.value.trim();
  if (!text) return;

  input.value = "";
  input.style.height = "auto";
  sendBtn.disabled = true;

  // Hide chips after first user message
  const chips = document.getElementById("chatChips");
  if (chips) chips.style.display = "none";

  // Append user bubble
  chatHistory.push({ role: "user", content: text });
  const userBubble = document.createElement("div");
  userBubble.className = "chat-bubble user";
  userBubble.textContent = text;
  feed.appendChild(userBubble);
  scrollChatToBottom();

  // Typing indicator
  const typingBubble = document.createElement("div");
  typingBubble.className = "chat-bubble ai";
  typingBubble.innerHTML = `<div class="chat-typing"><span></span><span></span><span></span></div>`;
  feed.appendChild(typingBubble);
  scrollChatToBottom();

  const locationContext = currentLocationName
    ? `The user is currently viewing: ${currentLocationName} (lat ${selectedLat}, lon ${selectedLon}).`
    : "";

  const modeInstruction =
    chatMode === "detailed"
      ? `Give thorough, well-structured answers with context, tips, and background details. Use multiple sentences.`
      : `Help users discover cool spots, outdoor activities, parks, cafés, events, and weather tips.
Be concise (2-4 sentences), warm, and specific.`;

  const systemPrompt = `You are VanCooler, a friendly local guide for Vancouver, BC.
${modeInstruction} No markdown formatting. Once you have greeted the user, do not need to greet again. ${locationContext}`;

  let messages = [...chatHistory.slice(-12)];

  messages.push({ role: "user", content: systemPrompt });

  try {
    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });

    const data = await res.json();
    const reply = data.reply || "Sorry, I couldn't get a response right now.";

    chatHistory.push({ role: "assistant", content: reply });

    typingBubble.innerHTML = "";
    typingBubble.textContent = reply;
  } catch (err) {
    typingBubble.textContent =
      "⚠️ Couldn't reach the AI right now. Try again in a moment.";
    console.error(err);
  } finally {
    sendBtn.disabled = false;
    input.focus();
    scrollChatToBottom();
  }
}

checkDevice();
