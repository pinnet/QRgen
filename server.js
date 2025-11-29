const express = require('express');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 8080;

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
app.post('/api/shorten', async (req, res) => {
  const { url, shortCode, expiresAt, metadata } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  
  // Validate URL format
  try {
    new URL(url);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid URL format' });
  }
  
  // Generate random short code if not provided
  const code = shortCode || Math.random().toString(36).substring(2, 8);
  
  const result = await db.createShortUrl(code, url, {
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    metadata: metadata || {}
  });
  
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  
  res.json({
    success: true,
    shortCode: result.data.short_code,
    shortUrl: `${req.protocol}://${req.get('host')}/${result.data.short_code}`,
    originalUrl: result.data.original_url,
    createdAt: result.data.created_at
  });
});

// Get statistics for a short code
app.get('/api/stats/:shortCode', async (req, res) => {
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
app.get('/api/referrers/top', async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const result = await db.getTopReferrers(limit);
  
  if (!result.success) {
    return res.status(500).json({ error: result.error });
  }
  
  res.json({ success: true, data: result.data });
});

// Get popular URLs
app.get('/api/urls/popular', async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const result = await db.getPopularUrls(limit);
  
  if (!result.success) {
    return res.status(500).json({ error: result.error });
  }
  
  res.json({ success: true, data: result.data });
});

// Deactivate a short code (admin function)
app.delete('/api/shorten/:shortCode', async (req, res) => {
  const { shortCode } = req.params;
  const result = await db.deactivateShortCode(shortCode);
  
  if (!result.success) {
    return res.status(404).json({ error: result.error });
  }
  
  res.json({ success: true, message: 'Short code deactivated' });
});

// Redirect short URL and track visit
app.get('/:shortCode', async (req, res, next) => {
  const { shortCode } = req.params;
  
  // Skip if it's a static file or API route
  if (shortCode.includes('.') || shortCode.startsWith('api')) {
    return next();
  }
  
  // Get original URL
  const result = await db.getOriginalUrl(shortCode);
  
  if (!result.success) {
    // Fallback to index.html for PWA routing
    const staticDir = process.env.STATIC_DIR || (require('fs').existsSync(path.join(__dirname, 'public')) ? 'public' : '.');
    return res.sendFile(path.join(__dirname, staticDir, 'index.html'));
  }
  
  // Record visit with referrer tracking
  const visitData = {
    referrer: req.get('referer') || req.get('referrer') || null,
    userAgent: req.get('user-agent') || null,
    ipAddress: req.ip || req.connection.remoteAddress || null
  };
  
  await db.recordVisit(shortCode, visitData);
  
  // Redirect to original URL
  res.redirect(301, result.url);
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
