# Website Not Loading - Troubleshooting Guide

## Quick Checks

Run these commands on your Azure VM to diagnose the issue:

### 1. Verify all containers are running
```bash
cd ~/partify-main
docker-compose -f infra/docker/docker-compose.yml ps
```

**Expected output:**
- `docker-postgres-1` - Up (healthy)
- `docker-redis-1` - Up (healthy)
- `docker-backend-1` - Up (healthy)
- `docker-frontend-1` - Up (healthy)

### 2. Test frontend directly
```bash
curl -v http://localhost/
```

Should return HTML content (not error)

### 3. Test backend API
```bash
curl -v http://localhost:8080/health
```

Should return: `{"status":"ok"}` or similar

### 4. Check for errors in logs
```bash
# View all logs
docker-compose -f infra/docker/docker-compose.yml logs

# View specific service
docker-compose -f infra/docker/docker-compose.yml logs backend
docker-compose -f infra/docker/docker-compose.yml logs frontend
```

## Common Issues & Solutions

### Issue 1: Containers not running
```bash
# Check status
docker-compose -f infra/docker/docker-compose.yml ps

# If any container is not running, restart all
docker-compose -f infra/docker/docker-compose.yml down
docker-compose -f infra/docker/docker-compose.yml up -d
```

### Issue 2: Frontend shows blank page
```bash
# Check frontend logs
docker-compose -f infra/docker/docker-compose.yml logs frontend

# Check if backend is accessible from frontend
docker-compose -f infra/docker/docker-compose.yml exec frontend curl http://backend:8080/health
```

**Solutions:**
- Make sure `VITE_API_URL=http://backend:8080` is set in docker-compose.yml
- Check nginx.conf has correct proxy settings
- Verify backend is running and healthy

### Issue 3: Backend not responding
```bash
# Check backend logs
docker-compose -f infra/docker/docker-compose.yml logs backend

# Common backend errors:
# - Database connection error → Check DATABASE_URL in .env
# - Redis connection error → Check REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
# - Missing environment variables → Check .env file exists and has all variables
```

### Issue 4: Database connection errors
```bash
# Verify database is running
docker-compose -f infra/docker/docker-compose.yml exec postgres pg_isready -U postgres

# Test connection from backend container
docker-compose -f infra/docker/docker-compose.yml exec backend psql -h postgres -U postgres -c "SELECT 1"
```

### Issue 5: Website accessible from localhost but not from IP
```bash
# Check CORS_ALLOWED_ORIGINS includes your IP
grep CORS_ALLOWED_ORIGINS .env

# Should include: http://216.73.163.164 and http://216.73.163.164:80

# If not, update .env and restart
docker-compose -f infra/docker/docker-compose.yml down
docker-compose -f infra/docker/docker-compose.yml up -d
```

### Issue 6: Environment variables not loading
```bash
# Verify .env file exists
ls -la .env

# Check file has content
cat .env | head -10

# Verify docker-compose is reading from .env
docker-compose -f infra/docker/docker-compose.yml config | grep SUPABASE_URL
```

## Advanced Diagnostics

### Run diagnostic script
```bash
cd ~/partify-main
bash scripts/diagnostic.sh
```

### Check Docker daemon is running
```bash
systemctl status docker
sudo systemctl start docker  # if not running
```

### Check disk space
```bash
df -h
docker system df
```

### Rebuild from scratch
```bash
# Stop all containers
docker-compose -f infra/docker/docker-compose.yml down -v

# Remove all images
docker image prune -a

# Rebuild
docker-compose -f infra/docker/docker-compose.yml build --no-cache

# Start
docker-compose -f infra/docker/docker-compose.yml up -d

# Check logs
docker-compose -f infra/docker/docker-compose.yml logs -f
```

## Network & Port Checks

### Check if ports are accessible
```bash
# Check if port 80 is listening
sudo netstat -tuln | grep :80

# Check if port 8080 is listening
sudo netstat -tuln | grep :8080

# Test from outside (from your local machine)
curl -v http://216.73.163.164/
curl -v http://216.73.163.164:8080/health
```

### Check Azure VM firewall rules
On Azure Portal:
1. Go to VM → Networking → Network settings
2. Add inbound rules for:
   - Port 80 (HTTP)
   - Port 8080 (Backend API)

## Restart Services

### Restart specific service
```bash
docker-compose -f infra/docker/docker-compose.yml restart backend
docker-compose -f infra/docker/docker-compose.yml restart frontend
```

### Restart all services
```bash
docker-compose -f infra/docker/docker-compose.yml restart
```

### Full restart (clean)
```bash
cd ~/partify-main
docker-compose -f infra/docker/docker-compose.yml down
# (Remove old containers)
docker-compose -f infra/docker/docker-compose.yml up -d
# (Start fresh)
```

## Getting Help

1. **Check logs first:**
   ```bash
   docker-compose -f infra/docker/docker-compose.yml logs -f
   ```

2. **Look for error messages** - they usually indicate the problem

3. **Common error patterns:**
   - `connect ECONNREFUSED` - Service not running or wrong port
   - `ENOTFOUND` - DNS/hostname issue
   - `EACCES` - Permission denied (usually ports < 1024)
   - `Address already in use` - Port conflict, change docker-compose.yml port mapping

4. **Still stuck?** Check:
   - Is `.env` file present? `ls -la .env`
   - Are containers running? `docker-compose -f infra/docker/docker-compose.yml ps`
   - Are services healthy? `docker-compose -f infra/docker/docker-compose.yml ps` (check STATUS column)
