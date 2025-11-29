# Authentication & Dashboard Setup

## Overview

JmpLnk now includes a complete user authentication system with JWT tokens and a user dashboard.

## Features

- **Email/Password Authentication**: Traditional login with secure password hashing
- **Google OAuth Integration**: One-click login with Google accounts
- **JWT Token Authentication**: Secure, stateless authentication using JSON Web Tokens
- **User Dashboard**: Personalized dashboard with link management and analytics
- **Protected Routes**: API endpoints secured with JWT middleware

## Files Added

### Frontend
- `dashboard.html` - User dashboard with stats and link management
- `dashboard.css` - Dashboard styles
- `login.html` - Updated with OAuth and email/password login

### Backend
- `auth.js` - Authentication module with JWT implementation
- Server routes:
  - `POST /api/auth/login` - Email/password login
  - `POST /api/auth/register` - User registration
  - `POST /api/auth/google` - Google OAuth callback
  - `GET /api/user/stats` - User statistics (protected)
  - `GET /api/user/links` - User links (protected)
  - `GET /dashboard` - Dashboard page

## Setup Instructions

### 1. Environment Variables

Add to your `.env` file or environment:

```bash
JWT_SECRET=your-strong-secret-key-here-change-in-production
```

**Important**: Change the JWT secret in production!

### 2. Google OAuth Setup

To enable Google OAuth:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized JavaScript origins: `https://jmplnk.uk`, `http://localhost:8080`
   - Authorized redirect URIs: (leave empty for client-side flow)
5. Copy the Client ID
6. Update `login.html` line 8 and line 166:
   ```html
   <meta name="google-signin-client_id" content="YOUR_CLIENT_ID.apps.googleusercontent.com">
   ```
   ```javascript
   client_id: 'YOUR_CLIENT_ID.apps.googleusercontent.com',
   ```

### 3. Demo Account

A demo account is automatically created:
- **Email**: `demo@jmplnk.uk`
- **Password**: `demo123`

## Usage

### Authentication Flow

1. User visits `/login`
2. Logs in with email/password or Google OAuth
3. Server validates credentials and returns JWT token
4. Frontend stores token in `localStorage`
5. Token is sent with all API requests in `Authorization: Bearer <token>` header
6. Protected routes verify token before serving content

### Dashboard Features

- **Stats Overview**: Total links, visits, active links, average clicks
- **Quick Actions**: Shortcuts to create links, view stats, generate QR codes
- **Recent Links**: Table of user's shortened URLs with actions
- **Account Info**: User details, plan type, API token access

### API Token Usage

Users can copy their JWT token from the dashboard to use with API requests:

```bash
curl -H "Authorization: Bearer <token>" https://jmplnk.uk/api/user/stats
```

## Security Notes

### Current Implementation (Demo/Development)

⚠️ **For demonstration purposes only. NOT production-ready!**

- Simple JWT implementation (use `jsonwebtoken` library in production)
- SHA-256 password hashing (use `bcrypt` or `argon2` in production)
- In-memory user storage (use PostgreSQL in production)
- Google OAuth credential verification skipped (verify in production)

### Production Recommendations

1. **JWT Library**: Replace custom JWT with `jsonwebtoken` npm package
2. **Password Hashing**: Use `bcrypt` with proper salt rounds
3. **Database**: Store users in PostgreSQL with proper schema
4. **OAuth Verification**: Verify Google JWT tokens server-side
5. **HTTPS Only**: Enforce HTTPS for all authentication endpoints
6. **Rate Limiting**: Add rate limiting to prevent brute force attacks
7. **Refresh Tokens**: Implement refresh token rotation
8. **Session Management**: Add session invalidation and logout tracking

### Example Production Implementation

```javascript
// Install: npm install jsonwebtoken bcrypt google-auth-library

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { OAuth2Client } = require('google-auth-library');

// Password hashing
const hashedPassword = await bcrypt.hash(password, 10);
const isValid = await bcrypt.compare(password, hashedPassword);

// JWT tokens
const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
const decoded = jwt.verify(token, process.env.JWT_SECRET);

// Google OAuth verification
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const ticket = await client.verifyIdToken({
  idToken: credential,
  audience: process.env.GOOGLE_CLIENT_ID
});
const payload = ticket.getPayload();
```

## Database Schema (Future)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  name VARCHAR(255),
  plan VARCHAR(50) DEFAULT 'FREE',
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

CREATE TABLE user_links (
  user_id UUID REFERENCES users(id),
  short_code VARCHAR(10) REFERENCES urls(short_code),
  PRIMARY KEY (user_id, short_code)
);
```

## Testing

Test the authentication flow:

```bash
# Register new user
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test User"}'

# Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Access protected route
curl http://localhost:8080/api/user/stats \
  -H "Authorization: Bearer <token>"
```

## Troubleshooting

**Token expired**: Tokens expire after 7 days. User must login again.

**Google OAuth not loading**: Check Client ID is correct and domain is authorized.

**401 Unauthorized**: Verify token is sent in Authorization header as `Bearer <token>`.

**CORS errors**: Ensure your domain is in the CSP headers in `server.js`.

## Next Steps

- [ ] Integrate user authentication with URL shortening
- [ ] Add user_id column to urls table
- [ ] Implement custom short codes for PRO users
- [ ] Add link expiration and password protection
- [ ] Create admin panel for user management
- [ ] Add email verification
- [ ] Implement password reset flow
- [ ] Add two-factor authentication (2FA)
