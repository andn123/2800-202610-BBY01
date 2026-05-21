require("dotenv").config();
const { database } = require("../databaseConnection");

const mongodb_user_database = process.env.MONGODB_USER_DATABASE;
const mongodb_database = process.env.MONGODB_DATABASE;

const userCollection = database.db(mongodb_user_database).collection("users");
const postsCollection = database.db(mongodb_database).collection("posts");
const easterEggCollection = database
  .db(mongodb_database)
  .collection("easterEgg");
const signupAttemptsCollection = database
  .db(mongodb_database)
  .collection("signupAttempts");

module.exports = {
  database,
  userCollection,
  postsCollection,
  easterEggCollection,
  signupAttemptsCollection,
};
