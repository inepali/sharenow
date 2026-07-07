# Deploying Server to Separate Host

Complete guide for deploying `server-production.js` independently from the frontend to a different hosting provider.

## Overview

This setup separates frontend and backend:
- **Frontend**: Static site (Hostinger, Netlify, Vercel, etc.)
- **Backend API**: Node.js server (Heroku, Railway, Render, DigitalOcean, AWS, etc.)
- **Database**: Supabase (cloud-hosted)
- **Storage**: Cloudflare R2 (cloud-hosted)

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT BROWSER                        │
└─────────────────────────────────────────────────────────┘
           ↓                              ↓
    ┌──────────────┐            ┌──────────────────┐
    │   Frontend   │            │   Backend API    │
    │  (Static)    │            │  (Node.js)       │
    │  yourdomain  │            │  api.yourdomain  │
    └──────────────┘            └──────────────────┘
           ↓                              ↓
    ┌──────────────────────────────────────────────┐
    │         Supabase Database (Auth, Data)       │
    └──────────────────────────────────────────────┘
           ↓                              ↓
    ┌──────────────────────────────────────────────┐
    │      Cloudflare R2 Storage (Images)          │
    └──────────────────────────────────────────────┘
```

---

## Step 1: Prepare Server Code

### Create Server-Only Package

```bash
# Create server-specific directory structure
mkdir -p server-deployment
cd server-deployment

# Copy server files only
cp ../server/server-production.js ./
cp ../server/package.json ./
cp ../.env.example ./.env.example

# Create production-specific files
```

### Create `server/Dockerfile` (Optional - for containerization)

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy server code
COPY server-production.js ./

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3001) + '/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Expose port
EXPOSE 3001

# Start server
CMD ["node", "server-production.js"]
```

### Create `.dockerignore`

```
node_modules
npm-debug.log
.git
.gitignore
.env
.env.local
*.md
.claude
tests
```

---

## Step 2: Choose Hosting Provider

### Option A: Heroku (Easiest)

**Pros**: Automatic deployment, easy environment setup  
**Cons**: More expensive ($7-50/month), limited resources

#### Heroku Setup

```bash
# 1. Install Heroku CLI
# https://devcenter.heroku.com/articles/heroku-cli

# 2. Create Heroku app
heroku create your-app-name
# Creates: https://your-app-name.herokuapp.com

# 3. Set environment variables
heroku config:set SUPABASE_URL=https://your-project.supabase.co
heroku config:set SUPABASE_ANON_KEY=your_key
heroku config:set R2_ACCOUNT_ID=your_account
heroku config:set R2_ACCESS_KEY_ID=your_key
heroku config:set R2_SECRET_ACCESS_KEY=your_secret
heroku config:set R2_BUCKET_NAME=your_bucket
heroku config:set ALLOWED_ORIGINS=https://yourdomain.com
heroku config:set NODE_ENV=production

# 4. Deploy
git push heroku main

# 5. View logs
heroku logs --tail

# 6. Get your API URL
heroku open --app your-app-name
# API is available at: https://your-app-name.herokuapp.com
```

**Procfile** (needed for Heroku):
```
web: node server-production.js
```

---

### Option B: Railway (Recommended)

**Pros**: Modern, affordable ($5-20/month), easy deploys  
**Cons**: Smaller ecosystem than Heroku

#### Railway Setup

```bash
# 1. Connect GitHub repo
# https://railway.app
# Click "New Project" → "Deploy from GitHub"

# 2. Add environment variables in Railway dashboard:
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_key
R2_ACCOUNT_ID=your_account
R2_ACCESS_KEY_ID=your_key
R2_SECRET_ACCESS_KEY=your_secret
R2_BUCKET_NAME=your_bucket
ALLOWED_ORIGINS=https://yourdomain.com
NODE_ENV=production
PORT=3001

# 3. Railway auto-deploys on git push

# 4. Get your API URL
# Railway dashboard shows: https://your-project-abc123.up.railway.app
```

---

### Option C: Render

**Pros**: Free tier available, good performance  
**Cons**: Free tier has limitations

#### Render Setup

