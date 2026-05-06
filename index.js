require("./utils.js");
require("dotenv").config();

const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const bcrypt = require("bcrypt");
const Joi = require("joi");
const dns = require("node:dns/promises");
const multer = require("multer");
const path = require("path");

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

const saltRounds = 12;
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const app = express();
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));

const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;
const node_session_secret = process.env.NODE_SESSION_SECRET;

const { database } = include("databaseConnection");
const userCollection = database.db(mongodb_database).collection("users");
const postsCollection = database.db(mongodb_database).collection("posts");

let mongoStore = MongoStore.create({
  mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${mongodb_database}`,
  crypto: { secret: mongodb_session_secret },
});

const expireTime = 60 * 60 * 1000; // 1 hour

app.use(
  session({
    secret: node_session_secret,
    store: mongoStore,
    resave: true,
    saveUninitialized: false,
    cookie: { maxAge: expireTime },
  }),
);

app.get("/", (req, res) => {
  if (req.session && req.session.authenticated) {
    return res.redirect("/members");
  }
  res.render("home");
});

app.get("/login", (req, res) => {
  if (req.session && req.session.authenticated) {
    return res.redirect("/members");
  }
  res.render("login", { error: null });
});

app.post("/login", async (req, res) => {
  let email = req.body.email;
  let password = req.body.password;

  const schema = Joi.object({
    email: Joi.string().max(50).required(),
    password: Joi.string().min(5).max(100).required(),
  });

  const validationResult = schema.validate({ email, password });
  if (validationResult.error) {
    return res.render("login", { error: validationResult.error.message });
  }

  const result = await userCollection
    .find({ email })
    .project({ username: 1, email: 1, password: 1 })
    .toArray();

  if (result.length !== 1) {
    return res.render("login", { error: "User not found." });
  }

  if (!(await bcrypt.compare(password, result[0].password))) {
    return res.render("login", {
      error: "Invalid email/password combination.",
    });
  }

  req.session.authenticated = true;
  req.session.username = result[0].username;
  req.session.cookie.maxAge = expireTime;

  res.redirect("/members");
});

app.get("/signup", (req, res) => {
  if (req.session && req.session.authenticated) {
    return res.redirect("/members");
  }
  res.render("signup", { error: null });
});

app.post("/signup", async (req, res) => {
  let username = req.body.username;
  let email = req.body.email;
  let password = req.body.password;

  const schema = Joi.object({
    username: Joi.string().min(1).max(50).required(),
    email: Joi.string().max(50).required(),
    password: Joi.string().min(5).max(100).required(),
  });

  const validationResult = schema.validate({ username, email, password });
  if (validationResult.error) {
    return res.render("signup", { error: validationResult.error.message });
  }

  const existingUser = await userCollection.findOne({ email });
  if (existingUser) {
    return res.render("signup", { error: "Email already exists." });
  }

  let hashedPassword = await bcrypt.hash(password, saltRounds);
  await userCollection.insertOne({
    username: username,
    email: email,
    password: hashedPassword,
  });

  req.session.authenticated = true;
  req.session.username = username;
  req.session.cookie.maxAge = expireTime;

  res.redirect("/members");
});

app.get("/members", (req, res) => {
  if (!req.session || !req.session.authenticated) {
    return res.redirect("/login");
  }

  res.render("members", {
    username: req.session.username,
  });
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

app.get("/post", (req, res) => {
  if (!req.session || !req.session.authenticated) {
    return res.redirect("/login");
  }

  res.render("post", {
    error: null,
    success: null,
  });
});

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
      error: validationResult.error
        ? validationResult.error.message
        : "Image is required",
      success: null,
    });
  }

  await postsCollection.insertOne({
    username: req.session.username,
    location,
    description,
    environment,
    image: imageFile.filename,
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

app.use(express.static(__dirname + "/public"));

app.use((req, res) => {
  res.status(404).send("Page not found - 404");
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
