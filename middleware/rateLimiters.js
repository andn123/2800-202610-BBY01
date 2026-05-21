const { postsCollection, signupAttemptsCollection } = require("../config/db");
const { getActiveEasterEgg } = require("../services/easterEgg");
const mapApi = process.env.MAP_API;

async function signupLimiter(req, res, next) {
  const raw =
    req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
  const ip = require("crypto").createHash("sha256").update(raw).digest("hex");
  const now = new Date();
  const cutoff = new Date(now - 24 * 60 * 60 * 1000);

  const count = await signupAttemptsCollection.countDocuments({
    ip: ip,
    createdAt: { $gt: cutoff },
  });

  if (count >= 2) {
    return res.render("signUp", {
      title: "Sign Up",
      css: ["style.css", "SignUpLogIn.css"],
      js: ["SignUpLogIn.js"],
      errorMessage:
        "Too many accounts created from this IP. Please try again tomorrow.",
      navbar: false,
    });
  }

  await signupAttemptsCollection.insertOne({ ip: ip, createdAt: now });
  next();
}

async function postRateLimiter(req, res, next) {
  const username = req.session.username;
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const recentPostCount = await postsCollection.countDocuments({
    username: username,
    createdAt: { $gt: oneHourAgo },
  });

  if (recentPostCount >= 3) {
    const easterEgg = await getActiveEasterEgg();
    return res.render("post", {
      title: "Post",
      css: ["post.css"],
      js: ["create-post.js"],
      navbar: false,
      mapApi: mapApi,
      easterEgg: easterEgg ? easterEgg.environment : null,
      error: "You can only create 3 posts per hour. Please try again later.",
      success: null,
    });
  }

  next();
}

module.exports = { signupLimiter, postRateLimiter };
