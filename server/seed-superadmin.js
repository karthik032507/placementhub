// Creates (or resets) the SUPER_ADMIN account:  npm run seed:superadmin
// Unlike seed.js this does not delete anything else in the database.
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

const EMAIL = process.env.SUPER_ADMIN_EMAIL || "superadmin@iiits.in";
const PASSWORD = process.env.SUPER_ADMIN_PASSWORD || "Password@123";
const NAME = process.env.SUPER_ADMIN_NAME || "Placement Officer";

async function seedSuperAdmin() {
  await mongoose.connect(process.env.MONGO_URI);

  // Assigning the fields and calling save() lets the pre-save hook hash the password.
  let user = await User.findOne({ email: EMAIL.toLowerCase() });
  const existed = Boolean(user);
  if (!user) user = new User({ email: EMAIL });

  user.name = NAME;
  user.password = PASSWORD;
  user.role = "SUPER_ADMIN";
  user.isActive = true;
  await user.save();

  console.log(existed ? "Super admin updated." : "Super admin created.");
  console.log(`  email:    ${user.email}`);
  console.log(`  password: ${PASSWORD}`);
  console.log(`  role:     ${user.role}`);

  await mongoose.disconnect();
}

seedSuperAdmin().catch((error) => {
  console.error("Seeding the super admin failed:", error);
  process.exit(1);
});
