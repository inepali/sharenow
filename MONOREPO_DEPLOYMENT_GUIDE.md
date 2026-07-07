# ShareMyShoot - Monorepo Deployment Guide

**Status**: ✅ Single Repository Setup - Frontend + Backend Together

This guide covers deploying the complete ShareMyShoot application (frontend + backend) from a single repository to Hostinger or other hosting providers.

---

## 📁 Repository Structure

```
sharenow/
├── src/                          # React frontend
├── public/                        # Static assets
├── server.js                      # Node.js backend API
├── package.json                   # Dependencies for both
├── .env.example                   # Environment template
├── vite.config.ts                 # Frontend build config
├── tsconfig.json                  # TypeScript config
├── .github/workflows/             # CI/CD automation
└── README.md                      # This file
```

**Everything is in one repository** - easier to manage, single deployment!

---

## 🚀 Quick Start (Local Development)

### Run Both Services Together

**Option 1: Single command (Recommended)**
```bash
npm run dev:all
```
This starts:
- Frontend on http://localhost:5173
- Backend on http://localhost:3001

**Option 2: Separate terminals**

Terminal 1 - Frontend:
```bash
npm run dev
# http://localhost:5173
```

Terminal 2 - Backend:
```bash
npm run server:dev
# http://localhost:3001
```

### Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your actual values:
# - SUPABASE_URL
# - SUPABASE_ANON_KEY
# - R2_* credentials
# - ALLOWED_ORIGINS (for CORS)
```

---

## 📋 Environment Variables

### For Local Development

Create `.env`:
```
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key

# R2 Storage
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=gallery-photos

# CORS - Allow local frontend
ALLOWED_ORIGINS=http://localhost:5173

# Server
PORT=3001
NODE_ENV=development
```

### For Production

Update `.env` for production:
```
# Same Supabase credentials

# Same R2 credentials

# CORS - Allow only your production domain
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Server
NODE_ENV=production
```

**Frontend** also uses Supabase/R2 - set these in `src/lib/supabase.ts`:
```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
```

---

## 🌐 Deployment: Hostinger (Recommended)

### Step 1: Build Frontend

```bash
npm run build
# Creates dist/ folder with optimized frontend
```

### Step 2: Deploy to Hostinger

#### Via cPanel File Manager

1. **Create directory structure** in Hostinger public_html/:
   ```
   public_html/
   ├── index.html           # From dist/
   ├── assets/              # From dist/
   └── api/                 # Create this folder
   ```

2. **Upload frontend** (dist/ contents):
   - Via FTP/SFTP: Upload dist/* to public_html/
   - Via cPanel: Upload dist.zip and extract

3. **Upload backend** (server.js + dependencies):
   - Create `public_html/api/` folder
   - Upload server.js
   - Upload package.json
   - Upload .env (with production values)

4. **Install dependencies**:
   ```bash
   cd ~/public_html/api
   npm install --production
   ```

5. **Start backend** using Hostinger's application manager:
   - Go to cPanel → Application Manager
   - Create Node.js application
   - Point to public_html/api
   - Node entry point: server.js
   - Start application

#### Via SSH (Advanced)

```bash
# Connect to Hostinger
ssh user@yourdomain.com

# Navigate to public_html
cd ~/public_html

# Build and upload
git clone https://github.com/yourusername/sharenow.git
cd sharenow

# Install dependencies
npm install --production

# Build frontend
npm run build

