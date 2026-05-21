// Get map API
const mapApi = window.mapApi;

// Central app state (shared across map, weather, posts, chat)
const state = {
  currentPosts: [],
  chatHistory: [],
  currentProps: {},
  selectedLat: null,
  selectedLon: null,
  currentWeather: null,
  currentLocationName: "",
  hasInfo: false,
  unit: localStorage.getItem("tempUnit") || "C",
  chatMode: "simple",
};

// Environment color mapping for markers & UI badges
const ENV_COLORS = {
  sunny: "#FFD700",
  shaded: "#228B22",
  indoors: "#1E90FF",
};

// UI elements
const backBtn = document.getElementById("back-btn");
const el = document.getElementById("map");

// Decode server-provided dataset from DOM attributes
const locations = JSON.parse(decodeURIComponent(el.dataset.locations));
const posts = JSON.parse(decodeURIComponent(el.dataset.posts));

// First-time user guide flag
let firstTimeMode = window.firstTimeMode === "true";

// Marker storage
let markers = [];
let markersVisible = true;
let userMarker = null;

// Group markers by environment type (used for filtering)
let markersByEnv = {
  sunny: [],
  shaded: [],
  indoors: [],
  none: [], // fallback category (unknown/no env)
};

// Panel set up
const panel = document.getElementById("panelBox");

// Panel height states (mobile)
const COLLAPSED = 120;
const HALF = window.innerHeight * 0.45;
const FULL = window.innerHeight * 0.75;

let currentHeight = COLLAPSED;

// Mobile drag system
let isMobile = window.innerWidth <= 768;
let startY = 0;
let startHeight = 0;

// Shade function and logic
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

