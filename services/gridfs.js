const { GridFSBucket } = require("mongodb");
const { database } = require("../config/db");
const fs = require("fs");

async function uploadToGridFS(filePath, filename) {
  const bucket = new GridFSBucket(database.db(process.env.MONGODB_DATABASE), {
    bucketName: "uploads",
  });
  const readStream = fs.createReadStream(filePath);
  const uploadStream = bucket.openUploadStream(filename);
  readStream.pipe(uploadStream);
  return new Promise((resolve, reject) => {
    uploadStream.on("finish", () => {
      fs.unlink(filePath, () => {});
      resolve(filename);
    });
    uploadStream.on("error", (err) => {
      fs.unlink(filePath, () => {});
      reject(err);
    });
  });
}

module.exports = { uploadToGridFS };
