const express = require("express");
const { MongoClient } = require("mongodb");
const MongoStore = require("connect-mongo").default;
require("dotenv").config();

const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static files
app.use(express.static("public"));

// EJS setup
app.set("view engine", "ejs");
app.set("views", "./views");

// Routes
app.get("/", (req, res) => {
  res.send("Hello world");
});

app.get("/info-center", (req, res) => {
  res.render("info-center");
});

// Start server
app.listen(3000, () => {
  console.log("Server running on port 3000");
});