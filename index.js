require("./utils.js");
require("dotenv").config();
const {
  isPark,
  findShelter,
  findTrees,
  findAmenities,
  parkBoundary,
} = require("./public/js/shadeServer");
const { ObjectId } = require("mongodb");
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
const { GoogleGenAI } = require("@google/genai");

const app = express();
const port = process.env.PORT || 3000;
const expireTime = 60 * 60 * 1000; // 1 hour in milliseconds

// Added these two lines otherwise I cannot connect to the database - Andrew
const dns = require("node:dns/promises");
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_user_database = process.env.MONGODB_USER_DATABASE;
const mongodb_session_database = process.env.MONGODB_SESSION_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;
const node_session_secret = process.env.NODE_SESSION_SECRET;
const mongodb_database = process.env.MONGODB_DATABASE;
const gemini_api_key = process.env.GEMINI_API_KEY;
const { database } = include("databaseConnection");
const userCollection = database.db(mongodb_user_database).collection("users");
const postsCollection = database.db(mongodb_database).collection("posts");

const genAI = new GoogleGenAI({ apiKey: gemini_api_key });
const profileImages = [
  "/img/profile1.png",
  "/img/profile2.png",
  "/img/profile3.png",
  "/img/profile4.png",
  "/img/profile5.png",
  "/img/profile6.png",
];

function getRandomProfileImage() {
  const randomIndex = Math.floor(Math.random() * profileImages.length);
  return profileImages[randomIndex];
}

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

app.use(function (req, res, next) {
  if (!req.session.votes) {
    req.session.votes = {};
  }
  next();
});

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const signupAttemptsCollection = database
  .db(mongodb_database)
  .collection("signupAttempts");

async function signupLimiter(req, res, next) {
  const raw =
    req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
  const ip = require("crypto").createHash("sha256").update(raw).digest("hex");
  const now = new Date();
  const cutoff = new Date(now - 24 * 60 * 60 * 1000);

  const count = await signupAttemptsCollection.countDocuments({
    ip: ip,
    createdAt: { $gt: cutoff },
  });

  if (count >= 2) {
    return res.render("signUp", {
      title: "Sign Up",
      css: ["style.css", "SignUpLogIn.css"],
      js: ["SignUpLogIn.js"],
      errorMessage:
        "Too many accounts created from this IP. Please try again tomorrow.",
      navbar: false,
    });
  }

  await signupAttemptsCollection.insertOne({ ip: ip, createdAt: now });
  next();
}

// Home route
app.get("/", (req, res) => {
  res.render("index", {
    title: "Home",
    css: ["style.css", "home.css"],
    js: ["home.js"],
    currentPage: "home",
    authenticated: req.session.authenticated,
    username: req.session.username,
    navbar: false,
  });
});

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
      navbar: false,
      css: ["map.css"],
      js: ["map.js"],
      navbar: false,
    });
  } catch (err) {
    console.error(err);
    res.send("Error fetching events");
  }
});

app.get("/shademapLoad", async (req, res) => {
  res.render("shademapLoad", {
    title: "loading",
    css: ["shadeLoad.css"],
    js: ["shadeLoad.js"],
    latitude: req.query.lat,
    longitude: req.query.lon,
    navbar: false,
  });
});

app.get("/shademap", async (req, res) => {
  const park = await isPark(req.query.lat, req.query.lon);
  if (park.boolean) {
    try {
      const bounds = await parkBoundary(req.query.lat, req.query.lon);
      const amenities = await findAmenities(
        req.query.lat,
        req.query.lon,
        bounds.boundsOverpass,
      );
      const trees = await findTrees(
        req.query.lat,
        req.query.lon,
        bounds.boundsTrees,
      );
      const shelter = await findShelter(
        req.query.lat,
        req.query.lon,
        bounds.boundsOverpass,
      );
      const parkName = park.name;
      const result = await userCollection.findOne(
        { email: req.session.email },
        { projection: { _id: 0, firstTimeMode: 1 } },
      );
      res.render("shade", {
        title: "shademap",
        css: ["shade.css", "style.css"],
        js: [],
        firstTime: result.firstTimeMode,
        latitude: req.query.lat,
        longitude: req.query.lon,
        trees: trees,
        shelter: shelter,
        amenities: amenities,
        parkName: parkName,
        navbar: false,
      });
    } catch (error) {
      console.log(error.message);
      res.render("noShade", {
        title: "shademap",
        css: ["noShade.css"],
        js: ["noShade.js"],
      });
    }
  } else {
    res.render("noShade", {
      title: "shademap",
      css: ["noShade.css"],
      js: ["noShade.js"],
    });
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
    navbar: true,
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
        navbar: true,
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
    navbar: false,
  });
});

