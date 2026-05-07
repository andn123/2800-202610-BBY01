const eventsContainer = document.getElementById("eventsContainer");
const statusBox = document.getElementById("statusBox");
const locationText = document.getElementById("locationText");
const eventSearch = document.getElementById("eventSearch");
const sortSelect = document.getElementById("sortSelect");

let allEvents = [];

window.addEventListener("load", () => {
  getUserLocation();
});

function getUserLocation() {
  if (!navigator.geolocation) {
    showError("Your browser does not support location services.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    position => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      getCityName(lat, lon);
fetchEvents(lat, lon);
    },
    () => {
      showError("Location permission was denied. Please allow location access.");
    }
  );
}

async function fetchEvents(lat, lon) {
  try {
    const response = await fetch(`/api/events?lat=${lat}&lon=${lon}`);
    const events = await response.json();

    if (!response.ok) {
      showError(events.error || "Something went wrong.");
      return;
    }

    if (events.length === 0) {
      showError("No events found near your location.");
      return;
    }

    statusBox.style.display = "none";
    allEvents = events;
updateEventList();
  } catch (error) {
    console.error(error);
    showError("Failed to load events.");
  }
}

function displayEvents(events) {
  eventsContainer.innerHTML = "";

  events.forEach(event => {
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
        <h2>${event.name}</h2>
        <p class="event-location">${event.city} • ${event.venue}</p>
      </div>

      <div class="event-action">
        <a href="${event.url}" target="_blank">Find Tickets</a>
      </div>
    `;

    eventsContainer.appendChild(eventCard);
  });
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
  date.setHours(hour);
  date.setMinutes(minute);

  return date.toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
}

function showError(message) {
  statusBox.style.display = "block";
  statusBox.textContent = message;
}
eventSearch.addEventListener("input", updateEventList);
sortSelect.addEventListener("change", updateEventList);

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

function updateEventList() {
  const searchValue = eventSearch.value.toLowerCase();

  let filteredEvents = allEvents.filter(event => {
    return (
      event.name.toLowerCase().includes(searchValue) ||
      event.venue.toLowerCase().includes(searchValue) ||
      event.city.toLowerCase().includes(searchValue)
    );
  });

  filteredEvents = sortEvents(filteredEvents);

  if (filteredEvents.length === 0) {
    eventsContainer.innerHTML = `
      <div class="no-results">
        No events found for "${eventSearch.value}"
      </div>
    `;
    return;
  }

  displayEvents(filteredEvents);
}

function sortEvents(events) {
  const sortValue = sortSelect.value;
  const sortedEvents = [...events];

  if (sortValue === "date-asc") {
    sortedEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  if (sortValue === "date-desc") {
    sortedEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  if (sortValue === "name-asc") {
    sortedEvents.sort((a, b) => a.name.localeCompare(b.name));
  }

  if (sortValue === "name-desc") {
    sortedEvents.sort((a, b) => b.name.localeCompare(a.name));
  }

  if (sortValue === "venue-asc") {
    sortedEvents.sort((a, b) => a.venue.localeCompare(b.venue));
  }

  return sortedEvents;
}