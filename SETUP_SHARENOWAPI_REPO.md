# Setup ShareNowAPI Repository

Instructions for setting up the separate https://github.com/inepali/sharenowapi.git repository.

## Files to Copy

### 1. Core Server File
```bash
# Copy the production server
cp server/server-production.js /path/to/sharenowapi/
```

### 2. Package.json
Create `/path/to/sharenowapi/package.json`:
```json
{
  "name": "sharenowapi",
  "version": "1.0.0",
  "description": "Production-ready Node.js backend API for ShareMyShoot",
  "type": "module",
  "main": "server-production.js",
  "scripts": {
    "start": "node server-production.js",
    "start:prod": "NODE_ENV=production node server-production.js",
    "dev": "node --watch server-production.js",
    "lint": "eslint .",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "test:watch": "vitest --watch"
  },
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=10.0.0"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.1079.0",
    "@supabase/supabase-js": "^2.75.1",
    "cors": "^2.8.6",
    "dotenv": "^17.4.2",
    "express": "^5.2.1",
    "express-rate-limit": "^7.1.5",
    "helmet": "^7.1.0",
    "multer": "^2.2.0",
    "sharp": "^0.35.3",
    "zod": "^3.25.76"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/multer": "^1.4.11",
    "@types/node": "^22.16.5",
    "eslint": "^9.32.0",
    "vitest": "^1.2.2"
  }
}
```

### 3. Environment Template
Create `.env.example`:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
R2_ACCOUNT_ID=your_r2_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=gallery-photos
ALLOWED_ORIGINS=https://yourdomain.com
NODE_ENV=production
PORT=3001
```

### 4. .gitignore
```
.env
.env.local
.env.*.local
node_modules
npm-debug.log*
.DS_Store
.vscode
.idea
coverage/
dist/
build/
.pm2/
```

### 5. Documentation Files
- README.md - Project overview and quick start
- DEPLOYMENT.md - Deployment guides for all platforms
- API_DOCUMENTATION.md - Complete API reference
- SECURITY.md - Security policies
- database-migrations.sql - Database schema

### 6. GitHub Actions
Create `.github/workflows/deploy.yml` - CI/CD pipeline

## Setup Steps

```bash
# 1. Clone the empty repository
git clone https://github.com/inepali/sharenowapi.git
cd sharenowapi

# 2. Copy all files from main repo
# Copy server-production.js
# Copy package.json
# Copy .env.example
# Copy .gitignore
# Copy README.md, DEPLOYMENT.md, API_DOCUMENTATION.md, SECURITY.md
# Copy database-migrations.sql
# Create .github/workflows/deploy.yml

# 3. Stage all files
git add -A

# 4. Commit initial setup
git commit -m "Initial server repository setup"

# 5. Push to GitHub
git push -u origin main
```

## File Structure (Final)

```
sharenowapi/
├── server-production.js          # Main server file
├── package.json                  # Dependencies
├── .env.example                  # Environment template
├── .gitignore                    # Git ignore rules
├── README.md                     # Project overview
├── DEPLOYMENT.md                 # Deployment guides
├── API_DOCUMENTATION.md          # API reference
├── SECURITY.md                   # Security policy
├── database-migrations.sql       # Database schema
├── .github/
│   └── workflows/
│       └── deploy.yml            # CI/CD pipeline
└── .git/                         # Git repository
```

## Next Steps

1. Copy all files to sharenowapi repository
2. Update environment variables as needed
3. Add GitHub secrets for CI/CD:
   - `RAILWAY_TOKEN` (if using Railway)
   - `HEROKU_API_KEY`, `HEROKU_APP_NAME`, `HEROKU_EMAIL` (if using Heroku)
   - `HOSTINGER_SSH_KEY`, `HOSTINGER_HOST`, etc. (if using Hostinger)
4. Push to GitHub
5. Deploy using chosen platform (see DEPLOYMENT.md)

## Updating Frontend

Update frontend repository to point to API server:

In `frontend/.env.production`:
```
VITE_API_URL=https://api.yourdomain.com
```

In `frontend/.env.development`:
```
VITE_API_URL=http://localhost:3001
```

## API Server is Now Separate

Benefits:
✓ Independent versioning
✓ Separate deployment pipeline
✓ Easier team collaboration
✓ Flexible hosting options
✓ Cleaner git history
✓ Independent CI/CD

---

Use this guide to fully set up the sharenowapi repository for production deployment.
