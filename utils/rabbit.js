const amqp = require("amqplib");
const config = require("../config/rabbit");
const E = require("./error");
const crypto = require("crypto");
const logger = require("../config/logger");
const {
  rabbitOutboxRepo: { create: createOutbox },
} = require("../repositories");

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

      this.connection.on("disconnect", () => {
        this.channel = null;
      });

      return this.connection;
    } catch (error) {
      logger.error(error);
      throw error;
    }
  }

  /**
   * @param {unknown} message
   * @param {string} exchange
   * @param {string} routingKey
   * @param {amqp.Options.Publish & {
   * exchange?: string, routingKey?: string }} options
   */
  async #publishDirect(message, exchange, routingKey, options) {
    if (!this.channel) await this.connect();

    const ch = this.channel;
    if (!ch) throw E.noMqChannel();

    const body = Buffer.from(JSON.stringify(message));

    return new Promise((resolve, reject) => {
      let confirmed = false;
      let drained = true;
      let settled = false;

      /**
       * @type {NodeJS.Timeout}
       */
      let timeout;

      const cleanup = () => {
        clearTimeout(timeout);
        ch.removeListener("drain", onDrain);
        ch.removeListener("error", onError);
        ch.removeListener("close", onClose);
      };

      const finish = (error) => {
        if (settled) return;

        if (error) {
          settled = true;
          cleanup();
          reject(error);
          return;
        }

        if (confirmed && drained) {
          settled = true;
          cleanup();
          resolve();
        }
      };

      const onDrain = () => {
        drained = true;
        finish();
      };
      const onError = (error) => {
        finish(error || new Error());
      };
      const onClose = () => {
        finish(new Error());
      };

      ch.on("drain", onDrain);
      ch.on("error", onError);
      ch.on("close", onClose);

      timeout = setTimeout(() => {
        finish(new Error());
      }, config.PUBLISH_CONFIRM_TIMEOUT_MS || 10_000);

      try {
        const writable = ch.publish(
          exchange,
          routingKey,
          body,
          options,
          (error) => {
            if (error) {
              finish(error);
              return;
            }

            confirmed = true;
            finish();
          },
        );

        if (!writable) {
          drained = false;
        }
      } catch (error) {
        finish(error);
      }
    });
  }

  /**
   * @param {unknown} message
   * @param {amqp.Options.Publish & {
   *   exchange?: string,
   *   routingKey?: string,
   *   session?: import("mongoose").ClientSession
   * }} options
   */
  async publish(message, options = {}) {
    if (message == undefined) throw E.invalidParam();

    const {
      exchange = this.exchanges.MAIN,
      routingKey = "",
      session = null,
      ...restOptions
    } = options;

    const messageId = restOptions.messageId || crypto.randomUUID();

    const publishOptions = {
      persistent: true,
      contentType: "application/json",
      timestamp: Math.floor(Date.now() / 1000),
      ...restOptions,
      messageId,
    };

    // with Session
    if (session) {
      return await createOutbox(
        {
          messageId,
          exchange,
          routingKey,
          payload: message,
          options: publishOptions,
        },
        session,
      );
    }

    try {
      await this.#publishDirect(message, exchange, routingKey, publishOptions);
    } catch {
      try {
        return await createOutbox({
          messageId,
          exchange,
          routingKey,
          payload: message,
          options: publishOptions,
        });
      } catch (outboxError) {
        logger.error(
          `[RabbitMQ] fallback failed:
          messageId: ${messageId}
          exchange: ${exchange}
          routingKey: ${routingKey}
          payload: ${message}
          options: ${options}
          `,
        );

        throw outboxError;
      }
    }
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
   * @param {string} queue
   * @param {QueueHandler} handler
   * @param {amqp.Options.Consume} [options]
   */
  async registerConsumer(queue, handler, options = {}) {
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

//   /**
//    * 아웃박스 폴링 워커 시작
//    * @param {number} [intervalMs=1000]
//    */
//   startOutboxRelay(intervalMs = 1000) {
//     if (this.#relayTimer) return;

//     this.#relayTimer = setInterval(() => {
//       this.triggerRelay();
//     }, intervalMs);
//   }

//   /**
//    * 즉시 릴레이 실행 (트랜잭션 커밋 직후 지연 없이 보낼 때도 호출 가능)
//    */
//   async triggerRelay() {
//     if (this.#isRelaying || !this.channel) return;
//     this.#isRelaying = true;

//     try {
//       await this.#processOutboxBatch();
//     } catch (err) {
//       logger.error("[outbox] relay loop error:", err);
//     } finally {
//       this.#isRelaying = false;
//     }
//   }

//   /**
//    * 원자적 상태 선점(PENDING -> PROCESSING)을 통한 다중 서버 안전 배치 처리
//    */
//   async #processOutboxBatch(batchSize = 50, maxRetries = 5) {
//     // 1. 워커 크래시 등으로 5분 이상 PROCESSING에 갇힌 좀비 메시지 복구
//     const staleThreshold = new Date(Date.now() - 5 * 60 * 1000);
//     await Outbox.updateMany(
//       { status: "PROCESSING", lockedAt: { $lt: staleThreshold } },
//       { $set: { status: "PENDING", lockedAt: null } },
//     );

//     for (let i = 0; i < batchSize; i++) {
//       if (!this.channel) break;

//       // 2. 한 건씩 원자적으로 선점 (다중 인스턴스 중복 발행 방지)
//       const doc = await Outbox.findOneAndUpdate(
//         { status: "PENDING" },
//         { $set: { status: "PROCESSING", lockedAt: new Date() } },
//         { sort: { createdAt: 1 }, new: true },
//       );

//       if (!doc) break; // 더 이상 처리할 PENDING 메시지가 없으면 종료

//       try {
//         await this.#publishDirect(
//           doc.exchange,
//           doc.routingKey,
//           doc.payload,
//           doc.options || {},
//         );

//         await Outbox.updateOne(
//           { _id: doc._id },
//           {
//             $set: {
//               status: "PUBLISHED",
//               publishedAt: new Date(),
//               lockedAt: null,
//             },
//           },
//         );

//         logger.debug(`[outbox] published message (${doc.messageId})`);
//       } catch (err) {
//         logger.error(`[outbox] failed to publish (${doc.messageId}):`, err);

//         const nextRetry = doc.retryCount + 1;
//         const isExhausted = nextRetry >= maxRetries;

//         await Outbox.updateOne(
//           { _id: doc._id },
//           {
//             $set: {
//               status: isExhausted ? "FAILED" : "PENDING",
//               retryCount: nextRetry,
//               lastError: err.message,
//               lockedAt: null,
//             },
//           },
//         );

//         if (this.#isChannelDeadError(err)) {
//           this.channel = null;
//           break;
//         }
//       }
//     }
//   }
// }
