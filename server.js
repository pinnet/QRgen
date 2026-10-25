const express = require('express');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const crypto = require('crypto');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 8080;

// Only someone holding ADMIN_TOKEN can create, change or read links. An open
// shortener on a public domain gets used for phishing, so refuse to start without one.
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
if (ADMIN_TOKEN.length < 32) {
  console.error('ADMIN_TOKEN must be set to at least 32 characters (e.g. openssl rand -hex 32)');
  process.exit(1);
}
const ADMIN_TOKEN_HASH = crypto.createHash('sha256').update(ADMIN_TOKEN).digest();

// Public address used when reporting short URLs, e.g. https://jmplnk.uk
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || '').replace(/\/+$/, '');

// Optional list of destination hosts, e.g. "dannyarnold.com,*.dannyarnold.com".
// Empty means any http(s) destination is allowed.
const ALLOWED_HOSTS = (process.env.ALLOWED_HOSTS || '')
  .split(',').map(h => h.trim().toLowerCase()).filter(Boolean);

// 302 by default: browsers cache a 301 forever, which would stop a printed
// QR code from following a link whose destination was changed later.
const REDIRECT_STATUS = parseInt(process.env.REDIRECT_STATUS) === 301 ? 301 : 302;

// Visit records (time and referring domain only) are deleted after this many days.
const VISIT_RETENTION_DAYS = parseInt(process.env.VISIT_RETENTION_DAYS) || 90;

const CODE_PATTERN = /^[A-Za-z0-9_-]{1,20}$/;
const RESERVED_CODES = new Set(['api', 'health', 'index', 'admin', 'login', 'stats', 'shorten', 'dashboard', 'public', 'icons']);
const CODE_ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function requireAdmin(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const hash = crypto.createHash('sha256').update(token).digest();
  if (!token || !crypto.timingSafeEqual(hash, ADMIN_TOKEN_HASH)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

function hostAllowed(hostname) {
  if (ALLOWED_HOSTS.length === 0) return true;
  const host = hostname.toLowerCase();
  return ALLOWED_HOSTS.some(rule => rule.startsWith('*.')
    ? host.endsWith(rule.slice(1))
    : host === rule);
}

// Returns an error message, or null when the destination is acceptable
function checkDestination(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch (e) {
    return 'Invalid URL format';
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return 'URL must start with http:// or https://';
  }
  if (PUBLIC_BASE_URL && parsed.origin === new URL(PUBLIC_BASE_URL).origin) {
    return 'URL cannot point back at this shortener';
  }
  if (!hostAllowed(parsed.hostname)) {
    return 'Destination host is not allowed';
  }
  return null;
}

function checkCode(code) {
  if (!CODE_PATTERN.test(code)) {
    return 'Short code must be 1-20 letters, digits, - or _';
  }
  if (RESERVED_CODES.has(code.toLowerCase())) {
    return 'Short code is reserved';
  }
  return null;
}

function randomCode(length = 7) {
  const bytes = crypto.randomBytes(length);
  let code = '';
  for (const b of bytes) code += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return code;
}

function shortUrlFor(req, code) {
  const base = PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
  return `${base}/${code}`;
}

// Parse JSON bodies
app.use(express.json());

// Security middleware with CSP for PWA
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      manifestSrc: ["'self'"],
      workerSrc: ["'self'", "blob:"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// Compression middleware
app.use(compression());

// Determine static files directory (public/ in Docker, root for local dev)
const staticDir = process.env.STATIC_DIR || (require('fs').existsSync(path.join(__dirname, 'public')) ? 'public' : '.');

// Custom middleware for proper PWA caching
app.use((req, res, next) => {
  const filePath = req.path;
  
  // Service Worker - NEVER cache, always fresh
  if (filePath.endsWith('service-worker.js')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Service-Worker-Allowed', '/');
  }
  // Manifest - check frequently for updates
  else if (filePath.endsWith('manifest.json')) {
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  }
  // HTML - always revalidate
  else if (filePath.endsWith('.html')) {
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  }
  // Static assets (JS/CSS) - cache with validation
  else if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
    res.setHeader('Cache-Control', 'public, max-age=86400, must-revalidate');
  }
  // Images and other static content
  else if (filePath.match(/\.(png|jpg|jpeg|gif|svg|ico|webp)$/i)) {
    res.setHeader('Cache-Control', 'public, max-age=604800');
  }
  
  next();
});

// Serve static files
app.use(express.static(path.join(__dirname, staticDir), {
  etag: true,
  lastModified: true
}));

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbHealth = await db.testConnection();
  res.status(dbHealth.success ? 200 : 503).json({ 
    status: dbHealth.success ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbHealth.success ? 'connected' : 'disconnected'
  });
});

// API endpoint for server info
app.get('/api/info', (req, res) => {
  res.json({
    name: 'QR Gen',
    version: '1.0.0',
    description: 'Beautiful QR Code Generator with URL Shortening',
    features: ['PWA', 'Offline Support', 'Custom Colors', 'Multiple Formats', 'URL Shortening', 'Referrer Tracking']
  });
});

// URL Shortening API Endpoints

