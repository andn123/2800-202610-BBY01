const express = require("express");
const router = express.Router();
const { userCollection } = require("../config/db");
const { isAuth } = require("../middleware/auth");

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

router.get("/dashboard", isAuth, async (req, res) => {
  try {
    let user = await userCollection.findOne({ email: req.session.email });

    if (!user) {
      req.session.destroy();
      return res.redirect("/login");
    }

    if (!user.profileImage) {
      const randomProfileImage = getRandomProfileImage();
      await userCollection.updateOne(
        { email: req.session.email },
        { $set: { profileImage: randomProfileImage } },
      );
      user.profileImage = randomProfileImage;
    }

    const firstTimeMode = user.firstTimeMode !== false;

    res.render("dashboard", {
      title: "Dashboard",
      css: ["dashboard.css", "style.css"],
      js: ["dashboard.js"],
      navbar: true,
      guideMode: firstTimeMode,
      profileImages,
      user: {
        name: user.username || "User",
        email: user.email || "",
        profileImage: user.profileImage,
        firstTimeMode,
      },
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).send("Server error loading dashboard");
  }
});

router.post("/profile-picture", isAuth, async (req, res) => {
  try {
    const { profileImage } = req.body;

    if (!profileImages.includes(profileImage)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid profile image" });
    }

    await userCollection.updateOne(
      { email: req.session.email },
      { $set: { profileImage } },
    );

    res.json({ success: true, profileImage });
  } catch (err) {
    console.error("Profile picture update error:", err);
    res
      .status(500)
      .json({
        success: false,
        message: "Server error updating profile picture",
      });
  }
});

router.post("/guide-mode", isAuth, async (req, res) => {
  try {
    const guideMode = req.body.guideMode === true;

    await userCollection.updateOne(
      { email: req.session.email },
      { $set: { firstTimeMode: guideMode } },
    );

    req.session.guideMode = guideMode;
    res.json({ success: true, guideMode });
  } catch (err) {
    console.error("Guide mode update error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error updating guide mode" });
  }
});

module.exports = router;
