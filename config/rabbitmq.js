// const amqp = require("amqplib");

// const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";

// const QUEUES = {
//   NEW_RX: "drx_automation",
//   NEW_RX_DLQ: "drx_automation_dlq",
// };
// const EXCHANGES = {
//   DLX: "backend_dlx_ex",
// };
// const ROUTINGS = {
//   DLQ: "backend_dlq",
// };

// const PREFETCH = 1;

// class RabbitMQManager {
//   constructor() {
//     /** @type {amqp.ChannelModel | null} */
//     this.connection = null;
//     /** @type {amqp.ConfirmChannel | null} */
//     this.channel = null;
//     this.isConnecting = false;
//     this.reconnectTimeoutId = null;
//     /** @type {} */
//     this.onConnect = [];
//   }

//   async connect() {
//     if (this.connection) return this.connection;
//     if (this.isConnecting) return;

//     this.isConnecting = true;
//     if (this.reconnectTimeoutId) {
//       clearTimeout(this.reconnectTimeoutId);
//       this.reconnectTimeoutId = null;
//     }
//     try {
//       this.connection = await amqp.connect(RABBITMQ_URL);

//       this.connection.on("error", (error) => {
//         console.error(error);
//         this.#reconnect();
//       });
//       this.connection.on("close", (error) => {
//         if (error) {
//           console.error(error);
//           this.#reconnect();
//         }
//       });
//       this.channel = await this.connection.createConfirmChannel();

//       await this.#init();

//       await this.channel.prefetch(PREFETCH);

//       this.isConnecting = false;

//       // for (let i = 0; i < this.onConnect.length; i++) this.onConnect[i]();

//       return this.connection;
//     } catch (error) {
//       console.error(error);
//       this.isConnecting = false;
//       this.#reconnect();
//     }
//   }

//   async #reconnect() {
//     if (this.isConnecting) return;

//     this.isConnecting = true;
//     if (this.channel) this.channel.removeAllListeners();
//     if (this.connection) this.connection.removeAllListeners();
//     this.channel = null;
//     this.connection = null;

//     setTimeout(() => {
//       this.isConnecting = false;
//       this.connect();
//     }, 5000);
//   }

//   async #init() {
//     if (!this.channel) return;
//     await this.channel.assertExchange(EXCHANGES.DLX, "direct", {
//       durable: true,
//     });
//     for (const queue in QUEUES) {
//       if (queue.endsWith("_DLQ")) {
//         await this.channel.assertQueue(QUEUES[queue], { durable: true });
//         await this.channel.bindQueue(
//           QUEUES[queue],
//           EXCHANGES.DLX,
//           ROUTINGS.DLQ
//         );
//       } else {
//         await this.channel.assertQueue(QUEUES[queue], {
//           durable: true,
//           arguments: {
//             "x-dead-letter-exchange": EXCHANGES.DLX,
//             "x-dead-letter-routing-key": ROUTINGS.DLQ,
//           },
//         });
//       }
//     }
//   }
// }

// module.exports = new RabbitMQManager();

// // const registeredConsumers = [];

// // function registerConsumer(queueName, businessLogic) {
// //   const consumer = { queueName, businessLogic };
// //   registeredConsumers.push(consumer);
// //   return async () => await startConsumer(consumer);
// // }

// // async function startConsumer(consumer) {
// //   if (!channel) return;
// //   const { queueName, businessLogic } = consumer;
// //   await channel.consume(
// //     queueName,
// //     async (msg) => {
// //       if (!msg) return;
// //       try {
// //         const payload = JSON.parse(msg.content.toString());
// //         await businessLogic(payload);
// //         channel.ack(msg);
// //       } catch (err) {
// //         // TODO: DB에 메시지를 저장
// //         // DB에 저장 실패 했을 경우 nack
// //         channel.ack(msg);
// //       }
// //     },
// //     { noAck: false }
// //   );
// // }

// // async function restartAllConsumers() {
// //   if (registeredConsumers.length === 0) return;
// //   for (const consumer of registeredConsumers) {
// //     try {
// //       await startConsumer(consumer);
// //     } catch (err) {
// //       //
// //     }
// //   }
// // }

// // module.exports = { QUEUES, initRabbitMQ, registerConsumer };
