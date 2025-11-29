const crypto = require('crypto');

/**
 * Simple JWT implementation for authentication
 * In production, use a proper library like jsonwebtoken
 */

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Base64 URL encoding
 */
function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Base64 URL decoding
 */
function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return Buffer.from(str, 'base64').toString();
}

/**
 * Create JWT token
 */
function createToken(payload) {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + JWT_EXPIRY
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(tokenPayload));
  
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid token format' };
    }

    const [encodedHeader, encodedPayload, signature] = parts;
    
    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    if (signature !== expectedSignature) {
      return { valid: false, error: 'Invalid signature' };
    }

    // Decode payload
    const payload = JSON.parse(base64UrlDecode(encodedPayload));

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return { valid: false, error: 'Token expired' };
    }

    return { valid: true, payload };
  } catch (error) {
    return { valid: false, error: 'Token verification failed' };
  }
}

/**
 * Hash password using SHA-256
 * In production, use bcrypt or argon2
 */
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Verify password against hash
 */
function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}

/**
 * Mock user database (in production, use real database)
 */
const users = new Map();

/**
 * Create user account
 */
function createUser(email, password, name = null) {
  if (users.has(email)) {
    return { success: false, error: 'User already exists' };
  }

  const user = {
    id: crypto.randomUUID(),
    email,
    password: hashPassword(password),
    name: name || email.split('@')[0],
    plan: 'PRO',
    createdAt: new Date().toISOString()
  };

  users.set(email, user);
  return { success: true, user: { ...user, password: undefined } };
}

/**
 * Authenticate user with email/password
 */
function authenticateUser(email, password) {
  const user = users.get(email);
  
  if (!user) {
    return { success: false, error: 'Invalid credentials' };
  }

  if (!verifyPassword(password, user.password)) {
    return { success: false, error: 'Invalid credentials' };
  }

  const token = createToken({
    id: user.id,
    email: user.email,
    name: user.name,
    plan: user.plan
  });

  return {
    success: true,
    token,
    user: { ...user, password: undefined }
  };
}

/**
 * Authenticate user with Google OAuth
 */
async function authenticateWithGoogle(credential) {
  try {
    // In production, verify the Google JWT token
    // For now, decode the payload (INSECURE - for demo only)
    const parts = credential.split('.');
    if (parts.length !== 3) {
      return { success: false, error: 'Invalid Google credential' };
    }

    const payload = JSON.parse(base64UrlDecode(parts[1]));
    const email = payload.email;
    const name = payload.name || email.split('@')[0];

    // Get or create user
    let user = users.get(email);
    if (!user) {
      const result = createUser(email, crypto.randomBytes(32).toString('hex'), name);
      if (!result.success) {
        return result;
      }
      user = result.user;
    }

    const token = createToken({
      id: user.id,
      email: user.email,
      name: user.name || name,
      plan: user.plan
    });

    return {
      success: true,
      token,
      user: { ...user, password: undefined }
    };
  } catch (error) {
    return { success: false, error: 'Google authentication failed' };
  }
}

/**
 * Express middleware to verify JWT
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);
  const result = verifyToken(token);

  if (!result.valid) {
    return res.status(401).json({ error: result.error || 'Invalid token' });
  }

  req.user = result.payload;
  next();
}

// Create demo user
createUser('demo@jmplnk.uk', 'demo123', 'Demo User');

module.exports = {
  createToken,
  verifyToken,
  createUser,
  authenticateUser,
  authenticateWithGoogle,
  authMiddleware,
  users
};