// Map Initialization
const map = new maplibregl.Map({
  container: "map",
  style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${mapApi}`,
  center: [-123.1207, 49.2827],
  zoom: 11,
});

// Add zoom/rotation controls
map.addControl(new maplibregl.NavigationControl());

// User location markers
const circle = document.createElement("div");
circle.className = "circle-marker";

// Get user's geolocation and center map
navigator.geolocation.getCurrentPosition((position) => {
  const lat = position.coords.latitude;
  const lon = position.coords.longitude;

  map.flyTo({
    center: [lon, lat],
    zoom: 14,
  });
  // Add user marker popup
  new maplibregl.Marker({ element: circle })
    .setLngLat([lon, lat])
    .setPopup(
      new maplibregl.Popup({ offset: 25 }).setHTML("Your current location"),
    )
    .addTo(map);
});

// Temperature unit switch (°C / °F)
document.addEventListener("change", (e) => {
  if (e.target && e.target.id === "tempSwitch") {
    state.unit = e.target.checked ? "F" : "C";
    localStorage.setItem("tempUnit", state.unit);

    // Re-render weather if already loaded
    if (state.currentWeather) {
      renderWeather(
        state.currentWeather,
        state.currentLocationName,
        state.selectedLat,
        state.selectedLon,
        state.currentProps,
      );
    }
  }
});

// Initial panel setup
if (window.innerWidth <= 768) {
  panel.style.height = COLLAPSED + "px";
} else {
  panel.style.height = "100vh";
}

// Map load events
map.on("load", () => {
  // Load both location + post markers
  loadMarkers(locations);
  loadMarkers(posts);

  // Click handler for map points layer
  map.on("click", "points", async (e) => {
    const f = e.features[0];
    const lat = e.lngLat.lat;
    const lon = e.lngLat.lng;
    handleLocationSelect(lat, lon, f.properties);
  });
});

// Weather fetching
async function fetchWeather(lat, lon) {
  const res = await fetch(`/weatherapi?lat=${lat}&lon=${lon}`);

  if (!res.ok) {
    throw new Error("Failed to fetch weather");
  }

  return await res.json();
}

// Location selection logic
async function handleLocationSelect(lat, lon, props) {
  state.hasInfo = true;

  if (window.innerWidth <= 768) {
    setPanelHeight(HALF);
  }

  // Store selected location
  state.selectedLat = lat;
  state.selectedLon = lon;
  state.currentProps = props;

  // Filter posts near selected location
  state.currentPosts = posts.filter((post) => {
    if (post.lat == null || post.lng == null) return false;

    return (
      Math.abs(post.lat - lat) < 0.0005 && Math.abs(post.lng - lon) < 0.0005
    );
  });

  try {
    toggleLoader(true);

    const weatherData = await fetchWeather(lat, lon);

    state.currentWeather = weatherData;
    state.currentLocationName = props.name || props.location;

    switchToInfo();

    renderWeather(weatherData, state.currentLocationName, lat, lon, props);
  } catch (err) {
    console.error(err);
  } finally {
    toggleLoader(false);
  }
}

// Loading UI
function toggleLoader(show) {
  const loader = document.getElementById("loading");

  if (!loader) return;

  loader.style.display = show ? "block" : "none";
}

// Temperature utility
function convertTemp(tempC) {
  if (state.unit === "F") {
    return (tempC * 9) / 5 + 32;
  }

  return tempC;
}

// Date formatter
function formatDate(date) {
  return new Date(date).toLocaleDateString("en-CA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Weather UI component
function createWeatherBlock(data, temp, feels) {
  return `
      <div class="form-check form-switch m-0 temp-toggle mt-2">
        <input class="form-check-input" type="checkbox" id="tempSwitch"
          ${state.unit === "F" ? "checked" : ""}>
        <label class="form-check-label" for="tempSwitch">
          <span class="label-c">°C</span>
          <span class="label-f">°F</span>
        </label>
      </div>
      <div class="temp">
        🌡️ ${temp.toFixed(1)}${state.unit === "C" ? "°C" : "°F"}
        <small class="text-muted">(Feels like ${feels.toFixed(1)}${state.unit === "C" ? "°C" : "°F"})</small>
      </div>
      <div class="details">
        🌤️ ${data.current.condition.text}<br>
        💨 Wind: ${data.current.wind_kph} km/h<br>
        💧 Humidity: ${data.current.humidity}%
      </div>
    `;
}

// Event details UI
function createEventDetails(props) {
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
    ? `<div class="event-detail">📅 Date: <span>${formatDate(props.date)}</span></div>`
    : "";

  const eventDetailsBlock =
    props.venue || props.city || props.date
      ? `<div class="event-details-block">${eventVenue}${eventCity}${eventDate}</div>`
      : "";
  return [eventImage, eventDetailsBlock];
}

// Map marker loading
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

  // Create markers
  items.forEach(({ coords, props }) => {
    // validate coordinates
    if (!coords || coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1]))
      return;

    const marker = new maplibregl.Marker({
      color: ENV_COLORS[props.environment] || "#6C757D",
    })
      .setLngLat(coords)
      .addTo(map);

    // Store by environment for filtering
    const envKey =
      markersByEnv[props.environment] !== undefined
        ? props.environment
        : "none";
    markersByEnv[envKey].push(marker);

    // Click handler
    marker.getElement().addEventListener("click", async (e) => {
      e.stopPropagation();

      const lat = coords[1];
      const lon = coords[0];

      handleLocationSelect(lat, lon, props);
    });

    markers.push(marker);
  });
}

// Marker filter system
function filterMarkers(env, btn) {
  // Highlight the active filter button
  document.querySelectorAll(".map-legend button").forEach((btn) => {
    btn.classList.remove("active-filter");
  });
  btn.classList.add("active-filter");

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

// Location card creation
function createLocationCard(eventImage, name, weatherBlock, eventDetailsBlock) {
  return `<div class="weather-card">
        ${eventImage}
        <h4 class="fw-bold text-center mt-2">${name}</h4>
        ${eventDetailsBlock}
        ${weatherBlock}
      </div>
      <br>`;
}

// Shade button creation
function shadeButton() {
  return `<button id="toShadeMap" class="btn explore-btn w-100 position-relative">
          <img src="/img/shade/leaf.png" class="leaf-icon position-absolute top-50 start-0 translate-middle-y ms-3">
          <span>Explore Park</span>
          <span class="position-absolute top-50 end-0 translate-middle-y me-3 arrow">›</span>
        </button>
      </div>`;
}

// Add event listener to shade button
function attachShadeButtonHandler(lat, lon) {
  const btn = document.getElementById("toShadeMap");
  if (!btn) return;
  btn.addEventListener("click", () => {
    location.href = `/shademapLoad?lat=${lat}&lon=${lon}`;
  });
}

// Render weather
async function renderWeather(data, name, selectedLat, selectedLon, props = {}) {
  const panelContent = document.getElementById("panel");
  let weatherBlock = "";
  if (data && data.current) {
    const tempC = data.current.temp_c;
    const feelsC = data.current.feelslike_c;
    const temp = convertTemp(tempC);
    const feels = convertTemp(feelsC);
    const symbol = state.unit === "C" ? "°C" : "°F";
    weatherBlock = createWeatherBlock(data, temp, feels);
  }

  // Event fields — only shown if they exist on props
  const [eventImage, eventDetailsBlock] = createEventDetails(props);

  // If shade exists
  if (await isPark(selectedLat, selectedLon)) {
    panelContent.innerHTML = `
      ${createLocationCard(eventImage, name, weatherBlock, eventDetailsBlock)}
        ${shadeButton()}
      <div id="loading" class="loader"></div>
    `;

    attachShadeButtonHandler(selectedLat, selectedLon);
  } else {
    // If shade does not exist
    panelContent.innerHTML = `
      ${createLocationCard(eventImage, name, weatherBlock, eventDetailsBlock)}
      <div id="loading" class="loader"></div>
    `;
  }
}

// Set panel height
function setPanelHeight(value) {
  // Check if the device is mobile
  if (window.innerWidth <= 768) {
    value = Math.max(COLLAPSED, Math.min(FULL, value));
    panel.style.height = value + "px";
    currentHeight = value;
  } else {
    //If not set full height
    panel.style.height = "100vh";
    currentHeight = value;
  }
}

// Enable drag in mobile view
function enableDrag() {
  panel.addEventListener("touchstart", touchStart);
  panel.addEventListener("touchmove", touchMove);
  panel.addEventListener("touchend", touchEnd);
}

// Disable drag in desktop view
function disableDrag() {
  panel.removeEventListener("touchstart", touchStart);
  panel.removeEventListener("touchmove", touchMove);
  panel.removeEventListener("touchend", touchEnd);
}

// Touch start in mobile view
function touchStart(e) {
  if (e.target.closest("#chatFeed")) return;
  map.dragPan.disable();
  startY = e.touches[0].clientY;
  startHeight = panel.offsetHeight;
}

// Scrolling in mobile view
function touchMove(e) {
  if (e.target.closest("#chatFeed")) return;
  const delta = startY - e.touches[0].clientY;
  let newHeight = startHeight + delta;
  setPanelHeight(newHeight);
}

// Touch end in mobile view
function touchEnd(e) {
  if (e.target.closest("#chatFeed")) return;
  map.dragPan.enable();
  snap();
}

// Device check
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

// Snap the panel height
function snap() {
  let target;

  // Set to three height only
  if (currentHeight < (COLLAPSED + HALF) / 2) {
    target = COLLAPSED;
  } else if (currentHeight < (HALF + FULL) / 2) {
    target = HALF;
  } else {
    target = FULL;
  }

  // Add transition
  panel.style.transition = "height 0.3s ease";
  setPanelHeight(target);

  setTimeout(() => {
    panel.style.transition = "";
  }, 300);
}

// Tabs in info panel
function showTab(tab, event) {
  // Remove active in all tabs
  document
    .querySelectorAll(".nav-link")
    .forEach((btn) => btn.classList.remove("active"));

  // Add to the selected tab
  if (event) event.target.classList.add("active");
  const panelContent = document.getElementById("panel");

  // The user selects the info tab
  if (tab === "info") {
    // Check if the user already selects a location
    if (state.hasInfo) {
      renderWeather(
        state.currentWeather,
        state.currentLocationName,
        state.selectedLat,
        state.selectedLon,
        state.currentProps,
      );
    } else {
      // If the user doesn't selects a location, shows "Click a location"
      panelContent.innerHTML = `
        <div>Click a location</div>
        <div id="loading" class="loader"></div>
      `;
    }

    // The user selects the post tab
  } else if (tab === "post") {
    if (!state.hasInfo) {
      panelContent.innerHTML = `
        <div class="alert alert-secondary">
          Click a location first.
        </div>
        <div id="loading" class="loader"></div>
      `;
      return;
    }

    // If no posts
    if (!state.currentPosts || state.currentPosts.length === 0) {
      panelContent.innerHTML = `
        <div class="alert alert-secondary">
          No posts for this location.
        </div>
        <div id="loading" class="loader"></div>
      `;
      return;
    }

    // Sort by most recent first
    state.currentPosts.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );

    panelContent.innerHTML = state.currentPosts
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

    // The user selects ai chat bot tab
  } else if (tab === "ai") {
    renderChat();
  }
}

// Switch to info tab
function switchToInfo() {
  document
    .querySelectorAll(".nav-link")
    .forEach((btn) => btn.classList.remove("active"));
  document.querySelector(".nav-link").classList.add("active");
}

// Resize the screen
window.addEventListener("resize", () => {
  map.resize();
  checkDevice();
});

// First time guide
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

// Set the selected chat mode
function setChatMode(mode, btn) {
  state.chatMode = mode;
  document
    .querySelectorAll(".chat-mode-btn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
}

// Convert the AI response to HTML
function markdownToHtml(text) {
  return (
    text
      // Code blocks (must come before inline code)
      .replace(/```[\w]*\n?([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
      // Inline code
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      // Headers
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^# (.+)$/gm, "<h1>$1</h1>")
      // Bold + italic combined
      .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
      // Bold
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      // Italic
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      // Unordered lists
      .replace(/^\s*[-*+] (.+)$/gm, "<li>$1</li>")
      .replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>")
      // Ordered lists
      .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
      // Blockquotes
      .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
      // Horizontal rule
      .replace(/^---$/gm, "<hr>")
      // Links
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>')
      // Line breaks (after block elements are handled)
      .replace(/\n/g, "<br>")
  );
}

// Render AI chat
function renderChat() {
  const panelContent = document.getElementById("panel");

  // Seed a greeting on first open (history persists for the whole session)
  if (state.chatHistory.length === 0) {
    state.chatHistory.push({
      role: "assistant",
      content: state.currentLocationName
        ? `Hey! I'm your VanCooler guide 🌊 Ask me anything about ${state.currentLocationName} — best times to visit, what to bring, nearby spots, and more.`
        : "Hey! I'm your VanCooler guide 🌊 Click a location on the map, then ask me anything about it — or just ask about Vancouver in general!",
    });
  }

  // Context-aware chips based on whether a location is selected
  const chips = state.currentLocationName
    ? [
        {
          label: "⏰ Best time to visit",
          prompt: `What's the best time to visit ${state.currentLocationName}?`,
        },
        {
          label: "🎒 What to bring",
          prompt: `What should I bring to ${state.currentLocationName}?`,
        },
        {
          label: "📍 Nearby spots",
          prompt: `What spots are worth checking out near ${state.currentLocationName}?`,
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
        state.currentLocationName
          ? `
        <div class="chat-context-pill">
          <span class="chat-context-dot"></span>
          Chatting about: ${state.currentLocationName}
        </div>`
          : ""
      }

      <div class="chat-feed" id="chatFeed">
        ${state.chatHistory
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

// Scrolls the chat feed div to its bottom so the latest message is always visible
function scrollChatToBottom() {
  const feed = document.getElementById("chatFeed");
  if (feed) feed.scrollTop = feed.scrollHeight;
}

// Shift+Enter inserts a newline; plain Enter submits the message.
function handleChatKey(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendChatMessage();
  }
}

// Auto-grows the textarea as the user types, up to a maximum of 96 px,
function autogrow(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 96) + "px";
}

// Pre-fills the chat input with a chip prompt and immediately sends it.
// This simulates a user typing and submitting in one tap.
async function sendChip(prompt) {
  document.getElementById("chatInput").value = prompt;
  await sendChatMessage();
}

// Reads the chat input, appends a user bubble, shows a typing indicator,
async function sendChatMessage() {
  const input = document.getElementById("chatInput");
  const sendBtn = document.getElementById("chatSendBtn");
  const feed = document.getElementById("chatFeed");
  if (!input || !feed) return;

  const text = input.value.trim();
  if (!text) return;

  input.value = "";
  input.style.height = "auto";
  sendBtn.disabled = true; // Prevent double-sends while waiting for the response

  // Hide chips after first user message
  const chips = document.getElementById("chatChips");
  if (chips) chips.style.display = "none";

  // Append user bubble
  state.chatHistory.push({ role: "user", content: text });
  const userBubble = document.createElement("div");
  userBubble.className = "chat-bubble user";
  userBubble.textContent = text;
  feed.appendChild(userBubble);
  scrollChatToBottom();

  // Render an animated "..." typing indicator while the API call is in flight
  const typingBubble = document.createElement("div");
  typingBubble.className = "chat-bubble ai";
  typingBubble.innerHTML = `<div class="chat-typing"><span></span><span></span><span></span></div>`;
  feed.appendChild(typingBubble);
  scrollChatToBottom();

  // Inject the current location into the system prompt so the AI can give
  // location-specific answers without the user needing to mention it
  const locationContext = state.currentLocationName
    ? `The user is currently viewing: ${state.currentLocationName} (lat ${state.selectedLat}, lon ${state.selectedLon}).`
    : "";

  // Mode-specific instruction shapes the length and depth of each reply
  const modeInstruction =
    state.chatMode === "detailed"
      ? `Give thorough, well-structured answers with context, tips, and background details. Use multiple sentences.`
      : `Help users discover cool spots, outdoor activities, parks, cafés, events, and weather tips.
Be concise (2-4 sentences), warm, and specific.`;

  const systemPrompt = `You are VanCooler, a friendly local guide for Vancouver, BC.
${modeInstruction} No markdown formatting. Once you have greeted the user, do not need to greet again. ${locationContext}`;

  // Prepend the system prompt as the first user message (Anthropic-style injection).
  // Only the last 12 history entries are sent to keep token usage in check.
  let messages = [...state.chatHistory.slice(-12)];
  messages.unshift({ role: "user", content: systemPrompt });

  try {
    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });

    const data = await res.json();
    const reply = data.reply || "Sorry, I couldn't get a response right now.";

    // Persist the assistant reply and replace the typing indicator with the real text
    state.chatHistory.push({ role: "assistant", content: reply });
    typingBubble.innerHTML = "";
    typingBubble.innerHTML = markdownToHtml(reply);
  } catch (err) {
    // Network or server error — show a friendly fallback in the same bubble
    typingBubble.textContent =
      "⚠️ Couldn't reach the AI right now. Try again in a moment.";
    console.error(err);
  } finally {
    sendBtn.disabled = false;
    input.focus();
    scrollChatToBottom();
  }
}

// Initial start
checkDevice();
