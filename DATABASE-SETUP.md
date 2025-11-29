# Database Setup Guide

## PostgreSQL Database for URL Shortening

QR Gen now includes a PostgreSQL database for URL shortening with HTTP referrer tracking.

## Quick Start

### Using Docker Compose (Recommended)

The database is automatically set up when you run:

```bash
docker-compose up -d
```

This will:
1. Create a PostgreSQL 16 container
2. Initialize the database with tables, views, and functions
3. Create a persistent volume for data storage
4. Connect the QR Gen app to the database

### Configuration

**Default Credentials** (⚠️ CHANGE IN PRODUCTION):
- Database: `qrgen`
- User: `qrgen_user`
- Password: `qrgen_secure_password_change_me`
- Port: `5432` (internal to Docker network)

**Environment Variables:**
```bash
DATABASE_URL=postgresql://qrgen_user:qrgen_secure_password_change_me@postgres:5432/qrgen
```

## Database Schema

### Tables

1. **shortened_urls** - URL mappings
   - `short_code` (unique) - The short identifier
   - `original_url` - Destination URL
   - `expires_at` - Optional expiration
   - `metadata` - JSON data (QR settings, campaigns, etc.)

2. **url_visits** - Visit tracking
   - `short_code` - Reference to URL
   - `referrer` - Full HTTP Referer header
   - `referrer_domain` - Extracted domain
   - `user_agent`, `ip_address` - Visitor info
   - `visited_at` - Timestamp

3. **referrer_stats** - Aggregated stats
   - Auto-updated via database trigger
   - Groups visits by referrer domain
   - Tracks visit count and date range

### Views

- **popular_urls** - URLs ranked by visits
- **top_referrers** - Top referring domains
- **url_stats_summary** - Comprehensive statistics

### Functions

- `update_referrer_stats()` - Trigger function for stats
- `cleanup_expired_urls()` - Remove expired URLs

## Manual Setup (Without Docker)

### 1. Install PostgreSQL

**Windows:**
```powershell
winget install PostgreSQL.PostgreSQL
```

**Linux:**
```bash
sudo apt-get install postgresql-16
```

### 2. Create Database

```bash
psql -U postgres
```

```sql
CREATE DATABASE qrgen;
CREATE USER qrgen_user WITH PASSWORD 'qrgen_secure_password_change_me';
GRANT ALL PRIVILEGES ON DATABASE qrgen TO qrgen_user;
```

### 3. Initialize Schema

```bash
psql -U qrgen_user -d qrgen -f init-db.sql
```

### 4. Configure Application

Set environment variable:
```bash
export DATABASE_URL="postgresql://qrgen_user:qrgen_secure_password_change_me@localhost:5432/qrgen"
```

## Verification

### Test Database Connection

```bash
curl http://localhost:8080/health
```

Should return:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-11-29T12:00:00Z",
  "uptime": 123.45
}
```

### Create Test Short URL

```bash
curl -X POST http://localhost:8080/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/test"}'
```

### Query Database Directly

```bash
docker exec -it qrgen-postgres psql -U qrgen_user -d qrgen
```

```sql
-- List all shortened URLs
SELECT short_code, original_url, created_at FROM shortened_urls;

-- View visit statistics
SELECT * FROM popular_urls;

-- Top referrers
SELECT * FROM top_referrers LIMIT 10;

-- Recent visits
SELECT short_code, referrer_domain, visited_at 
FROM url_visits 
ORDER BY visited_at DESC 
LIMIT 20;
```

## Backup and Restore

### Backup Database

```bash
docker exec qrgen-postgres pg_dump -U qrgen_user qrgen > backup.sql
```

### Restore Database

```bash
docker exec -i qrgen-postgres psql -U qrgen_user -d qrgen < backup.sql
```

### Backup with Docker Volume

The data is persisted in a Docker volume `qrgen_postgres_data`. To backup:

```bash
docker run --rm \
  -v qrgen_postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres-backup.tar.gz /data
```

## Maintenance

### Clean Up Expired URLs

Run periodically to remove expired short URLs:

```sql
SELECT cleanup_expired_urls();
```

### View Database Size

```sql
SELECT pg_size_pretty(pg_database_size('qrgen'));
```

### Analyze Query Performance

```sql
EXPLAIN ANALYZE 
SELECT * FROM url_visits 
WHERE short_code = 'abc123';
```

## Monitoring

### Check Active Connections

```sql
SELECT count(*) FROM pg_stat_activity 
WHERE datname = 'qrgen';
```

### View Slow Queries

```sql
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

### Database Health

```bash
docker exec qrgen-postgres pg_isready -U qrgen_user -d qrgen
```

## Security

### Production Checklist

- [ ] Change default password in `docker-compose.yml`
- [ ] Update `DATABASE_URL` environment variable
- [ ] Enable SSL connections
- [ ] Restrict network access to database
- [ ] Set up regular backups
- [ ] Enable query logging for auditing
- [ ] Implement connection pooling limits
- [ ] Set up monitoring and alerts

### Update Password

1. Edit `docker-compose.yml`:
```yaml
environment:
  - POSTGRES_PASSWORD=new_secure_password
```

2. Update application:
```yaml
environment:
  - DATABASE_URL=postgresql://qrgen_user:new_secure_password@postgres:5432/qrgen
```

3. Restart containers:
```bash
docker-compose down
docker-compose up -d
```

## Troubleshooting

### Connection Refused

**Problem:** App can't connect to database

**Solution:**
1. Check if PostgreSQL container is running:
   ```bash
   docker-compose ps
   ```
2. Verify health check:
   ```bash
   docker-compose logs postgres
   ```
3. Test connection:
   ```bash
   docker exec qrgen-postgres pg_isready
   ```

### Database Not Initialized

**Problem:** Tables don't exist

**Solution:**
1. Check if init script ran:
   ```bash
   docker-compose logs postgres | grep "init-db.sql"
   ```
2. Manually run initialization:
   ```bash
   docker exec -i qrgen-postgres psql -U qrgen_user -d qrgen < init-db.sql
   ```

### Out of Disk Space

**Problem:** Database volume full

**Solution:**
1. Check volume usage:
   ```bash
   docker system df -v
   ```
2. Clean up old data:
   ```sql
   DELETE FROM url_visits WHERE visited_at < NOW() - INTERVAL '90 days';
   ```
3. Vacuum database:
   ```sql
   VACUUM FULL;
   ```

## Performance Tuning

### Optimize for High Traffic

Edit `docker-compose.yml`:

```yaml
postgres:
  command: >
    postgres
    -c shared_buffers=256MB
    -c max_connections=200
    -c work_mem=4MB
    -c maintenance_work_mem=64MB
    -c effective_cache_size=1GB
```

### Index Optimization

```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;

-- Rebuild indexes
REINDEX DATABASE qrgen;
```

## API Integration

See [API-DOCS.md](./API-DOCS.md) for complete API documentation.

**Quick Example:**
```javascript
// Create short URL
const response = await fetch('/api/shorten', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'https://example.com/page' })
});
const data = await response.json();
console.log('Short URL:', data.shortUrl);
```

## Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [pg npm package](https://node-postgres.com/)
- [Docker PostgreSQL Image](https://hub.docker.com/_/postgres)