# Copy frontend to public_html root
cp -r dist/* ../

# Copy backend to api folder
mkdir -p ../api
cp server.js ../api/
cp package.json ../api/
cp .env ../api/
cd ../api
npm install --production

# Start backend with PM2
pm2 start server.js --name api
pm2 save
```

---

## 🔧 Deployment: Other Platforms

### Railway.app (Easy Cloud Deployment)

1. Connect your GitHub repository
2. Create new service with Node.js
3. Set environment variables in dashboard
4. Add start command:
   ```bash
   npm run build && npm run server:prod
   ```
5. Deploy!

Railway automatically:
- Installs dependencies
- Builds frontend
- Starts backend server
- Provides HTTPS endpoint

### Heroku

```bash
# Create Heroku app
heroku create your-app-name

# Set environment variables
heroku config:set SUPABASE_URL=https://...
heroku config:set SUPABASE_ANON_KEY=...
heroku config:set R2_ACCOUNT_ID=...
# ... add all R2 variables

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

### DigitalOcean App Platform

1. Connect GitHub repository
2. Configure build command:
   ```bash
   npm run build
   ```
3. Configure run command:
   ```bash
   npm run server:prod
   ```
4. Set environment variables in dashboard
5. Deploy!

---

## 🔗 Frontend to Backend Communication

### Development

Frontend requests go to local backend:
```typescript
const API_URL = 'http://localhost:3001';

const response = await fetch(`${API_URL}/api/upload`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
```

### Production

Frontend requests go to production backend:
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'https://yourdomain.com';
```

Update `src/lib/api.ts` or similar:
```typescript
// Load from env or default to same domain
const API_BASE = import.meta.env.VITE_API_URL || window.location.origin;
```

---

## 📊 Build & Deployment Workflow

### Local Development

```bash
# Install dependencies (once)
npm install

# Run both services
npm run dev:all

# Modify code, changes hot-reload
# Test frontend on http://localhost:5173
# Test API on http://localhost:3001/api/health
```

### Prepare for Production

```bash
# 1. Build frontend
npm run build

# 2. Update .env with production values
# Edit .env:
# - Change ALLOWED_ORIGINS to production domain
# - Verify all credentials are correct
# - Set NODE_ENV=production

# 3. Test production build locally
PORT=3001 NODE_ENV=production npm run server
# In another terminal:
# npx http-server dist -p 3000

# 4. Commit changes
git add .env .env.example
git commit -m "Update environment for production"
git push origin main

# 5. Deploy to hosting platform
# (See platform-specific instructions above)
```

---

## 🔍 API Endpoints

Backend runs on same server as frontend in production.

### Health Check
```bash
GET /api/health
# Response: { status: "ok", uptime: 3600 }
```

### Upload Photo
```bash
POST /api/upload
Authorization: Bearer <JWT_TOKEN>
Content-Type: multipart/form-data

file: <image_file>
galleryId: <uuid>
sectionId: <uuid>
displayOrder: <number>
caption: <string> (optional)
```

### Gallery Stats
```bash
POST /api/gallery-stats
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{ "prefixes": ["Gallery/abc/"] }
# Response: { totalSize: 1024000, photoCount: 42 }
```

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete reference.

---

## 🛡️ Security Checklist

Before deploying to production:

- [ ] `.env` file created with production values (never commit this)
- [ ] `ALLOWED_ORIGINS` set to your production domain only
- [ ] `SUPABASE_ANON_KEY` is correct
- [ ] R2 credentials have restricted permissions (upload to single bucket)
- [ ] Database RLS policies are enabled
- [ ] Rate limiting is enabled on API endpoints
- [ ] HTTPS is enabled (automatic on most platforms)
- [ ] No sensitive data in git repository
- [ ] .gitignore includes .env and node_modules

---

## 🔄 CI/CD Pipeline

Automatic deployment on `git push`:

```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - run: npm install
      - run: npm run lint
      - run: npm run build
      - run: npm test
      
      # Deploy to Hostinger via SSH
      - name: Deploy to Hostinger
        env:
          HOST: ${{ secrets.HOSTINGER_HOST }}
          USER: ${{ secrets.HOSTINGER_USER }}
          KEY: ${{ secrets.HOSTINGER_SSH_KEY }}
        run: |
          mkdir -p ~/.ssh
          echo "$KEY" > ~/.ssh/id_rsa
          chmod 600 ~/.ssh/id_rsa
          ssh-keyscan -H $HOST >> ~/.ssh/known_hosts
          rsync -avz dist/ $USER@$HOST:~/public_html/
          rsync -avz server.js $USER@$HOST:~/public_html/api/
          ssh $USER@$HOST "cd ~/public_html/api && npm install --production && pm2 restart api"
```

---

## 📈 Monitoring & Logs

### Local Development
```bash
# Watch for errors
npm run dev:all

# Logs appear in terminal
# API logs: JSON formatted with timestamp, level, message
```

### Production (Hostinger)

**Via cPanel:**
1. Go to Application Manager
2. Click your Node.js app
3. View "View Logs" button

**Via SSH:**
```bash
# View PM2 logs
pm2 logs api

# View errors only
pm2 logs api --err
```

**Via Browser Console:**
```javascript
// Test API connection
fetch('/api/health')
  .then(r => r.json())
  .then(console.log)
```

---

## 🔧 Troubleshooting

### Frontend can't reach API

1. **Check `ALLOWED_ORIGINS`**:
   - Frontend URL must be in `ALLOWED_ORIGINS` in .env
   - Example: `ALLOWED_ORIGINS=https://yourdomain.com`

2. **Check API is running**:
   ```bash
   curl https://yourdomain.com/api/health
   # Should return: {"status":"ok",...}
   ```

3. **Check CORS headers**:
   ```bash
   curl -i -X OPTIONS https://yourdomain.com/api/health
   # Should see: Access-Control-Allow-Origin: https://yourdomain.com
   ```

### Backend won't start

1. **Check Node.js version**:
   ```bash
   node --version  # Should be v20+
   ```

2. **Check dependencies**:
   ```bash
   npm install
   npm list express helmet cors sharp
   ```

3. **Check .env file**:
   ```bash
   cat .env
   # Should have all required variables
   ```

4. **Check port is available**:
   ```bash
   lsof -i :3001
   # Kill if needed: kill -9 <PID>
   ```

### Database connection fails

1. **Verify Supabase URL and key**:
   ```bash
   # Test connection
   node -e "
   const { createClient } = require('@supabase/supabase-js');
   const c = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
   c.auth.getSession().then(() => console.log('✅ Connected')).catch(e => console.error('❌', e));
   "
   ```

2. **Check Supabase project is active** in dashboard

3. **Verify RLS policies** allow your user

### File uploads fail

1. **Check R2 credentials**:
   ```bash
   aws s3 ls s3://your-bucket/ \
     --endpoint-url https://your-account-id.r2.cloudflarestorage.com
   ```

2. **Check file size** (max 50MB)

3. **Check MIME type** (JPEG, PNG, WebP, GIF)

4. **Check R2 bucket exists** and is accessible

---

## 📦 Database Setup

Run migrations once (create tables, set up RLS):

```bash
# Via Supabase Dashboard:
1. Go to SQL Editor
2. Copy migrations from database-migrations.sql
3. Run each migration

# OR via psql (if you have CLI access):
psql "postgresql://..." < database-migrations.sql
```

See [database-migrations.sql](./database-migrations.sql) for schema details.

---

## 🎯 Summary

✅ **Single repository** - frontend and backend together  
✅ **One deployment** - build and deploy everything at once  
✅ **Easy management** - one git history, one CI/CD pipeline  
✅ **Shared dependencies** - use same Node.js, same build tools  
✅ **Flexible hosting** - deploy to Hostinger, Railway, Heroku, etc.  

**Next Step**: Follow the deployment section for your hosting provider!

---

**Last Updated**: 2026-07-07  
**Status**: ✅ Production Ready
