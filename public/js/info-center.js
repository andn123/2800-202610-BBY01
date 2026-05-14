const helpSearch = document.getElementById("helpSearch");
const tutorialSections = document.querySelectorAll(".tutorial-section");
const featureCards = document.querySelectorAll(".feature-card");

/*
  These are the pre-filled search recommendations.
  route = page to redirect to
  section = section id on help center page
*/
const recommendations = [
  {
    label: "Search Events",
    keywords: ["search", "events", "find events", "event search"],
    route: "/info-center#search-events",
  },
  {
    label: "Change Location",
    keywords: ["location", "city", "address", "change location"],
    route: "/info-center#change-location",
  },
  {
    label: "Sort Events",
    keywords: ["sort", "filter", "date", "organize"],
    route: "/info-center#sort-events",
  },
  {
    label: "Weather-Based Events",
    keywords: ["weather", "rain", "indoor", "outdoor", "recommendations"],
    route: "/info-center#weather-events",
  },
  {
    label: "Create Posts",
    keywords: ["post", "create post", "social spot", "submit post"],
    route: "/info-center#create-posts",
  },
  {
    label: "View Map",
    keywords: ["map", "places", "markers", "activity spots"],
    route: "/info-center#view-map",
  },
];

// Create recommendation dropdown
const suggestionBox = document.createElement("div");
suggestionBox.classList.add("suggestion-box");
helpSearch.parentElement.appendChild(suggestionBox);

function filterPage(searchValue) {
  tutorialSections.forEach((section) => {
    const title = section.dataset.title.toLowerCase();
    const text = section.innerText.toLowerCase();

    if (title.includes(searchValue) || text.includes(searchValue)) {
      section.classList.remove("hidden");
    } else {
      section.classList.add("hidden");
    }
  });

  featureCards.forEach((card) => {
    const text = card.innerText.toLowerCase();

    if (text.includes(searchValue)) {
      card.classList.remove("hidden");
    } else {
      card.classList.add("hidden");
    }
  });
}

function getMatches(searchValue) {
  if (!searchValue) {
    return recommendations;
  }

  return recommendations.filter((item) => {
    const labelMatch = item.label.toLowerCase().includes(searchValue);

    const keywordMatch = item.keywords.some((keyword) =>
      keyword.toLowerCase().includes(searchValue)
    );

    return labelMatch || keywordMatch;
  });
}

function showSuggestions(matches) {
  suggestionBox.innerHTML = "";

  if (matches.length === 0) {
    suggestionBox.classList.remove("active");
    return;
  }

  matches.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.classList.add("suggestion-item");
    button.textContent = item.label;

    button.addEventListener("click", () => {
      helpSearch.value = item.label;
      window.location.href = item.route;
    });

    suggestionBox.appendChild(button);
  });

  suggestionBox.classList.add("active");
}

helpSearch.addEventListener("input", function () {
  const searchValue = helpSearch.value.toLowerCase().trim();

  filterPage(searchValue);

  const matches = getMatches(searchValue);
  showSuggestions(matches);
});

helpSearch.addEventListener("focus", function () {
  const searchValue = helpSearch.value.toLowerCase().trim();
  showSuggestions(getMatches(searchValue));
});

helpSearch.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    const searchValue = helpSearch.value.toLowerCase().trim();
    const matches = getMatches(searchValue);

    if (matches.length > 0) {
      window.location.href = matches[0].route;
    }
  }
});

document.addEventListener("click", function (event) {
  if (!event.target.closest(".search-box")) {
    suggestionBox.classList.remove("active");
  }
});