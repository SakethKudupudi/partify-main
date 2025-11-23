# 🚀 Complete Azure VM Setup Guide for Partify

## Prerequisites Check

✅ You have:
- Azure VM created (Ubuntu 22.04)
- Application cloned: `/home/azureuser/Partify`
- `.env.local` file with credentials ready
- SSH access to VM

---

## Step 1: Connect to VM

```bash
# From your local machine
ssh -i ~/.ssh/id_rsa azureuser@<PUBLIC_IP>

# Verify you're in the right directory
cd /home/azureuser/Partify
ls -la
```

**Expected output:**
```
drwxr-xr-x  backend/
drwxr-xr-x  unified-portal/
drwxr-xr-x  database/
drwxr-xr-x  docs/
drwxr-xr-x  infra/
-rw-r--r--  .env.local
-rw-r--r--  README.md
```

---

## Step 2: Install Prerequisites

### Update System
```bash
sudo apt-get update
sudo apt-get upgrade -y
```

### Install Docker & Docker Compose
```bash
# Install Docker
sudo apt-get install -y docker.io

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installations
docker --version
docker-compose --version

# Add current user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Test Docker
docker run hello-world
```

**Expected output:**
```
Docker version 24.x.x
Docker Compose version v2.20.2
Hello from Docker!
```

### Install Git & Node.js (Optional - for debugging)
```bash
sudo apt-get install -y git nodejs npm
```

---

## Step 3: Verify .env.local File

```bash
# Check if .env.local exists
cd /home/azureuser/Partify
cat .env.local
```

**Expected variables to be present:**
```
✅ SUPABASE_URL=https://xxx.supabase.co
✅ SUPABASE_SERVICE_ROLE_KEY=eyJ...
✅ MISTRAL_API_KEY=Zd...
✅ REDIS_HOST=xxx.redis.cache.windows.net
✅ REDIS_PORT=6380
✅ REDIS_PASSWORD=xxx
✅ REDIS_USE_TLS=true
✅ AZURE_STORAGE_ACCOUNT_NAME=xxx
✅ AZURE_STORAGE_ACCOUNT_KEY=xxx
✅ PORT=8080
✅ NODE_ENV=development
✅ CORS_ALLOWED_ORIGINS=http://localhost:3000
```

---

## Step 4: Configure Docker Compose

### Update docker-compose.yml (if needed)

```bash
# View current configuration
cat infra/docker/docker-compose.yml
```

### Edit for Azure VM

```bash
# Edit the file
nano infra/docker/docker-compose.yml
```

**Make these changes:**

Find the backend service section and update:
```yaml
backend:
  build:
    context: .
    dockerfile: Dockerfile.backend
  ports:
    - "8080:8080"
  environment:
    NODE_ENV: production  # Change from development
    SUPABASE_URL: ${SUPABASE_URL}
    SUPABASE_SERVICE_KEY: ${SUPABASE_SERVICE_KEY}
    MISTRAL_API_KEY: ${MISTRAL_API_KEY}
    JWT_SECRET: ${JWT_SECRET}
    REDIS_HOST: ${REDIS_HOST}
    REDIS_PORT: ${REDIS_PORT}
    REDIS_PASSWORD: ${REDIS_PASSWORD}
    REDIS_USE_TLS: ${REDIS_USE_TLS}
    CORS_ALLOWED_ORIGINS: http://<PUBLIC_IP>:3000
```

Find the frontend service section:
```yaml
frontend:
  build:
    context: .
    dockerfile: Dockerfile.frontend
  ports:
    - "3000:80"  # Changed from 3000:3000
  environment:
    VITE_API_URL: http://<PUBLIC_IP>:8080
```

---

## Step 5: Build Docker Images

```bash
# Navigate to docker directory
cd /home/azureuser/Partify/infra/docker

# Build both images
docker-compose build

# This may take 5-10 minutes
# Expected output: Successfully tagged partify-backend:latest
#                  Successfully tagged partify-frontend:latest
```

**Check if build was successful:**
```bash
docker images | grep partify
```

**Expected output:**
```
partify-backend    latest    xxxxx    5 seconds ago    150MB
partify-frontend   latest    xxxxx    10 seconds ago   50MB
```

---

## Step 6: Start Services

### Option A: Docker Compose (Recommended)

```bash
# Navigate to docker directory
cd /home/azureuser/Partify/infra/docker

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop (if needed)
docker-compose down
```