```bash
# 1. Go to https://render.com
# Create new "Web Service"
# Connect GitHub repository

# 2. Select Node
# Build command: npm install
# Start command: node server-production.js

# 3. Add environment variables:
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_key
R2_ACCOUNT_ID=your_account
R2_ACCESS_KEY_ID=your_key
R2_SECRET_ACCESS_KEY=your_secret
R2_BUCKET_NAME=your_bucket
ALLOWED_ORIGINS=https://yourdomain.com
NODE_ENV=production

# 4. Deploy
# Render auto-deploys on git push
# Get URL: https://your-service.onrender.com
```

---

### Option D: DigitalOcean (VPS Control)

**Pros**: Full control, good price ($5-40/month)  
**Cons**: Requires more setup

#### DigitalOcean Setup

```bash
# 1. Create Droplet
# Select: Ubuntu 22.04, 2GB RAM, $6/month tier
# Add SSH key

# 2. SSH into droplet
ssh root@your_droplet_ip

# 3. Update system
apt update && apt upgrade -y

# 4. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 5. Install PM2 (process manager)
sudo npm install -g pm2

# 6. Create app directory
mkdir -p /var/www/sharemyshoot-api
cd /var/www/sharemyshoot-api

# 7. Clone repository or upload files
git clone your-repo .

# 8. Install dependencies
npm install --production

# 9. Create .env file
nano .env
# Add all environment variables

# 10. Start with PM2
pm2 start server-production.js --name api

# 11. Make PM2 restart on reboot
pm2 startup
pm2 save

# 12. Configure firewall
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# 13. Optional: Add Nginx reverse proxy
sudo apt install nginx
# See Nginx config section below

# 14. Optional: Add SSL with Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot certonly --standalone -d api.yourdomain.com
```

---

### Option E: AWS EC2

**Pros**: Scalable, powerful  
**Cons**: Complex, requires more configuration

#### AWS EC2 Setup

```bash
# 1. Launch EC2 instance
# - Ubuntu 22.04 LTS
# - t3.micro (free tier) or t3.small
# - Configure security group (allow 80, 443, 22)

# 2. SSH into instance
ssh -i your-key.pem ubuntu@your-instance-ip

# 3. Setup (same as DigitalOcean steps 3-10)

# 4. Optional: Use Elastic IP
# - Allocate Elastic IP in AWS console
# - Associate with instance
# - Use Elastic IP for DNS

# 5. Optional: Use RDS (skip if using Supabase)
# 6. Optional: Use S3 (use R2 instead - cheaper)
# 7. Optional: Use ALB (load balancer)
```

---

## Step 3: Frontend Configuration

### Update API Base URL

Update your frontend to call the separate API server.

#### In `src/integrations/supabase/client.ts` or environment config:

```typescript
// Don't hardcode - use environment variable
const API_URL = import.meta.env.VITE_API_URL || 'https://api.yourdomain.com';

// Use in API calls
export const uploadToServer = async (file: File, metadata: any) => {
  const response = await fetch(`${API_URL}/api/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  return response.json();
};
```

#### Environment Variables

**`.env.production`** (frontend):
```
VITE_API_URL=https://api.yourdomain.com
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_key
VITE_R2_PUBLIC_URL=https://your-bucket.r2.dev
```

**`.env.development`** (frontend):
```
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_key
VITE_R2_PUBLIC_URL=https://your-bucket.r2.dev
```

---

## Step 4: CORS Configuration

### Update Backend CORS

Your backend `server-production.js` needs CORS configured for the frontend domain:

```bash
# Set this environment variable
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# For development
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Verify CORS Works

```bash
# Test from frontend domain
curl -H "Origin: https://yourdomain.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS \
  https://api.yourdomain.com/api/health

# Should return CORS headers:
# Access-Control-Allow-Origin: https://yourdomain.com
# Access-Control-Allow-Methods: GET, POST, OPTIONS
```

---

## Step 5: DNS & SSL Configuration

### Create API Subdomain

#### Option A: Subdomain (Recommended)

```
Frontend: https://yourdomain.com
API:      https://api.yourdomain.com
```

**In your DNS provider (Namecheap, Route53, Cloudflare, etc.):**

1. Create CNAME record:
   - Name: `api`
   - Value: Depends on hosting (see below)

2. Example values:
   - Heroku: `api.yourdomain.com CNAME your-app-name.herokuapp.com`
   - Railway: `api.yourdomain.com CNAME your-railway-domain`
   - Render: `api.yourdomain.com CNAME your-render-domain`
   - DigitalOcean: `api.yourdomain.com A your.droplet.ip`

