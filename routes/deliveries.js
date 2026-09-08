const router = require("express").Router();
const delivery = require("../controllers/delivery");
const {
  validate,
  createDeliveryLogSchema,
  cancelDeliverySchema,
} = require("../zod");

router.post("/qr/:invoiceCode", delivery.upsertRxWithQr);
router.patch(
  "/cancel/:id",
  validate(cancelDeliverySchema),
  delivery.cancelDelivery,
);
router.patch(
  "/return/:id",
  validate(cancelDeliverySchema),
  delivery.returnDelivery,
);
router.get("/logs", delivery.searchLogs);
router.post(
  "/logs/:invoiceCode",
  validate(createDeliveryLogSchema),
  delivery.createLog,
);
router.get("/:invoiceCode", delivery.getItemsOnStage);
router.get("/logs/:id", delivery.getLogItems);

module.exports = router;
