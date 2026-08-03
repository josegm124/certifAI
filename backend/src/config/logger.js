const pino = require('pino');
const path = require('path');
const fs = require('fs');

const logsDir = path.join(__dirname, '../../logs');
fs.mkdirSync(logsDir, { recursive: true });

const now = new Date();
const date = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
const level = process.env.LOG_LEVEL || 'info';
const destination = (kind) => pino.destination({ dest: path.join(logsDir, `${kind}-${date}.log`), mkdir: true, sync: false });

const pretty = pino.transport({
  target: 'pino-pretty',
  options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' }
});

const logger = pino(
  { level, base: { service: 'certifai-backend' } },
  pino.multistream([{ stream: pretty }, { stream: destination('application') }])
);

// Separate JSONL files make audit review and metric processing possible
// without filtering general application output.
logger.audit = pino({ level: 'info', base: { service: 'certifai-backend', logType: 'audit' } }, destination('audit'));
logger.metric = pino({ level: 'info', base: { service: 'certifai-backend', logType: 'metric' } }, destination('metrics'));
logger.logDirectory = logsDir;
logger.logDate = date;

module.exports = logger;