**Expected output after `docker-compose ps`:**
```
NAME              COMMAND                  SERVICE      STATUS      PORTS
postgres          "docker-entrypoint..."   postgres     Up 2 mins   5432/tcp
redis             "redis-server"           redis        Up 2 mins   6379/tcp
backend           "node server.js"         backend      Up 1 min    0.0.0.0:8080->8080/tcp
frontend          "nginx -g daemon ..."    frontend     Up 1 min    0.0.0.0:3000->80/tcp
```

### Option B: Individual Commands

```bash
# Just backend
docker run -d -p 8080:8080 --env-file .env.local --name partify-backend partify-backend

# Just frontend
docker run -d -p 3000:80 --env-file .env.local --name partify-frontend partify-frontend
```

---

## Step 7: Verify Services are Running

### Check Container Status
```bash
docker ps
```

### Test Backend
```bash
# From VM
curl http://localhost:8080/health

# From your local machine
curl http://<PUBLIC_IP>:8080/health

# Expected response:
# {"status":"OK","timestamp":"2025-11-23T..."}
```

### Test Frontend
```bash
# From your local machine
open http://<PUBLIC_IP>:3000
# or
curl http://<PUBLIC_IP>:3000
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres

# Exit logs: Ctrl+C
```

---

## Step 8: Configure Network Security (Azure Portal)

### Open Ports in Azure Network Security Group

1. Go to Azure Portal → Resource Groups → partify-rg
2. Find your VM
3. Click "Networking" on left sidebar
4. Click "Add inbound port rule"

**Add these rules:**

| Priority | Source | Port | Protocol | Access | Name |
|----------|--------|------|----------|--------|------|
| 1000 | Any | 80 | TCP | Allow | HTTP |
| 1001 | Any | 443 | TCP | Allow | HTTPS |
| 1002 | Any | 3000 | TCP | Allow | Frontend |
| 1003 | Any | 8080 | TCP | Allow | Backend |

**Or use CLI:**
```bash
# Get your resource group and VM name
RESOURCE_GROUP="partify-rg"
VM_NAME="partify-vm"
NSG_NAME="${VM_NAME}-nsg"

# Allow port 3000
az network nsg rule create \
  --resource-group $RESOURCE_GROUP \
  --nsg-name $NSG_NAME \
  --name allow-frontend \
  --priority 1000 \
  --destination-port-ranges 3000 \
  --access Allow \
  --protocol Tcp

# Allow port 8080
az network nsg rule create \
  --resource-group $RESOURCE_GROUP \
  --nsg-name $NSG_NAME \
  --name allow-backend \
  --priority 1001 \
  --destination-port-ranges 8080 \
  --access Allow \
  --protocol Tcp
```

---

## Step 9: Access Your Application

### From Browser

```
Frontend:  http://<PUBLIC_IP>:3000
Backend:   http://<PUBLIC_IP>:8080/api
Health:    http://<PUBLIC_IP>:8080/health
```

### Login with Test Credentials

```
Admin:
  Email: admin@test.com
  Password: admin123

Vendor:
  Email: vendor@test.com
  Password: vendor123

Customer:
  Email: customer@test.com
  Password: customer123
```

---

## Step 10: Setup Auto-Start on Reboot

### Option A: Systemd Service (Recommended)

```bash
sudo tee /etc/systemd/system/partify.service << 'EOF'
[Unit]
Description=Partify Application (Docker Compose)
Requires=docker.service
After=docker.service

[Service]
Type=simple
WorkingDirectory=/home/azureuser/Partify/infra/docker
ExecStart=/usr/local/bin/docker-compose up
ExecStop=/usr/local/bin/docker-compose down
Restart=always
RestartSec=10
User=azureuser

[Install]
WantedBy=multi-user.target
EOF

# Enable service
sudo systemctl daemon-reload
sudo systemctl enable partify.service
sudo systemctl start partify.service

# Check status
sudo systemctl status partify.service

# View logs
sudo journalctl -u partify.service -f
```

### Option B: Cron Job

```bash
# Edit crontab
crontab -e

# Add this line at the end
@reboot cd /home/azureuser/Partify/infra/docker && docker-compose up -d

# Save and exit
```

---

## Step 11: Setup Nginx Reverse Proxy (Optional but Recommended)

### Install Nginx

```bash
sudo apt-get install -y nginx

# Enable Nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### Configure Nginx

```bash
sudo tee /etc/nginx/sites-available/partify << 'EOF'
upstream backend {
    server localhost:8080;
}

upstream frontend {
    server localhost:3000;
}

