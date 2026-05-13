document.addEventListener("DOMContentLoaded", () => {
  const guideToggle = document.getElementById("guideToggle");

  if (!guideToggle) return;

  // Make the page match the toggle state when dashboard first loads
  document.body.classList.toggle("guide-mode", guideToggle.checked);

  guideToggle.addEventListener("change", async () => {
    const firstTimeMode = guideToggle.checked;

    // Update page styling immediately
    document.body.classList.toggle("guide-mode", firstTimeMode);

    try {
      const response = await fetch("/guide-mode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          firstTimeMode: firstTimeMode
        })
      });

      const data = await response.json();

      if (!data.success) {
        console.error("Guide mode update failed:", data.message);
      }
    } catch (error) {
      console.error("Guide mode error:", error);
    }
  });
});

const menuButton = document.querySelector(".menu-btn");

if (menuButton) {
  menuButton.addEventListener("click", () => {
    console.log("Menu clicked");
  });
}

const weatherLocation = document.querySelector("#weatherLocation");
const weatherTemp = document.querySelector("#weatherTemp");
const weatherCondition = document.querySelector("#weatherCondition");
const weatherIcon = document.querySelector("#weatherIcon");
const forecastRow = document.querySelector("#forecastRow");

function getWeatherEmoji(condition) {
  const text = condition.toLowerCase();

  if (text.includes("sun") || text.includes("clear")) return "☀️";
  if (text.includes("cloud")) return "☁️";
  if (text.includes("rain")) return "🌧️";
  if (text.includes("snow")) return "❄️";
  if (text.includes("thunder")) return "⛈️";
  if (text.includes("fog") || text.includes("mist")) return "🌫️";

  return "🌤️";
}

async function fetchDashboardWeather(lat, lon) {
  try {
    let url = "/api/dashboard-weather";

    if (lat && lon) {
      url = `/api/dashboard-weather?lat=${lat}&lon=${lon}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.details || data.error || "Weather failed");
    }

    renderDashboardWeather(data);

  } catch (error) {
    console.error("Dashboard weather error:", error);

    weatherLocation.textContent = "Vancouver, BC";
    weatherTemp.textContent = "--°C";
    weatherCondition.textContent = "Weather unavailable";
    weatherIcon.textContent = "🌤️";

    forecastRow.innerHTML = `
      <div class="forecast-item">
        <span>No forecast available</span>
      </div>
    `;
  }
}

function renderDashboardWeather(data) {
  weatherLocation.textContent = `${data.city}, ${data.region}`;
  weatherTemp.textContent = `${data.temperature}°C`;
  weatherCondition.textContent = data.condition;
  weatherIcon.textContent = getWeatherEmoji(data.condition);

  forecastRow.innerHTML = "";

  data.forecast.forEach((day, index) => {
    const date = new Date(day.date + "T00:00:00");

    const dayName = date.toLocaleDateString("en-US", {
      weekday: "short"
    });

    const item = document.createElement("div");
    item.classList.add("forecast-item");

    item.innerHTML = `
      <span class="small-weather-icon">${getWeatherEmoji(day.condition)}</span>
      <span>${dayName} ${day.maxTemp}°/${day.minTemp}°</span>
    `;

    forecastRow.appendChild(item);

    if (index !== data.forecast.length - 1) {
      const divider = document.createElement("div");
      divider.classList.add("forecast-divider");
      forecastRow.appendChild(divider);
    }
  });
}

if ("geolocation" in navigator) {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      fetchDashboardWeather(
        position.coords.latitude,
        position.coords.longitude
      );
    },
    () => {
      fetchDashboardWeather(); // fallback Vancouver
    }
  );
} else {
  fetchDashboardWeather(); // fallback Vancouver
}
document.addEventListener("DOMContentLoaded", () => {
  const guideToggle = document.getElementById("guideToggle");

  if (guideToggle) {
    guideToggle.addEventListener("change", async () => {
      try {
        const response = await fetch("/guide-mode", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            guideMode: guideToggle.checked,
          }),
        });

        const data = await response.json();

        if (!data.success) {
          console.error("Guide mode update failed:", data.message);
        }
      } catch (error) {
        console.error("Guide mode error:", error);
      }
    });
  }

  const changeProfileBtn = document.getElementById("changeProfileBtn");
  const profilePicker = document.getElementById("profilePicker");
  const currentProfileImage = document.getElementById("currentProfileImage");
  const profileOptions = document.querySelectorAll(".profile-option");

  if (changeProfileBtn && profilePicker) {
    changeProfileBtn.addEventListener("click", () => {
      profilePicker.classList.toggle("show");
    });
  }

  profileOptions.forEach((option) => {
    option.addEventListener("click", async () => {
      const profileImage = option.dataset.image;

      try {
        const response = await fetch("/profile-picture", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ profileImage }),
        });

        const data = await response.json();

        if (!data.success) {
          console.error("Profile picture update failed:", data.message);
          return;
        }

        if (currentProfileImage) {
          currentProfileImage.src = data.profileImage;
        }

        profileOptions.forEach((btn) => {
          btn.classList.remove("selected");
        });

        option.classList.add("selected");

        if (profilePicker) {
          profilePicker.classList.remove("show");
        }
      } catch (err) {
        console.error("Profile picture error:", err);
      }
    });
  });
});