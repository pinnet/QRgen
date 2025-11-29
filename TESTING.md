# URL Shortening Test Suite

## Overview

Comprehensive automated test suite for the URL shortening service with HTTP referrer tracking.

## Test Coverage

The test suite includes **12 comprehensive tests**:

### 1. Health Check ✓
- Verifies `/health` endpoint responds
- Checks database connectivity
- Validates response structure

### 2. Create Short URL ✓
- Tests POST `/api/shorten` endpoint
- Verifies custom short code creation
- Validates metadata storage
- Checks response format

### 3. Auto-Generated Code ✓
- Tests short code auto-generation
- Validates generated code format
- Ensures uniqueness

### 4. Invalid URL Validation ✓
- Tests URL format validation
- Verifies 400 error response
- Checks error messages

### 5. Duplicate Short Code ✓
- Tests duplicate code prevention
- Verifies unique constraint
- Validates error handling

### 6. Redirect and Visit Tracking ✓
- Tests GET `/:shortCode` redirect
- Verifies 301 redirect response
- Validates referrer tracking
- Checks user agent recording

### 7. Get Statistics ✓
- Tests GET `/api/stats/:shortCode`
- Verifies visit counts
- Validates referrer breakdown
- Checks data aggregation

### 8. Non-Existent Short Code ✓
- Tests 404 error handling
- Verifies graceful failure
- Validates error messages

### 9. Get Popular URLs ✓
- Tests GET `/api/urls/popular`
- Verifies sorting by visits
- Validates limit parameter
- Checks data structure

### 10. Get Top Referrers ✓
- Tests GET `/api/referrers/top`
- Verifies referrer aggregation
- Validates sorting
- Checks visit counts

### 11. Deactivate Short URL ✓
- Tests DELETE `/api/shorten/:shortCode`
- Verifies deactivation works
- Validates redirect stops working

### 12. API Info ✓
- Tests GET `/api/info`
- Verifies feature list
- Validates version info

## Running Tests

### Prerequisites

The server must be running with database connection:

```bash
# Start with Docker Compose (recommended)
docker-compose up -d

# Or start locally with PostgreSQL
node server.js
```

### Run Tests

```bash
# Test against localhost (default)
npm test

# Test against localhost explicitly
npm run test:local

# Test against production
npm run test:prod

# Custom URL
TEST_URL=http://your-server:8080 node test-url-shortening.js
```

### Expected Output

```
╔═══════════════════════════════════════════════╗
║  URL Shortening Service - Test Suite         ║
╚═══════════════════════════════════════════════╝

Target: http://localhost:8080
Started: 2025-11-29T12:00:00.000Z

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Test 1: Health Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Health endpoint returns 200 OK
✓ Health status is healthy
✓ Database is connected
✓ Uptime is a number
✓ Timestamp is present
  Status: healthy
  Database: connected
  Uptime: 123.45s

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Test 2: Create Short URL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Create endpoint returns 200 OK
✓ Response indicates success
✓ Short code matches request
✓ Original URL matches request
✓ Short URL contains code
✓ Created timestamp is present
  Short Code: test1732886400000
  Short URL: http://localhost:8080/test1732886400000
  Original URL: https://example.com/test-page-1732886400000

... (continues for all tests)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Test Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Passed: 65
Failed: 0
Total: 65
Success Rate: 100.0%

✓ All tests passed!

Testing against: http://localhost:8080
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Test Structure

### Each Test Includes:
- **Section Header**: Clear test description
- **Assertions**: Multiple checks per test
- **Visual Feedback**: ✓ for pass, ✗ for fail
- **Debug Info**: Gray text showing actual values
- **Error Handling**: Graceful failure with messages

### Color Coding:
- 🟢 **Green** - Passed tests
- 🔴 **Red** - Failed tests
- 🔵 **Cyan** - Section headers
- ⚪ **Gray** - Debug information
- 🟡 **Yellow** - Warnings

## Exit Codes

- `0` - All tests passed
- `1` - One or more tests failed

Perfect for CI/CD integration:
```bash
npm test && echo "Deploy!" || echo "Tests failed!"
```

## Test Isolation

Each test run:
- Creates unique short codes using timestamps
- Cleans up by deactivating test URLs
- Doesn't interfere with production data
- Can run multiple times safely

## Debugging Failed Tests

If a test fails:

1. **Check Server Logs**
   ```bash
   docker-compose logs qrgen
   ```

2. **Check Database Connection**
   ```bash
   curl http://localhost:8080/health
   ```

3. **Verify Database State**
   ```bash
   docker exec -it qrgen-postgres psql -U qrgen_user -d qrgen
   \dt  -- List tables
   SELECT * FROM shortened_urls ORDER BY created_at DESC LIMIT 5;
   ```

4. **Run Single Test**
   Edit `test-url-shortening.js` and comment out other tests

## Continuous Integration

### GitHub Actions Example

```yaml
name: Test URL Shortening
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: qrgen
          POSTGRES_USER: qrgen_user
          POSTGRES_PASSWORD: test_password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - run: npm install
      - run: npm test
