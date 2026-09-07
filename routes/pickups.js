const router = require("express").Router();
const pickup = require("../controllers/pickup");

router.post("/", pickup.post);
router.get("/png/:_id", pickup.png);
router.get("/search", pickup.search);

module.exports = router;
