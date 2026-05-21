const { easterEggCollection } = require("../config/db");

async function getActiveEasterEgg() {
  return await easterEggCollection.findOne({ expiresAt: { $gt: new Date() } });
}

module.exports = { getActiveEasterEgg };
