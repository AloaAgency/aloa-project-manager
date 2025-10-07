const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const EMAIL_ATTEMPT_LIMIT = 10;
const IP_ATTEMPT_LIMIT = 30;
const MAX_FAILURES = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const FAILURE_WINDOW_MS = RATE_LIMIT_WINDOW_MS;

const emailVerificationState = new Map();
const ipVerificationState = new Map();
const failedVerificationState = new Map();

function applySlidingWindowLimit(store, key, limit, windowMs) {
  if (!key) {
    return { limited: false, retryAfter: 0 };
  }

  const now = Date.now();
  const existing = store.get(key);

  if (!existing || now > existing.reset) {
    store.set(key, { count: 1, reset: now + windowMs });
    return { limited: false, retryAfter: 0 };
  }

  if (existing.count >= limit) {
    return {
      limited: true,
      retryAfter: Math.ceil((existing.reset - now) / 1000)
    };
  }

  existing.count += 1;
  return {
    limited: false,
    retryAfter: Math.max(0, Math.ceil((existing.reset - now) / 1000))
  };
}

export function enforceVerificationRateLimits(email, ip) {
  const normalizedEmail = email?.toLowerCase();
  const ipKey = ip?.trim();

  if (ipKey) {
    const ipResult = applySlidingWindowLimit(ipVerificationState, ipKey, IP_ATTEMPT_LIMIT, RATE_LIMIT_WINDOW_MS);
    if (ipResult.limited) {
      return {
        allowed: false,
        status: 429,
        message: 'Too many verification attempts from this IP. Please wait before trying again.',
        retryAfter: ipResult.retryAfter
      };
    }
  }

  const emailResult = applySlidingWindowLimit(emailVerificationState, normalizedEmail, EMAIL_ATTEMPT_LIMIT, RATE_LIMIT_WINDOW_MS);
  if (emailResult.limited) {
    return {
      allowed: false,
      status: 429,
      message: 'Too many verification attempts for this email. Please wait before trying again.',
      retryAfter: emailResult.retryAfter
    };
  }

  return { allowed: true };
}

export function getVerificationLockState(email) {
  const normalizedEmail = email?.toLowerCase();
  const record = failedVerificationState.get(normalizedEmail);
  if (!record) {
    return { locked: false };
  }

  const now = Date.now();

  if (record.lockUntil && now < record.lockUntil) {
    return {
      locked: true,
      retryAfter: Math.ceil((record.lockUntil - now) / 1000)
    };
  }

  if (record.lockUntil && now >= record.lockUntil) {
    failedVerificationState.delete(normalizedEmail);
  }

  return { locked: false };
}

export function registerVerificationFailure(email) {
  const normalizedEmail = email?.toLowerCase();
  const now = Date.now();
  let record = failedVerificationState.get(normalizedEmail);

  if (!record || now - record.firstFailure > FAILURE_WINDOW_MS) {
    record = {
      failures: 0,
      firstFailure: now,
      lockUntil: null
    };
  }

  if (record.lockUntil && now < record.lockUntil) {
    return {
      locked: true,
      retryAfter: Math.ceil((record.lockUntil - now) / 1000)
    };
  }

  record.failures += 1;

  if (record.failures >= MAX_FAILURES) {
    record.lockUntil = now + LOCKOUT_DURATION_MS;
    failedVerificationState.set(normalizedEmail, record);
    return {
      locked: true,
      retryAfter: Math.ceil((record.lockUntil - now) / 1000)
    };
  }

  record.lockUntil = null;
  failedVerificationState.set(normalizedEmail, record);
  return {
    locked: false,
    remaining: MAX_FAILURES - record.failures
  };
}

export function clearVerificationFailures(email) {
  const normalizedEmail = email?.toLowerCase();
  failedVerificationState.delete(normalizedEmail);
}

export function buildRetryHeaders(retryAfterSeconds) {
  if (!retryAfterSeconds) {
    return undefined;
  }
  return {
    'Retry-After': String(retryAfterSeconds)
  };
}

export const OTP_GUARD_CONSTANTS = {
  RATE_LIMIT_WINDOW_MS,
  EMAIL_ATTEMPT_LIMIT,
  IP_ATTEMPT_LIMIT,
  MAX_FAILURES,
  LOCKOUT_DURATION_MS
};
