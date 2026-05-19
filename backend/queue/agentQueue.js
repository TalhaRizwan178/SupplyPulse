const { Queue } = require('bullmq');
const connection = require('./redisConnection');

const agentQueue = new Queue('agent-orchestration', { connection });

module.exports = agentQueue;
