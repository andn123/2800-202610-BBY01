require('./utils.js');
require('dotenv').config(); 
const express = require("express");
const session = require('express-session');
const MongoStore = require("connect-mongo").default;
require("dotenv").config();
const bcrypt = require('bcrypt');
const Joi = require('joi');
const { title } = require('node:process');
const saltRounds = 10;
const weatherApi = process.env.WEATHER_API;
const mapApi = process.env.MAP_API;

const app = express();
const port = process.env.PORT || 3000;
const expireTime = 60 * 60 * 1000; // 1 hour in milliseconds

app.set("view engine", "ejs");
app.use(express.static("public"));

const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_user_database = process.env.MONGODB_USER_DATABASE;
const mongodb_session_database = process.env.MONGODB_SESSION_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;
const node_session_secret = process.env.NODE_SESSION_SECRET;

const {database} = include('databaseConnection');
const userCollection = database.db(mongodb_user_database).collection('users');


app.use(express.json());
app.use(express.urlencoded({ extended: false }));

var mongoStore = MongoStore.create({
	mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${mongodb_session_database}`,
	crypto: {
		secret: mongodb_session_secret
	},
});

app.use(session({ 
  secret: node_session_secret,
	store: mongoStore, //default is memory store 
	saveUninitialized: false, 
	resave: true
}
));

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
    title : "Map",
    css: ["map.css"],
    js: ["map.js"],
  });
});

app.get("/about", (req, res) => {
  res.render("about", {
    title: "About",
    css: ["about.css"],
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
        css: ["weather.css"],
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
    currentPage: "home",
    authenticated: req.session.authenticated,
    username: req.session.username
  });
});

app.get("/login", (req, res) => {
  if (req.session.authenticated) {
    res.redirect('/');
    return;
  }
  res.render("LogIn", {
    title: "Login",
    css: ["SignUpLogIn.css"],
    js: ["SignUpLogIn.js"],
    errorMessage: ""
  });
});

app.get("/info-center", (req, res) => {
  res.render("info-center");
  
app.post("/loggingin", async (req, res) => {
  const { email, password } = req.body;
  
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
  });

  const validationResult = schema.validate({ email, password });
  if (validationResult.error) {
    res.render("LogIn", {
      title: "Login",
      css: ["SignUpLogIn.css"],
      js: ["SignUpLogIn.js"],
      errorMessage: 'Error: Incorrect email or password'
    });
    return;
  }

  const result = await userCollection.find({ email: email }).project({email: 1, username: 1, password: 1, _id: 1}).toArray();

  if (result.length != 1) {
    res.render("LogIn", {
      title: "Login",
      css: ["SignUpLogIn.css"],
      js: ["SignUpLogIn.js"],
      errorMessage: 'Error: Invalid email or password'
    });
    return;
  }
  if (await bcrypt.compare(password, result[0].password)) {
    req.session.authenticated = true;
    req.session.email = email;
    req.session.username = result[0].username;
    req.session.cookie.maxAge = expireTime;
    res.redirect('/');
    return;
  } else {
    res.render("LogIn", {
      title: "Login",
      css: ["SignUpLogIn.css"],
      js: ["SignUpLogIn.js"],
      errorMessage: 'Error: Invalid email or password'
    });
    return;
  }
});

app.get("/signup", (req, res) => {
  if (req.session.authenticated) {
    res.redirect('/');
    return;
  }
  res.render("signUp", {
    title: "Sign Up",
    css: ["SignUpLogIn.css"],
    js: ["SignUpLogIn.js"],
    errorMessage: ''
  });
});

app.post("/signingup", async (req, res) => {
  const { username, email, password } = req.body;
  
  const schema = Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
  });

  const validationResult = schema.validate({ username, email, password });
  if (validationResult.error) {
    res.render("signUp", {
      title: "Sign Up",
      css: ["SignUpLogIn.css"],
      js: ["SignUpLogIn.js"],
      errorMessage: 'Error: Invalid format for ' + validationResult.error.details[0].context.key
    });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, saltRounds);
  await userCollection.insertOne({username: username, email: email, password: hashedPassword });

  const html = 'Created user successfully! <a href="/login">Login here</a>';
  res.send(html);
});

app.post("/logout", (req, res) => {
  req.session.destroy();
  res.redirect('/login');
    res.render("index", {
        currentPage: "home"
    });
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
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});