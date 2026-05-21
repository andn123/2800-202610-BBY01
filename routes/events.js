const express = require("express");
const router = express.Router();
const { userCollection } = require("../config/db");
const { isAuth } = require("../middleware/auth");

router.get("/events", isAuth, async (req, res) => {
  const user = await userCollection.findOne({ email: req.session.email });

  if (!user) {
    req.session.destroy();
    return res.redirect("/login");
  }

  const firstTimeMode = user.firstTimeMode !== false;

  res.render("events", {
    title: "Events",
    css: ["events.css", "style.css"],
    js: ["events.js"],
    navbar: true,
    guideMode: firstTimeMode,
    user: {
      name: user.username || "User",
      email: user.email || "",
      firstTimeMode,
    },
  });
});

router.get("/api/events", async (req, res) => {
  try {
    const { lat, lon, keyword = "", page = 0 } = req.query;

    if (!lat || !lon) {
      return res
        .status(400)
        .json({ error: "Latitude and longitude are required." });
    }

    const apiKey = process.env.TICKETMASTER_API_KEY;

    if (!apiKey) {
      return res
        .status(500)
        .json({ error: "Ticketmaster API key is missing." });
    }

    let url =
      "https://app.ticketmaster.com/discovery/v2/events.json" +
      `?apikey=${apiKey}` +
      `&latlong=${lat},${lon}` +
      `&radius=50` +
      `&unit=km` +
      `&size=10` +
      `&page=${page}` +
      `&sort=date,asc`;

    if (keyword.trim() !== "") {
      url += `&keyword=${encodeURIComponent(keyword.trim())}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.errors?.[0]?.detail || "Ticketmaster API error.",
      });
    }

    const events = (data._embedded?.events || []).map((event) => {
      const venue = event._embedded?.venues?.[0];
      const dateInfo = event.dates?.start || {};
      return {
        name: event.name || "Untitled Event",
        url: event.url || "#",
        date: dateInfo.localDate || "",
        time: dateInfo.localTime || "",
        city: venue?.city?.name || "Unknown city",
        venue: venue?.name || "Unknown venue",
      };
    });

    const pageInfo = data.page || {};
    const currentPage = Number(pageInfo.number || 0);
    const totalPages = Number(pageInfo.totalPages || 0);

    res.json({
      events,
      page: currentPage,
      totalPages,
      hasMore: currentPage + 1 < totalPages,
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ error: "Failed to fetch events." });
  }
});

module.exports = router;
