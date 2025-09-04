import DOMPurify from 'isomorphic-dompurify';

// Input validation and sanitization utilities

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHTML(dirty) {
  if (!dirty) return '';
  
  // Configure DOMPurify to be very strict
  const config = {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href'],
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    SAFE_FOR_TEMPLATES: true,
    WHOLE_DOCUMENT: false,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_TRUSTED_TYPE: false,
    FORCE_BODY: false,
    SANITIZE_DOM: true,
    IN_PLACE: false,
    USE_PROFILES: false,
    ALLOW_ARIA_ATTR: false,
    ALLOW_DATA_ATTR: false,
    DISALLOWED_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'link'],
  };
  
  return DOMPurify.sanitize(dirty, config);
}

/**
 * Sanitize plain text input (removes all HTML)
 */
export function sanitizeText(input) {
  if (!input) return '';
  if (typeof input !== 'string') {
    input = String(input);
  }
  
  // Remove all HTML tags and decode HTML entities
  const decoded = input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
    
  // Remove any potential script injections
  return decoded
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/eval\(/gi, '')
    .replace(/expression\(/gi, '');
}

/**
 * Validate and sanitize email addresses
 */
export function sanitizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  
  // Basic email validation regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  const sanitized = email.toLowerCase().trim();
  
  if (!emailRegex.test(sanitized)) {
    throw new Error('Invalid email format');
  }
  
  // Additional check for common injection patterns
  if (sanitized.includes('\n') || sanitized.includes('\r') || 
      sanitized.includes('%0a') || sanitized.includes('%0d')) {
    throw new Error('Invalid email format - possible injection attempt');
  }
  
  return sanitized;
}

/**
 * Validate and sanitize URLs
 */
export function sanitizeURL(url) {
  if (!url || typeof url !== 'string') return '';
  
  try {
    const parsed = new URL(url);
    
    // Only allow http(s) and mailto protocols
    if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
      throw new Error('Invalid URL protocol');
    }
    
    // Prevent javascript: and data: URLs
    if (url.toLowerCase().includes('javascript:') || 
        url.toLowerCase().includes('data:')) {
      throw new Error('Potentially malicious URL');
    }
    
    return parsed.href;
  } catch (error) {
    throw new Error('Invalid URL format');
  }
}

/**
 * Sanitize file names to prevent directory traversal
 */
export function sanitizeFileName(fileName) {
  if (!fileName || typeof fileName !== 'string') return '';
  
  // Remove any path components and dangerous characters
  return fileName
    .replace(/^.*[\\\/]/, '') // Remove path
    .replace(/\.{2,}/g, '.') // Remove multiple dots
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscore
    .substring(0, 255); // Limit length
}

/**
 * Validate and sanitize form field names (no special characters)
 */
export function sanitizeFieldName(name) {
  if (!name || typeof name !== 'string') return '';
  
  // Only allow alphanumeric, underscore, and hyphen
  return name
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 100);
}

/**
 * Validate numeric input
 */
export function sanitizeNumber(input, min = null, max = null) {
  const num = Number(input);
  
  if (isNaN(num)) {
    throw new Error('Invalid number format');
  }
  
  if (min !== null && num < min) {
    throw new Error(`Number must be at least ${min}`);
  }
  
  if (max !== null && num > max) {
    throw new Error(`Number must be at most ${max}`);
  }
  
  return num;
}

/**
 * Sanitize array input (for checkboxes, multi-select)
 */
export function sanitizeArray(input, allowedValues = null) {
  if (!Array.isArray(input)) {
    return [];
  }
  
  const sanitized = input
    .filter(item => item !== null && item !== undefined)
    .map(item => sanitizeText(String(item)));
  
  if (allowedValues && Array.isArray(allowedValues)) {
    return sanitized.filter(item => allowedValues.includes(item));
  }
  
  return sanitized;
}

/**
 * Validate file upload
 */
export function validateFileUpload(file, options = {}) {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['text/plain', 'text/markdown', 'text/x-markdown', 'application/x-markdown'],
    allowedExtensions = ['.txt', '.md', '.markdown']
  } = options;
  
  if (!file) {
    throw new Error('No file provided');
  }
  
  // Check file size
  if (file.size > maxSize) {
    throw new Error(`File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`);
  }
  
  // Check file type
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    throw new Error('File type not allowed');
  }
  
  // Check file extension
  const fileName = file.name || '';
  const hasValidExtension = allowedExtensions.some(ext => 
    fileName.toLowerCase().endsWith(ext)
  );
  
  if (!hasValidExtension) {
    throw new Error('File extension not allowed');
  }
  
  // Check for double extensions that might bypass filters
  if (fileName.split('.').length > 2) {
    const parts = fileName.split('.');
    const beforeLast = parts[parts.length - 2];
    const suspiciousExtensions = ['exe', 'js', 'php', 'asp', 'jsp'];
    
    if (suspiciousExtensions.includes(beforeLast.toLowerCase())) {
      throw new Error('Suspicious file name detected');
    }
  }
  
  return true;
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  
  if (typeof window !== 'undefined' && window.crypto) {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    
    for (let i = 0; i < length; i++) {
      token += chars[array[i] % chars.length];
    }
  } else {
    // Server-side fallback
    const crypto = require('crypto');
    for (let i = 0; i < length; i++) {
      token += chars[crypto.randomInt(chars.length)];
    }
  }
  
  return token;
}

/**
 * Validate CSRF token
 */
export function validateCSRFToken(requestToken, sessionToken) {
  if (!requestToken || !sessionToken) {
    return false;
  }
  
  // Use timing-safe comparison to prevent timing attacks
  if (requestToken.length !== sessionToken.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < requestToken.length; i++) {
    result |= requestToken.charCodeAt(i) ^ sessionToken.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Sanitize SQL identifiers (table names, column names)
 * Note: Prefer parameterized queries instead of this
 */
export function sanitizeSQLIdentifier(identifier) {
  if (!identifier || typeof identifier !== 'string') return '';
  
  // Only allow alphanumeric and underscore
  const sanitized = identifier.replace(/[^a-zA-Z0-9_]/g, '');
  
  // Ensure it doesn't start with a number
  if (/^\d/.test(sanitized)) {
    return '_' + sanitized;
  }
  
  return sanitized.substring(0, 64); // Limit length
}

/**
 * Rate limit check helper
 */
export class RateLimiter {
  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
  }
  
  check(identifier) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.requests.has(identifier)) {
      this.requests.set(identifier, []);
    }
    
    const timestamps = this.requests.get(identifier);
    
    // Remove old timestamps
    const validTimestamps = timestamps.filter(ts => ts > windowStart);
    
    if (validTimestamps.length >= this.maxRequests) {
      return false; // Rate limit exceeded
    }
    
    validTimestamps.push(now);
    this.requests.set(identifier, validTimestamps);
    
    // Clean up old entries periodically
    if (Math.random() < 0.01) { // 1% chance to clean up
      this.cleanup();
    }
    
    return true;
  }
  
  cleanup() {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    for (const [identifier, timestamps] of this.requests.entries()) {
      const validTimestamps = timestamps.filter(ts => ts > windowStart);
      
      if (validTimestamps.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, validTimestamps);
      }
    }
  }
}

export default {
  sanitizeHTML,
  sanitizeText,
  sanitizeEmail,
  sanitizeURL,
  sanitizeFileName,
  sanitizeFieldName,
  sanitizeNumber,
  sanitizeArray,
  validateFileUpload,
  generateSecureToken,
  validateCSRFToken,
  sanitizeSQLIdentifier,
  RateLimiter
};