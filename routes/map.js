const express = require("express");
const router = express.Router();
const { postsCollection, userCollection } = require("../config/db");
const { isAuth } = require("../middleware/auth");
const { shadeMapData } = require("../public/js/shadeServer");

const mapApi = process.env.MAP_API;

router.get("/map", isAuth, async (req, res) => {
  const apiKey = process.env.TICKETMASTER_API_KEY;
  const posts = await postsCollection.find({}).toArray();

  const user = await userCollection.findOne({ email: req.session.email });

  if (!user) {
    req.session.destroy();
    return res.redirect("/login");
  }

  const firstTimeMode = user.firstTimeMode !== false;

  const url = `https://app.ticketmaster.com/discovery/v2/events.json?latlong=49.2827,-123.1207&radius=100&unit=km&size=200&sort=date,asc&apikey=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    const events = data._embedded?.events || [];

    const locations = {
      type: "FeatureCollection",
      features: events
        .filter((event) => event._embedded?.venues?.[0]?.location)
        .map((event) => {
          const venue = event._embedded.venues[0];
          return {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [
                parseFloat(venue.location.longitude),
                parseFloat(venue.location.latitude),
              ],
            },
            properties: {
              name: event.name,
              venue: venue.name,
              city: venue.city?.name,
              date: event.dates?.start?.localDate,
              image: event.images?.[0]?.url,
            },
          };
        }),
    };

    res.render("map", {
      posts,
      mapApi,
      locations,
      title: "Map",
      css: ["map.css", "back-button.css"],
      js: ["map.js"],
      navbar: false,
      firstTimeMode,
      backButton: true,
      backButtonHref: "/dashboard",
      backButtonClass: "map-back",
    });
  } catch (err) {
    console.error(err);
    res.send("Error fetching events");
  }
});

router.get("/noShade", (req, res) => {
  res.render("noShade", {
    title: "shademap",
    css: ["noShade.css"],
    js: ["noShade.js"],
  });
});

router.get("/shademapLoad", (req, res) => {
  res.render("shademapLoad", {
    title: "loading",
    css: ["shadeLoad.css"],
    js: ["shadeLoad.js"],
    latitude: req.query.lat,
    longitude: req.query.lon,
    navbar: false,
  });
});

router.get("/shademap", async (req, res) => {
  const { lat: latitude, lon: longitude } = req.query;

  try {
    const data = await shadeMapData(latitude, longitude);
    const firstTime = (
      await userCollection.findOne(
        { email: req.session.email },
        { projection: { _id: 0, firstTimeMode: 1 } },
      )
    )?.firstTimeMode;

    res.render("shade", {
      title: "shademap",
      css: ["shade.css", "style.css"],
      js: ["shade.js"],
      latitude,
      longitude,
      firstTime,
      navbar: false,
      ...data,
    });
  } catch (error) {
    console.error(error.message);
    res.redirect("/noShade");
  }
});

module.exports = router;
