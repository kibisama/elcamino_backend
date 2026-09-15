const router = require("express").Router();
const dRx = require("../controllers/dRx");

router.get("/:rxNumber", dRx.findRxByRxNumber);

module.exports = router;
