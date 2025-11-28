# Use nginx alpine for a lightweight web server
FROM nginx:alpine

# Set working directory
WORKDIR /usr/share/nginx/html

# Copy all application files to nginx html directory
COPY index.html .
COPY index.css .
COPY app.js .
COPY qrcode.min.js .
COPY manifest.json .
COPY service-worker.js .

# Optional: Add custom nginx config for better caching and security
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    # Security headers \
    add_header X-Frame-Options "SAMEORIGIN" always; \
    add_header X-Content-Type-Options "nosniff" always; \
    add_header X-XSS-Protection "1; mode=block" always; \
    add_header Referrer-Policy "no-referrer-when-downgrade" always; \
    \
    # Cache static assets \
    location ~* \.(js|css)$ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
    \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
