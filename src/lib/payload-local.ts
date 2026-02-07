/**
 * Payload Local API utilities for standalone scripts.
 *
 * This module provides a way to use Payload's Local API in scripts
 * while also providing access to the raw MongoDB connection for
 * bulk operations that Payload doesn't natively support.
 */

import type { Payload } from "payload";
import type { Db, Collection, BulkWriteOptions } from "mongodb";

import { getPayload } from "payload";

import config from "@payload-config";

let cachedPayload: Payload | null = null;
let cachedDb: Db | null = null;

/**
 * Initialize and get the Payload instance.
 * Caches the instance for subsequent calls.
 */
export const initPayload = async (): Promise<Payload> => {
  if (cachedPayload) {
    return cachedPayload;
  }

  console.log("Initializing Payload...");
  cachedPayload = await getPayload({ config });
  console.log("Payload initialized");

  return cachedPayload;
};

/**
 * Get the raw MongoDB database instance through Payload.
 * Useful for bulk operations that Payload doesn't support.
 */
export const getDatabase = async (): Promise<Db> => {
  if (cachedDb) {
    return cachedDb;
  }

  const payload = await initPayload();

  // Access the mongoose connection through Payload's db adapter
  const mongooseAdapter = payload.db as unknown as {
    connection: { db: Db };
  };

  if (!mongooseAdapter.connection?.db) {
    throw new Error("MongoDB database not available after Payload initialization");
  }

  cachedDb = mongooseAdapter.connection.db;
  return cachedDb;
};

/**
 * Get a raw MongoDB collection.
 */
export const getCollection = async (name: string): Promise<Collection> => {
  const db = await getDatabase();
  return db.collection(name);
};

/**
 * Perform a bulk write operation on a collection.
 * This uses the raw MongoDB driver for efficiency.
 */
export const bulkWrite = async <T = unknown>(
  collectionName: string,
  operations: Array<{
    insertOne?: { document: T };
    updateOne?: {
      filter: object;
      update: object;
      upsert?: boolean;
    };
    updateMany?: {
      filter: object;
      update: object;
      upsert?: boolean;
    };
    deleteOne?: { filter: object };
    deleteMany?: { filter: object };
    replaceOne?: {
      filter: object;
      replacement: T;
      upsert?: boolean;
    };
  }>,
  options?: BulkWriteOptions,
) => {
  const collection = await getCollection(collectionName);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return collection.bulkWrite(operations as any, options);
};

/**
 * Run an aggregation pipeline on a collection.
 */
export const aggregate = async <T = unknown>(
  collectionName: string,
  pipeline: object[],
): Promise<T[]> => {
  const collection = await getCollection(collectionName);
  const result = await collection.aggregate(pipeline).toArray();
  return result as T[];
};

/**
 * Find documents in a collection.
 */
export const findDocuments = async <T = unknown>(
  collectionName: string,
  query: object,
  options?: { limit?: number; skip?: number; sort?: object },
): Promise<T[]> => {
  const collection = await getCollection(collectionName);
  let cursor = collection.find(query);
  if (options?.sort) {
    cursor = cursor.sort(options.sort as Parameters<typeof cursor.sort>[0]);
  }
  if (options?.skip) {
    cursor = cursor.skip(options.skip);
  }
  if (options?.limit) {
    cursor = cursor.limit(options.limit);
  }
  const result = await cursor.toArray();
  return result as T[];
};

/**
 * Find a single document.
 */
export const findOne = async <T = unknown>(
  collectionName: string,
  query: object,
): Promise<T | null> => {
  const collection = await getCollection(collectionName);
  const result = await collection.findOne(query);
  return result as T | null;
};

/**
 * Count documents in a collection.
 */
export const countDocuments = async (
  collectionName: string,
  query: object,
): Promise<number> => {
  const collection = await getCollection(collectionName);
  return collection.countDocuments(query);
};

/**
 * Graceful shutdown - close connections.
 */
export const shutdown = async () => {
  if (cachedPayload) {
    // Payload handles connection cleanup
    cachedPayload = null;
    cachedDb = null;
  }
  process.exit(0);
};

// Handle SIGINT for graceful shutdown
process.on("SIGINT", shutdown);
