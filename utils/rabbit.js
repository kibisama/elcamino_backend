const amqp = require("amqplib");
const config = require("../config/rabbit");
const logger = require("../config/logger");

// async function publish(routingKey, message, options) {
//   options = options || {};
//   const body = Buffer.from(JSON.stringify(message));
//   const publishOpts = Object.assign(
//     {
//       persistent: true,
//       contentType: "application/json",
//       timestamp: Math.floor(Date.now() / 1000),
//     },
//     options,
//   );
//   let ch = await getChannel();
//   try {
//     ch.publish(EXCHANGE, routingKey, body, publishOpts);
//     logger.debug("[rabbitmq] published to " + EXCHANGE + " / " + routingKey);
//     return;
//   } catch (err) {
//     const isChannelDead =
//       err.name === "IllegalOperationError" ||
//       err.code === 320 ||
//       /channel.*closed|connection.*closed/i.test(err.message);
//     if (isChannelDead) {
//       logger.warn(
//         "[rabbitmq] publish failed (dead channel) - retrying: " + err.message,
//       );
//     } else {
//       throw err;
//     }
//   }
//   channel = null;
//   ch = await getChannel();
//   ch.publish(EXCHANGE, routingKey, body, publishOpts);
//   logger.debug(
//     "[rabbitmq] published (retry) to " + EXCHANGE + " / " + routingKey,
//   );
// }

/**
 * @typedef {(payload: any, rawMsg: amqp.ConsumeMessage) => Promise<void>} QueueHandler
 */

const { EXCHANGES, ROUTINGS, QUEUES } = config;

class RabbitMQManager {
  constructor() {
    /** @type {amqp.RecoveringChannelModel | null} */
    this.connection = null;

    /** @type {amqp.ConfirmChannel | null} */
    this.channel = null;

    this.exchanges = EXCHANGES;
    this.routings = ROUTINGS;
    this.queues = QUEUES;
  }

  /**
   * @type {Map<string, { handler: QueueHandler, options: amqp.Options.Consume }>}
   */
  #consumers = new Map();

  /**
   * @param {amqp.ConfirmChannel | null} ch
   */
  async #init(ch) {
    if (!ch) return;
    ch.on("error", (error) => {
      if (error) logger.error(error);
    });
    await ch.prefetch(config.PREFETCH_COUNT);
    await ch.assertExchange(EXCHANGES.DLX, "direct", {
      durable: true,
    });
    for (const queue in QUEUES) {
      if (queue.endsWith("_DLQ")) {
        await ch.assertQueue(QUEUES[queue], { durable: true });
        await ch.bindQueue(QUEUES[queue], EXCHANGES.DLX, ROUTINGS.DLQ);
      } else {
        await ch.assertQueue(QUEUES[queue], {
          durable: true,
          arguments: {
            "x-dead-letter-exchange": EXCHANGES.DLX,
            "x-dead-letter-routing-key": ROUTINGS.DLQ,
          },
        });
      }
    }

    for (const [queue, { handler, options }] of this.#consumers.entries()) {
      await this.#consume(ch, queue, handler, options);
    }
  }

  /**
   * @param {amqp.ChannelModel} model
   */
  async #setup(model) {
    const ch = await model.createConfirmChannel();
    this.channel = ch;
    await this.#init(ch);
  }

  async connect() {
    if (this.connection) return this.connection;

    try {
      this.connection = await amqp.connect(config.RABBIT_URL, {
        timeout: config.CONNECT_TIMEOUT_MS,
        recovery: { setup: this.#setup.bind(this) },
      });

      this.connection.on("error", (error) => {
        if (error) logger.error(error);
      });

      return this.connection;
    } catch (error) {
      logger.error(error);
      throw error;
    }
  }

  async publish() {
    //
  }

  /**
   * @param {amqp.ConfirmChannel} ch
   * @param {string} queue
   * @param {QueueHandler} handler
   * @param {amqp.Options.Consume} [options]
   */
  async #consume(ch, queue, handler, options = {}) {
    await ch.consume(
      queue,
      async (msg) => {
        if (!msg) return;

        try {
          const contentStr = msg.content.toString();
          const payload = JSON.parse(contentStr);

          await handler(payload, msg);

          ch.ack(msg);
        } catch (err) {
          logger.error(err);
          ch.nack(msg, false, false);
        }
      },
      { noAck: false, ...options },
    );
  }

  /**
   * @param {amqp.ConfirmChannel} ch
   * @param {string} queue
   * @param {QueueHandler} handler
   * @param {amqp.Options.Consume} [options]
   */
  async registerConsumer(ch, queue, handler, options = {}) {
    this.#consumers.set(queue, { handler, options });

    if (this.channel)
      await this.#consume(this.channel, queue, handler, options);
  }

  async close() {
    try {
      if (this.channel) await this.channel.close();

      if (this.connection) await this.connection.close();
    } catch (error) {
      logger.error(error);
    } finally {
      this.channel = null;
      this.connection = null;
    }
  }
}

module.exports = new RabbitMQManager();
