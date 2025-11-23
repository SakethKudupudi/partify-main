# Docker Deployment Quick Start

## Prerequisites on Azure VM

```bash
# 1. Install Docker and Docker Compose
sudo apt-get update
sudo apt-get install -y docker.io docker-compose

# 2. Add your user to docker group (optional, to avoid sudo)
sudo usermod -aG docker $USER
newgrp docker

# 3. Verify installation
docker --version
docker-compose --version
```

## Setup & Deployment

```bash
# 1. Clone the repository
cd ~
git clone https://github.com/SakethKudupudi/partify-main.git
cd partify-main

# 2. Switch to feature branch with all updates
git checkout feature/improvements-sales-search

# 3. Create .env file from example
cp .env.example .env

# 4. Edit .env with your actual credentials
nano .env
# Add your Supabase URL, API keys, etc.

# 5. Build Docker images (run from project root)
docker-compose -f infra/docker/docker-compose.yml build

# 6. Start all services
docker-compose -f infra/docker/docker-compose.yml up -d

# 7. Verify all services are running
docker-compose -f infra/docker/docker-compose.yml ps
```

## Expected Output

```
NAME                        COMMAND                  SERVICE      STATUS      PORTS
partify-frontend-1          "nginx -g 'daemon off"   frontend     Up (healthy) 0.0.0.0:80->80/tcp
partify-backend-1           "node server.js"         backend      Up (healthy) 0.0.0.0:8080->8080/tcp
partify-redis-1             "redis-server"           redis        Up (healthy) 0.0.0.0:6379->6379/tcp
partify-postgres-1          "postgres"               postgres     Up (healthy) 0.0.0.0:5432->5432/tcp
```

## Access the Application

- **Frontend**: `http://<your-vm-ip>/`
- **Backend API**: `http://<your-vm-ip>:8080`
- **PostgreSQL**: `localhost:5432`
- **Redis**: `localhost:6379`

## Common Commands

```bash
# View logs
docker-compose -f infra/docker/docker-compose.yml logs -f

# View specific service logs
docker-compose -f infra/docker/docker-compose.yml logs -f backend

# Stop all services
docker-compose -f infra/docker/docker-compose.yml down

# Rebuild after code changes
docker-compose -f infra/docker/docker-compose.yml build --no-cache
docker-compose -f infra/docker/docker-compose.yml up -d

# Remove all Docker images and volumes
docker-compose -f infra/docker/docker-compose.yml down -v
```

## Troubleshooting

### Services not starting?
```bash
# Check health status
docker-compose -f infra/docker/docker-compose.yml ps

# View detailed logs
docker-compose -f infra/docker/docker-compose.yml logs
```

### Missing environment variables?
```bash
# Verify .env file exists in project root
ls -la .env

# Check if variables are loaded
docker-compose -f infra/docker/docker-compose.yml config | grep SUPABASE
```

### Port already in use?
```bash
# Change ports in docker-compose.yml, e.g., 8080:8080 → 8081:8080
# Or stop conflicting services first
sudo lsof -i :80  # Find what's using port 80
```

### Rebuild images after pulling updates
```bash
# Pull latest changes
git pull origin feature/improvements-sales-search

# Rebuild without cache
docker-compose -f infra/docker/docker-compose.yml build --no-cache
```

## Alternative: Set Docker Compose Alias (Optional)

Add to your `~/.bashrc` or `~/.zshrc`:

```bash
alias dc='docker-compose -f infra/docker/docker-compose.yml'
```

Then use simpler commands:
```bash
dc build
dc up -d
dc logs -f
dc down
```

## Next Steps

1. Get your VM's public IP: `curl ifconfig.me`
2. Configure DNS or use IP directly
3. Set up SSL/HTTPS with Let's Encrypt (optional)
4. Monitor application at `http://<your-vm-ip>`
