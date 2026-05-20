const eventsContainer = document.getElementById("eventsContainer");
const statusBox = document.getElementById("statusBox");
const locationText = document.getElementById("locationText");
const eventSearch = document.getElementById("eventSearch");
const sortButton = document.getElementById("sortButton");
const sortMenu = document.getElementById("sortMenu");
const addressInput = document.getElementById("addressInput");
const addressSearchBtn = document.getElementById("addressSearchBtn");
const loadMoreBtn = document.getElementById("loadMoreBtn");
const loadMoreWrap = document.getElementById("loadMoreWrap");
const loadingSpinner = document.getElementById("loadingSpinner");

let currentSort = "date-asc";
let allEvents = [];

let currentLat = null;
let currentLon = null;
let currentPage = 0;
let hasMoreEvents = false;
let isLoading = false;
let searchTimer = null;

window.addEventListener("load", () => {
  setupEventsTutorial();
  getUserLocation();
});

function getUserLocation() {
  if (!navigator.geolocation) {
    showError("Your browser does not support location services.");
    return;
  }

  showStatus("Loading nearby events...");

  navigator.geolocation.getCurrentPosition(
    (position) => {
      currentLat = position.coords.latitude;
      currentLon = position.coords.longitude;

      getCityName(currentLat, currentLon);
      fetchEvents({ reset: true });
    },
    () => {
      showError("Location permission was denied. Please allow location access or enter a city/address.");
    }
  );
}

async function fetchEvents({ reset = false, minimumLoadingTime = 0 } = {}) {
  if (isLoading) return;

  if (!currentLat || !currentLon) {
    showError("Location is missing. Please enter a city or allow location access.");
    return;
  }

  try {
    isLoading = true;

    const loadingStartTime = Date.now();

    if (reset) {
      currentPage = 0;
      allEvents = [];
      eventsContainer.innerHTML = "";
      loadMoreWrap.classList.add("hidden");
      showStatus("Loading events...");
    } else {
      showSpinner();
    }

    const keyword = eventSearch.value.trim();

    const url =
      `/api/events?lat=${encodeURIComponent(currentLat)}` +
      `&lon=${encodeURIComponent(currentLon)}` +
      `&page=${currentPage}` +
      `&keyword=${encodeURIComponent(keyword)}`;

    const response = await fetch(url);
    const data = await response.json();

    const elapsedTime = Date.now() - loadingStartTime;
    const remainingTime = minimumLoadingTime - elapsedTime;

    if (remainingTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, remainingTime));
    }

    if (!response.ok) {
      showError(data.error || "Something went wrong.");
      return;
    }

    const newEvents = data.events || [];

    if (reset && newEvents.length === 0) {
      eventsContainer.innerHTML = "";
      showError(keyword ? `No events found for "${keyword}".` : "No events found near your location.");
      return;
    }

    allEvents = [...allEvents, ...newEvents];

    hasMoreEvents = data.hasMore === true;

    statusBox.style.display = "none";
    updateEventList();

    if (hasMoreEvents) {
      loadMoreWrap.classList.remove("hidden");
    } else {
      loadMoreWrap.classList.add("hidden");
    }
  } catch (error) {
    console.error(error);
    showError("Failed to load events.");
  } finally {
    isLoading = false;
    hideSpinner();
  }
}

function displayEvents(events) {
  eventsContainer.innerHTML = "";

  events.forEach((event) => {
    const eventCard = document.createElement("article");
    eventCard.classList.add("event-card");

    const month = getMonth(event.date);
    const day = getDay(event.date);
    const eventTime = formatTime(event.time);

    eventCard.innerHTML = `
      <div class="event-date">
        <span>${month}</span>
        <strong>${day}</strong>
      </div>

      <div class="event-info">
        <span class="near-you">NEAR YOU</span>
        <p class="event-time">${formatDate(event.date)} • ${eventTime}</p>
        <h2>${escapeHTML(event.name)}</h2>
        <p class="event-location">${escapeHTML(event.city)} • ${escapeHTML(event.venue)}</p>
      </div>

      <div class="event-action">
        <a href="${event.url}" target="_blank" rel="noopener noreferrer">Find Tickets</a>
      </div>
    `;

    eventsContainer.appendChild(eventCard);
  });
}

function updateEventList() {
  let sortedEvents = sortEvents(allEvents);

  if (sortedEvents.length === 0) {
    eventsContainer.innerHTML = `
      <div class="no-results">
        No events found.
      </div>
    `;
    return;
  }

  displayEvents(sortedEvents);
}

