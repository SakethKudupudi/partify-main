# 🚀 Running React & Node Simultaneously on Azure VM

## Overview

You need to run both backend (Node.js on port 8080) and frontend (React on port 3000) on the same Azure VM. Here are the best approaches:

---

## Method 1: Docker Compose (RECOMMENDED - Simplest)

### Why Docker Compose?
- ✅ Both apps run in isolated containers
- ✅ Automatic restart on failure
- ✅ Easy environment management
- ✅ Single command to start everything
- ✅ Perfect for production

### Setup

**1. SSH into VM**
```bash
ssh -i ~/.ssh/id_rsa azureuser@<PUBLIC_IP>
```

**2. Install Docker**
```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

**3. Copy docker-compose.yml**
```bash
cd /home/azureuser/Partify
# File already exists at: infra/docker/docker-compose.yml
```

**4. Setup environment file**
```bash
# Copy your .env.local to VM
scp -i ~/.ssh/id_rsa .env.local azureuser@<PUBLIC_IP>:/home/azureuser/Partify/

# SSH and verify
ssh azureuser@<PUBLIC_IP>
cd /home/azureuser/Partify
cat .env.local
```

**5. Start all services**
```bash
# Build and start
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

**Access:**
- Frontend: `http://<PUBLIC_IP>:3000`
- Backend: `http://<PUBLIC_IP>:8080`
- API: `http://<PUBLIC_IP>:8080/api`

---

## Method 2: PM2 (Process Manager - Alternative)

### Why PM2?
- ✅ Run multiple Node processes
- ✅ Auto-restart on crash
- ✅ Built-in logs and monitoring
- ✅ No Docker required
- ✅ Good for learning

### Setup

**1. Install Node.js & PM2**
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Enable PM2 auto-start on reboot
pm2 startup
pm2 save
```

**2. Clone and setup project**
```bash
cd /home/azureuser
git clone --branch feature/improvements-sales-search https://github.com/SakethKudupudi/partify-main.git Partify
cd Partify

# Copy environment file
cp .env.local .env.local  # Already have it
```

**3. Install dependencies**
```bash
# Backend
cd backend
npm install

# Frontend
cd ../unified-portal
npm install
npm run build  # Build for production

cd ..
```

**4. Create PM2 ecosystem file**
```bash
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'partify-backend',
      script: './backend/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 8080,
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
        MISTRAL_API_KEY: process.env.MISTRAL_API_KEY,
        REDIS_HOST: process.env.REDIS_HOST,
        REDIS_PORT: process.env.REDIS_PORT
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'partify-frontend',
      script: 'npm',
      args: 'start',
      cwd: './unified-portal',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        VITE_API_URL: 'http://localhost:8080'
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
EOF
```

**5. Start with PM2**
```bash
# Create logs directory
mkdir -p logs

# Start all apps
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs

# Monitor
pm2 monit

# Save startup configuration
pm2 save
```

**Access:**
- Frontend: `http://<PUBLIC_IP>:3000`
- Backend: `http://<PUBLIC_IP>:8080`

---

## Method 3: Systemd Services (Advanced - Production)

### Why Systemd?
- ✅ Native to Linux
- ✅ Auto-restart on failure
- ✅ Resource limits
- ✅ No external process manager needed

### Setup

**1. Create backend service**
```bash
sudo tee /etc/systemd/system/partify-backend.service << 'EOF'
[Unit]
Description=Partify Backend API
After=network.target

[Service]
Type=simple
User=azureuser
WorkingDirectory=/home/azureuser/Partify/backend
ExecStart=/usr/bin/node /home/azureuser/Partify/backend/server.js
Restart=always
RestartSec=10
StandardOutput=append:/var/log/partify-backend.log
StandardError=append:/var/log/partify-backend-error.log
EnvironmentFile=/home/azureuser/Partify/.env.local

[Install]
WantedBy=multi-user.target
EOF
```

**2. Create frontend service**
```bash
sudo tee /etc/systemd/system/partify-frontend.service << 'EOF'
[Unit]
Description=Partify Frontend
After=network.target

[Service]
Type=simple
User=azureuser
WorkingDirectory=/home/azureuser/Partify/unified-portal
ExecStart=/usr/bin/npm run preview
Restart=always
RestartSec=10
StandardOutput=append:/var/log/partify-frontend.log
StandardError=append:/var/log/partify-frontend-error.log
Environment="PORT=3000"
Environment="VITE_API_URL=http://localhost:8080"

[Install]
WantedBy=multi-user.target
EOF
```

**3. Enable and start services**
```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable services
sudo systemctl enable partify-backend.service
sudo systemctl enable partify-frontend.service

# Start services
sudo systemctl start partify-backend.service
sudo systemctl start partify-frontend.service

# Check status
sudo systemctl status partify-backend.service
sudo systemctl status partify-frontend.service

# View logs
sudo journalctl -u partify-backend.service -f
sudo journalctl -u partify-frontend.service -f
```

---

## Method 4: Nginx Reverse Proxy + Docker (BEST FOR PRODUCTION)

### Why This?
- ✅ Professional setup
- ✅ Single domain for both apps
- ✅ Automatic SSL
- ✅ Load balancing ready
- ✅ Production-grade

### Setup

