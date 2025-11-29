# Quick Test Reference

## Run Tests

```bash
# Local testing (default: http://localhost:8080)
npm test

# Test specific environment
npm run test:local   # http://localhost:8080
npm run test:prod    # https://jmplnk.uk

# Custom URL
TEST_URL=http://custom:8080 npm test
```

## Expected Results

### ✅ All Tests Pass (with PostgreSQL running)
```
Passed: 65
Failed: 0
Success Rate: 100.0%
✓ All tests passed!
```

### ❌ Without Database
```
Passed: 14
Failed: 31
Success Rate: 31.1%
✗ Some tests failed
(Only validation/info tests pass)
```

## Quick Manual Tests

### 1. Create Short URL
```bash
curl -X POST http://localhost:8080/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","shortCode":"test123"}'
```

### 2. Test Redirect
```bash
curl -I http://localhost:8080/test123
# Should return: 301 Redirect
```

### 3. Get Stats
```bash
curl http://localhost:8080/api/stats/test123
```

### 4. With Referrer
```bash
curl -L http://localhost:8080/test123 \
  -H "Referer: https://google.com/search"
```

## Test Checklist

Before deployment:
- [ ] Run `npm test` - all pass
- [ ] Check health: `curl http://localhost:8080/health`
- [ ] Verify database: `"database": "connected"`
- [ ] Test redirect: `curl -I http://localhost:8080/:code`
- [ ] Check stats: `curl http://localhost:8080/api/stats/:code`

## CI/CD Integration

```yaml
# GitHub Actions
- run: npm install
- run: npm test
- run: ./deploy.ps1
  if: success()
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Connection refused | Start server: `node server.js` |
| Database disconnected | Start PostgreSQL: `docker-compose up -d` |
| Tests timeout | Check server logs |
| All tests fail | Verify: `curl http://localhost:8080/health` |

## Test Output Meanings

- 🟢 `✓` Green - Test passed
- 🔴 `✗` Red - Test failed
- Gray text - Debug information
- Exit code 0 - Success
- Exit code 1 - Failure

## Production Testing

```bash
# Before deployment
npm run test:local

# After deployment
npm run test:prod

# Verify in production
curl https://jmplnk.uk/health
curl https://jmplnk.uk/api/info
```

## Test Coverage Summary

| Endpoint | Tests |
|----------|-------|
| Health | ✓ |
| Create URL (POST) | ✓✓ |
| Redirect (GET) | ✓ |
| Stats (GET) | ✓ |
| Popular URLs | ✓ |
| Top Referrers | ✓ |
| Deactivate | ✓ |
| Validation | ✓✓✓ |

**Total: 12 tests, 65+ assertions**
