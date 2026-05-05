const express = require("express");
const { MongoClient } = require("mongodb");
const MongoStore = require("connect-mongo").default;
require("dotenv").config();

const app = express();
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Hello world");
});

app.get("/login", (req, res) => {
  res.render("SignUpLogIn", {
    title: "Login",
    CSSFiles: ["SignUpLogIn.css"],
    JSFiles: ["SignUpLogIn.js"],
  });
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