function sortEvents(events) {
  const sortedEvents = [...events];

  if (currentSort === "date-asc") {
    sortedEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  if (currentSort === "date-desc") {
    sortedEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  if (currentSort === "name-asc") {
    sortedEvents.sort((a, b) => a.name.localeCompare(b.name));
  }

  if (currentSort === "name-desc") {
    sortedEvents.sort((a, b) => b.name.localeCompare(a.name));
  }

  if (currentSort === "venue-asc") {
    sortedEvents.sort((a, b) => a.venue.localeCompare(b.venue));
  }

  return sortedEvents;
}

function getMonth(dateString) {
  if (!dateString) return "N/A";

  const date = new Date(dateString);
  return date.toLocaleString("en-US", { month: "short" }).toUpperCase();
}

function getDay(dateString) {
  if (!dateString) return "--";

  const date = new Date(dateString);
  return String(date.getDate()).padStart(2, "0");
}

function formatDate(dateString) {
  if (!dateString) return "Date TBA";

  const date = new Date(dateString);
  return date.toLocaleString("en-US", { weekday: "short" });
}

function formatTime(timeString) {
  if (!timeString) return "Time TBA";

  const [hour, minute] = timeString.split(":");
  const date = new Date();

  date.setHours(Number(hour));
  date.setMinutes(Number(minute));

  return date.toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function showStatus(message) {
  statusBox.style.display = "block";
  statusBox.textContent = message;
}

function showError(message) {
  statusBox.style.display = "block";
  statusBox.textContent = message;
  loadMoreWrap.classList.add("hidden");
  hideSpinner();
}

function showSpinner() {
  loadingSpinner.classList.remove("hidden");
  loadMoreBtn.disabled = true;
  loadMoreWrap.classList.add("hidden");
}

function hideSpinner() {
  loadingSpinner.classList.add("hidden");
  loadMoreBtn.disabled = false;
  loadMoreBtn.textContent = "Load More Events";
}

function escapeHTML(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

eventSearch.addEventListener("input", () => {
  clearTimeout(searchTimer);

  searchTimer = setTimeout(() => {
    currentPage = 0;
    fetchEvents({ reset: true });
  }, 500);
});

sortButton.addEventListener("click", () => {
  sortMenu.classList.toggle("show");
});

sortMenu.querySelectorAll("button").forEach((button) => {
  button.addEventListener("click", () => {
    currentSort = button.dataset.sort;
    sortButton.innerHTML = `${button.textContent} <span>⌄</span>`;
    sortMenu.classList.remove("show");
    updateEventList();
  });
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".sort-dropdown")) {
    sortMenu.classList.remove("show");
  }
});

addressSearchBtn.addEventListener("click", searchAddressLocation);

addressInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    searchAddressLocation();
  }
});

loadMoreBtn.addEventListener("click", async () => {
  if (!hasMoreEvents || isLoading) return;

  currentPage += 1;

  await fetchEvents({ reset: false, minimumLoadingTime: 2000 });
});

async function getCityName(lat, lon) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
    );

    const data = await response.json();

    const city =
      data.address.city ||
      data.address.town ||
      data.address.village ||
      data.address.municipality ||
      data.address.county ||
      "your area";

    locationText.textContent = `Showing events near ${city}`;
  } catch (error) {
    console.error("Error getting city name:", error);
    locationText.textContent = "Showing events near your location";
  }
}

async function searchAddressLocation() {
  const address = addressInput.value.trim();

  if (address === "") {
    showError("Please enter a city or address.");
    return;
  }

  try {
    showStatus("Finding location...");
    eventsContainer.innerHTML = "";
    loadMoreWrap.classList.add("hidden");

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
    );

    const data = await response.json();

    if (data.length === 0) {
      showError(`Could not find location for "${address}".`);
      return;
    }

    const location = data[0];

    currentLat = location.lat;
    currentLon = location.lon;
    currentPage = 0;

    const displayName = location.display_name.split(",").slice(0, 2).join(",");

    locationText.textContent = `Showing events near ${displayName}`;

    fetchEvents({ reset: true });
  } catch (error) {
    console.error("Error searching address:", error);
    showError("Could not search that location.");
  }
}

function setupEventsTutorial() {
  const tutorial = document.getElementById("eventsTutorial");
  const closeBtn = document.getElementById("closeTutorial");
  const gotItBtn = document.getElementById("gotItTutorial");

  if (!tutorial) return;

  function closeTutorial() {
    tutorial.style.display = "none";
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", closeTutorial);
  }

  if (gotItBtn) {
    gotItBtn.addEventListener("click", closeTutorial);
  }
}