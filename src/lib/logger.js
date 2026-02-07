/**
 * Centralized logging service for production monitoring
 */

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

const currentLogLevel = process.env.LOG_LEVEL || 'info';

const logLevelPriority = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

function shouldLog(level) {
  return logLevelPriority[level] <= logLevelPriority[currentLogLevel.toUpperCase()];
}

function formatTimestamp() {
  return new Date().toISOString();
}

function formatLog(level, context, message, data) {
  const timestamp = formatTimestamp();
  const prefix = `[${timestamp}] [${level}] [${context}]`;
  
  if (data) {
    return `${prefix} ${message} ${JSON.stringify(data, null, 2)}`;
  }
  return `${prefix} ${message}`;
}

export const logger = {
  error: (context, message, data) => {
    if (shouldLog('ERROR')) {
      const formatted = formatLog(LOG_LEVELS.ERROR, context, message, data);
      console.error(formatted);
      // In production, send to error tracking service (Sentry, etc.)
    }
  },
  
  warn: (context, message, data) => {
    if (shouldLog('WARN')) {
      const formatted = formatLog(LOG_LEVELS.WARN, context, message, data);
      console.warn(formatted);
    }
  },
  
  info: (context, message, data) => {
    if (shouldLog('INFO')) {
      const formatted = formatLog(LOG_LEVELS.INFO, context, message, data);
      console.log(formatted);
    }
  },
  
  debug: (context, message, data) => {
    if (shouldLog('DEBUG')) {
      const formatted = formatLog(LOG_LEVELS.DEBUG, context, message, data);
      console.log(formatted);
    }
  }
};
