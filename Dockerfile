# Multi-stage build for Node.js web server
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --only=production && npm cache clean --force

# Production stage
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy dependencies from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application files
COPY package*.json ./
COPY server.js ./
COPY db.js ./
COPY init-db.sql ./
COPY test-url-shortening.js ./

# Create public directory and copy static files
RUN mkdir -p public/icons
COPY index.html ./public/
COPY index.css ./public/
COPY app.js ./public/
COPY qrcode.min.js ./public/
COPY manifest.json ./public/
COPY service-worker.js ./public/
COPY icons/*.png ./public/icons/

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://127.0.0.1:8080/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

# Start the server
CMD ["node", "server.js"]