#### Option B: Path-based (Alternative)

```
Frontend: https://yourdomain.com
API:      https://yourdomain.com/api/
```

Requires Nginx/Apache reverse proxy configuration.

### SSL Certificate

#### Automatic (Recommended)

- **Heroku**: Included free
- **Railway**: Included free
- **Render**: Included free
- **DigitalOcean**: Use Let's Encrypt (see below)

#### Let's Encrypt (DigitalOcean/AWS)

```bash
sudo apt install certbot python3-certbot-nginx

# For single domain
sudo certbot certonly --standalone -d api.yourdomain.com

# For multiple domains
sudo certbot certonly --standalone -d api.yourdomain.com -d yourdomain.com

# Auto-renew
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Verify
sudo certbot certificates
```

---

## Step 6: Nginx Reverse Proxy (Optional)

If using DigitalOcean/AWS and want extra layer of control:

### Create Nginx Config

**`/etc/nginx/sites-available/sharemyshoot-api`**:

```nginx
upstream api_backend {
    server localhost:3001;
}

server {
    listen 80;
    server_name api.yourdomain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Proxy settings
    location / {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # CORS headers (if needed)
        add_header Access-Control-Allow-Origin "https://yourdomain.com" always;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
    }

    # Handle OPTIONS requests
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' 'https://yourdomain.com' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
        add_header 'Access-Control-Max-Age' '86400' always;
        return 204;
    }
}
```

Enable it:

```bash
sudo ln -s /etc/nginx/sites-available/sharemyshoot-api \
  /etc/nginx/sites-enabled/sharemyshoot-api

# Test config
sudo nginx -t

# Restart
sudo systemctl restart nginx
```

---

## Step 7: Environment Variables Setup

### Backend Environment Variables

**Required on API server:**

```bash
# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key

# Storage
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=gallery-photos

# CORS (Frontend URL)
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Server
PORT=3001
NODE_ENV=production
```

### How to Set Environment Variables

#### On Heroku:
```bash
heroku config:set SUPABASE_URL=value
heroku config:set SUPABASE_ANON_KEY=value
# etc.
```

#### On Railway/Render:
Use dashboard UI to add variables

#### On DigitalOcean/AWS:
```bash
# SSH into server
nano /var/www/sharemyshoot-api/.env

# Add all variables, then restart
pm2 restart api
```

#### On Docker:
```bash
docker run -e SUPABASE_URL=value \
           -e SUPABASE_ANON_KEY=value \
           -e R2_ACCOUNT_ID=value \
           # ... other vars
           your-docker-image
```

---

## Step 8: CI/CD for Backend Only

### GitHub Actions for Backend Deployment

Create `.github/workflows/deploy-server.yml`:

```yaml
name: Deploy Backend Only

on:
  push:
    branches: [main]
    paths:
      - 'server/**'
      - '.github/workflows/deploy-server.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Heroku
        uses: akhileshns/heroku-deploy@v3.13.15
        with:
          heroku_api_key: ${{ secrets.HEROKU_API_KEY }}
          heroku_app_name: ${{ secrets.HEROKU_APP_NAME }}
          heroku_email: ${{ secrets.HEROKU_EMAIL }}
          appdir: "server"
      
      # OR for Railway
      - name: Deploy to Railway
        run: |
          npm i -g @railway/cli
          railway up --environment production
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

### GitHub Actions for Frontend Only

Create `.github/workflows/deploy-frontend.yml`:

```yaml
name: Deploy Frontend Only

on:
  push:
    branches: [main]
    paths:
      - 'src/**'
      - 'public/**'
      - '.github/workflows/deploy-frontend.yml'

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
        env:
          VITE_API_URL: ${{ secrets.VITE_API_URL }}
        run: npm run build
      
      - name: Deploy to Hostinger
        env:
          SSH_KEY: ${{ secrets.HOSTINGER_SSH_KEY }}
          SSH_HOST: ${{ secrets.HOSTINGER_HOST }}
          SSH_USER: ${{ secrets.HOSTINGER_USER }}
          SSH_PORT: ${{ secrets.HOSTINGER_PORT }}
          SSH_PATH: ${{ secrets.HOSTINGER_PATH }}
        run: |
          mkdir -p ~/.ssh
          echo "$SSH_KEY" > ~/.ssh/id_ed25519
          chmod 600 ~/.ssh/id_ed25519
          ssh-keyscan -p $SSH_PORT $SSH_HOST >> ~/.ssh/known_hosts
          rsync -az -e "ssh -p $SSH_PORT" dist/ \
            $SSH_USER@$SSH_HOST:$SSH_PATH/
