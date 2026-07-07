# Hostinger Deployment Guide (Frontend + Node.js Backend)

Complete guide for deploying both frontend and backend Node.js server on Hostinger.

---

## Overview

**Architecture on Hostinger**:
```
yourdomain.com (Frontend - React static files)
   └─ Served by Hostinger web server (Apache/Nginx)

yourdomain.com/api/* (Backend - Node.js)
   └─ Forwarded to Node.js application
   
OR

yourdomain.com (Frontend)
api.yourdomain.com (Backend - Node.js)
   └─ Separate Node.js instance
```

---

## Part 1: Check Your Hostinger Plan

### Node.js Support by Plan

**Business or higher** - Direct Node.js support ✅
- SSH access
- npm package manager
- Node.js pre-installed
- Process managers

**Premium** - Node.js via Application Manager ⚠️
- SSH access limited
- Node.js available

**Starter** - Limited or no Node.js ❌
- Not recommended for Node.js

### Check Your Plan

1. Log in to Hostinger > Hosting > Domain
2. Look at current plan level
3. If Starter → **Upgrade to Business or Premium**

---

## Part 2: Prepare Files for Hostinger

### Directory Structure

Create this structure on your local machine:

```
your-project/
├── public/                    # Frontend static files
│   ├── index.html
│   ├── assets/
│   └── css/
├── server/
│   ├── server-production.js   # Node.js server
│   ├── package.json           # Server dependencies
│   └── .env                   # Server environment (not committed)
└── .env.example               # Template
```

### Step 1: Build Frontend

```bash
# Build React app
npm run build

# Output in: dist/
# All files here go to: public_html/ on Hostinger
```

### Step 2: Prepare Server

```bash
# Copy server files
cp -r server/ server-hostinger/
cd server-hostinger

# Create .env file (will upload separately)
cp ../.env.example .env

# Install dependencies locally (for verification)
npm install
```

---

## Part 3: Connect to Hostinger via SSH

### Get SSH Credentials

1. Hostinger Dashboard > Hosting > SSH Access
2. Get these details:
   - **Hostname**: olive-tiger-723036.hostingersite.com (or your domain)
   - **Username**: u... (starts with 'u')
   - **Password**: Your hosting password
   - **Port**: Usually 65002

### Connect via SSH

**On Mac/Linux:**
```bash
ssh -p 65002 u123456@olive-tiger-723036.hostingersite.com
# or
ssh -p 65002 u123456@yourdomain.com
```

**On Windows (PowerShell):**
```powershell
ssh -p 65002 u123456@olive-tiger-723036.hostingersite.com
```

**If you have SSH key**:
```bash
ssh -i ~/.ssh/hostinger_key -p 65002 u123456@yourdomain.com
```

---

## Part 4: Deploy Frontend (React Static Files)

### Using SFTP (Easiest)

**Option A: FileZilla (GUI)**
```
1. Download FileZilla: https://filezilla-project.org
2. File > Site Manager > New Site
3. Fill in:
   - Host: olive-tiger-723036.hostingersite.com
   - Port: 65002
   - Protocol: SFTP
   - User: u123456
   - Password: your-password
4. Click Connect
5. Navigate to: public_html/
6. Drag-drop files from dist/ folder
```

**Option B: Command Line (scp)**
```bash
# Build frontend
npm run build

# Upload all files to public_html
scp -r -P 65002 dist/* u123456@olive-tiger-723036.hostingersite.com:~/public_html/
```

### Using Hostinger Application Manager

**Method 1: Direct Upload**

```bash
# SSH into Hostinger
ssh -p 65002 u123456@yourdomain.com

# Navigate to public_html
cd ~/public_html

# Clear old files
rm -rf *

# Upload new files (via SFTP or FileZilla)
```

**Method 2: Git Auto-Deploy**

```bash
# SSH into Hostinger
ssh -p 65002 u123456@yourdomain.com

# Navigate to public_html
cd ~/public_html

# Clone your repo
git clone https://github.com/yourusername/sharenow.git .

# Build
npm run build

# Copy dist to public_html
cp -r dist/* .
```

---

## Part 5: Deploy Node.js Backend on Hostinger

### Option A: Node.js via Hostinger Application Manager (Easiest)

**Using Hostinger's Node.js Management:**

1. **SSH into Hostinger**
```bash
ssh -p 65002 u123456@yourdomain.com
```

2. **Create application directory**
```bash
mkdir -p ~/applications/api
cd ~/applications/api
```

3. **Upload server files**
```bash
# Via SFTP upload:
# - server-production.js
# - package.json
# - package-lock.json (if exists)
```

4. **Install dependencies**
```bash
npm install --production
```

