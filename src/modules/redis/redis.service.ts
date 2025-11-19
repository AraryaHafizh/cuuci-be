import { connection } from "../../config/redis";

export class RedisService {
  getValue = async (key: string) => {
    return await connection.get(key);
  };

  setValue = async (key: string, value: string, ttlInSecond?: number) => {
    if (ttlInSecond) {
      return await connection.set(key, value, "EX", ttlInSecond);
    } else {
      return await connection.set(key, value);
    }
  };
}