app.get("/info-center", (req, res) => {
  res.render("info-center", {
    title: "Info Center",
    css: ["info-center.css", "style.css"],
    js: ["info-center.js"],
    navbar: false,
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
      navbar: false,
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

    res.redirect("/dashboard");
    return;
  } else {
    res.render("LogIn", {
      title: "Login",
      css: ["style.css", "SignUpLogIn.css"],
      js: ["SignUpLogIn.js"],
      errorMessage: "Error: Invalid email or password",
      navbar: false,
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
    navbar: false,
  });
});

app.post("/signingup", signupLimiter, async (req, res) => {
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
      navbar: false,
    });
    return;
  }

  // Check if email or username is already taken
  const existingUser = await userCollection.findOne({
    $or: [{ email: email }, { username: username }],
  });

  if (existingUser) {
    const conflictField = existingUser.email === email ? "email" : "username";
    res.render("signUp", {
      title: "Sign Up",
      css: ["style.css", "SignUpLogIn.css"],
      js: ["SignUpLogIn.js"],
      errorMessage: `Error: That ${conflictField} is already in use.`,
      navbar: false,
    });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, saltRounds);
  await userCollection.insertOne({
    username: username,
    email: email,
    password: hashedPassword,
    profileImage: getRandomProfileImage(),
    firstTimeMode: true,
  });

  req.session.authenticated = true;
  req.session.email = email;
  req.session.username = username;
  req.session.cookie.maxAge = expireTime;

  // First-time users start with Guide Mode on
  req.session.guideMode = true;

  res.redirect("/dashboard");
});

