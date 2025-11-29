# URL Shortening Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         QR Gen Application                       │
│                                                                  │
│  ┌────────────────┐      ┌──────────────┐      ┌─────────────┐ │
│  │                │      │              │      │             │ │
│  │  Frontend PWA  │──────│  Express.js  │──────│   db.js     │ │
│  │  (HTML/JS/CSS) │      │   Server     │      │  (Service)  │ │
│  │                │      │              │      │             │ │
│  └────────────────┘      └──────────────┘      └──────┬──────┘ │
│                                                         │        │
└─────────────────────────────────────────────────────────┼────────┘
                                                          │
                                                          │ pg pool
                                                          │ (max 20)
                                                          │
                                                          ▼
                                           ┌──────────────────────────┐
                                           │   PostgreSQL Database    │
                                           │                          │
                                           │  ┌────────────────────┐ │
                                           │  │  shortened_urls    │ │
                                           │  ├────────────────────┤ │
                                           │  │ short_code         │ │
                                           │  │ original_url       │ │
                                           │  │ expires_at         │ │
                                           │  │ metadata (JSONB)   │ │
                                           │  └────────────────────┘ │
                                           │                          │
                                           │  ┌────────────────────┐ │
                                           │  │   url_visits       │ │
                                           │  ├────────────────────┤ │
                                           │  │ short_code         │ │
                                           │  │ referrer           │ │
                                           │  │ referrer_domain    │ │
                                           │  │ user_agent         │ │
                                           │  │ ip_address         │ │
                                           │  │ visited_at         │ │
                                           │  └────────────────────┘ │
                                           │                          │
                                           │  ┌────────────────────┐ │
                                           │  │  referrer_stats    │ │
                                           │  ├────────────────────┤ │
                                           │  │ short_code         │ │
                                           │  │ referrer_domain    │ │
                                           │  │ visit_count        │ │
                                           │  │ first/last_visit   │ │
                                           │  └────────────────────┘ │
                                           │                          │
                                           └──────────────────────────┘
```

## Request Flow

### 1. Create Short URL

```
User Request:
POST /api/shorten
{
  "url": "https://example.com/long-url",
  "shortCode": "abc123"
}
    │
    │ 1. Validate URL format
    ├──────────────────────►  Express.js
    │                              │
    │                              │ 2. Call db.createShortUrl()
    │                              ├─────────────────────►  db.js
    │                              │                           │
    │                              │                           │ 3. INSERT INTO shortened_urls
    │                              │                           ├────────►  PostgreSQL
    │                              │                           │
    │                              │ 4. Return short_code      │
    │                              │◄─────────────────────────┤
    │                              │                           │
    │ 5. Return JSON response      │                           │
    │◄─────────────────────────────┤                           │
    │                                                          │
    ▼                                                          │
{
  "shortUrl": "https://jmplnk.uk/abc123",
  "originalUrl": "https://example.com/long-url"
}
```

### 2. Visit Short URL (Redirect + Track)

```
Browser Request:
GET /abc123
Referer: https://google.com/search
    │
    │ 1. Extract short code
    ├──────────────────────►  Express.js
    │                              │
    │                              │ 2. Get original URL
    │                              ├─────────────────────►  db.js
    │                              │                           │
    │                              │                           │ 3. SELECT FROM shortened_urls
    │                              │                           ├────────►  PostgreSQL
    │                              │                           │
    │                              │ 4. Return original URL    │
    │                              │◄─────────────────────────┤
    │                              │                           │
    │                              │ 5. Record visit           │
    │                              ├─────────────────────►  db.js
    │                              │                           │
    │                              │                           │ 6. INSERT INTO url_visits
    │                              │                           ├────────►  PostgreSQL
    │                              │                           │              │
    │                              │                           │              │ 7. TRIGGER
    │                              │                           │              │    update_referrer_stats()
    │                              │                           │              │
    │                              │                           │              │ 8. UPDATE referrer_stats
    │                              │                           │              │    (google.com +1)
    │                              │                           │              │
    │                              │ 9. Visit recorded         │              │
    │                              │◄─────────────────────────┤              │
    │                              │                                          │
    │ 10. 301 Redirect             │                                          │
    │◄─────────────────────────────┤                                          │
    │                                                                         │
    ▼
