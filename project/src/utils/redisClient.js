const { createClient } = require('redis');

let client = null;
let connectPromise = null;

const getRedisUrl = () => String(process.env.REDIS_URL || 'redis://127.0.0.1:6379').trim();

const createRedis = () => {
  const redis = createClient({
    url: getRedisUrl(),
    socket: {
      connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT_MS || 5000),
      reconnectStrategy: false
    }
  });

  redis.on('error', (error) => {
    console.error('Redis error:', error.message);
  });

  return redis;
};

const getRedisClient = async () => {
  if (!client) {
    client = createRedis();
  }

  if (client.isOpen) {
    return client;
  }

  if (!connectPromise) {
    connectPromise = client.connect().finally(() => {
      connectPromise = null;
    });
  }

  await connectPromise;
  return client;
};

const setJson = async (key, value, ttlSeconds) => {
  const redis = await getRedisClient();
  await redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
};

const getJson = async (key) => {
  const redis = await getRedisClient();
  const raw = await redis.get(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (error) {
    await redis.del(key);
    return null;
  }
};

const deleteKey = async (key) => {
  const redis = await getRedisClient();
  await redis.del(key);
};

module.exports = {
  deleteKey,
  getJson,
  getRedisClient,
  setJson
};
