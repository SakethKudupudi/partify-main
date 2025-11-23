# Azure VM Environment Setup

## Problem
The Docker containers are running but the website isn't responding because the `.env` file on the VM is missing or empty.

## Solution

### Step 1: Create `.env` file on Azure VM

On your Azure VM, navigate to the project and create the `.env` file:

```bash
cd ~/partify-main
nano .env
```

### Step 2: Add all environment variables

Copy and paste the following configuration into the `.env` file (update with your actual values):

```dotenv
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Database
DATABASE_URL=postgresql://user:password@host:6543/dbname
DB_HOST=your-db-host.supabase.com
DB_PORT=6543
DB_NAME=postgres
DB_USER=your-db-user
DB_PASSWORD=your-db-password

# Azure Storage
AZURE_STORAGE_ACCOUNT_NAME=your-storage-account
AZURE_STORAGE_ACCOUNT_KEY=your-storage-key-here

# Redis (Azure Cache)
REDIS_HOST=your-redis-host.redis.cache.windows.net
REDIS_PORT=6380
REDIS_PASSWORD=your-redis-password
REDIS_USE_TLS=true

# API Keys
MISTRAL_API_KEY=your-mistral-api-key
JWT_SECRET=your-jwt-secret-key-here

# Node Configuration
PORT=8080
NODE_ENV=production

# CORS - Update with your VM IP address
CORS_ALLOWED_ORIGINS=http://localhost,http://localhost:80,http://localhost:3000,http://YOUR_VM_IP,http://YOUR_VM_IP:80

# Pinecone (if needed)
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_ENVIRONMENT=your-pinecone-environment
```

**Important:** Replace all `your-*` values with actual credentials from your `.env.local` file:

| Key | Get from |
|-----|----------|
| `your-project.supabase.co` | Supabase Dashboard → Settings → General |
| `your-anon-key-here` | `.env.local` → SUPABASE_ANON_KEY |
| `your-service-role-key-here` | `.env.local` → SUPABASE_SERVICE_ROLE_KEY |
| `postgresql://...` | `.env.local` → DATABASE_URL |
| `your-storage-account` | `.env.local` → AZURE_STORAGE_ACCOUNT_NAME |
| `your-storage-key-here` | `.env.local` → AZURE_STORAGE_ACCOUNT_KEY |
| `your-redis-host` | `.env.local` → REDIS_HOST |
| `your-redis-password` | `.env.local` → REDIS_PASSWORD |
| `your-mistral-api-key` | `.env.local` → MISTRAL_API_KEY |
| `YOUR_VM_IP` | Your Azure VM's public IP (e.g., 216.73.163.164)

### Step 3: Save the file

In `nano`:
```
Ctrl + O  (to save)
Enter
Ctrl + X  (to exit)
```

### Step 4: Verify the file was created

```bash
cat .env | head -10
```

### Step 5: Restart Docker containers

```bash
cd ~/partify-main

# Stop current containers
docker-compose -f infra/docker/docker-compose.yml down

# Rebuild with new environment
docker-compose -f infra/docker/docker-compose.yml build --no-cache

# Start with environment variables
docker-compose -f infra/docker/docker-compose.yml up -d

# Verify all containers are running
docker-compose -f infra/docker/docker-compose.yml ps
```

### Step 6: Check logs

```bash
# View backend logs
docker-compose -f infra/docker/docker-compose.yml logs backend

# View frontend logs
docker-compose -f infra/docker/docker-compose.yml logs frontend

# Follow logs in real-time
docker-compose -f infra/docker/docker-compose.yml logs -f
```

### Step 7: Test the application

```bash
# Test backend
curl http://216.73.163.164:8080/health

# Test frontend
curl http://216.73.163.164/health
```

## Troubleshooting

### Still seeing warnings?
Check if `.env` is in the right location:
```bash
ls -la ~/partify-main/.env
```

### Backend not responding?
```bash
# Check container logs
docker-compose -f infra/docker/docker-compose.yml logs backend | tail -50

# Check if backend is healthy
docker-compose -f infra/docker/docker-compose.yml ps
```

### Frontend shows blank page?
```bash
# Check frontend logs
docker-compose -f infra/docker/docker-compose.yml logs frontend

# Test with curl
curl http://216.73.163.164/
```

### Database connection issues?
Make sure DATABASE_URL is correct and Supabase is accessible from Azure VM:
```bash
# Test Supabase connection
docker exec docker-backend-1 node -e "console.log(process.env.DATABASE_URL)"
```

## Environment Variable Reference

| Variable | Purpose | Required |
|----------|---------|----------|
| SUPABASE_URL | Supabase project URL | Yes |
| SUPABASE_SERVICE_ROLE_KEY | Supabase service key | Yes |
| DATABASE_URL | PostgreSQL connection string | Yes |
| MISTRAL_API_KEY | AI API key for embeddings | Yes |
| JWT_SECRET | JWT signing secret | Yes |
| REDIS_HOST | Redis host address | Yes |
| REDIS_PASSWORD | Redis authentication | Yes |
| AZURE_STORAGE_ACCOUNT_NAME | Azure Blob Storage account | Yes |
| AZURE_STORAGE_ACCOUNT_KEY | Azure Blob Storage key | Yes |

## Next Steps

Once environment is set up:
1. Access http://216.73.163.164/ to verify frontend is live
2. Check backend at http://216.73.163.164:8080/health
3. Monitor logs: `docker-compose -f infra/docker/docker-compose.yml logs -f`