Browser redirects to: https://example.com/long-url
```

### 3. Get Statistics

```
User Request:
GET /api/stats/abc123
    │
    │ 1. Query statistics
    ├──────────────────────►  Express.js
    │                              │
    │                              │ 2. Get aggregated stats
    │                              ├─────────────────────►  db.js
    │                              │                           │
    │                              │                           │ 3. SELECT FROM url_stats_summary
    │                              │                           ├────────►  PostgreSQL
    │                              │                           │              (View)
    │                              │ 4. Return stats           │
    │                              │◄─────────────────────────┤
    │                              │                           │
    │                              │ 5. Get referrer breakdown │
    │                              ├─────────────────────►  db.js
    │                              │                           │
    │                              │                           │ 6. SELECT FROM referrer_stats
    │                              │                           ├────────►  PostgreSQL
    │                              │                           │
    │                              │ 7. Return referrers       │
    │                              │◄─────────────────────────┤
    │                              │                           │
    │ 8. Return JSON response      │                           │
    │◄─────────────────────────────┤                           │
    │                                                          │
    ▼
{
  "stats": {
    "total_visits": 156,
    "unique_referrers": 12
  },
  "referrers": [
    {"referrer_domain": "google.com", "visit_count": 45},
    {"referrer_domain": "twitter.com", "visit_count": 32}
  ]
}
```

## Database Trigger Flow

### Auto-Updating Referrer Stats

```
INSERT INTO url_visits
│
│ short_code: 'abc123'
│ referrer_domain: 'google.com'
│ visited_at: NOW()
│
├───────►  TRIGGER: trigger_update_referrer_stats
            │
            │ AFTER INSERT
            │
            ├───────►  FUNCTION: update_referrer_stats()
                       │
                       │ 1. Try INSERT
                       │    (short_code + referrer_domain)
                       │
                       ├──► Success: New referrer
                       │    • visit_count = 1
                       │    • first_visit = NOW()
                       │    • last_visit = NOW()
                       │
                       └──► Conflict: Existing referrer
                            • visit_count = visit_count + 1
                            • last_visit = NOW()
                            
Result:
referrer_stats table automatically updated
No application code needed!
```

## Connection Pooling

```
┌────────────────────────────────────────────────────┐
│                   Application                       │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ Request 1│  │ Request 2│  │ Request 3│ ...     │
│  └─────┬────┘  └─────┬────┘  └─────┬────┘         │
│        │             │             │               │
│        └─────────────┴─────────────┴─────┐         │
│                                           │         │
│                    ┌──────────────────────▼─────┐  │
│                    │   Connection Pool (pg)      │  │
│                    │                             │  │
│                    │  ┌────┐ ┌────┐ ┌────┐      │  │
│                    │  │Conn│ │Conn│ │Conn│ ...  │  │
│                    │  │ 1  │ │ 2  │ │ 3  │      │  │
│                    │  └────┘ └────┘ └────┘      │  │
│                    │                             │  │
│                    │  Max: 20 connections        │  │
│                    │  Idle timeout: 30s          │  │
│                    │  Connect timeout: 2s        │  │
│                    └──────────────┬──────────────┘  │
│                                   │                 │
└───────────────────────────────────┼─────────────────┘
                                    │
                                    │ Persistent connections
                                    │ Reused across requests
                                    │
                                    ▼
                        ┌─────────────────────┐
                        │   PostgreSQL DB     │
                        └─────────────────────┘
```

## Data Flow: QR Code → Short URL → Analytics

```
Step 1: Create Short URL for QR Code
──────────────────────────────────────
User Action:
  Generate QR code for "https://example.com/product/12345"

App Action:
  POST /api/shorten
  {
    "url": "https://example.com/product/12345",
    "metadata": {
      "qrCode": {
        "color": "#8845ff",
        "size": 256
      },
      "campaign": "product-launch"
    }
  }

Result:
  Short URL: https://jmplnk.uk/prod12
  QR Code generated for short URL


Step 2: User Scans QR Code
──────────────────────────
User Action:
  Scan QR code with mobile phone
  Referer: (none - direct scan)

Request:
  GET /prod12
  User-Agent: Mozilla/5.0 (iPhone; CPU...)
  X-Forwarded-For: 203.0.113.1

Database Records:
  url_visits:
    short_code: 'prod12'
    referrer: null
    referrer_domain: null
    user_agent: 'Mozilla/5.0 (iPhone...'
    ip_address: '203.0.113.1'
    visited_at: '2025-11-29 14:23:45'

Result:
  301 Redirect → https://example.com/product/12345


Step 3: User Shares Link
────────────────────────
User Action:
  Share link on Twitter
  Someone clicks from Twitter feed

Request:
  GET /prod12
  Referer: https://t.co/xyz123
  User-Agent: Mozilla/5.0 (Android...)

Database Records:
  url_visits:
    short_code: 'prod12'
    referrer: 'https://t.co/xyz123'
    referrer_domain: 't.co'
    user_agent: 'Mozilla/5.0 (Android...'
    visited_at: '2025-11-29 15:42:18'

  referrer_stats (auto-updated):
    short_code: 'prod12'
    referrer_domain: 't.co'
    visit_count: 1
    first_visit: '2025-11-29 15:42:18'
    last_visit: '2025-11-29 15:42:18'


Step 4: Analyze Campaign
────────────────────────
User Action:
  GET /api/stats/prod12