```

## Manual Testing Examples

### Create Short URL
```bash
curl -X POST http://localhost:8080/api/shorten \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/page",
    "shortCode": "mycode"
  }'
```

### Test Redirect
```bash
curl -I http://localhost:8080/mycode
```

### Get Statistics
```bash
curl http://localhost:8080/api/stats/mycode
```

### Test with Referrer
```bash
curl -L http://localhost:8080/mycode \
  -H "Referer: https://google.com/search"
```

## Performance Testing

For load testing, use tools like:

```bash
# Apache Bench
ab -n 1000 -c 10 http://localhost:8080/api/urls/popular

# Artillery
artillery quick --count 100 --num 10 http://localhost:8080/mycode
```

## Test Data Cleanup

To clean up test data:

```sql
-- Delete test short codes
DELETE FROM shortened_urls 
WHERE short_code LIKE 'test%' 
AND created_at < NOW() - INTERVAL '1 day';

-- View test statistics
SELECT COUNT(*) FROM shortened_urls WHERE short_code LIKE 'test%';
SELECT COUNT(*) FROM url_visits WHERE short_code LIKE 'test%';
```

## Extending Tests

To add new tests:

1. Create a new async function:
```javascript
async function testNewFeature() {
  section('Test XX: New Feature');
  
  try {
    const res = await request('GET', '/api/endpoint');
    assert(res.status === 200, 'Test description');
    console.log(`${colors.gray}  Info: ${res.body.info}${colors.reset}`);
  } catch (error) {
    assert(false, `Test failed: ${error.message}`);
  }
}
```

2. Add to test runner:
```javascript
await testNewFeature();
```

## Troubleshooting

### "Connection refused" error
- Server isn't running
- Wrong URL/port
- Docker containers not started

**Fix:**
```bash
docker-compose up -d
# or
node server.js
```

### "Database disconnected" error
- PostgreSQL not running
- Wrong DATABASE_URL
- Network issue

**Fix:**
```bash
docker-compose restart postgres
docker-compose logs postgres
```

### Tests timeout
- Server overloaded
- Database slow
- Network latency

**Fix:** Increase timeout in test code

### All tests fail
- Check health endpoint first:
```bash
curl http://localhost:8080/health
```

## Best Practices

1. **Run tests before deployment**
   ```bash
   npm test && ./deploy.ps1
   ```

2. **Test locally first**
   ```bash
   npm run test:local
   ```

3. **Then test production**
   ```bash
   npm run test:prod
   ```

4. **Check exit code in scripts**
   ```bash
   npm test
   if [ $? -eq 0 ]; then
     echo "Tests passed!"
   else
     echo "Tests failed!"
     exit 1
   fi
   ```

## Test Results Archive

Consider saving test results:

```bash
npm test > test-results-$(date +%Y%m%d-%H%M%S).log
```

## Summary

This test suite provides:
- ✅ Complete API coverage
- ✅ Automated validation
- ✅ Clear visual feedback
- ✅ CI/CD ready
- ✅ Production safe
- ✅ Easy to extend
- ✅ Comprehensive assertions
- ✅ Debug information
