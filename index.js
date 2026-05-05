const express = require("express");
const app = express();
const apiKey = "8c080acec4b04efe90301909260205";

app.set("view engine", "ejs");

app.use(express.static('public'));
app.get("/", (req, res) => {
  res.render("test");
});

app.get("/about", (req, res) => {
  res.render("about");
})

app.get("/weatherapi", async (req, res) => {
  const city = req.query.city || "Vancouver";

  const url = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${city}&days=4&aqi=no&alerts=no`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "API Error");
    }

    res.render("weather", {weatherData: data});

  } catch (error) {
    console.error("DEBUG ERROR:", error.message);

    res.status(500).json({
      error: "Internal Server Error",
      details: error.message
    });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
