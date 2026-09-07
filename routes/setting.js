const router = require("express").Router();
const { get, update } = require("../controllers/setting");
const { validate, updateSettingSchema } = require("../zod");

router.get("/", get);
router.put("/", validate(updateSettingSchema), update);

module.exports = router;
