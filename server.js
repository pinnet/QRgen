const express = require('express');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 8080;

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
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API endpoint for server info (optional)
app.get('/api/info', (req, res) => {
  res.json({
    name: 'QR Gen',
    version: '1.0.0',
    description: 'Beautiful QR Code Generator',
    features: ['PWA', 'Offline Support', 'Custom Colors', 'Multiple Formats']
  });
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
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});
