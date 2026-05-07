const {isPark, findShelter, findTrees} = require("./public/js/shadeServer")
const express = require("express");
const { MongoClient } = require("mongodb");
const MongoStore = require("connect-mongo").default;
require("dotenv").config();

const app = express();

app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(express.urlencoded({extended: false}));

app.get("/", (req, res) => {
  res.send(`
    <h1>Hello world</h1>
    <a href="/shade">shade</a>
    `);
});

app.get('/shade', async (req, res) =>{
    res.render('shade');
})

app.post('/shademap', async (req, res) =>{
    const park = await isPark(req.body.lat, req.body.lon);
    if(park.boolean){
        const parkName = park.name;
        const trees = await findTrees(req.body.lat, req.body.lon);
        const shelter = await findShelter(req.body.lat, req.body.lon)

        res.render('shade', {
            latitude: req.body.lat, 
            longitude: req.body.lon, 
            trees: trees,
            shelter: shelter,
            parkName: parkName
        });
    } else {
        res.render('noShade');
    }
})

app.listen(3018, () => {
  console.log("Server running on port 3018");
});
