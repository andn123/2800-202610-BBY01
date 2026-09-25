require("./utils.js");
require("dotenv").config();

const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const dns = require("node:dns/promises");

const { postsCollection } = require("./config/db");

// Routes
const authRoutes = require("./routes/auth");
const postRoutes = require("./routes/posts");
const dashboardRoutes = require("./routes/dashboard");
const mapRoutes = require("./routes/map");
const weatherRoutes = require("./routes/weather");
const eventsRoutes = require("./routes/events");
const aiRoutes = require("./routes/ai");

dns.setServers(["1.1.1.1", "8.8.8.8"]);

const app = express();
const port = process.env.PORT || 3000;

const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_session_database = process.env.MONGODB_SESSION_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;
const node_session_secret = process.env.NODE_SESSION_SECRET;

const mongoStore = MongoStore.create({
  mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${mongodb_session_database}`,
  //crypto: { secret: mongodb_session_secret },
  stringify: true,
});

app.use(
  session({
    secret: node_session_secret,
    store: mongoStore,
    saveUninitialized: false,
    resave: true,
  }),
);

app.use(function (req, res, next) {
  if (!req.session.votes) req.session.votes = {};
  next();
});

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Mount routes
app.use(authRoutes);
app.use(postRoutes);
app.use(dashboardRoutes);
app.use(mapRoutes);
app.use(weatherRoutes);
app.use(eventsRoutes);
app.use(aiRoutes);

// Static pages
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

app.get("/about", (req, res) => {
  if (!req.session.authenticated) return res.redirect("/login");
  res.render("about", {
    title: "About",
    css: ["about.css", "style.css", "back-button.css"],
    js: ["about.js"],
    navbar: true,
    backButton: true,
    backButtonHref: "/dashboard",
    backButtonClass: "map-back",
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

app.get("/about_us_easter_egg", (req, res) => {
  res.render("aboutUsEasterEgg", {
    title: "Easter Egg",
    css: ["aboutUsEasterEgg.css"],
  });
});

// Cleanup old posts
async function removeOldPosts() {
  const cutoff = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
  const result = await postsCollection.deleteMany({
    createdAt: { $lt: cutoff },
  });
  if (result.deletedCount > 0) {
    console.log(`Removed ${result.deletedCount} expired post(s)`);
  }
}

removeOldPosts();
postsCollection.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 4 * 24 * 60 * 60 },
);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
