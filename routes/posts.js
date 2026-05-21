const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const multer = require("multer");
const Joi = require("joi");
const { postsCollection, easterEggCollection } = require("../config/db");
const { isAuth } = require("../middleware/auth");
const { postRateLimiter } = require("../middleware/rateLimiters");
const { getActiveEasterEgg } = require("../services/easterEgg");
const { uploadToGridFS } = require("../services/gridfs");
const { GridFSBucket } = require("mongodb");
const { database } = require("../config/db");

const mapApi = process.env.MAP_API;

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/uploads");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    const allowed = ["image/jpeg", "image/png", "image/jpg"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only JPG and PNG images allowed"));
    }
    cb(null, true);
  },
});

router.get("/post", isAuth, async (req, res) => {
  const easterEgg = await getActiveEasterEgg();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentPostCount = await postsCollection.countDocuments({
    username: req.session.username,
    createdAt: { $gt: oneHourAgo },
  });

  res.render("post", {
    title: "Post",
    css: ["post.css", "style.css"],
    js: ["create-post.js"],
    navbar: true,
    mapApi,
    error:
      recentPostCount >= 3
        ? "You can only create 3 posts per hour. Please try again later."
        : null,
    success: null,
    easterEgg: easterEgg ? easterEgg.environment : null,
  });
});

router.post(
  "/post",
  isAuth,
  postRateLimiter,
  upload.single("image"),
  async (req, res) => {
    const easterEgg = await getActiveEasterEgg();
    const { location, description, environment } = req.body;
    const imageFile = req.file;

    const schema = Joi.object({
      location: Joi.string().min(1).required(),
      description: Joi.string().min(1).required(),
      environment: Joi.string().valid("shaded", "sunny", "indoors").required(),
    });

    const validationResult = schema.validate({
      location,
      description,
      environment,
    });

    if (validationResult.error || !imageFile) {
      return res.render("post", {
        title: "Post",
        css: ["post.css"],
        js: ["create-post.js"],
        navbar: false,
        mapApi,
        easterEgg: easterEgg ? easterEgg.environment : null,
        error: validationResult.error
          ? validationResult.error.message
          : "Image is required",
        success: null,
      });
    }

    const lat = parseFloat(req.body.lat);
    const lng = parseFloat(req.body.lng);

    if (!lat || !lng) {
      return res.render("post", {
        title: "Post",
        css: ["post.css"],
        js: ["create-post.js"],
        navbar: false,
        mapApi,
        easterEgg: easterEgg ? easterEgg.environment : null,
        error: "Please select a valid location from the dropdown.",
        success: null,
      });
    }

    const gridFilename = await uploadToGridFS(
      imageFile.path,
      imageFile.filename,
    );
    await postsCollection.insertOne({
      username: req.session.username,
      location,
      description,
      environment,
      image: gridFilename,
      lat,
      lng,
      createdAt: new Date(),
      likes: 0,
      dislikes: 0,
      likedBy: [],
      dislikedBy: [],
    });

    const lastTwo = await postsCollection
      .find({})
      .sort({ createdAt: -1 })
      .limit(2)
      .toArray();

    if (
      lastTwo.length === 2 &&
      lastTwo[0].environment === lastTwo[1].environment
    ) {
      await easterEggCollection.deleteMany({});
      await easterEggCollection.insertOne({
        environment: lastTwo[0].environment,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
    }

    res.redirect("/posts?success=1");
  },
);

router.get("/posts", isAuth, async (req, res) => {
  const easterEgg = await getActiveEasterEgg();
  const search = req.query.search || "";
  const safeSearch = escapeRegex(search);
  const env = req.query.environment || "";
  const page = parseInt(req.query.page) || 1;
  const success = req.query.success === "1";
  const limit = 9;
  const skip = (page - 1) * limit;

  let query = {};
  if (search) {
    query.$or = [
      { location: { $regex: safeSearch, $options: "i" } },
      { description: { $regex: safeSearch, $options: "i" } },
    ];
  }
  if (env) query.environment = env;

  const totalPosts = await postsCollection.countDocuments(query);
  const totalPages = Math.max(1, Math.ceil(totalPosts / limit));

  if (page > totalPages) {
    return res.redirect(
      `/posts?page=${totalPages}&search=${search}&environment=${env}`,
    );
  }

  const posts = await postsCollection
    .find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  res.render("posts", {
    title: "Posts",
    css: ["posts.css"],
    js: ["posts.js"],
    navbar: false,
    posts,
    search,
    env,
    page,
    totalPages,
    success,
    easterEgg: easterEgg ? easterEgg.environment : null,
  });
});

router.get("/api/posts", async (req, res) => {
  const posts = await postsCollection
    .find(
      {},
      {
        projection: {
          lat: 1,
          lng: 1,
          location: 1,
          description: 1,
          environment: 1,
          image: 1,
          username: 1,
          createdAt: 1,
        },
      },
    )
    .toArray();
  res.json(posts);
});

router.get("/api/my-posts", isAuth, async (req, res) => {
  const posts = await postsCollection
    .find({ username: req.session.username })
    .sort({ createdAt: -1 })
    .toArray();
  res.json(posts);
});

router.get("/image/:filename", async (req, res) => {
  try {
    const bucket = new GridFSBucket(database.db(process.env.MONGODB_DATABASE), {
      bucketName: "uploads",
    });
    const stream = bucket.openDownloadStreamByName(req.params.filename);
    stream.on("error", () => res.status(404).send("Image not found"));
    stream.pipe(res);
  } catch (err) {
    res.status(500).send("Error loading image");
  }
});

router.post("/posts/:id/like", isAuth, (req, res) =>
  handleVote(req, res, "like"),
);
router.post("/posts/:id/dislike", isAuth, (req, res) =>
  handleVote(req, res, "dislike"),
);

async function handleVote(req, res, type) {
  const post = await postsCollection.findOne({
    _id: new ObjectId(req.params.id),
  });
  if (!post) return res.status(404).json({ error: "Post not found" });

  const email = req.session.email;
  let { likes = 0, dislikes = 0, likedBy = [], dislikedBy = [] } = post;
  const isLike = type === "like";
  const ownArr = isLike ? likedBy : dislikedBy;
  const otherArr = isLike ? dislikedBy : likedBy;

  const alreadyOwn = ownArr.includes(email);
  const alreadyOther = otherArr.includes(email);

  if (alreadyOwn) {
    if (isLike) likes -= 1;
    else dislikes -= 1;
    ownArr.splice(ownArr.indexOf(email), 1);
  } else {
    if (alreadyOther) {
      if (isLike) dislikes -= 1;
      else likes -= 1;
      otherArr.splice(otherArr.indexOf(email), 1);
    }
    if (isLike) likes += 1;
    else dislikes += 1;
    ownArr.push(email);
  }

  await postsCollection.updateOne(
    { _id: post._id },
    { $set: { likes, dislikes, likedBy, dislikedBy } },
  );

  res.json({ likes, dislikes });
}

router.delete("/posts/:id", isAuth, async (req, res) => {
  const post = await postsCollection.findOne({
    _id: new ObjectId(req.params.id),
  });
  if (!post) return res.status(404).json({ error: "Post not found" });
  if (post.username !== req.session.username)
    return res.status(403).json({ error: "Not your post" });
  await postsCollection.deleteOne({ _id: post._id });
  res.json({ success: true });
});

module.exports = router;
