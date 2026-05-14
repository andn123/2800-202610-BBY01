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
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstTimeMode: firstTimeMode,
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
      weekday: "short",
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
        position.coords.longitude,
      );
    },
    () => {
      fetchDashboardWeather(); // fallback Vancouver
    },
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

// My Posts
document.addEventListener("DOMContentLoaded", () => {
  const myPostsGrid = document.getElementById("myPostsGrid");
  const deleteOverlay = document.getElementById("deleteOverlay");
  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
  const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
  let pendingDeleteId = null;
  let currentPage = 1;
  const postsPerPage = 6;
  let allPosts = [];

  async function loadMyPosts() {
    try {
      const res = await fetch("/api/my-posts");
      allPosts = await res.json();
      renderPage(currentPage);
    } catch (err) {
      myPostsGrid.innerHTML = "<p>Failed to load posts.</p>";
    }
  }

  function renderPage(page) {
    if (!allPosts.length) {
      myPostsGrid.innerHTML = "<p>You haven't made any posts yet.</p>";
      return;
    }

    const totalPages = Math.ceil(allPosts.length / postsPerPage);
    const start = (page - 1) * postsPerPage;
    const pagePosts = allPosts.slice(start, start + postsPerPage);

    myPostsGrid.innerHTML = pagePosts
      .map(
        (post) => `
      <div class="my-post-card" id="post-${post._id}">
        <img src="/uploads/${post.image}" class="my-post-img" alt="post image">
        <div class="my-post-info">
          <p><strong>${post.location}</strong></p>
          <p>${post.description}</p>
          <p class="my-post-env">${post.environment}</p>
          <p class="my-post-date">${post.createdAt ? new Date(post.createdAt).toLocaleString() : ""}</p>
        </div>
        <button class="delete-post-btn" data-id="${post._id}">🗑 Delete</button>
      </div>
    `,
      )
      .join("");

    // Pagination controls
    const paginationHTML = `
      <div class="my-posts-pagination">
        <button class="my-page-btn" id="myPrevBtn" ${page === 1 ? "disabled" : ""}>Prev</button>
        <span class="my-page-number">Page ${page} of ${totalPages}</span>
        <button class="my-page-btn" id="myNextBtn" ${page === totalPages ? "disabled" : ""}>Next</button>
      </div>
    `;

    myPostsGrid.insertAdjacentHTML("afterend", paginationHTML);

    document.getElementById("myPrevBtn")?.addEventListener("click", () => {
      document.querySelector(".my-posts-pagination")?.remove();
      currentPage--;
      renderPage(currentPage);
    });

    document.getElementById("myNextBtn")?.addEventListener("click", () => {
      document.querySelector(".my-posts-pagination")?.remove();
      currentPage++;
      renderPage(currentPage);
    });
  }

  myPostsGrid.addEventListener("click", (e) => {
    const btn = e.target.closest(".delete-post-btn");
    if (!btn) return;
    pendingDeleteId = btn.dataset.id;
    deleteOverlay.classList.add("show");
  });

  confirmDeleteBtn.addEventListener("click", async () => {
    if (!pendingDeleteId) return;
    await fetch(`/posts/${pendingDeleteId}`, { method: "DELETE" });
    allPosts = allPosts.filter((p) => p._id !== pendingDeleteId);
    document.querySelector(".my-posts-pagination")?.remove();
    const totalPages = Math.ceil(allPosts.length / postsPerPage);
    if (currentPage > totalPages) currentPage = Math.max(1, totalPages);
    renderPage(currentPage);
    pendingDeleteId = null;
    deleteOverlay.classList.remove("show");
  });

  cancelDeleteBtn.addEventListener("click", () => {
    pendingDeleteId = null;
    deleteOverlay.classList.remove("show");
  });

  loadMyPosts();
});
