/**
 * MongoDB utilities for custom API endpoints that need direct aggregation access.
 * Uses Payload's getPayload to ensure MongoDB connection is established.
 */

import type { Sort } from "mongodb";
import type { Db } from "mongodb";

import config from "@payload-config";
import { getPayload } from "payload";

let cachedDb: Db | null = null;

/**
 * Get the native MongoDB database connection through Payload.
 * This ensures Payload has initialized the connection before we use it.
 */
export const getDb = async (): Promise<Db> => {
  if (cachedDb) {
    return cachedDb;
  }

  // Initialize Payload to ensure MongoDB connection
  const payload = await getPayload({ config });

  // Access the mongoose connection through Payload's db adapter
  // The db adapter exposes the connection through its internals
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
 * Run an aggregation on a collection.
 */
export const aggregate = async <T = unknown>(
  collectionName: string,
  pipeline: object[],
): Promise<T[]> => {
  const db = await getDb();
  const collection = db.collection(collectionName);
  const result = await collection.aggregate(pipeline).toArray();
  return result as T[];
};

/**
 * Find documents in a collection.
 */
export const findDocuments = async <T = unknown>(
  collectionName: string,
  query: object,
  options?: { limit?: number; skip?: number; sort?: Sort },
): Promise<T[]> => {
  const db = await getDb();
  const collection = db.collection(collectionName);
  let cursor = collection.find(query);
  if (options?.sort) {
    cursor = cursor.sort(options.sort);
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
  const db = await getDb();
  const collection = db.collection(collectionName);
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
  const db = await getDb();
  const collection = db.collection(collectionName);
  return collection.countDocuments(query);
};
