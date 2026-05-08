require("./utils.js");
require("dotenv").config();
const { isPark, findShelter, findTrees } = require("./public/js/shadeServer");
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
require("dotenv").config();
const bcrypt = require("bcrypt");
const Joi = require("joi");
const { title } = require("node:process");
const saltRounds = 10;
const weatherApi = process.env.WEATHER_API;
const mapApi = process.env.MAP_API;
const multer = require("multer");

const app = express();
const port = process.env.PORT || 3000;
const expireTime = 60 * 60 * 1000; // 1 hour in milliseconds

// Added these two lines otherwise I cannot connect to the database - Andrew
const dns = require("node:dns/promises");
dns.setServers(["1.1.1.1", "8.8.8.8"]);

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/uploads");
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    const allowed = ["image/jpeg", "image/png", "image/jpg"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only JPG and PNG images allowed"));
    }
    cb(null, true);
  },
});

app.set("view engine", "ejs");
app.use(express.static("public"));

const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_user_database = process.env.MONGODB_USER_DATABASE;
const mongodb_session_database = process.env.MONGODB_SESSION_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;
const node_session_secret = process.env.NODE_SESSION_SECRET;
const mongodb_database = process.env.MONGODB_DATABASE;
const { database } = include("databaseConnection");
const userCollection = database.db(mongodb_user_database).collection("users");
const postsCollection = database.db(mongodb_database).collection("posts");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

var mongoStore = MongoStore.create({
  mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${mongodb_session_database}`,
  crypto: {
    secret: mongodb_session_secret,
  },
});

app.use(
  session({
    secret: node_session_secret,
    store: mongoStore, //default is memory store
    saveUninitialized: false,
    resave: true,
  }),
);
app.set("view engine", "ejs");
app.use(express.static("public"));

app.get("/map", async (req, res) => {
  const apiKey = process.env.TICKETMASTER_API_KEY;

  const posts = await postsCollection.find({}).toArray();

  const url = `https://app.ticketmaster.com/discovery/v2/events.json?latlong=49.2827,-123.1207&radius=100&unit=km&size=200&sort=date,asc&apikey=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    const events = data._embedded?.events || [];

    // convert to geojson
    const locations = {
      type: "FeatureCollection",

      features: events
        .filter((event) => {
          const venue = event._embedded?.venues?.[0];

          return venue?.location;
        })

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
      posts: posts,
      mapApi: mapApi,
      locations,
      title: "Map",
      css: ["map.css"],
      js: ["map.js"],
    });
  } catch (err) {
    console.error(err);
    res.send("Error fetching events");
  }
});
app.get("/shade", async (req, res) => {
  if (!req.session.authenticated) {
    res.redirect("/login");
    return;
  }
  res.render("shade", {
    title: "shademap",
    css: ["shade.css", "style.css"],
    js: [],
  });
});

app.post("/shademap", async (req, res) => {
  const park = await isPark(req.body.lat, req.body.lon);
  if (park.boolean) {
    const parkName = park.name;
    const trees = await findTrees(req.body.lat, req.body.lon);
    const shelter = await findShelter(req.body.lat, req.body.lon);

    res.render("shade", {
      title: "shademap",
      css: ["shade.css", "style.css"],
      js: [],
      latitude: req.body.lat,
      longitude: req.body.lon,
      trees: trees,
      shelter: shelter,
      parkName: parkName,
    });
  } else {
    res.render("noShade");
  }
});

app.get("/about", (req, res) => {
  if (!req.session.authenticated) {
    res.redirect("/login");
    return;
  }
  res.render("about", {
    title: "About",
    css: ["about.css", "style.css"],
    js: ["about.js"],
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
        title: "Weather",
        css: ["weather.css", "style.css"],
        js: ["weather.js"],
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

// Home route
app.get("/", (req, res) => {
  res.render("index", {
    title: "Home",
    css: ["style.css", "home.css"],
    js: ["home.js"],
    currentPage: "home",
    authenticated: req.session.authenticated,
    username: req.session.username,
  });
});

app.get("/login", (req, res) => {
  if (req.session.authenticated) {
    res.redirect("/");
    return;
  }
  res.render("LogIn", {
    title: "Login",
    css: ["style.css", "SignUpLogIn.css"],
    js: ["SignUpLogIn.js"],
    errorMessage: "",
  });
});

app.get("/info-center", (req, res) => {
  if (!req.session.authenticated) {
    res.redirect("/login");
    return;
  }
  res.render("info-center", {
    title: "Info Center",
    css: ["info-center.css", "style.css"],
    js: ["info-center.js"],
  });
});

app.post("/loggingin", async (req, res) => {
  const { email, password } = req.body;

  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
  });

  const validationResult = schema.validate({ email, password });
  if (validationResult.error) {
    res.render("LogIn", {
      title: "Login",
      css: ["style.css", "SignUpLogIn.css"],
      js: ["SignUpLogIn.js"],
      errorMessage: "Error: Incorrect email or password",
    });
    return;
  }

  const result = await userCollection
    .find({ email: email })
    .project({ email: 1, username: 1, password: 1, _id: 1 })
    .toArray();

  if (result.length != 1) {
    res.render("LogIn", {
      title: "Login",
      css: ["style.css", "SignUpLogIn.css"],
      js: ["SignUpLogIn.js"],
      errorMessage: "Error: Invalid email or password",
    });
    return;
  }
  if (await bcrypt.compare(password, result[0].password)) {
    req.session.authenticated = true;
    req.session.email = email;
    req.session.username = result[0].username;
    req.session.cookie.maxAge = expireTime;
    res.redirect("/");
    return;
  } else {
    res.render("LogIn", {
      title: "Login",
      css: ["style.css", "SignUpLogIn.css"],
      js: ["SignUpLogIn.js"],
      errorMessage: "Error: Invalid email or password",
    });
    return;
  }
});

app.get("/signup", (req, res) => {
  if (req.session.authenticated) {
    res.redirect("/");
    return;
  }
  res.render("signUp", {
    title: "Sign Up",
    css: ["style.css", "SignUpLogIn.css"],
    js: ["SignUpLogIn.js"],
    errorMessage: "",
  });
});

app.post("/signingup", async (req, res) => {
  const { username, email, password } = req.body;

  const schema = Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
  });

  const validationResult = schema.validate({ username, email, password });
  if (validationResult.error) {
    res.render("signUp", {
      title: "Sign Up",
      css: ["style.css", "SignUpLogIn.css"],
      js: ["SignUpLogIn.js"],
      errorMessage:
        "Error: Invalid format for " +
        validationResult.error.details[0].context.key,
    });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, saltRounds);
  await userCollection.insertOne({
    username: username,
    email: email,
    password: hashedPassword,
  });

  const html = 'Created user successfully! <a href="/login">Login here</a>';
  res.send(html);
});