server {
    listen 80;
    server_name _;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check
    location /health {
        proxy_pass http://backend;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/partify /etc/nginx/sites-enabled/

# Remove default
sudo rm /etc/nginx/sites-enabled/default

# Test config
sudo nginx -t

# Reload
sudo systemctl reload nginx
```

**Now access everything via port 80:**
```
Frontend:  http://<PUBLIC_IP>/
Backend:   http://<PUBLIC_IP>/api
Health:    http://<PUBLIC_IP>/health
```

---

## Step 12: Monitor & Maintain

### Check Service Status

```bash
# Docker status
docker-compose ps

# Container logs
docker-compose logs -f

# Resource usage
docker stats

# Nginx status
sudo systemctl status nginx
```

### View Logs

```bash
# Backend logs
docker-compose logs -f backend

# Frontend logs
docker-compose logs -f frontend

# Database logs
docker-compose logs -f postgres

# Redis logs
docker-compose logs -f redis

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
docker-compose restart frontend

# Full restart
docker-compose down
docker-compose up -d
```

### Update Application

```bash
# Pull latest changes
cd /home/azureuser/Partify
git pull origin feature/improvements-sales-search

# Rebuild and restart
docker-compose up -d --build

# Check status
docker-compose ps
```

---

## Troubleshooting

### Backend not starting

```bash
# View logs
docker-compose logs backend

# Common issues:
# 1. Missing .env.local variables
# 2. Supabase connection failed
# 3. Redis connection failed
# 4. Port 8080 already in use

# Check if port is in use
sudo lsof -i :8080

# Kill process using port
sudo kill -9 <PID>
```

### Frontend not loading

```bash
# View logs
docker-compose logs frontend

# Check if port 3000 is in use
sudo lsof -i :3000

# Rebuild frontend
docker-compose up -d --build frontend
```

### Can't access from browser

```bash
# Check if containers are running
docker ps

# Check if ports are open in Azure NSG
az network nsg rule list --resource-group partify-rg --nsg-name partify-vm-nsg

# Test locally
curl http://localhost:3000
curl http://localhost:8080/health

# Check firewall on VM
sudo ufw status
```

### Database connection failed

```bash
# Check PostgreSQL
docker-compose exec postgres psql -U postgres -d postgres -c "SELECT 1;"

# Check Redis
docker-compose exec redis redis-cli ping

# View PostgreSQL logs
docker-compose logs postgres
```

### High memory usage

```bash
# Check which container is using memory
docker stats

# Check VM resources
free -h
df -h

# Resize VM if needed
az vm deallocate --resource-group partify-rg --name partify-vm
az vm resize --resource-group partify-rg --name partify-vm --size Standard_B2ms
az vm start --resource-group partify-rg --name partify-vm
```

---

## Quick Reference Commands

```bash
# Navigate to project
cd /home/azureuser/Partify

# Start services
docker-compose up -d

# Stop services
docker-compose down

# View status
docker-compose ps

# View logs
docker-compose logs -f

# Rebuild images
docker-compose up -d --build

# SSH to container
docker-compose exec backend bash

# View environment
docker-compose config

# Prune unused containers
docker system prune -a

# Remove all containers
docker-compose down -v

# Restart VM
sudo reboot
```

---

## Accessing Your Application

### URLs

| Service | URL |
|---------|-----|
| Frontend | http://<PUBLIC_IP>:3000 |
| Backend | http://<PUBLIC_IP>:8080 |
| API Health | http://<PUBLIC_IP>:8080/health |
| Admin Dashboard | http://<PUBLIC_IP>:3000/admin |
| Vendor Portal | http://<PUBLIC_IP>:3000/vendor |
| Customer Store | http://<PUBLIC_IP>:3000/ |

### Features Available

✅ Admin Dashboard with Sales Analytics
✅ Vendor Inventory Management
✅ Customer Store & Shopping Cart
✅ AI Search (Q&A Database)
✅ Order Management
✅ Real-time Updates

---

## Next Steps

1. ✅ SSH to VM
2. ✅ Install Docker
3. ✅ Verify .env.local
4. ✅ Build images
5. ✅ Start services
6. ✅ Verify running
7. ✅ Open firewall ports
8. ✅ Access application
9. ✅ Setup auto-start
10. ✅ Monitor & maintain

---

## Support & Documentation

- Full guides: Check `docs/` directory in project
- Azure VM Guide: `docs/AZURE_VM_DEPLOYMENT.md`
- Docker Setup: `docs/RUN_REACT_NODE_SIMULTANEOUSLY.md`
- Architecture: `docs/ARCHITECTURE.md`

---

**Version**: 1.0
**Last Updated**: November 23, 2025
**Status**: Production Ready
