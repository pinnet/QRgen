const { Pool } = require('pg');

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://qrgen_user:qrgen_secure_password_change_me@localhost:5432/qrgen',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
pool.on('connect', () => {
  console.log('✅ Database connection established');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
});

// Helper: Extract domain from URL
function extractDomain(url) {
  if (!url || url === '') return null;
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (e) {
    return null;
  }
}

// Database service functions
const db = {
  // Test connection
  async testConnection() {
    try {
      const result = await pool.query('SELECT NOW()');
      return { success: true, time: result.rows[0].now };
    } catch (error) {
      console.error('Database connection test failed:', error);
      return { success: false, error: error.message };
    }
  },

  // Create a shortened URL
  async createShortUrl(shortCode, originalUrl, options = {}) {
    const { createdBy = null, expiresAt = null, metadata = {} } = options;
    
    try {
      const result = await pool.query(
        `INSERT INTO shortened_urls (short_code, original_url, created_by, expires_at, metadata)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [shortCode, originalUrl, createdBy, expiresAt, JSON.stringify(metadata)]
      );
      return { success: true, data: result.rows[0] };
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        return { success: false, error: 'Short code already exists' };
      }
      console.error('Error creating short URL:', error);
      return { success: false, error: error.message };
    }
  },

  // Get original URL by short code
  async getOriginalUrl(shortCode) {
    try {
      const result = await pool.query(
        `SELECT original_url, is_active, expires_at 
         FROM shortened_urls 
         WHERE short_code = $1`,
        [shortCode]
      );
      
      if (result.rows.length === 0) {
        return { success: false, error: 'Short code not found' };
      }
      
      const url = result.rows[0];
      
      // Check if expired
      if (url.expires_at && new Date(url.expires_at) < new Date()) {
        return { success: false, error: 'Short code has expired' };
      }
      
      // Check if active
      if (!url.is_active) {
        return { success: false, error: 'Short code is inactive' };
      }
      
      return { success: true, url: url.original_url };
    } catch (error) {
      console.error('Error getting original URL:', error);
      return { success: false, error: error.message };
    }
  },

  // Record a visit with referrer tracking
  async recordVisit(shortCode, visitData = {}) {
    const {
      referrer = null,
      userAgent = null,
      ipAddress = null,
      countryCode = null,
      city = null,
      deviceType = null,
      browser = null,
      os = null
    } = visitData;
    
    const referrerDomain = extractDomain(referrer);
    
    try {
      const result = await pool.query(
        `INSERT INTO url_visits (
          short_code, referrer, referrer_domain, user_agent, ip_address,
          country_code, city, device_type, browser, os
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, visited_at`,
        [shortCode, referrer, referrerDomain, userAgent, ipAddress, 
         countryCode, city, deviceType, browser, os]
      );
      return { success: true, data: result.rows[0] };
    } catch (error) {
      console.error('Error recording visit:', error);
      return { success: false, error: error.message };
    }
  },

  // Get statistics for a short code
  async getStats(shortCode) {
    try {
      const result = await pool.query(
        `SELECT * FROM url_stats_summary WHERE short_code = $1`,
        [shortCode]
      );
      
      if (result.rows.length === 0) {
        return { success: false, error: 'Short code not found' };
      }
      
      return { success: true, data: result.rows[0] };
    } catch (error) {
      console.error('Error getting stats:', error);
      return { success: false, error: error.message };
    }
  },

  // Get referrer statistics for a short code
  async getReferrerStats(shortCode) {
    try {
      const result = await pool.query(
        `SELECT referrer_domain, visit_count, first_visit, last_visit
         FROM referrer_stats
         WHERE short_code = $1
         ORDER BY visit_count DESC`,
        [shortCode]
      );
      
      return { success: true, data: result.rows };
    } catch (error) {
      console.error('Error getting referrer stats:', error);
      return { success: false, error: error.message };
    }
  },

  // Get top referrers across all URLs
  async getTopReferrers(limit = 10) {
    try {
      const result = await pool.query(
        `SELECT * FROM top_referrers LIMIT $1`,
        [limit]
      );
      
      return { success: true, data: result.rows };
    } catch (error) {
      console.error('Error getting top referrers:', error);
      return { success: false, error: error.message };
    }
  },

  // Get popular URLs
  async getPopularUrls(limit = 10) {
    try {
      const result = await pool.query(
        `SELECT * FROM popular_urls LIMIT $1`,
        [limit]
      );
      
      return { success: true, data: result.rows };
    } catch (error) {
      console.error('Error getting popular URLs:', error);
      return { success: false, error: error.message };
    }
  },

  // Deactivate a short code
  async deactivateShortCode(shortCode) {
    try {
      const result = await pool.query(
        `UPDATE shortened_urls 
         SET is_active = FALSE 
         WHERE short_code = $1
         RETURNING *`,
        [shortCode]
      );
      
      if (result.rows.length === 0) {
        return { success: false, error: 'Short code not found' };
      }
      
      return { success: true, data: result.rows[0] };
    } catch (error) {
      console.error('Error deactivating short code:', error);
      return { success: false, error: error.message };
    }
  },

  // Clean up expired URLs
  async cleanupExpiredUrls() {
    try {
      const result = await pool.query('SELECT cleanup_expired_urls()');
      const deletedCount = result.rows[0].cleanup_expired_urls;
      return { success: true, deletedCount };
    } catch (error) {
      console.error('Error cleaning up expired URLs:', error);
      return { success: false, error: error.message };
    }
  },

  // Close pool (for graceful shutdown)
  async close() {
    await pool.end();
    console.log('Database connection pool closed');
  }
};

module.exports = db;
