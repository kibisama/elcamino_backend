const router = require("express").Router();
const dRx = require("../controllers/dRx");

router.get("/search", dRx.searchPatients);

module.exports = router;