app.post("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
  res.render("index", {
    currentPage: "home",
  });
});

app.get("/post", (req, res) => {
  if (!req.session || !req.session.authenticated) {
    return res.redirect("/login");
  }

  res.render("post", {
    error: null,
    success: null,
    mapApi: mapApi,
  });
});
const axios = require("axios");

app.post("/post", upload.single("image"), async (req, res) => {
  if (!req.session || !req.session.authenticated) {
    return res.redirect("/login");
  }

  let location = req.body.location;
  let description = req.body.description;
  let environment = req.body.environment;
  let imageFile = req.file;

  const schema = Joi.object({
    location: Joi.string().min(1).required(),
    description: Joi.string().min(1).required(),
    environment: Joi.string().valid("shaded", "sunny", "indoors").required(),
  });

  const validationResult = schema.validate({
    location,
    description,
    environment,
  });

  if (validationResult.error || !imageFile) {
    return res.render("post", {
      mapApi: mapApi,
      error: validationResult.error
        ? validationResult.error.message
        : "Image is required",
      success: null,
    });
  }

  let lat = parseFloat(req.body.lat);
  let lng = parseFloat(req.body.lng);

  if (!lat || !lng) {
    return res.render("post", {
      mapApi: mapApi,
      error: "Please select a valid location from the dropdown.",
      success: null,
    });
  }

  await postsCollection.insertOne({
    username: req.session.username,
    location,
    description,
    environment,
    image: imageFile.filename,
    lat: lat,
    lng: lng,
    createdAt: new Date(),
  });

  res.redirect("/posts?success=1");
});

app.get("/posts", async (req, res) => {
  if (!req.session || !req.session.authenticated) {
    return res.redirect("/login");
  }

  const search = req.query.search || "";
  const safeSearch = escapeRegex(search);
  const env = req.query.environment || "";
  const page = parseInt(req.query.page) || 1;
  const success = req.query.success === "1";
  const limit = 9; // 3 rows of 3 cards
  const skip = (page - 1) * limit;

  let query = {};

  if (search) {
    query.$or = [
      { location: { $regex: safeSearch, $options: "i" } },
      { description: { $regex: safeSearch, $options: "i" } },
    ];
  }

  if (env) {
    query.environment = env;
  }

  const totalPosts = await postsCollection.countDocuments(query);

  const posts = await postsCollection
    .find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  const totalPages = Math.max(1, Math.ceil(totalPosts / limit));

  res.render("posts", {
    posts,
    search,
    env,
    page,
    totalPages,
    success,
  });
});

app.get("/api/posts", async (req, res) => {
  const posts = await postsCollection
    .find(
      {},
      {
        projection: {
          lat: 1,
          lng: 1,
          location: 1,
          description: 1,
          environment: 1,
          image: 1,
          username: 1,
          createdAt: 1,
        },
      },
    )
    .toArray();

  res.json(posts);
});

// Events page route
app.get("/events", (req, res) => {
  if (!req.session.authenticated) {
    res.redirect("/login");
    return;
  }
  res.render("events", {
    title: "Events",
    css: ["events.css", "style.css"],
    js: ["events.js"],
  });
});

// Ticketmaster API route
app.get("/api/events", async (req, res) => {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        error: "Latitude and longitude are required.",
      });
    }

    const apiKey = process.env.TICKETMASTER_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Ticketmaster API key is missing in .env file.",
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
        venue: venue?.name || "Unknown venue",
      };
    });

    res.json(formattedEvents);
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({
      error: "Failed to fetch events.",
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
