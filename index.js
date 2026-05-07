require('./utils.js');
require('dotenv').config(); 
const express = require("express");
const session = require('express-session');
const MongoStore = require("connect-mongo").default;
require("dotenv").config();
const bcrypt = require('bcrypt');
const Joi = require('joi');
const saltRounds = 10;

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

app.get("/", (req, res) => {
  res.send("Hello" + req.session.username + "! <form action='/logout' method='POST'><button type='submit'>Logout</button></form> <form action='/login' method='GET'><button type='submit'>Login</button></form> <form action='/signup' method='GET'><button type='submit'>Sign Up</button></form>");
});

app.get("/login", (req, res) => {
  if (req.session.authenticated) {
    res.redirect('/');
    return;
  }
  res.render("LogIn", {
    title: "Login",
    CSSFiles: ["SignUpLogIn.css"],
    JSFiles: ["SignUpLogIn.js"],
    errorMessage: ""
  });
});

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
      CSSFiles: ["SignUpLogIn.css"],
      JSFiles: ["SignUpLogIn.js"],
      errorMessage: 'Error: Incorrect email or password'
    });
    return;
  }

  const result = await userCollection.find({ email: email }).project({email: 1, username: 1, password: 1, _id: 1}).toArray();

  if (result.length != 1) {
    res.render("LogIn", {
      title: "Login",
      CSSFiles: ["SignUpLogIn.css"],
      JSFiles: ["SignUpLogIn.js"],
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
      CSSFiles: ["SignUpLogIn.css"],
      JSFiles: ["SignUpLogIn.js"],
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
    CSSFiles: ["SignUpLogIn.css"],
    JSFiles: ["SignUpLogIn.js"],
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
      CSSFiles: ["SignUpLogIn.css"],
      JSFiles: ["SignUpLogIn.js"],
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
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
