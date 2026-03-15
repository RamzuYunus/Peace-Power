# Peace Power Deployment Guide

## Overview

Peace Power is a Progressive Web App (PWA) that can be deployed to your Ubuntu 24 VPS with Nginx and Let's Encrypt SSL.

## Architecture

- **Frontend**: React + Vite (builds to static HTML/CSS/JS)
- **Backend API**: Express.js (Node.js)
- **Database**: PostgreSQL
- **Hosting**: Nginx reverse proxy + Node.js app server
- **SSL**: Let's Encrypt via Certbot

## Prerequisites

On your Ubuntu 24 VPS:
- Node.js 24+ and pnpm
- PostgreSQL 15+
- Nginx
- Certbot (for SSL)
- A domain name (e.g., `peacepower.yourdomain.com`)

## Step 1: Prepare the VPS

```bash
# SSH into your VPS
ssh user@your-vps-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y curl git nginx certbot python3-certbot-nginx postgresql postgresql-contrib build-essential

# Install Node.js 24
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
sudo npm install -g pnpm

# Verify installations
node --version
npm --version
pnpm --version
psql --version
```

## Step 2: Clone and Setup the Repository

```bash
# Clone your Peace Power repository (adjust URL as needed)
cd /opt
sudo git clone <your-repo-url> peace-power
sudo chown -R $USER:$USER peace-power
cd peace-power

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials and domain

# Create .env files for artifacts
echo "DATABASE_URL=postgresql://user:password@localhost:5432/peace_power" > artifacts/api-server/.env
echo "NODE_ENV=production" >> artifacts/api-server/.env
```

## Step 3: Set Up PostgreSQL

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE peace_power;
CREATE USER peace_user WITH PASSWORD 'your-secure-password';
ALTER ROLE peace_user SET client_encoding TO 'utf8';
ALTER ROLE peace_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE peace_user SET default_transaction_deferrable TO off;
ALTER ROLE peace_user SET default_transaction_read_only TO off;
ALTER ROLE peace_user SET search_path TO 'public';
GRANT ALL PRIVILEGES ON DATABASE peace_power TO peace_user;

# Exit psql
\q

# Run migrations (if using Drizzle)
cd /opt/peace-power
pnpm --filter @workspace/db run migrate
```

## Step 4: Build the Application

```bash
cd /opt/peace-power

# Build frontend
pnpm --filter @workspace/peace-power run build

# Output will be in: artifacts/peace-power/dist/public/

# Build backend is ready as-is (Express)
```

## Step 5: Set Up Nginx

Create `/etc/nginx/sites-available/peace-power`:

```nginx
server {
    listen 80;
    server_name peacepower.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name peacepower.yourdomain.com;

    # SSL certificate paths (will be set by Certbot)
    ssl_certificate /etc/letsencrypt/live/peacepower.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/peacepower.yourdomain.com/privkey.pem;

    # SSL best practices
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend: Serve static files with caching
    location / {
        root /opt/peace-power/artifacts/peace-power/dist/public;
        try_files $uri $uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public, max-age=3600";
    }

    # Service worker: Don't cache
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

    # API proxy to backend
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
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/peace-power /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Step 6: Obtain SSL Certificate

```bash
sudo certbot --nginx -d peacepower.yourdomain.com

# Certbot will auto-update the Nginx config
```

## Step 7: Set Up Systemd Service for API Server

Create `/etc/systemd/system/peace-power-api.service`:

```ini
[Unit]
Description=Peace Power API Server
After=network.target postgresql.service

[Service]
Type=simple
User=nobody
WorkingDirectory=/opt/peace-power
Environment="NODE_ENV=production"
Environment="DATABASE_URL=postgresql://peace_user:your-password@localhost:5432/peace_power"
Environment="PORT=8080"
Environment="BASE_PATH=/"
ExecStart=/usr/local/bin/pnpm --filter @workspace/api-server run dev
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable peace-power-api
sudo systemctl start peace-power-api
sudo systemctl status peace-power-api
```

## Step 8: PWA Installation

Once deployed, users can:

1. **On mobile (iOS/Android)**: 
   - Open `peacepower.yourdomain.com` in their mobile browser
   - Tap the share button and select "Add to Home Screen"
   - The app will install as a native-looking PWA

2. **On desktop (Windows/Mac)**:
   - Chrome/Edge will show an install prompt in the address bar
   - Click to install

## Monitoring and Maintenance

```bash
# Check API logs
sudo journalctl -u peace-power-api -f

# Database backup
sudo -u postgres pg_dump peace_power > /backup/peace_power_$(date +%Y%m%d).sql

# Update SSL certificates (auto-renewal via cron)
sudo certbot renew --dry-run
```

## Custom Domain Setup

Once you have this deployed, you can:
1. Update your DNS records to point `peacepower.yourdomain.com` to your VPS IP
2. Update the manifest.json start_url if deploying to a subdirectory
3. Restart the Nginx and API services

## Production Checklist

- [ ] Environment variables securely set
- [ ] Database backups configured
- [ ] SSL certificate auto-renewal verified
- [ ] API server running via systemd
- [ ] Nginx serving frontend with proper caching
- [ ] PWA manifest loaded correctly
- [ ] Service worker registered
- [ ] Domain DNS pointing to VPS
- [ ] Firewall allows ports 80/443
- [ ] PostgreSQL backups automated

## Troubleshooting

**API not responding**: Check `sudo journalctl -u peace-power-api -f`
**Nginx not proxying**: Verify port 8080 is open and API is running
**SSL certificate issues**: Check `sudo certbot renew --dry-run`
**PWA not installing**: Verify `/manifest.json` and `/service-worker.js` are accessible
