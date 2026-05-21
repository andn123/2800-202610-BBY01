const express = require("express");
const router = express.Router();

const weatherApi = process.env.WEATHER_API;

router.get("/weatherapi", async (req, res) => {
  const { lat, lon } = req.query;
  const query = lat && lon ? `${lat},${lon}` : "Vancouver";
  const url = `https://api.weatherapi.com/v1/forecast.json?key=${weatherApi}&q=${query}&days=4&aqi=no&alerts=no`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) throw new Error(data.error?.message || "API Error");

    if (!lat || !lon) {
      res.render("weather", {
        weatherData: data,
        title: "Weather",
        css: ["weather.css", "style.css"],
        js: ["weather.js"],
        navbar: true,
      });
    } else {
      res.json(data);
    }
  } catch (error) {
    console.error("Weather error:", error.message);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
});

router.get("/api/dashboard-weather", async (req, res) => {
  const { lat, lon } = req.query;
  const query = lat && lon ? `${lat},${lon}` : "Vancouver";
  const url = `https://api.weatherapi.com/v1/forecast.json?key=${weatherApi}&q=${query}&days=4&aqi=no&alerts=no`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok)
      throw new Error(data.error?.message || "Weather API Error");

    res.json({
      city: data.location?.name || "Vancouver",
      region: data.location?.region || "BC",
      country: data.location?.country || "Canada",
      temperature: Math.round(data.current?.temp_c),
      condition: data.current?.condition?.text || "Weather unavailable",
      icon: data.current?.condition?.icon || "",
      forecast:
        data.forecast?.forecastday?.map((day) => ({
          date: day.date,
          maxTemp: Math.round(day.day.maxtemp_c),
          minTemp: Math.round(day.day.mintemp_c),
          condition: day.day.condition?.text || "",
          icon: day.day.condition?.icon || "",
        })) || [],
    });
  } catch (error) {
    console.error("Dashboard weather error:", error.message);
    res
      .status(500)
      .json({ error: "Dashboard weather failed", details: error.message });
  }
});

module.exports = router;
