const amqp = require("amqplib");
const config = require("../config/rabbit");
const logger = require("../config/logger");

const EXCHANGE = "elcamino";
let model = null;
let channel = null;

async function setupTopology(openModel) {
  const ch = await openModel.createChannel();
  try {
    await ch.assertExchange(EXCHANGE, "topic", { durable: true });
    logger.debug(
      "[rabbitmq] topology asserted - exchange: " +
        EXCHANGE +
        " (topic, durable)",
    );
  } finally {
    await ch.close();
  }
}

function buildRecoveryOptions() {
  const r = config.reconnect;
  return {
    enabled: true,
    initialDelay: r.initialDelayMs,
    maxDelay: r.maxDelayMs,
    maxRetries: r.maxRetries,
    factor: r.backoffFactor,
    jitter: r.jitter,
    setup: setupTopology,
  };
}

async function init() {
  if (model) return;
  const urlStr = config.url.toString();
  logger.info(
    "[rabbitmq] connecting - " +
      config.hostname +
      ":" +
      config.port +
      "/" +
      config.vhost,
  );
  model = await amqplib.connect(urlStr, {
    heartbeat: config.heartbeatSec,
    timeout: config.connectTimeoutMs,
    recovery: buildRecoveryOptions(),
  });
  model.on("connect", function () {
    logger.info("[rabbitmq] connected");
  });
  model.on("disconnect", function (err) {
    logger.warn(
      "[rabbitmq] disconnected - " + ((err && err.message) || "unknown"),
    );
    channel = null;
  });
  model.on("reconnect-scheduled", function (attempt, delay) {
    logger.info(
      "[rabbitmq] reconnect scheduled - attempt #" +
        attempt +
        ", delay " +
        delay +
        "ms",
    );
  });
  model.on("connect-failed", function (err) {
    logger.error(
      "[rabbitmq] reconnect failed - " + ((err && err.message) || "unknown"),
    );
  });
  model.on("blocked", function (reason) {
    logger.warn("[rabbitmq] connection blocked - " + (reason || "no reason"));
  });
  model.on("unblocked", function () {
    logger.info("[rabbitmq] connection unblocked");
  });
  channel = await model.createChannel();
  logger.info("[rabbitmq] initialization complete");
}

async function getChannel() {
  if (channel && channel.isOpen) return channel;
  logger.debug("[rabbitmq] creating new channel");
  channel = await model.createChannel();
  return channel;
}

async function publish(routingKey, message, options) {
  options = options || {};
  const body = Buffer.from(JSON.stringify(message));
  const publishOpts = Object.assign(
    {
      persistent: true,
      contentType: "application/json",
      timestamp: Math.floor(Date.now() / 1000),
    },
    options,
  );
  let ch = await getChannel();
  try {
    ch.publish(EXCHANGE, routingKey, body, publishOpts);
    logger.debug("[rabbitmq] published to " + EXCHANGE + " / " + routingKey);
    return;
  } catch (err) {
    const isChannelDead =
      err.name === "IllegalOperationError" ||
      err.code === 320 ||
      /channel.*closed|connection.*closed/i.test(err.message);
    if (isChannelDead) {
      logger.warn(
        "[rabbitmq] publish failed (dead channel) - retrying: " + err.message,
      );
    } else {
      throw err;
    }
  }
  channel = null;
  ch = await getChannel();
  ch.publish(EXCHANGE, routingKey, body, publishOpts);
  logger.debug(
    "[rabbitmq] published (retry) to " + EXCHANGE + " / " + routingKey,
  );
}

async function close() {
  if (!model) return;
  try {
    logger.info("[rabbitmq] closing connection...");
    await model.close();
    logger.info("[rabbitmq] connection closed");
  } catch (err) {
    logger.warn("[rabbitmq] error during close: " + err.message);
  } finally {
    model = null;
    channel = null;
  }
}

module.exports = {
  EXCHANGE: EXCHANGE,
  init: init,
  close: close,
  publish: publish,
  getChannel: getChannel,
};

class RabbitMQManager {
  constructor() {
    /** @type {amqp.ChannelModel | null} */
    this.connection = null;

    /** @type {amqp.ConfirmChannel | null} */
    this.channel = null;

    this.isConnecting = false;
  }

  async connect() {
    if (this.connection) return this.connection;
    if (this.isConnecting) return;

    this.isConnecting = true;

    try {
      this.connection = await amqp.connect(RABBITMQ_URL);

      this.connection.on("error", (error) => {
        console.error(error);
        this.#reconnect();
      });
      this.connection.on("close", (error) => {
        if (error) {
          console.error(error);
          this.#reconnect();
        }
      });
      this.channel = await this.connection.createConfirmChannel();

      await this.#init();

      await this.channel.prefetch(PREFETCH);

      this.isConnecting = false;

      // for (let i = 0; i < this.onConnect.length; i++) this.onConnect[i]();

      return this.connection;
    } catch (error) {
      console.error(error);
      this.isConnecting = false;
      this.#reconnect();
    }
  }

  async #reconnect() {
    if (this.isConnecting) return;

    this.isConnecting = true;
    if (this.channel) this.channel.removeAllListeners();
    if (this.connection) this.connection.removeAllListeners();
    this.channel = null;
    this.connection = null;

    setTimeout(() => {
      this.isConnecting = false;
      this.connect();
    }, 5000);
  }

  async #init() {
    if (!this.channel) return;
    await this.channel.assertExchange(EXCHANGES.DLX, "direct", {
      durable: true,
    });
    for (const queue in QUEUES) {
      if (queue.endsWith("_DLQ")) {
        await this.channel.assertQueue(QUEUES[queue], { durable: true });
        await this.channel.bindQueue(
          QUEUES[queue],
          EXCHANGES.DLX,
          ROUTINGS.DLQ,
        );
      } else {
        await this.channel.assertQueue(QUEUES[queue], {
          durable: true,
          arguments: {
            "x-dead-letter-exchange": EXCHANGES.DLX,
            "x-dead-letter-routing-key": ROUTINGS.DLQ,
          },
        });
      }
    }
  }
}
