const mapApi = window.mapApi;

const input = document.getElementById("locationInput");
const suggestionsBox = document.getElementById("locationSuggestions");
const latField = document.getElementById("latField");
const lngField = document.getElementById("lngField");

let chosen = false;

input.addEventListener("input", async function () {
  const query = input.value.trim();
  chosen = false;

  if (query.length < 3) {
    suggestionsBox.style.display = "none";
    return;
  }

  const url =
    "https://api.maptiler.com/geocoding/" +
    encodeURIComponent(query) +
    ".json?key=" +
    mapApi +
    "&limit=5" +
    "&types=address,street,poi" +
    "&proximity=-123.1207,49.2827"; // Vancouver bias

  try {
    const res = await fetch(url);
    const data = await res.json();

    suggestionsBox.innerHTML = "";
    suggestionsBox.style.display = "block";

    data.features.forEach(function (feature) {
      const div = document.createElement("div");

      div.style.padding = "8px";
      div.style.cursor = "pointer";
      div.style.borderBottom = "1px solid #eee";

      const regex = new RegExp(query, "i");

      div.innerHTML = feature.place_name.replace(regex, function (match) {
        return "<strong>" + match + "</strong>";
      });

      div.addEventListener("click", function () {
        input.value = feature.place_name;
        latField.value = feature.center[1];
        lngField.value = feature.center[0];

        chosen = true;
        suggestionsBox.style.display = "none";
      });

      suggestionsBox.appendChild(div);
    });
  } catch (err) {
    console.error("Geocoding error:", err);
    suggestionsBox.style.display = "none";
  }
});

// Prevent form submission unless a suggestion was chosen
document.querySelector("form").addEventListener("submit", function (e) {
  if (!chosen) {
    e.preventDefault();
    alert("Please select a valid location from the dropdown.");
  }
});
