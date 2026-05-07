const express = require("express");
const { MongoClient } = require("mongodb");
const MongoStore = require("connect-mongo").default;
require("dotenv").config();

const app = express();

app.get("/", (req, res) => {
  res.send("Hello world");
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
