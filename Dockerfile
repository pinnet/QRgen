# JMPLNK.uk: QR generator and URL shortener
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY package.json server.js db.js ./

# Static files for the QR generator page
COPY index.html index.css app.js qrcode.min.js manifest.json service-worker.js ./public/
COPY icons/*.png ./public/icons/

ENV NODE_ENV=production
ENV PORT=8080

# The node image ships a non-root "node" user
USER node

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget -q --spider http://127.0.0.1:8080/health || exit 1

CMD ["node", "server.js"]