5. **Create .env file**
```bash
cat > .env << 'EOF'
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
R2_ACCOUNT_ID=your_r2_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=gallery-photos
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
NODE_ENV=production
PORT=3001
EOF
```

6. **Test server locally**
```bash
# Test (should output a port message)
node server-production.js &
sleep 2
curl http://localhost:3001/api/health
# Should see: {"status":"ok",...}

# Kill test
kill %1
```

7. **Start with Hostinger's App Manager**
```bash
# Hostinger usually provides a way to start Node.js apps
# Either via dashboard or:
cd ~/applications/api
nohup node server-production.js > app.log 2>&1 &

# Verify it's running
ps aux | grep "server-production"

# View logs
tail -f app.log
```

### Option B: Using PM2 Process Manager

```bash
# SSH into Hostinger
ssh -p 65002 u123456@yourdomain.com

# Install PM2 globally
npm install -g pm2

# Navigate to server directory
cd ~/applications/api

# Start server with PM2
pm2 start server-production.js --name api

# Make it auto-restart on reboot
pm2 startup
pm2 save

# Verify it's running
pm2 status

# View logs
pm2 logs api
```

### Option C: Using Supervisor (Traditional)

```bash
# SSH into Hostinger
ssh -p 65002 u123456@yourdomain.com

# Install supervisor
sudo apt-get install supervisor

# Create config file
sudo nano /etc/supervisor/conf.d/sharemyshoot-api.conf
```

**Add this content:**
```ini
[program:sharemyshoot-api]
directory=/home/u123456/applications/api
command=node /home/u123456/applications/api/server-production.js
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/home/u123456/applications/api/app.log
environment=NODE_ENV=production
```

```bash
# Restart supervisor
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start sharemyshoot-api

# Check status
sudo supervisorctl status
```

---

## Part 6: Configure Routing (API vs Frontend)

### Option A: Using Subdomain (Recommended)

**Setup DNS:**
1. Hostinger Dashboard > Domain > DNS Records
2. Add CNAME record:
   ```
   Name: api
   Type: CNAME
   Value: yourdomain.com
   TTL: 3600
   ```

3. Configure Hostinger to forward `api.yourdomain.com` to port 3001

**Update Frontend:**
```typescript
// In src/integrations/supabase/client.ts or .env
VITE_API_URL=https://api.yourdomain.com
```

### Option B: Using Path (/api) (Alternative)

**Setup Nginx reverse proxy on Hostinger:**

1. SSH into Hostinger
```bash
ssh -p 65002 u123456@yourdomain.com
```

2. Create Nginx config
```bash
sudo nano /etc/nginx/sites-available/api-proxy
```

**Add this:**
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

3. Enable site
```bash
sudo ln -s /etc/nginx/sites-available/api-proxy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**Update Frontend:**
```typescript
VITE_API_URL=https://yourdomain.com/api
```

---

## Part 7: Environment Configuration

### Environment Variables on Hostinger

**Method 1: .env file (Recommended)**

```bash
# SSH to server
ssh -p 65002 u123456@yourdomain.com

# Create .env in server directory
cd ~/applications/api
nano .env
```

Add:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
R2_ACCOUNT_ID=your_r2_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=gallery-photos
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
NODE_ENV=production
PORT=3001
```

**Method 2: Hostinger Application Manager**

If using Hostinger's Application Manager:
1. Go to Application Manager in Hostinger Dashboard
2. Select your Node.js app
3. Add environment variables there

---

## Part 8: SSL/TLS Configuration

### Hostinger Automatic SSL

**Good News**: Hostinger provides free SSL automatically!

1. Hostinger Dashboard > SSL Certificate
2. You should see: "SSL Certificate Active" ✅
3. All domains/subdomains covered: yourdomain.com, api.yourdomain.com, etc.

**Verify:**
```bash
# Should be HTTPS
curl -I https://yourdomain.com
curl -I https://api.yourdomain.com

# Both should return 200 with HTTPS
```

### Update Frontend to Use HTTPS

```typescript
// .env.production
VITE_API_URL=https://api.yourdomain.com

// NOT
VITE_API_URL=http://api.yourdomain.com
```

---

## Part 9: Update Frontend API Configuration

### Create Environment Files

**`frontend/.env.production`**:
```
VITE_API_URL=https://api.yourdomain.com
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_key
VITE_R2_PUBLIC_URL=https://your-bucket.r2.dev
```

**`frontend/.env.development`**:
```
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_key
VITE_R2_PUBLIC_URL=https://your-bucket.r2.dev
```

### Build with Production Environment

```bash
# Build for production (uses VITE_API_URL from .env.production)
npm run build

# This creates dist/ folder with correct API URL
```

