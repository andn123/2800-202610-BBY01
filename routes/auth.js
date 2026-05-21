const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const Joi = require("joi");
const { userCollection } = require("../config/db");
const { signupLimiter } = require("../middleware/rateLimiters");

const saltRounds = 10;
const expireTime = 60 * 60 * 1000;

const profileImages = [
  "/img/profile1.png",
  "/img/profile2.png",
  "/img/profile3.png",
  "/img/profile4.png",
  "/img/profile5.png",
  "/img/profile6.png",
];

function getRandomProfileImage() {
  return profileImages[Math.floor(Math.random() * profileImages.length)];
}

router.get("/login", (req, res) => {
  if (req.session.authenticated) return res.redirect("/dashboard");
  res.render("Login", {
    title: "Login",
    css: ["style.css", "SignUpLogIn.css"],
    js: ["form-utils.js", "SignUpLogIn.js"],
    errorMessage: "",
    navbar: false,
  });
});

router.post("/loggingin", async (req, res) => {
  const { email, password } = req.body;

  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
  });

  const validationResult = schema.validate({ email, password });
  if (validationResult.error) {
    return res.render("Login", {
      title: "Login",
      css: ["style.css", "SignUpLogIn.css"],
      js: ["form-utils.js", "SignUpLogIn.js"],
      errorMessage: "Error: Incorrect email or password",
      navbar: false,
    });
  }

  const result = await userCollection
    .find({ email })
    .project({ email: 1, username: 1, password: 1, _id: 1 })
    .toArray();

  if (result.length !== 1) {
    return res.render("Login", {
      title: "Login",
      css: ["style.css", "SignUpLogIn.css"],
      js: ["form-utils.js", "SignUpLogIn.js"],
      errorMessage: "Error: Invalid email or password",
      navbar: false,
    });
  }

  if (await bcrypt.compare(password, result[0].password)) {
    req.session.authenticated = true;
    req.session.email = email;
    req.session.username = result[0].username;
    req.session.cookie.maxAge = expireTime;
    return res.redirect("/dashboard");
  }

  res.render("Login", {
    title: "Login",
    css: ["style.css", "SignUpLogIn.css"],
    js: ["form-utils.js", "SignUpLogIn.js"],
    errorMessage: "Error: Invalid email or password",
    navbar: false,
  });
});

router.get("/signup", (req, res) => {
  if (req.session.authenticated) return res.redirect("/");
  res.render("signUp", {
    title: "Sign Up",
    css: ["style.css", "SignUpLogIn.css"],
    js: ["form-utils.js", "SignUpLogIn.js"],
    errorMessage: "",
    navbar: false,
  });
});

router.post("/signingup", signupLimiter, async (req, res) => {
  const { username, email, password } = req.body;

  const schema = Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
  });

  const validationResult = schema.validate({ username, email, password });
  if (validationResult.error) {
    return res.render("signUp", {
      title: "Sign Up",
      css: ["style.css", "SignUpLogIn.css"],
      js: ["form-utils.js", "SignUpLogIn.js"],
      errorMessage:
        "Error: Invalid format for " +
        validationResult.error.details[0].context.key,
      navbar: false,
    });
  }

  const existingUser = await userCollection.findOne({
    $or: [{ email }, { username }],
  });

  if (existingUser) {
    const conflictField = existingUser.email === email ? "email" : "username";
    return res.render("signUp", {
      title: "Sign Up",
      css: ["style.css", "SignUpLogIn.css"],
      js: ["form-utils.js", "SignUpLogIn.js"],
      errorMessage: `Error: That ${conflictField} is already in use.`,
      navbar: false,
    });
  }

  const hashedPassword = await bcrypt.hash(password, saltRounds);
  await userCollection.insertOne({
    username,
    email,
    password: hashedPassword,
    profileImage: getRandomProfileImage(),
    firstTimeMode: true,
  });

  req.session.authenticated = true;
  req.session.email = email;
  req.session.username = username;
  req.session.cookie.maxAge = expireTime;
  req.session.guideMode = true;

  res.redirect("/dashboard");
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

module.exports = router;
