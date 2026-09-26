// Runs the API against a temporary in-memory MongoDB and loads the seed data.
// Useful when MongoDB is not installed locally:   npm run dev:memory
// Everything is lost when the process stops - use a real MONGO_URI for persistent data.
require("dotenv").config();
const { spawnSync } = require("child_process");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const app = require("./app");

async function start() {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri("placement_portal");
  process.env.JWT_SECRET = process.env.JWT_SECRET || "dev_only_secret";

  // Run the normal seed script against the temporary database
  const seed = spawnSync(process.execPath, ["seed.js"], { stdio: "inherit", env: process.env });
  if (seed.status !== 0) process.exit(seed.status);

  await mongoose.connect(process.env.MONGO_URI);

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`\nServer (in-memory MongoDB) running on http://localhost:${PORT}`));

  process.on("SIGINT", async () => {
    await mongoose.disconnect();
    await mongod.stop();
    process.exit(0);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