// Create a shortened URL
app.post('/api/shorten', requireAdmin, async (req, res) => {
  const { url, shortCode, expiresAt, metadata } = req.body || {};
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  
  const urlError = checkDestination(url);
  if (urlError) {
    return res.status(400).json({ error: urlError });
  }
  
  if (shortCode !== undefined) {
    const codeError = checkCode(String(shortCode));
    if (codeError) {
      return res.status(400).json({ error: codeError });
    }
  }
  
  const options = {
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    metadata: metadata || {}
  };
  
  // A generated code can collide with an existing one, so try a few
  let result;
  for (let attempt = 0; attempt < 5; attempt++) {
    result = await db.createShortUrl(shortCode !== undefined ? String(shortCode) : randomCode(), url, options);
    if (result.success || shortCode !== undefined || result.error !== 'Short code already exists') break;
  }
  
  if (!result.success) {
    return res.status(result.error === 'Short code already exists' ? 409 : 400).json({ error: result.error });
  }
  
  res.status(201).json({
    success: true,
    shortCode: result.data.short_code,
    shortUrl: shortUrlFor(req, result.data.short_code),
    originalUrl: result.data.original_url,
    createdAt: result.data.created_at
  });
});

// List all short codes
app.get('/api/links', requireAdmin, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
  const offset = Math.max(parseInt(req.query.offset) || 0, 0);
  const result = await db.listUrls(limit, offset);
  
  if (!result.success) {
    return res.status(500).json({ error: result.error });
  }
  
  res.json({
    success: true,
    data: result.data.map(row => ({ ...row, short_url: shortUrlFor(req, row.short_code) }))
  });
});

// Change where a short code points, turn it back on, or change its expiry
app.patch('/api/shorten/:shortCode', requireAdmin, async (req, res) => {
  const { url, isActive, expiresAt } = req.body || {};
  
  if (url !== undefined) {
    const urlError = checkDestination(url);
    if (urlError) {
      return res.status(400).json({ error: urlError });
    }
  }
  
  const result = await db.updateShortUrl(req.params.shortCode, {
    originalUrl: url,
    isActive: typeof isActive === 'boolean' ? isActive : undefined,
    expiresAt: expiresAt === undefined ? undefined : (expiresAt ? new Date(expiresAt) : null)
  });
  
  if (!result.success) {
    return res.status(404).json({ error: result.error });
  }
  
  res.json({ success: true, data: result.data });
});

// Get statistics for a short code
app.get('/api/stats/:shortCode', requireAdmin, async (req, res) => {
  const { shortCode } = req.params;
  
  const stats = await db.getStats(shortCode);
  if (!stats.success) {
    return res.status(404).json({ error: stats.error });
  }
  
  const referrers = await db.getReferrerStats(shortCode);
  
  res.json({
    success: true,
    stats: stats.data,
    referrers: referrers.data || []
  });
});

// Get top referrers
app.get('/api/referrers/top', requireAdmin, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 1000);
  const result = await db.getTopReferrers(limit);
  
  if (!result.success) {
    return res.status(500).json({ error: result.error });
  }
  
  res.json({ success: true, data: result.data });
});

// Get popular URLs
app.get('/api/urls/popular', requireAdmin, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 1000);
  const result = await db.getPopularUrls(limit);
  
  if (!result.success) {
    return res.status(500).json({ error: result.error });
  }
  
  res.json({ success: true, data: result.data });
});

// Deactivate a short code
app.delete('/api/shorten/:shortCode', requireAdmin, async (req, res) => {
  const { shortCode } = req.params;
  const result = await db.deactivateShortCode(shortCode);
  
  if (!result.success) {
    return res.status(404).json({ error: result.error });
  }
  
  res.json({ success: true, message: 'Short code deactivated' });
});

// Unknown API routes get a JSON 404 rather than the app page
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Redirect short URL and track visit
app.get('/:shortCode', async (req, res, next) => {
  const { shortCode } = req.params;
  
  // Skip anything that can't be a short code, such as static files
  if (!CODE_PATTERN.test(shortCode)) {
    return next();
  }
  
  // Get original URL
  const result = await db.getOriginalUrl(shortCode);
  
  if (!result.success) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(404).type('html').send(
      '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width">' +
      '<title>Link not found</title><body style="font-family:sans-serif;text-align:center;padding:3em">' +
      '<h1>Link not found</h1><p>This short link doesn\'t exist or is no longer active.</p></body>');
  }
  
  // Record the visit without holding up the redirect
  db.recordVisit(shortCode, { referrer: req.get('referer') || null });
  
  // Visitors must always reach the current destination, so don't let anything cache the redirect
  res.setHeader('Cache-Control', 'private, no-store');
  res.redirect(REDIRECT_STATUS, result.url);
});

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  const staticDir = process.env.STATIC_DIR || (require('fs').existsSync(path.join(__dirname, 'public')) ? 'public' : '.');
  res.sendFile(path.join(__dirname, staticDir, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Daily housekeeping: drop expired links and old visit records
async function housekeeping() {
  const visits = await db.purgeOldVisits(VISIT_RETENTION_DAYS);
  const expired = await db.cleanupExpiredUrls();
  if (visits.success && expired.success) {
    console.log(`Housekeeping: removed ${visits.deletedCount} visits older than ${VISIT_RETENTION_DAYS} days and ${expired.deletedCount} expired links`);
  }
}
setTimeout(housekeeping, 60 * 1000);
setInterval(housekeeping, 24 * 60 * 60 * 1000).unref();

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 QR Gen server running on http://0.0.0.0:${PORT}`);
  console.log(`📱 PWA ready for installation`);
  console.log(`🔒 Security headers enabled`);
  console.log(`⚡ Compression enabled`);
  console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await db.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await db.close();
  process.exit(0);
});