---

## Part 10: Deployment Script

### Automated Deployment (Bash Script)

Create `deploy-hostinger.sh`:

```bash
#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
HOSTINGER_HOST="olive-tiger-723036.hostingersite.com"
HOSTINGER_USER="u123456"
HOSTINGER_PORT="65002"
HOSTINGER_PATH="/home/u123456/public_html"
API_PATH="/home/u123456/applications/api"
REMOTE_KEY="~/.ssh/hostinger_key"  # If using SSH key

echo -e "${YELLOW}Starting Hostinger Deployment...${NC}"

# Step 1: Build frontend
echo -e "${YELLOW}Step 1: Building frontend...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}Frontend build failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Frontend built${NC}"

# Step 2: Upload frontend
echo -e "${YELLOW}Step 2: Uploading frontend...${NC}"
rsync -avz -e "ssh -p $HOSTINGER_PORT" dist/ \
    $HOSTINGER_USER@$HOSTINGER_HOST:$HOSTINGER_PATH/
if [ $? -ne 0 ]; then
    echo -e "${RED}Frontend upload failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Frontend uploaded${NC}"

# Step 3: Upload server
echo -e "${YELLOW}Step 3: Uploading server...${NC}"
rsync -avz -e "ssh -p $HOSTINGER_PORT" \
    server/server-production.js \
    server/package.json \
    server/package-lock.json \
    $HOSTINGER_USER@$HOSTINGER_HOST:$API_PATH/
if [ $? -ne 0 ]; then
    echo -e "${RED}Server upload failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Server uploaded${NC}"

# Step 4: Install dependencies & restart
echo -e "${YELLOW}Step 4: Installing dependencies & restarting...${NC}"
ssh -p $HOSTINGER_PORT $HOSTINGER_USER@$HOSTINGER_HOST << 'ENDSSH'
cd ~/applications/api
npm install --production
pm2 restart api
sleep 2
pm2 logs api | head -20
ENDSSH

echo -e "${GREEN}✓ Deployment complete!${NC}"
echo -e "${YELLOW}Frontend: https://yourdomain.com${NC}"
echo -e "${YELLOW}Backend: https://api.yourdomain.com/api/health${NC}"
```

### Usage

```bash
# Make executable
chmod +x deploy-hostinger.sh

# Run
./deploy-hostinger.sh

# Monitor
ssh -p 65002 u123456@yourdomain.com
pm2 logs api
```

---

## Part 11: Monitoring & Management

### Check Server Status

```bash
# SSH into Hostinger
ssh -p 65002 u123456@yourdomain.com

# With PM2
pm2 status

# View logs
pm2 logs api

# View last 50 lines
pm2 logs api --lines 50

# Real-time monitoring
pm2 monit
```

### Restart Server

```bash
# Restart server
pm2 restart api

# Stop server
pm2 stop api

# Start server
pm2 start server-production.js --name api
```

### Check Disk Space

```bash
# SSH to Hostinger
ssh -p 65002 u123456@yourdomain.com

# Check usage
df -h

# Check node_modules size
du -sh ~/applications/api/node_modules
```

---

## Part 12: Verify Deployment

### Test Frontend

```bash
# Should load React app
curl https://yourdomain.com | head -20

# Should contain: React HTML, links to assets
```

### Test Backend API

```bash
# Health check
curl https://api.yourdomain.com/api/health

# Should return:
# {"status":"ok","timestamp":"...","uptime":123}

# Test CORS
curl -H "Origin: https://yourdomain.com" \
  https://api.yourdomain.com/api/health
```

### Test from Browser

**Open browser console:**
```javascript
// Test API connection
fetch('https://api.yourdomain.com/api/health')
  .then(r => r.json())
  .then(data => console.log('API OK:', data))
  .catch(err => console.error('API Error:', err))

// Should log: API OK: {status: "ok", ...}
```

---

## Part 13: Common Issues & Fixes

### "404 Not Found" on Frontend

**Problem**: Frontend files not found

**Solution**:
```bash
# SSH to Hostinger
ssh -p 65002 u123456@yourdomain.com

# Check files are in public_html
ls -la ~/public_html/

# Should see: index.html, assets/ folder, etc.

# Clear cache and rebuild
cd ~/public_html
rm -rf *
# Re-upload dist files
```

### "Cannot connect to API" Error

**Problem**: Frontend can't reach backend

**Solution 1**: Check CORS
```bash
# SSH to Hostinger, check ALLOWED_ORIGINS
ssh -p 65002 u123456@yourdomain.com
cd ~/applications/api
grep ALLOWED_ORIGINS .env

# Should match your domain
```