app.post("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
  res.render("index", {
    currentPage: "home",
    navbar: false,
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
    likes: 0,
    dislikes: 0,
    likedBy: [],
    dislikedBy: [],
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
  const limit = 9;
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
  const totalPages = Math.max(1, Math.ceil(totalPosts / limit));

  if (page > totalPages) {
    return res.redirect(
      `/posts?page=${totalPages}&search=${search}&environment=${env}`,
    );
  }

  const posts = await postsCollection
    .find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();

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
app.get("/events", async (req, res) => {
  if (!req.session.authenticated) {
    res.redirect("/login");
    return;
  }

  const user = await userCollection.findOne({
    email: req.session.email,
  });

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
      firstTimeMode: firstTimeMode,
    },
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
app.get("/api/dashboard-weather", async (req, res) => {
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
      throw new Error(data.error?.message || "Weather API Error");
    }

    res.json({
      city: data.location?.name || "Vancouver",
      region: data.location?.region || "BC",
      country: data.location?.country || "Canada",
      temperature: Math.round(data.current?.temp_c),
      condition: data.current?.condition?.text || "Weather unavailable",
      icon: data.current?.condition?.icon || "",
      forecast:
        data.forecast?.forecastday?.map((day) => {
          return {
            date: day.date,
            maxTemp: Math.round(day.day.maxtemp_c),
            minTemp: Math.round(day.day.mintemp_c),
            condition: day.day.condition?.text || "",
            icon: day.day.condition?.icon || "",
          };
        }) || [],
    });
  } catch (error) {
    console.error("Dashboard weather error:", error.message);

    res.status(500).json({
      error: "Dashboard weather failed",
      details: error.message,
    });
  }
});
app.get("/dashboard", async (req, res) => {
  try {
    if (!req.session.authenticated) {
      res.redirect("/login");
      return;
    }

    let user = await userCollection.findOne({
      email: req.session.email,
    });

    if (!user) {
      req.session.destroy();
      return res.redirect("/login");
    }

    if (!user.profileImage) {
      const randomProfileImage = getRandomProfileImage();

      await userCollection.updateOne(
        { email: req.session.email },
        { $set: { profileImage: randomProfileImage } },
      );

      user.profileImage = randomProfileImage;
    }

    const firstTimeMode = user.firstTimeMode !== false;

    res.render("dashboard", {
      title: "Dashboard",
      css: ["dashboard.css", "style.css"],
      js: ["dashboard.js"],
      navbar: true,
      guideMode: firstTimeMode,
      profileImages: profileImages,
      user: {
        name: user.username || "User",
        email: user.email || "",
        profileImage: user.profileImage,
        firstTimeMode: firstTimeMode,
      },
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).send("Server error loading dashboard");
  }
});

app.post("/profile-picture", async (req, res) => {
  try {
    if (!req.session.authenticated) {
      return res.status(401).json({
        success: false,
        message: "Not logged in",
      });
    }

    const { profileImage } = req.body;

    if (!profileImages.includes(profileImage)) {
      return res.status(400).json({
        success: false,
        message: "Invalid profile image",
      });
    }

    await userCollection.updateOne(
      { email: req.session.email },
      { $set: { profileImage: profileImage } },
    );

    res.json({
      success: true,
      profileImage: profileImage,
    });
  } catch (err) {
    console.error("Profile picture update error:", err);
    res.status(500).json({
      success: false,
      message: "Server error updating profile picture",
    });
  }
});

app.post("/guide-mode", async (req, res) => {
  try {
    if (!req.session.authenticated) {
      return res.status(401).json({
        success: false,
        message: "Not logged in",
      });
    }

    const guideMode = req.body.guideMode === true;

    await userCollection.updateOne(
      { email: req.session.email },
      { $set: { firstTimeMode: guideMode } },
    );

    req.session.guideMode = guideMode;

    res.json({
      success: true,
      guideMode: guideMode,
    });
  } catch (err) {
    console.error("Guide mode update error:", err);
    res.status(500).json({
      success: false,
      message: "Server error updating guide mode",
    });
  }
});

async function handleVote(req, res, type) {
  if (!req.session.authenticated)
    return res.status(401).json({ error: "Not logged in" });

  const email = req.session.email;
  const post = await postsCollection.findOne({
    _id: new ObjectId(req.params.id),
  });
  if (!post) return res.status(404).json({ error: "Post not found" });

  let { likes = 0, dislikes = 0, likedBy = [], dislikedBy = [] } = post;
  const isLike = type === "like";
  const ownArr = isLike ? likedBy : dislikedBy;
  const otherArr = isLike ? dislikedBy : likedBy;
  const ownKey = isLike ? "likes" : "dislikes";
  const otherKey = isLike ? "dislikes" : "likes";

  const alreadyOwn = ownArr.includes(email);
  const alreadyOther = otherArr.includes(email);

  if (alreadyOwn) {
    // Undo
    likes += isLike ? -1 : 0;
    dislikes += isLike ? 0 : -1;
    ownArr.splice(ownArr.indexOf(email), 1);
  } else {
    // Switch if needed
    if (alreadyOther) {
      if (isLike) dislikes -= 1;
      else likes -= 1;
      otherArr.splice(otherArr.indexOf(email), 1);
    }
    if (isLike) likes += 1;
    else dislikes += 1;
    ownArr.push(email);
  }

  await postsCollection.updateOne(
    { _id: post._id },
    { $set: { likes, dislikes, likedBy, dislikedBy } },
  );

  res.json({ likes, dislikes });
}

app.post("/posts/:id/like", (req, res) => handleVote(req, res, "like"));
app.post("/posts/:id/dislike", (req, res) => handleVote(req, res, "dislike"));
app.post("/chat", async (req, res) => {
  try {
    const messages = req.body.messages;

    if (!messages) {
      return res.status(400).json({ error: "Message required" });
    }

    const formatted = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    // Call the correct SDK syntax
    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash-lite", // gemini-2.5-flash is recommended for general text tasks
      contents: formatted,
    });

    // Send back the property string
    res.json({
      reply: response.text,
    });
  } catch (err) {
    console.error("Full Gemini Error:", err);
    res.status(500).json({
      error: "Gemini request failed",
      details: err.message,
    });
  }
});

app.get("/api/my-posts", async (req, res) => {
  if (!req.session.authenticated)
    return res.status(401).json({ error: "Not logged in" });
  const posts = await postsCollection
    .find({ username: req.session.username })
    .sort({ createdAt: -1 })
    .toArray();
  res.json(posts);
});

app.delete("/posts/:id", async (req, res) => {
  if (!req.session.authenticated)
    return res.status(401).json({ error: "Not logged in" });
  const post = await postsCollection.findOne({
    _id: new ObjectId(req.params.id),
  });
  if (!post) return res.status(404).json({ error: "Post not found" });
  if (post.username !== req.session.username)
    return res.status(403).json({ error: "Not your post" });
  await postsCollection.deleteOne({ _id: post._id });
  res.json({ success: true });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
