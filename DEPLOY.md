# Deploying JMPLNK.uk

JMPLNK.uk runs on the **network hub** (10.88.0.1) next to dannyarnold.com, and is reached the
same way:

```
visitor ─► Cloudflare :443 ─► can (NPM) ══VPN══► network hub
                                                 └─ jmplnk :8083  ─► postgres (internal only)
```

The hub's firewall only lets port 8083 in over the VPN, so NPM on can is the only way in.
Postgres has no published port at all.

## What it does

- `https://jmplnk.uk/` is the QR code generator (it runs in the browser).
- `https://jmplnk.uk/<code>` sends the visitor on with a **302** redirect that nothing caches,
  so a printed QR code keeps working when you point its link somewhere new.
- Only you can create or change links. Every `/api` call except `/api/info` needs the admin
  token, which is made on the hub and never leaves it.
- A visit records only the time and the referring site's domain. No IP address, user agent or
  full referrer is stored, and visit records are deleted after 90 days
  (`VISIT_RETENTION_DAYS` in `.env`). Expired links are removed daily.
- Any http(s) destination is allowed. To limit it, set for example
  `ALLOWED_HOSTS=dannyarnold.com,*.dannyarnold.com` in the hub's `.env`.

## First-time setup

1. **Deploy** from WinX (Git Bash), with the VPN on:
   ```bash
   ./deploy-jmplnk.sh
   ```
   The first run creates `~/jmplnk/.env` on the hub with a random `POSTGRES_PASSWORD` and
   `ADMIN_TOKEN`. It ends by checking `http://10.88.0.1:8083/health` answers `200`.
2. **Firewall on the hub:** allow 8083 from the VPN only, the same as 8080 to 8082.
3. **Cloudflare DNS** for `jmplnk.uk`: an A record for `jmplnk.uk` pointing at **can's public
   IP**, **Proxied** (orange cloud).
4. **Cloudflare certificate:** in the jmplnk.uk zone, SSL/TLS → Origin Server → Create
   Certificate for `jmplnk.uk, *.jmplnk.uk`. Set SSL/TLS mode to **Full (strict)**.
5. **NPM on can** (http://10.88.0.3:81, over the VPN):
   - SSL Certificates → Add → Custom: paste the jmplnk.uk origin certificate and key.
   - Hosts → Proxy Hosts → Add:
     - Domain names: `jmplnk.uk`
     - Scheme `http`, Forward host `10.88.0.1`, port `8083`
     - Tick **Block Common Exploits**
     - SSL tab: choose the jmplnk.uk certificate, tick **Force SSL**.
     - Optional: since `link.sh` talks to the container over the VPN, the API need not be
       public at all. Advanced tab: `location /api/ { return 404; }`
6. Check:
   ```bash
   ./link.sh add https://dannyarnold.com/scores test
   curl -sI https://jmplnk.uk/test | grep -i -e '^HTTP' -e '^location'
   ./link.sh off test
   ```

## Making links

```bash
./link.sh add https://dannyarnold.com/scores/word-game wordgame   # https://jmplnk.uk/wordgame
./link.sh add https://example.com/some/long/page                  # random 7-character code
./link.sh list
./link.sh move wordgame https://dannyarnold.com/scores            # same QR code, new place
./link.sh off wordgame
./link.sh stats wordgame
```

Then open https://jmplnk.uk/, paste the short link and download the QR code as PNG or SVG.
Codes are 1 to 20 letters, digits, `-` or `_`.

## Updating

Run `./deploy-jmplnk.sh` again. It keeps the hub's `.env` and `data/` (the database).

## Testing locally

```bash
cp .env.example .env    # fill in POSTGRES_PASSWORD and ADMIN_TOKEN (openssl rand -hex 32)
PUBLIC_BASE_URL=http://localhost:8083 docker compose up -d --build
set -a; . ./.env; set +a; TEST_URL=http://localhost:8083 npm test
```