```

---

## Step 9: Local Development Setup

### Running Both Services Locally

**Terminal 1 - Backend:**
```bash
cd server
npm install
cp .env.example .env
# Edit .env with development values
npm run start:prod
# Runs on http://localhost:3001
```

**Terminal 2 - Frontend:**
```bash
npm install
npm run dev
# Runs on http://localhost:5173
```

**Terminal 3 - Proxy (Optional - for production URL testing):**
```bash
# Install http-server
npm install -g http-server

# Serve dist folder
http-server dist -p 8080 -c-1
```

### .env Files for Development

**Frontend (`frontend/.env.development`):**
```
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_key
```

**Backend (`server/.env.development`):**
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_key
R2_ACCOUNT_ID=your_account
R2_ACCESS_KEY_ID=your_key
R2_SECRET_ACCESS_KEY=your_secret
R2_BUCKET_NAME=your_bucket
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
PORT=3001
NODE_ENV=development
```

---

## Step 10: Monitoring & Troubleshooting

### Health Checks

```bash
# Check API is running
curl https://api.yourdomain.com/api/health

# Expected response
{"status":"ok","timestamp":"2024-01-15T10:30:00Z","uptime":3600}

# Check CORS
curl -H "Origin: https://yourdomain.com" \
  https://api.yourdomain.com/api/health

# Test upload endpoint
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@image.jpg" \
  -F "galleryId=550e8400-e29b-41d4-a716-446655440000" \
  -F "sectionId=550e8400-e29b-41d4-a716-446655440001" \
  -F "displayOrder=1" \
  https://api.yourdomain.com/api/upload
```

### Check Logs

#### Heroku
```bash
heroku logs --tail --app your-app-name
```

#### Railway
```bash
# View in dashboard or use CLI
railway logs
```

#### DigitalOcean/AWS
```bash
# With PM2
pm2 logs api

# Or system logs
sudo journalctl -u nginx -f
tail -f ~/.pm2/logs/api-out.log
```

### Performance Monitoring

```bash
# Check response times
time curl https://api.yourdomain.com/api/health

# Load test (careful!)
npm install -g autocannon
autocannon https://api.yourdomain.com/api/health
```

### Common Issues

**502 Bad Gateway**
```bash
# Check if API is running
pm2 status
pm2 logs api

# Restart if needed
pm2 restart api
```

**CORS Error in Browser**
```bash
# Verify ALLOWED_ORIGINS
echo $ALLOWED_ORIGINS

# Should include your frontend domain
# Add if missing: heroku config:set ALLOWED_ORIGINS=https://yourdomain.com
```

**Database Connection Error**
```bash
# Verify Supabase credentials
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY

# Test connection
node -e "const {createClient} = require('@supabase/supabase-js'); const c = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY); c.auth.getSession().then(r => console.log('OK')).catch(e => console.error(e));"
```

---

## Cost Comparison

| Provider | Tier | Cost/Month | Features |
|----------|------|-----------|----------|
| **Heroku** | Basic | $7 | Easy, includes SSL |
| **Railway** | Pay-as-you-go | $5-20 | Modern, fast deploys |
| **Render** | Free | $0 | Limited, auto-sleep |
| **Render** | Paid | $7+ | No sleep, better specs |
| **DigitalOcean** | Droplet | $5+ | Full control, VPS |
| **AWS** | Free tier | $0-10 | Requires setup |

**Recommendation for most projects**: Railway or Render

---

## Summary

You now have:
- ✅ Separate frontend and backend deployments
- ✅ Frontend on Hostinger (static)
- ✅ Backend on Railway/Render/Heroku (Node.js)
- ✅ Database on Supabase (cloud)
- ✅ Storage on R2 (cloud)
- ✅ Independent CI/CD pipelines
- ✅ CORS configured correctly
- ✅ SSL certificates on both
- ✅ Monitoring and troubleshooting guide

This is the production-standard architecture for scalable applications!
