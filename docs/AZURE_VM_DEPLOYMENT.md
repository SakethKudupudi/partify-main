# 🖥️ Azure VM Deployment Guide for Partify

## Overview

You can deploy Partify to an Azure Virtual Machine (VM) using Docker containers. This approach gives you full control and flexibility while being cost-effective.

## Prerequisites

### 1. Azure Account & Resources
- Azure subscription active
- Azure CLI installed (`az login` ready)
- Target region decided

### 2. Machine Requirements
```
Minimum VM Specs:
├── Compute: B2s (2 vCPU, 4GB RAM) - ~$50/month
├── OS: Ubuntu 22.04 LTS
├── Storage: 50GB (OS + containers)
└── Network: Allow ports 80, 443, 8080, 3000, 5432, 6379

Recommended VM Specs:
├── Compute: B2ms (2 vCPU, 8GB RAM) - ~$70/month
├── OS: Ubuntu 22.04 LTS
├── Storage: 100GB (headroom for logs/data)
└── Network: Same as above
```

### 3. Local Requirements
- Docker installed
- Docker Compose installed
- Git installed

---

## Step 1: Create Azure VM

### Option A: Using Azure CLI

```bash
# Set variables
RESOURCE_GROUP="partify-rg"
VM_NAME="partify-vm"
REGION="eastus"
IMAGE="UbuntuLTS"
SIZE="Standard_B2s"

# Create resource group (if not exists)
az group create \
  --name $RESOURCE_GROUP \
  --location $REGION

# Create VM
az vm create \
  --resource-group $RESOURCE_GROUP \
  --name $VM_NAME \
  --image $IMAGE \
  --size $SIZE \
  --admin-username azureuser \
  --generate-ssh-keys \
  --public-ip-sku Standard \
  --output json

# Save the public IP
PUBLIC_IP=$(az vm show \
  --resource-group $RESOURCE_GROUP \
  --name $VM_NAME \
  --show-details \
  --query publicIps \
  --output tsv)

echo "VM IP: $PUBLIC_IP"
```

### Option B: Using Azure Portal
1. Search for "Virtual machines"
2. Click "+ Create" → "Azure virtual machine"
3. Configure:
   - **Resource Group**: partify-rg (create new)
   - **VM Name**: partify-vm
   - **Region**: eastus
   - **Image**: Ubuntu 22.04 LTS
   - **Size**: Standard_B2s
   - **Authentication**: SSH public key
4. Click "Review + create" → "Create"

---

## Step 2: Configure Network Security

### Open Required Ports

```bash
RESOURCE_GROUP="partify-rg"
VM_NAME="partify-vm"

# Create or get existing NSG
NSG_NAME="${VM_NAME}-nsg"

az network nsg create \
  --resource-group $RESOURCE_GROUP \
  --name $NSG_NAME

# Allow SSH
az network nsg rule create \
  --resource-group $RESOURCE_GROUP \
  --nsg-name $NSG_NAME \
  --name allow-ssh \
  --priority 1000 \
  --source-address-prefixes '*' \
  --source-port-ranges '*' \
  --destination-address-prefixes '*' \
  --destination-port-ranges 22 \
  --access Allow \
  --protocol Tcp

# Allow HTTP
az network nsg rule create \
  --resource-group $RESOURCE_GROUP \
  --nsg-name $NSG_NAME \
  --name allow-http \
  --priority 1001 \
  --source-address-prefixes '*' \
  --source-port-ranges '*' \
  --destination-address-prefixes '*' \
  --destination-port-ranges 80 \
  --access Allow \
  --protocol Tcp

# Allow HTTPS
az network nsg rule create \
  --resource-group $RESOURCE_GROUP \
  --nsg-name $NSG_NAME \
  --name allow-https \
  --priority 1002 \
  --source-address-prefixes '*' \
  --source-port-ranges '*' \
  --destination-address-prefixes '*' \
  --destination-port-ranges 443 \
  --access Allow \
  --protocol Tcp

# Allow Backend (8080)
az network nsg rule create \
  --resource-group $RESOURCE_GROUP \
  --nsg-name $NSG_NAME \
  --name allow-backend \
  --priority 1003 \
  --source-address-prefixes '*' \
  --source-port-ranges '*' \
  --destination-address-prefixes '*' \
  --destination-port-ranges 8080 \
  --access Allow \
  --protocol Tcp

# Allow Frontend (3000)
az network nsg rule create \
  --resource-group $RESOURCE_GROUP \
  --nsg-name $NSG_NAME \
  --name allow-frontend \
  --priority 1004 \
  --source-address-prefixes '*' \
  --source-port-ranges '*' \
  --destination-address-prefixes '*' \
  --destination-port-ranges 3000 \
  --access Allow \
  --protocol Tcp
```

