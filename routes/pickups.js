const router = require("express").Router();
const pickup = require("../controllers/pickup");
const { validate, postPickupSchema } = require("../zod");

router.post("/", validate(postPickupSchema), pickup.post);
router.get("/png/:_id", pickup.png);
router.get("/search", pickup.search);

module.exports = router;
