import { RequestHandler as ExpressRequestHandler } from "express";
import {
  AnyKeys as MongooseAnyKeys,
  ClientSession as MongooseClientSession,
  InferRawDocTypeFromSchema as MongooseInferRawDocTypeFromSchema,
  InferSchemaType as MongooseInferSchemaType,
  Types as MongooseTypes,
  QueryFilter as MongooseQueryFilter,
  UpdateQuery as MongooseUpdateQuery,
} from "mongoose";
import {
  Socket as SocketIOSocket,
  Namespace as SocketIONameSpace,
} from "socket.io";

type Primitive = string | number | bigint | boolean | undefined | symbol | null;

declare global {
  /**
   * Express
   */
  type RequestHandler = ExpressRequestHandler & {
    (...args: Parameters<ExpressRequestHandler>): Promise<void> | void | any;
  };

  /**
   * Mongoose
   */
  type ClientSession = MongooseClientSession;
  type ObjectId = MongooseTypes.ObjectId;
  type InferSchemaType<T> = MongooseInferSchemaType<T>;
  type InferLeanWithVersion<T> = MongooseInferRawDocTypeFromSchema<T> & {
    __v: number;
  };
  type CreateInput<T, OmittedKeys extends keyof T = never> = T extends Primitive
    ? T
    : T extends Date
      ? string | Date
      : T extends ObjectId
        ? string | ObjectId
        : T extends readonly (infer U)[]
          ? CreateInput<U>[]
          : T extends object
            ? {
                [K in keyof T as K extends
                  | OmittedKeys
                  | "createdAt"
                  | "updatedAt"
                  ? never
                  : K]: CreateInput<T[K]>;
              } & {
                [K in keyof T as K extends OmittedKeys
                  ? K
                  : never]?: CreateInput<T[K]>;
              }
            : T;
  type UpdateSetInput<T> = NonNullable<MongooseUpdateQuery<T>["$set"]>;

  /**
   * SocketIO
   */
  type SocketNamespace = SocketIONameSpace;
  type Socket = SocketIOSocket;
}