**Ports Summary:**
| Port | Service | Access |
|------|---------|--------|
| 22 | SSH | Restricted (management) |
| 80 | HTTP | Public |
| 443 | HTTPS | Public |
| 8080 | Backend API | Public |
| 3000 | Frontend | Public |
| 5432 | PostgreSQL | Internal only |
| 6379 | Redis | Internal only |

---

## Step 3: Connect to VM & Install Prerequisites

### Connect via SSH

```bash
# Get VM details
RESOURCE_GROUP="partify-rg"
VM_NAME="partify-vm"

az vm show \
  --resource-group $RESOURCE_GROUP \
  --name $VM_NAME \
  --show-details

# Connect (replace with your public IP)
ssh -i ~/.ssh/id_rsa azureuser@<PUBLIC_IP>
```

### Install Docker & Docker Compose

```bash
# Update system
sudo apt-get update
sudo apt-get upgrade -y

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

# Verify Docker works
docker run hello-world
```

### Install Git & Node.js (optional, for logs/debugging)

```bash
sudo apt-get install -y git nodejs npm
```

---

## Step 4: Deploy Application

### Clone Repository

```bash
cd /home/azureuser
git clone https://github.com/SakethKudupudi/Partify.git
cd Partify
git checkout feature/improvements-sales-search
```

### Setup Environment Variables

```bash
# Copy existing .env.local or create new
cat > .env.local << 'EOF'
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

# Mistral API
MISTRAL_API_KEY=your-mistral-key

# JWT Secret (generate secure random string)
JWT_SECRET=your-super-secret-jwt-token-at-least-32-chars-long

# Optional: Redis (used if running externally)
REDIS_URL=redis://localhost:6379

# Node Environment
NODE_ENV=production
EOF

# Verify the file was created
cat .env.local
```

**Generate JWT Secret:**
```bash
openssl rand -base64 32
```

### Deploy Using Docker Compose

```bash
# Navigate to project
cd /home/azureuser/Partify

# Build images
docker-compose build

# Start services (detached mode)
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## Step 5: Configure Nginx Reverse Proxy (Optional but Recommended)

Nginx acts as a reverse proxy, handling SSL, load balancing, and request routing.

### Install Nginx

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx

# Enable nginx to start on boot
sudo systemctl enable nginx
sudo systemctl start nginx
```

### Configure Nginx

```bash
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

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL certificates (using Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

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
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/partify /etc/nginx/sites-enabled/partify

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Setup SSL Certificate (Let's Encrypt)

```bash
# Replace with your domain
sudo certbot certonly --nginx -d your-domain.com

# Auto-renew certificates
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

## Step 6: Monitor & Manage

### Check Service Status

```bash
# Docker services
docker-compose ps

# Check logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
docker-compose logs -f redis

# Check Nginx
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Resource Monitoring

```bash
# Install htop
sudo apt-get install -y htop

# Monitor system resources
htop

# Docker stats
docker stats
```

### Backup Database

```bash
# Backup PostgreSQL
docker-compose exec postgres pg_dump -U postgres partify_db > backup.sql

# Restore from backup
docker-compose exec -T postgres psql -U postgres partify_db < backup.sql
```

---

## Step 7: Setup Auto-Start on VM Reboot

### Create Systemd Service

```bash
sudo tee /etc/systemd/system/partify.service << 'EOF'
[Unit]
Description=Partify Application
Requires=docker.service
After=docker.service