**1. Start Docker containers**
```bash
cd /home/azureuser/Partify
docker-compose up -d
```

**2. Install and configure Nginx**
```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx

# Create Nginx config
sudo tee /etc/nginx/sites-available/partify << 'EOF'
upstream backend {
    server localhost:8080;
}

upstream frontend {
    server localhost:3000;
}

server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # Frontend routes
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API routes
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/partify /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Reload
sudo systemctl reload nginx
```

**3. Setup SSL**
```bash
sudo certbot certonly --nginx -d your-domain.com
```

**4. Access**
- Everything: `https://your-domain.com`
- Frontend: `https://your-domain.com`
- API: `https://your-domain.com/api`

---

## 📊 Comparison Table

| Method | Complexity | Production Ready | Recommended |
|--------|-----------|------------------|-------------|
| **Docker Compose** | Low | ✅ Yes | ✅ Best |
| **PM2** | Medium | ✅ Yes | Good |
| **Systemd** | High | ✅ Yes | Advanced |
| **Nginx + Docker** | Medium | ✅✅ Yes | Enterprise |

---

## Port Configuration

```
┌─ Azure VM
├─ Port 80    → HTTP traffic
├─ Port 443   → HTTPS traffic
├─ Port 8080  → Backend (Node.js)
├─ Port 3000  → Frontend (React)
├─ Port 5432  → PostgreSQL
└─ Port 6379  → Redis
```

---

## Monitoring & Logs

### Docker Compose
```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Check resource usage
docker stats

# View running containers
docker-compose ps
```

### PM2
```bash
# View status
pm2 status

# View logs
pm2 logs

# Monitor real-time
pm2 monit

# Get detailed info
pm2 info partify-backend
pm2 info partify-frontend
```

### Systemd
```bash
# View service status
sudo systemctl status partify-backend
sudo systemctl status partify-frontend

# View logs
sudo journalctl -u partify-backend -f
sudo journalctl -u partify-frontend -f

# View service files
sudo cat /etc/systemd/system/partify-backend.service
```

---

## Environment Variables on VM

**Option 1: In .env.local**
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-key
MISTRAL_API_KEY=your-key
REDIS_HOST=your-redis
REDIS_PORT=6379
PORT=8080
NODE_ENV=production
```

**Option 2: In docker-compose.yml**
```yaml
environment:
  - SUPABASE_URL=${SUPABASE_URL}
  - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
  - MISTRAL_API_KEY=${MISTRAL_API_KEY}
  - REDIS_HOST=${REDIS_HOST}
  - NODE_ENV=production
```

---

## Quick Start Commands

### Docker Compose (Recommended)
```bash
# Clone repo
git clone --branch feature/improvements-sales-search https://github.com/SakethKudupudi/partify-main.git

cd Partify

# Copy env file
scp .env.local azureuser@<VM_IP>:/home/azureuser/Partify/

# SSH to VM
ssh azureuser@<VM_IP>

# Start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### PM2
```bash
# Install
npm install -g pm2

# Start
pm2 start ecosystem.config.js

# Save
pm2 save

# Monitor
pm2 monit
```

### Systemd
```bash
# Create services
sudo systemctl enable partify-backend
sudo systemctl enable partify-frontend

# Start
sudo systemctl start partify-backend
sudo systemctl start partify-frontend

# Check
sudo systemctl status partify-backend
sudo systemctl status partify-frontend
```

---

## Troubleshooting

### Backend not connecting to frontend
```bash
# Check backend is running
curl http://localhost:8080/health

# Check frontend can reach backend
# In browser console:
fetch('http://localhost:8080/health').then(r => r.json()).then(console.log)
```

### High memory usage
```bash
# Check what's using memory
docker stats
ps aux --sort=-%mem

# Increase VM size if needed
az vm resize --resource-group partify-rg --name partify-vm --size Standard_B2ms
```

### Port already in use
```bash
# Find process using port
sudo lsof -i :8080
sudo lsof -i :3000

# Kill process
sudo kill -9 <PID>
```

### Services not auto-starting after reboot
```bash
# Docker Compose
# Add to crontab: @reboot cd /home/azureuser/Partify && docker-compose up -d

# PM2
pm2 startup
pm2 save

# Systemd
sudo systemctl enable partify-backend
sudo systemctl enable partify-frontend
```

---

## Recommended Setup for You

Based on your requirements:

```
Azure VM (B2s or B2ms)
│
├─ Docker Compose (for simplicity)
│   ├─ PostgreSQL (in container)
│   ├─ Redis (in container)
│   ├─ Backend Node.js (port 8080)
│   └─ Frontend React (port 3000)
│
├─ Nginx (reverse proxy & SSL)
│   ├─ Handles HTTPS
│   ├─ Routes /api to backend
│   └─ Serves frontend
│
└─ Auto-restart on failure
```

**Time to deploy: 30 minutes**

---

## Next Steps

1. ✅ Create Azure VM (B2s, Ubuntu 22.04)
2. ✅ Install Docker & Docker Compose
3. ✅ Clone repository
4. ✅ Copy .env.local
5. ✅ Run `docker-compose up -d`
6. ✅ Setup Nginx (optional but recommended)
7. ✅ Configure SSL (if using domain)
8. ✅ Monitor and maintain

---

**Version**: 1.0
**Last Updated**: November 23, 2025
