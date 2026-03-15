# Peace Power Quick Deployment to VPS

## TL;DR - Fast Setup

### 1. SSH to VPS and Clone
```bash
ssh user@your-vps-ip
cd /opt && sudo git clone <repo> peace-power && cd peace-power
sudo chown -R $USER:$USER .
```

### 2. Install & Build (5 mins)
```bash
pnpm install
pnpm build
```

### 3. PostgreSQL Setup (2 mins)
```bash
sudo -u postgres psql -c "CREATE DATABASE peace_power;"
sudo -u postgres psql -c "CREATE USER peace_user WITH PASSWORD 'your-pw';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE peace_power TO peace_user;"
```

### 4. Nginx Config (1 min)
```bash
sudo tee /etc/nginx/sites-available/peacepower.yourdomain.com > /dev/null << 'NGINX'
server {
  listen 80;
  server_name peacepower.yourdomain.com;
  return 301 https://$server_name$request_uri;
}

server {
  listen 443 ssl http2;
  server_name peacepower.yourdomain.com;

  ssl_certificate /etc/letsencrypt/live/peacepower.yourdomain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/peacepower.yourdomain.com/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;

  location / {
    root /opt/peace-power/artifacts/peace-power/dist/public;
    try_files $uri $uri/ /index.html;
    add_header Cache-Control "public, max-age=3600";
  }

  location /service-worker.js {
    root /opt/peace-power/artifacts/peace-power/dist/public;
    add_header Cache-Control "no-cache, no-store, must-revalidate";
  }

  location /api/ {
    proxy_pass http://localhost:8080/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
NGINX
sudo ln -s /etc/nginx/sites-available/peacepower.yourdomain.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
```

### 5. SSL Cert
```bash
sudo certbot --nginx -d peacepower.yourdomain.com
```

### 6. API Service
```bash
sudo tee /etc/systemd/system/peace-power-api.service > /dev/null << 'SERVICE'
[Unit]
Description=Peace Power API
After=network.target postgresql.service

[Service]
Type=simple
User=nobody
WorkingDirectory=/opt/peace-power
Environment="NODE_ENV=production"
Environment="DATABASE_URL=postgresql://peace_user:your-pw@localhost:5432/peace_power"
Environment="PORT=8080"
Environment="BASE_PATH=/"
ExecStart=/usr/local/bin/pnpm --filter @workspace/api-server run dev
Restart=always

[Install]
WantedBy=multi-user.target
SERVICE
sudo systemctl daemon-reload
sudo systemctl enable peace-power-api
sudo systemctl start peace-power-api
```

## Done! Your app is live at https://peacepower.yourdomain.com

### Mobile Installation
- **Android**: Open in Chrome → Install from address bar
- **iOS**: Share → Add to Home Screen

---

## Full Setup Guide
See `DEPLOYMENT_GUIDE.md` for detailed instructions, troubleshooting, and production checklist.
