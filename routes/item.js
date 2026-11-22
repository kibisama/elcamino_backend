const router = require("express").Router();
const item = require("../controllers/item");

router.post("/fill", item.fillItem);

module.exports = router;
