const express = require("express");
const { MongoClient } = require("mongodb");
const MongoStore = require("connect-mongo").default;
require("dotenv").config();

const app = express();

app.set("view engine", "ejs");

app.use(express.static("public"));

app.get("/", (req, res) => {
    res.render("index", {
        currentPage: "home"
    });
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});