const RABBIT_URL = process.env.RABBIT_URL;

if (!RABBIT_URL) throw new Error();

const url = new URL(RABBIT_URL);
const HEARTBEAT_SEC = 60;

if (HEARTBEAT_SEC) url.searchParams.set("heartbeat", String(HEARTBEAT_SEC));

exports.RABBIT_URL = url.toString();

exports.CONNECT_TIMEOUT_MS = 10_000;

exports.PREFETCH_COUNT = 1;

exports.EXCHANGES = Object.freeze({
  DLX: "backend_dlx_ex",
});

exports.ROUTINGS = Object.freeze({
  DLQ: "backend_dlq",
});

/**
 * @type {Object<string, string>}
 */
exports.QUEUES = Object.freeze({
  NEW_RX: "drx_automation",
  NEW_RX_DLQ: "drx_automation_dlq",
});
