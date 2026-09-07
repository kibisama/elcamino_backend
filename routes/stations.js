const router = require("express").Router();
const station = require("../controllers/station");

const {
  validate,
  createStationSchema,
  updateStationSchema,
} = require("../zod");

router.get("/", station.getAllStations);
router.post("/", validate(createStationSchema), station.createStation);
router.get("/menu", station.getMenuItems);
router.get("/:invoiceCode", station.findStation);
router.put(
  "/:invoiceCode",
  validate(updateStationSchema),
  station.updateStation,
);

module.exports = router;