**Solution 2**: Verify server is running
```bash
# SSH to Hostinger
pm2 status
# Should show: api (online)

# If offline, restart
pm2 restart api
```

**Solution 3**: Check firewall
```bash
# Test if port 3001 is accessible
curl http://localhost:3001/api/health

# If works locally but not remotely, issue is firewall/proxy
```

### "502 Bad Gateway"

**Problem**: Nginx error

**Solution**:
```bash
# Check server is running
pm2 status

# Check logs
pm2 logs api

# Restart
pm2 restart api

# Check Nginx
sudo nginx -t
sudo systemctl restart nginx
```

### Node Modules Too Large

**Problem**: npm install taking too long, disk space issues

**Solution**:
```bash
# Remove unnecessary packages
npm prune --production

# Clear npm cache
npm cache clean --force

# Check size
du -sh node_modules/
```

---

## Part 14: Updating Deployments

### Automatic Updates (GitHub Actions)

Create `.github/workflows/deploy-hostinger.yml`:

```yaml
name: Deploy to Hostinger

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      
      - run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Deploy to Hostinger
        env:
          HOSTINGER_SSH_KEY: ${{ secrets.HOSTINGER_SSH_KEY }}
          HOSTINGER_HOST: ${{ secrets.HOSTINGER_HOST }}
          HOSTINGER_USER: ${{ secrets.HOSTINGER_USER }}
          HOSTINGER_PORT: ${{ secrets.HOSTINGER_PORT }}
        run: |
          mkdir -p ~/.ssh
          echo "$HOSTINGER_SSH_KEY" > ~/.ssh/id_ed25519
          chmod 600 ~/.ssh/id_ed25519
          ssh-keyscan -p $HOSTINGER_PORT $HOSTINGER_HOST >> ~/.ssh/known_hosts
          
          # Deploy frontend
          rsync -az -e "ssh -p $HOSTINGER_PORT" dist/ \
            $HOSTINGER_USER@$HOSTINGER_HOST:/home/$HOSTINGER_USER/public_html/
          
          # Deploy backend
          rsync -az -e "ssh -p $HOSTINGER_PORT" \
            server/server-production.js \
            server/package.json \
            server/package-lock.json \
            $HOSTINGER_USER@$HOSTINGER_HOST:/home/$HOSTINGER_USER/applications/api/
          
          # Restart server
          ssh -p $HOSTINGER_PORT $HOSTINGER_USER@$HOSTINGER_HOST \
            "cd ~/applications/api && npm install --production && pm2 restart api"
```

**GitHub Secrets Needed**:
- `HOSTINGER_SSH_KEY`
- `HOSTINGER_HOST`
- `HOSTINGER_USER`
- `HOSTINGER_PORT`

### Manual Update

```bash
# Just push to git
git push origin main

# OR run deploy script
./deploy-hostinger.sh
```

---

## Part 15: Production Checklist

Before going live:

- [ ] Frontend loads at yourdomain.com
- [ ] Backend responds at api.yourdomain.com/api/health
- [ ] CORS headers present
- [ ] SSL working (HTTPS works)
- [ ] Environment variables set correctly
- [ ] Server auto-restarts on reboot
- [ ] Logs accessible
- [ ] Database connections working
- [ ] File uploads working
- [ ] Database backups configured

---

## Quick Reference

### SSH Command
```bash
ssh -p 65002 u123456@yourdomain.com
```

### Key Directories
```
Frontend: ~/public_html/
Backend:  ~/applications/api/
Logs:     pm2 logs api
```

### Key Commands
```bash
# Restart backend
pm2 restart api

# View logs
pm2 logs api

# Check status
pm2 status

# Redeploy
./deploy-hostinger.sh
```

### Environment File Location
```bash
~/applications/api/.env
```

### Frontend Build & Deploy
```bash
npm run build                    # Build
scp -r -P 65002 dist/* \
  u123456@yourdomain.com:~/public_html/  # Upload
```

---

## Support

**Hostinger Resources**:
- Hosting Dashboard: https://hpanel.hostinger.com
- SSH Access: Hosting > SSH Access
- Application Manager: Hosting > App Manager (if available)

**Our Documentation**:
- API Reference: `API_DOCUMENTATION.md`
- Production Tips: `PRODUCTION_DEPLOYMENT.md`
- Security: `SECURITY.md`

---

## Summary

You now have:
✅ Frontend deployed to Hostinger public_html  
✅ Backend Node.js running on Hostinger  
✅ Both accessible via yourdomain.com  
✅ Automated deployment script  
✅ Monitoring and management tools  
✅ Production checklist  

**You're ready to go live!** 🚀
