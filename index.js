const express = require("express");
const { MongoClient } = require("mongodb");
const MongoStore = require("connect-mongo").default;
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// EJS setup
app.set("view engine", "ejs");

// Static files
app.use(express.static("public"));

// Home route
app.get("/", (req, res) => {
  res.send("Hello world");
});

// Events page route
app.get("/events", (req, res) => {
  res.render("events");
});

// Ticketmaster API route
app.get("/api/events", async (req, res) => {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        error: "Latitude and longitude are required."
      });
    }

    const apiKey = process.env.TICKETMASTER_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Ticketmaster API key is missing in .env file."
      });
    }

    const url =
      "https://app.ticketmaster.com/discovery/v2/events.json" +
      `?apikey=${apiKey}` +
      `&latlong=${lat},${lon}` +
      `&radius=50` +
      `&unit=km` +
      `&size=10` +
      `&sort=date,asc`;

    const response = await fetch(url);
    const data = await response.json();

    const events = data._embedded?.events || [];

    const formattedEvents = events.map((event) => {
      const dateInfo = event.dates?.start || {};
      const venue = event._embedded?.venues?.[0];

      return {
        name: event.name,
        url: event.url,
        date: dateInfo.localDate,
        time: dateInfo.localTime,
        city: venue?.city?.name || "Unknown city",
        venue: venue?.name || "Unknown venue"
      };
    });

    res.json(formattedEvents);
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({
      error: "Failed to fetch events."
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});