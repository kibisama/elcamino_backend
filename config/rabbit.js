const RABBIT_URL = process.env.RABBIT_URL;

if (!RABBIT_URL) throw new Error();

// ── 기본값 ────────────────────────────────────────────────────────────────────
const DEFAULTS = {
  CONNECT_TIMEOUT_MS: 10000,
  HEARTBEAT_SEC: 60,
  RECONNECT_INITIAL_DELAY_MS: 1000,
  RECONNECT_MAX_DELAY_MS: 30000,
  RECONNECT_MAX_RETRIES: 10,
  RECONNECT_BACKOFF_FACTOR: 2,
  RECONNECT_JITTER: 0.2,
  CLOSE_TIMEOUT_MS: 5000,
};

const config = {
  // 연결
  url: url.toString(),
  protocol: url.protocol.replace(":", ""),
  hostname: url.hostname,
  port: url.port ? parseInt(url.port, 10) : 5672,
  username: url.username ? decodeURIComponent(url.username) : "",
  password: url.password ? decodeURIComponent(url.password) : "",
  vhost: url.pathname.replace(/^\//, "") || "",

  // 연결 타임아웃 (ms) — amqplib SocketOptions.timeout
  connectTimeoutMs: readNumber(
    "RABBITMQ_CONNECT_TIMEOUT_MS",
    DEFAULTS.CONNECT_TIMEOUT_MS,
  ),

  // heartbeat (초) — amqplib Options.Connect.heartbeat
  heartbeatSec: readNumber("RABBITMQ_HEARTBEAT_SEC", DEFAULTS.HEARTBEAT_SEC, {
    min: 1,
  }),

  // 재연결 — amqplib RecoveryOptions
  reconnect: Object.freeze({
    initialDelayMs: readNumber(
      "RABBITMQ_RECONNECT_INITIAL_DELAY_MS",
      DEFAULTS.RECONNECT_INITIAL_DELAY_MS,
    ),
    maxDelayMs: readNumber(
      "RABBITMQ_RECONNECT_MAX_DELAY_MS",
      DEFAULTS.RECONNECT_MAX_DELAY_MS,
    ),
    maxRetries: readNumber(
      "RABBITMQ_RECONNECT_MAX_RETRIES",
      DEFAULTS.RECONNECT_MAX_RETRIES,
      { min: 0 },
    ),
    backoffFactor: readNumber(
      "RABBITMQ_RECONNECT_BACKOFF_FACTOR",
      DEFAULTS.RECONNECT_BACKOFF_FACTOR,
      { min: 1 },
    ),
    jitter: readNumber("RABBITMQ_RECONNECT_JITTER", DEFAULTS.RECONNECT_JITTER, {
      min: 0,
      max: 1,
    }),
  }),

  // 종료 타임아웃 (ms)
  closeTimeoutMs: readNumber(
    "RABBITMQ_CLOSE_TIMEOUT_MS",
    DEFAULTS.CLOSE_TIMEOUT_MS,
  ),
};

// 불변 객체로 봉인
Object.freeze(config.reconnect);
Object.freeze(config);

module.exports = config;