[Service]
Type=simple
WorkingDirectory=/home/azureuser/Partify
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
sudo systemctl enable partify
sudo systemctl start partify

# Check status
sudo systemctl status partify
```

---

## Cost Comparison

### VM Deployment
```
Azure VM B2s:           ~$50/month
Storage (50GB):         ~$2/month
Bandwidth (if needed):  ~$5-10/month
──────────────────────
Total:                  ~$60/month
```

### App Service Deployment (Alternative)
```
App Service Plan B1:    ~$65/month
Database (PostgreSQL):  ~$15/month
Cache (Redis):          ~$15/month
──────────────────────
Total:                  ~$95/month
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs backend

# Verify environment variables
docker-compose config

# Test connection to Supabase
curl https://your-project.supabase.co

# Check disk space
df -h
```

### High Memory Usage

```bash
# Check which container is using memory
docker stats

# Increase VM memory and resize
az vm resize --resource-group partify-rg --name partify-vm --size Standard_B2ms
```

### Database Connection Issues

```bash
# Test PostgreSQL connection
docker-compose exec postgres psql -U postgres -d partify_db -c "SELECT 1;"

# Check Redis
docker-compose exec redis redis-cli ping

# Verify network connectivity
docker network inspect partify_default
```

### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Renew manually
sudo certbot renew --dry-run

# Check Nginx config
sudo nginx -t
```

---

## Scaling the VM

### Vertical Scaling (Increase Resources)

```bash
# Stop VM
az vm deallocate \
  --resource-group partify-rg \
  --name partify-vm

# Resize
az vm resize \
  --resource-group partify-rg \
  --name partify-vm \
  --size Standard_B2ms

# Start VM
az vm start \
  --resource-group partify-rg \
  --name partify-vm

# Reconnect and restart containers
ssh azureuser@<PUBLIC_IP>
docker-compose up -d
```

### Horizontal Scaling (Multiple VMs)

1. Create additional VMs (VM2, VM3, etc.)
2. Deploy application on each
3. Setup Azure Load Balancer
4. Point domain to load balancer

---

## Maintenance & Updates

### Update Application

```bash
cd /home/azureuser/Partify
git pull origin feature/improvements-sales-search

# Rebuild and restart
docker-compose up -d --build
```

### Update Containers

```bash
# Pull latest images
docker-compose pull

# Restart with new images
docker-compose up -d
```

### System Updates

```bash
sudo apt-get update
sudo apt-get upgrade -y

# Reboot if needed
sudo reboot
```

---

## Migration from Local to VM

### Option 1: Docker Compose (Recommended)

```bash
# Local machine
docker-compose up -d

# On VM
git clone <repo>
cd Partify
docker-compose up -d
```

### Option 2: Manual Migration

1. Backup local database
2. SCP files to VM
3. Install dependencies
4. Start services

---

## Next Steps

1. ✅ Create Azure VM
2. ✅ Install Docker & prerequisites
3. ✅ Clone repository
4. ✅ Configure environment
5. ✅ Run docker-compose
6. ✅ Setup Nginx (optional)
7. ✅ Configure SSL
8. ✅ Monitor & maintain

---

## Quick Commands Reference

```bash
# View logs
docker-compose logs -f

# Check status
docker-compose ps

# Stop all services
docker-compose down

# Restart services
docker-compose restart

# Execute command in container
docker-compose exec backend npm start

# View system resources
docker stats

# Check VM status
az vm get-instance-view \
  --resource-group partify-rg \
  --name partify-vm
```

---

## Support & Documentation

- Azure VM Docs: https://learn.microsoft.com/azure/virtual-machines/
- Docker Compose: https://docs.docker.com/compose/
- Nginx: https://nginx.org/en/docs/
- Let's Encrypt: https://letsencrypt.org/

---

**Version**: 1.0
**Last Updated**: November 23, 2025
