require("dotenv").config();
const express = require("express");
const app = express();
const weatherApi = process.env.WEATHER_API;
const mapApi = process.env.MAP_API;

app.set("view engine", "ejs");

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.render("test", {
    css: [],
    js: [],
  });
});

app.get("/map", (req, res) => {
  const locations = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [-123.1207, 49.2827], // Vancouver
        },
        properties: {
          name: "Vancouver",
        },
      },
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [-123.1, 49.25],
        },
        properties: {
          name: "Point 2",
        },
      },
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [-74.006, 40.7128], // NYC
        },
        properties: {
          name: "New York City",
        },
      },
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [-71.0589, 42.3601], // Boston
        },
        properties: {
          name: "Boston",
        },
      },
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [-122.76932, 49.26637], // Vancouver
        },
        properties: {
          name: "Port Coquiland",
        },
      },
    ],
  };

  res.render("map", {
    mapApi: mapApi,
    locations,
    css: ["map"],
    js: ["map"],
  });
});

app.get("/about", (req, res) => {
  res.render("about", {
    css: ["about"],
    js: ["about"],
  });
});

app.get("/weatherapi", async (req, res) => {
  const lat = req.query.lat;
  const lon = req.query.lon;

  let query = "Vancouver";

  if (lat && lon) {
    query = `${lat},${lon}`;
  }

  const url = `https://api.weatherapi.com/v1/forecast.json?key=${weatherApi}&q=${query}&days=4&aqi=no&alerts=no`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "API Error");
    }

    if (!lat || !lon) {
      res.render("weather", {
        weatherData: data,
        css: [],
        js: [],
      });
    } else {
      res.json(data);
    }
  } catch (error) {
    console.error("DEBUG ERROR:", error.message);

    res.status(500).json({
      error: "Internal Server Error",
      details: error.message,
    });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
