import IORedis from "ioredis";
import { REDIS_HOST, REDIS_PORT } from "./env";

export const connection = new IORedis({
  host: REDIS_HOST!,
  port: Number(REDIS_PORT),
  maxRetriesPerRequest: null,
});
