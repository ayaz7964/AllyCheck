/**
 * Simple in-memory rate limiter for API endpoints
 * In production, use Redis for distributed rate limiting
 */

const requestMap = new Map();

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_REQUESTS = parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE || '10');

export function checkRateLimit(identifier) {
  const now = Date.now();
  const key = `${identifier}`;

  if (!requestMap.has(key)) {
    requestMap.set(key, []);
  }

  const timestamps = requestMap.get(key);

  // Remove old timestamps outside the window
  const validTimestamps = timestamps.filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
  );

  if (validTimestamps.length >= RATE_LIMIT_REQUESTS) {
    return {
      allowed: false,
      retryAfter: Math.ceil(
        (validTimestamps[0] + RATE_LIMIT_WINDOW_MS - now) / 1000
      )
    };
  }

  validTimestamps.push(now);
  requestMap.set(key, validTimestamps);

  return {
    allowed: true,
    remaining: RATE_LIMIT_REQUESTS - validTimestamps.length
  };
}

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of requestMap.entries()) {
    const validTimestamps = timestamps.filter(
      (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
    );
    if (validTimestamps.length === 0) {
      requestMap.delete(key);
    } else {
      requestMap.set(key, validTimestamps);
    }
  }
}, 5 * 60 * 1000);
