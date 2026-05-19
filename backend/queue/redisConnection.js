const connection = {
  host: process.env.UPSTASH_REDIS_HOST,
  port: parseInt(process.env.UPSTASH_REDIS_PORT) || 6379,
  password: process.env.UPSTASH_REDIS_PASSWORD,
  tls: {},
  maxRetriesPerRequest: null,
  // Stop retrying after 5 attempts — prevents infinite error spam when Redis is unreachable
  retryStrategy: (times) => {
    if (times > 5) return null; // null = stop retrying
    return Math.min(times * 1000, 5000);
  },
  enableOfflineQueue: false,
};

module.exports = connection;
