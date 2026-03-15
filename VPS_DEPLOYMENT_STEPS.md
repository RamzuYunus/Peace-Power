# Peace Power VPS Deployment - Step by Step

## Pre-Deployment Checklist
- [ ] Ubuntu 24 VPS ready
- [ ] Custom domain purchased (e.g., peacepower.yourdomain.com)
- [ ] SSH access to VPS
- [ ] Root or sudo access on VPS

## Complete Deployment Guide

### Phase 1: Server Preparation (10 minutes)

```bash
# SSH into your VPS
ssh user@your-vps-ip

# Update system packages
sudo apt update && sudo apt upgrade -y

# Install required software
sudo apt install -y \
  curl \
  git \
  build-essential \
  nginx \
  postgresql \
  postgresql-contrib \
  certbot \
  python3-certbot-nginx

# Install Node.js 24
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm (faster than npm)
sudo npm install -g pnpm

# Verify all installations
node --version
npm --version
pnpm --version
psql --version
nginx -v
```

### Phase 2: Database Setup (5 minutes)

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Inside psql:
CREATE DATABASE peace_power;
CREATE USER peace_user WITH PASSWORD 'your-secure-password-here';
ALTER ROLE peace_user SET client_encoding TO 'utf8';
ALTER ROLE peace_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE peace_user SET default_transaction_deferrable TO off;
ALTER ROLE peace_user SET default_transaction_read_only TO off;
ALTER ROLE peace_user SET search_path TO 'public';
GRANT ALL PRIVILEGES ON DATABASE peace_power TO peace_user;

# Exit psql
\q

# Test connection
psql -U peace_user -d peace_power -h localhost -W
# (Enter password to verify)
```

### Phase 3: Application Deployment (10 minutes)

```bash
# Clone your Peace Power repository
cd /opt
sudo git clone <your-git-repo-url> peace-power
cd peace-power
sudo chown -R $USER:$USER .

# Install dependencies
pnpm install

# Build the application
pnpm build

