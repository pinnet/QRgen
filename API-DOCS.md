# URL Shortening API Documentation

## Overview

QR Gen now includes a URL shortening service with comprehensive HTTP referrer tracking. This allows you to:
- Create short URLs with custom or auto-generated codes
- Track every visit with full referrer information
- Analyze traffic patterns and referrer sources
- Set expiration dates for temporary short URLs

## Database Schema

### Tables

#### `shortened_urls`
Stores URL shortening mappings.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| short_code | VARCHAR(20) | Unique short code (e.g., "abc123") |
| original_url | TEXT | The destination URL |
| created_at | TIMESTAMP | When the short URL was created |
| created_by | VARCHAR(255) | Optional creator identifier |
| expires_at | TIMESTAMP | Optional expiration date |
| is_active | BOOLEAN | Whether the short URL is active |
| metadata | JSONB | Custom JSON metadata (e.g., QR code settings) |

#### `url_visits`
Records every visit to a shortened URL.

| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Primary key |
| short_code | VARCHAR(20) | Reference to shortened URL |
| visited_at | TIMESTAMP | When the visit occurred |
| referrer | TEXT | Full HTTP Referer header |
| referrer_domain | VARCHAR(255) | Extracted domain from referrer |
| user_agent | TEXT | Browser user agent string |
| ip_address | INET | Visitor's IP address |
| country_code | VARCHAR(2) | Country code (if available) |
| city | VARCHAR(100) | City (if available) |
| device_type | VARCHAR(50) | Device type (mobile/desktop/tablet) |
| browser | VARCHAR(100) | Browser name |
| os | VARCHAR(100) | Operating system |

#### `referrer_stats`
Aggregated statistics per referrer domain (auto-updated via trigger).

| Column | Type | Description |
|--------|------|-------------|
| short_code | VARCHAR(20) | Reference to shortened URL |
| referrer_domain | VARCHAR(255) | Referrer domain |
| visit_count | INTEGER | Total visits from this referrer |
| first_visit | TIMESTAMP | First visit from this referrer |
| last_visit | TIMESTAMP | Most recent visit |

### Views

- **`popular_urls`**: URLs ranked by visit count
- **`top_referrers`**: Top referring domains across all URLs
- **`url_stats_summary`**: Comprehensive statistics per URL

## API Endpoints

### 1. Create Shortened URL

**POST** `/api/shorten`

Create a new shortened URL.

**Request Body:**
```json
{
  "url": "https://example.com/very-long-url",
  "shortCode": "custom123",  // Optional - auto-generated if not provided
  "expiresAt": "2025-12-31T23:59:59Z",  // Optional
  "metadata": {              // Optional
    "qrCodeSettings": {
      "color": "#8845ff",
      "size": 256
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "shortCode": "custom123",
  "shortUrl": "https://jmplnk.uk/custom123",
  "originalUrl": "https://example.com/very-long-url",
  "createdAt": "2025-11-29T12:00:00Z"
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid URL or short code already exists

---

### 2. Redirect Short URL

**GET** `/:shortCode`

Redirects to the original URL and records visit data.

**Example:**
```
GET /custom123
```

**Response:**
- `301` - Permanent redirect to original URL
- `404` - Short code not found (falls back to PWA)

**Tracked Data:**
- HTTP Referer header
- User agent
- IP address
- Visit timestamp

---

### 3. Get URL Statistics

**GET** `/api/stats/:shortCode`

Get comprehensive statistics for a shortened URL.

**Example:**
```
GET /api/stats/custom123
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "short_code": "custom123",
    "original_url": "https://example.com/very-long-url",
    "created_at": "2025-11-29T12:00:00Z",
    "total_visits": 156,
    "unique_visitors": 89,
    "unique_referrers": 12,
    "last_visit": "2025-11-29T18:30:00Z",
    "age_days": 0.27
  },
  "referrers": [
    {
      "referrer_domain": "google.com",
      "visit_count": 45,
      "first_visit": "2025-11-29T12:15:00Z",
      "last_visit": "2025-11-29T18:30:00Z"
    },
    {
      "referrer_domain": "twitter.com",
      "visit_count": 32,
      "first_visit": "2025-11-29T13:00:00Z",
      "last_visit": "2025-11-29T17:45:00Z"
    }
  ]
}
```

**Status Codes:**
- `200` - Success
- `404` - Short code not found

---

### 4. Get Top Referrers

**GET** `/api/referrers/top?limit=10`

Get top referring domains across all URLs.

**Query Parameters:**
- `limit` (optional) - Number of results (default: 10)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "referrer_domain": "google.com",
      "total_visits": 1234,
      "urls_referred": 45,
      "last_visit": "2025-11-29T18:30:00Z"
    },
    {
      "referrer_domain": "facebook.com",
      "total_visits": 892,
      "urls_referred": 32,
      "last_visit": "2025-11-29T17:15:00Z"
    }
  ]
}
```

