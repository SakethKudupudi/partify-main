#!/bin/bash

# Partify Docker Deployment Diagnostics
# Run this on the Azure VM to check application status

echo "========================================="
echo "Partify Docker Deployment Diagnostics"
echo "========================================="
echo ""

# 1. Check Docker containers
echo "[1] Checking Docker Containers..."
echo "---"
docker-compose -f infra/docker/docker-compose.yml ps
echo ""

# 2. Check if services are healthy
echo "[2] Checking Service Health..."
echo "---"
echo "Frontend Health Check:"
curl -s http://localhost/health || echo "❌ Frontend not responding"
echo ""
echo "Backend Health Check:"
curl -s http://localhost:8080/health || echo "❌ Backend not responding"
echo ""

# 3. Check logs
echo "[3] Last 20 lines of Backend Logs..."
echo "---"
docker-compose -f infra/docker/docker-compose.yml logs --tail=20 backend
echo ""

echo "[4] Last 20 lines of Frontend Logs..."
echo "---"
docker-compose -f infra/docker/docker-compose.yml logs --tail=20 frontend
echo ""

# 4. Check environment variables
echo "[5] Environment Variables Status..."
echo "---"
if [ -f .env ]; then
    echo "✅ .env file exists"
    echo "Number of variables: $(grep -c '=' .env)"
else
    echo "❌ .env file NOT FOUND"
fi
echo ""

# 5. Network connectivity
echo "[6] Network Connectivity..."
echo "---"
echo "Checking database connectivity..."
docker-compose -f infra/docker/docker-compose.yml exec -T postgres pg_isready -U postgres || echo "❌ Database not ready"
echo ""
echo "Checking Redis connectivity..."
docker-compose -f infra/docker/docker-compose.yml exec -T redis redis-cli ping || echo "❌ Redis not ready"
echo ""

# 6. Port availability
echo "[7] Port Availability..."
echo "---"
netstat -tuln 2>/dev/null | grep -E ":(80|8080|5432|6379)" || echo "Ports not in use (this might be normal in some environments)"
echo ""

# 7. Summary
echo "[8] Quick Troubleshooting Guide..."
echo "---"
echo "If frontend is not loading:"
echo "  1. Check CORS_ALLOWED_ORIGINS includes your IP"
echo "  2. Check nginx logs: docker-compose -f infra/docker/docker-compose.yml logs frontend"
echo "  3. Test with curl: curl -v http://216.73.163.164/"
echo ""
echo "If backend is not responding:"
echo "  1. Check environment variables are loaded"
echo "  2. Check database connection: docker-compose -f infra/docker/docker-compose.yml logs backend | grep -i database"
echo "  3. Restart backend: docker-compose -f infra/docker/docker-compose.yml restart backend"
echo ""
echo "To restart all services:"
echo "  docker-compose -f infra/docker/docker-compose.yml down"
echo "  docker-compose -f infra/docker/docker-compose.yml up -d"
echo ""