# Output will be in: artifacts/peace-power/dist/public/
# API server is in: artifacts/api-server/
```

### Phase 4: Web Server Configuration (5 minutes)

```bash
# Create Nginx configuration
sudo tee /etc/nginx/sites-available/peacepower.yourdomain.com > /dev/null << 'NGINX_CONF'
# HTTP → HTTPS redirect
server {
    listen 80;
    server_name peacepower.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name peacepower.yourdomain.com;

    # SSL certificates (Certbot will update these paths)
    ssl_certificate /etc/letsencrypt/live/peacepower.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/peacepower.yourdomain.com/privkey.pem;

    # SSL best practices
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Frontend: Serve static files
    location / {
        root /opt/peace-power/artifacts/peace-power/dist/public;
        try_files $uri $uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public, max-age=3600";
    }

    # Service Worker: Don't cache
    location /service-worker.js {
        root /opt/peace-power/artifacts/peace-power/dist/public;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # Manifest: Don't cache
    location /manifest.json {
        root /opt/peace-power/artifacts/peace-power/dist/public;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # API proxy to Express backend
    location /api/ {
        proxy_pass http://localhost:8080/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts for long connections (camera scanning)
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:8080/health;
        access_log off;
    }
}
NGINX_CONF

# Enable the site
sudo ln -s /etc/nginx/sites-available/peacepower.yourdomain.com /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### Phase 5: SSL Certificate (5 minutes)

```bash
# Get free SSL certificate from Let's Encrypt
sudo certbot --nginx -d peacepower.yourdomain.com

# Follow the prompts to register your email
# Certbot will automatically update the Nginx config

# Set up automatic renewal
sudo certbot renew --dry-run
sudo systemctl enable certbot.timer
```

### Phase 6: Create Systemd Service for API

```bash
# Create the service file
sudo tee /etc/systemd/system/peace-power-api.service > /dev/null << 'SERVICE_CONF'
[Unit]
Description=Peace Power API Server
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=nobody
WorkingDirectory=/opt/peace-power
Environment="NODE_ENV=production"
Environment="DATABASE_URL=postgresql://peace_user:your-secure-password-here@localhost:5432/peace_power"
Environment="PORT=8080"
Environment="BASE_PATH=/"
ExecStart=/usr/local/bin/pnpm --filter @workspace/api-server run dev
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SERVICE_CONF

# Reload systemd and enable the service
sudo systemctl daemon-reload
sudo systemctl enable peace-power-api
sudo systemctl start peace-power-api

# Verify it's running
sudo systemctl status peace-power-api
```

### Phase 7: Verify Everything Works

```bash
# Check API is responding
curl http://localhost:8080/health

# Check Nginx is proxying
curl -I https://peacepower.yourdomain.com/

# Check database connection
psql -U peace_user -d peace_power -h localhost -c "SELECT version();"

# Monitor API logs
sudo journalctl -u peace-power-api -f
```

## PWA Installation (User Facing)

Once deployed, users can install as app:

### Android (Chrome)
1. Open https://peacepower.yourdomain.com
2. Chrome shows "Install app" prompt in address bar
3. Tap to install on home screen

### iOS (Safari)
1. Open https://peacepower.yourdomain.com in Safari
2. Tap Share button → "Add to Home Screen"
3. Tap "Add" to confirm

### Desktop (Chrome/Edge)
1. Visit https://peacepower.yourdomain.com
2. Click the install icon in the address bar
3. Confirm to install as desktop app

## Maintenance & Monitoring

### Daily Monitoring
```bash
# Check API is running
systemctl status peace-power-api

# View recent errors
sudo journalctl -u peace-power-api -n 50

# Monitor system resources
htop
```

### Database Backups
```bash
# Manual backup
sudo -u postgres pg_dump peace_power > /backup/peace_power_$(date +%Y%m%d_%H%M%S).sql

# Automated daily backup (add to crontab)
# 0 2 * * * sudo -u postgres pg_dump peace_power > /backup/peace_power_$(date +\%Y\%m\%d).sql
```

### Update Application
```bash
cd /opt/peace-power
git pull origin main
pnpm install
pnpm build
sudo systemctl restart peace-power-api
sudo systemctl restart nginx
```

### Renew SSL Certificate
```bash
# Certbot auto-renews via systemd timer
# Manual renewal if needed:
sudo certbot renew --force-renewal
```

## Production Checklist

- [x] Node.js 24 installed
- [x] PostgreSQL running
- [x] Nginx configured as reverse proxy
- [x] SSL certificate installed (Let's Encrypt)
- [x] API service running via systemd
- [x] Frontend assets served with caching
- [x] Service worker & manifest accessible
- [x] PWA ready for installation
- [x] Database credentials configured securely
- [x] Logs configured for monitoring
- [x] Firewall allows 80/443
- [x] Domain DNS points to VPS IP

## Troubleshooting

**API not responding?**
```bash
sudo systemctl status peace-power-api
sudo journalctl -u peace-power-api -n 100
```

**Database connection failed?**
```bash
psql -U peace_user -d peace_power -h localhost -c "SELECT 1;"
# Check DATABASE_URL in /etc/systemd/system/peace-power-api.service
```

**Nginx not proxying to API?**
```bash
curl -v http://localhost:8080/api/auth/me
# Check Nginx logs: sudo tail -50 /var/log/nginx/error.log
```

**PWA not installing?**
- Verify HTTPS is working: curl https://peacepower.yourdomain.com
- Check manifest.json is served: curl https://peacepower.yourdomain.com/manifest.json
- Check service-worker.js exists
- Clear browser cache and retry

**SSL certificate issues?**
```bash
sudo certbot renew --dry-run
sudo certbot certificates
```

## Next Steps

1. Point your domain DNS A record to your VPS IP
2. Wait for DNS propagation (usually 5-30 minutes)
3. Test at https://peacepower.yourdomain.com
4. Share the link with users to install the PWA
5. Monitor logs for any issues

## Support

For more information, see:
- DEPLOYMENT_GUIDE.md (detailed reference)
- PWA_SETUP.md (PWA configuration)
- QUICK_DEPLOY.md (minimal quick setup)
