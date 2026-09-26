const express = require("express");
const auth = require("../middleware/auth");
const { getMyNotifications, markAsRead, markAllAsRead } = require("../controllers/notificationController");

const router = express.Router();

router.use(auth);

router.get("/", getMyNotifications);
router.patch("/read-all", markAllAsRead); // must be declared before "/:id/read"
router.patch("/:id/read", markAsRead);

module.exports = router;