Response:
  {
    "stats": {
      "total_visits": 47,
      "unique_visitors": 32,
      "unique_referrers": 5
    },
    "referrers": [
      {"referrer_domain": null, "visit_count": 23},  // Direct (QR scans)
      {"referrer_domain": "t.co", "visit_count": 15},
      {"referrer_domain": "facebook.com", "visit_count": 7},
      {"referrer_domain": "linkedin.com", "visit_count": 2}
    ]
  }

Insights:
  • 23 QR code scans (direct, no referrer)
  • 15 clicks from Twitter
  • 7 clicks from Facebook
  • 2 clicks from LinkedIn
  • Total reach: 47 visits from 32 unique users
```

## Security Architecture

```
┌─────────────────────────────────────────────────────┐
│               Security Layers                        │
│                                                      │
│  1. Input Validation                                 │
│     ├─ URL format validation                         │
│     ├─ Short code regex: ^[a-zA-Z0-9_-]+$           │
│     └─ Length limits                                 │
│                                                      │
│  2. SQL Injection Protection                         │
│     ├─ Parameterized queries                         │
│     ├─ pg library prepared statements                │
│     └─ No string concatenation                       │
│                                                      │
│  3. Connection Pooling                               │
│     ├─ Max 20 connections                            │
│     ├─ Timeout protection                            │
│     └─ Connection reuse                              │
│                                                      │
│  4. Database Constraints                             │
│     ├─ UNIQUE(short_code)                            │
│     ├─ CHECK(short_code format)                      │
│     ├─ FOREIGN KEY cascades                          │
│     └─ NOT NULL on critical fields                   │
│                                                      │
│  5. Network Security                                 │
│     ├─ Internal Docker network                       │
│     ├─ Database not exposed externally               │
│     └─ App communicates via docker network           │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## Performance Optimizations

```
┌──────────────────────────────────────────────────────┐
│              Performance Features                     │
│                                                       │
│  1. Database Indexes                                  │
│     ├─ shortened_urls(short_code) - B-tree            │
│     ├─ url_visits(short_code) - B-tree                │
│     ├─ url_visits(referrer_domain) - B-tree           │
│     ├─ url_visits(visited_at) - B-tree                │
│     └─ referrer_stats(short_code, referrer) - Unique  │
│                                                       │
│  2. Pre-Computed Views                                │
│     ├─ popular_urls (aggregated)                      │
│     ├─ top_referrers (aggregated)                     │
│     └─ url_stats_summary (joined + aggregated)        │
│                                                       │
│  3. Database Triggers                                 │
│     ├─ Auto-update referrer_stats                     │
│     ├─ No application overhead                        │
│     └─ Real-time aggregation                          │
│                                                       │
│  4. Connection Pooling                                │
│     ├─ Reuse connections                              │
│     ├─ Reduce connection overhead                     │
│     └─ Handle concurrent requests                     │
│                                                       │
│  5. Async Operations                                  │
│     ├─ Non-blocking visit recording                   │
│     ├─ Parallel query execution                       │
│     └─ Promise-based API                              │
│                                                       │
└──────────────────────────────────────────────────────┘
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Docker Compose                          │
│                                                             │
│  ┌────────────────────────┐     ┌────────────────────────┐ │
│  │  qrgen Container       │     │  postgres Container    │ │
│  │                        │     │                        │ │
│  │  ┌──────────────────┐  │     │  ┌──────────────────┐ │ │
│  │  │  Express.js      │  │     │  │  PostgreSQL 16   │ │ │
│  │  │  Port: 8080      │  │────►│  │  Port: 5432      │ │ │
│  │  │                  │  │     │  │                  │ │ │
│  │  │  Health: /health │  │     │  │  Health: pg_     │ │ │
│  │  │          200 OK  │  │     │  │    isready       │ │ │
│  │  └──────────────────┘  │     │  └──────────────────┘ │ │
│  │                        │     │                        │ │
│  │  Depends on:           │     │  Volumes:              │ │
│  │  - postgres (healthy)  │     │  - postgres_data:/var  │ │
│  │                        │     │    /lib/postgresql/    │ │
│  │  Env:                  │     │    data (persistent)   │ │
│  │  - DATABASE_URL        │     │  - ./init-db.sql       │ │
│  │  - PORT=8080           │     │    (initialization)    │ │
│  └────────────────────────┘     └────────────────────────┘ │
│                                                             │
│  Network: nginxpm_default (external)                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Port 8080
                            ▼
                ┌───────────────────────┐
                │   Nginx Proxy         │
                │   Manager             │
                │   (nginxpm_default)   │
                └───────────────────────┘
                            │
                            │ HTTPS
                            ▼
                    jmplnk.uk/xyz
```

## Summary

This architecture provides:
- ✅ Scalable URL shortening
- ✅ Comprehensive referrer tracking
- ✅ Real-time analytics
- ✅ High performance (indexes + views)
- ✅ Data integrity (constraints + triggers)
- ✅ Security (parameterized queries)
- ✅ Easy deployment (Docker Compose)
- ✅ Persistent storage (Docker volumes)