---

### 5. Get Popular URLs

**GET** `/api/urls/popular?limit=10`

Get most visited shortened URLs.

**Query Parameters:**
- `limit` (optional) - Number of results (default: 10)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "short_code": "popular1",
      "original_url": "https://example.com/page",
      "total_visits": 5678,
      "unique_referrers": 89,
      "last_visit": "2025-11-29T18:30:00Z",
      "created_at": "2025-11-01T00:00:00Z"
    }
  ]
}
```

---

### 6. Deactivate Short URL

**DELETE** `/api/shorten/:shortCode`

Deactivate a shortened URL (admin function).

**Example:**
```
DELETE /api/shorten/custom123
```

**Response:**
```json
{
  "success": true,
  "message": "Short code deactivated"
}
```

**Status Codes:**
- `200` - Success
- `404` - Short code not found

---

## Usage Examples

### Create a Short URL with cURL

```bash
curl -X POST http://localhost:8080/api/shorten \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/my-long-url",
    "shortCode": "mylink"
  }'
```

### Get Statistics with cURL

```bash
curl http://localhost:8080/api/stats/mylink
```

### JavaScript Example

```javascript
// Create short URL
async function createShortUrl(url) {
  const response = await fetch('/api/shorten', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });
  return await response.json();
}

// Get statistics
async function getStats(shortCode) {
  const response = await fetch(`/api/stats/${shortCode}`);
  return await response.json();
}

// Usage
const result = await createShortUrl('https://example.com/page');
console.log('Short URL:', result.shortUrl);

const stats = await getStats(result.shortCode);
console.log('Total visits:', stats.stats.total_visits);
```

## Database Maintenance

### Cleanup Expired URLs

The database includes a function to clean up expired URLs:

```sql
SELECT cleanup_expired_urls();
```

This can be run periodically via cron job or scheduled task.

### Query Examples

**Get all visits for a specific referrer:**
```sql
SELECT * FROM url_visits 
WHERE referrer_domain = 'google.com'
ORDER BY visited_at DESC;
```

**Get hourly visit distribution:**
```sql
SELECT 
  DATE_TRUNC('hour', visited_at) as hour,
  COUNT(*) as visits
FROM url_visits
WHERE short_code = 'mylink'
GROUP BY hour
ORDER BY hour DESC;
```

**Get geographic distribution:**
```sql
SELECT 
  country_code,
  COUNT(*) as visits
FROM url_visits
WHERE short_code = 'mylink' AND country_code IS NOT NULL
GROUP BY country_code
ORDER BY visits DESC;
```

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string (default: see docker-compose.yml)
- `PORT` - Server port (default: 8080)
- `NODE_ENV` - Environment (production/development)

## Security Considerations

1. **Short Code Validation**: Only alphanumeric, underscore, and hyphen characters allowed
2. **URL Validation**: URLs are validated before storage
3. **Rate Limiting**: Consider implementing rate limiting for production
4. **Authentication**: Add authentication for admin endpoints (deactivate, stats)
5. **Input Sanitization**: All inputs are sanitized and validated
6. **SQL Injection Protection**: Uses parameterized queries via pg library

## Performance

- **Indexes**: Optimized indexes on frequently queried columns
- **Connection Pooling**: PostgreSQL connection pool (max 20 connections)
- **Triggers**: Auto-updating referrer stats via database triggers
- **Views**: Pre-computed views for common queries

## Integration with QR Codes

When generating a QR code, you can:
1. Create a shortened URL first
2. Store QR code settings in the `metadata` field
3. Generate QR code for the short URL
4. Track how many people scan the QR code via referrer stats

**Example:**
```javascript
// Create short URL with QR metadata
const shortUrl = await createShortUrl({
  url: 'https://example.com/product',
  metadata: {
    qrCode: {
      color: '#8845ff',
      size: 256,
      errorCorrection: 'M'
    },
    campaign: 'product-launch-2025'
  }
});

// Generate QR code for short URL
generateQRCode(shortUrl.shortUrl);
```
