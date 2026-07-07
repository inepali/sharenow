# Server Separation Guide

Complete guide for managing ShareMyShoot as a multi-repository project with separated frontend and backend.

## Repository Structure

### Frontend Repository
**Repository**: https://github.com/inepali/sharenow  
**Purpose**: React application, static files  
**Hosting**: Hostinger public_html/  
**Files**:
- React components
- Frontend styling
- Build output (dist/)

### Backend/API Repository
**Repository**: https://github.com/inepali/sharenowapi  
**Purpose**: Node.js API server  
**Hosting**: Hostinger applications/api/ OR Railway/Render/Heroku/etc  
**Files**:
- server-production.js
- package.json
- Environment configuration
- Deployment scripts

---

## Development Workflow

### Clone Both Repositories

```bash
# Clone frontend
git clone https://github.com/inepali/sharenow.git sharenow
cd sharenow

# Clone backend (in different directory)
git clone https://github.com/inepali/sharenowapi.git sharenowapi
cd sharenowapi
```

### Run Both Services Locally

**Terminal 1 - Frontend**:
```bash
cd sharenow
npm install
npm run dev
# Runs on http://localhost:5173
```

**Terminal 2 - Backend**:
```bash
cd sharenowapi
npm install
cp .env.example .env
# Edit .env with development credentials
npm run dev
# Runs on http://localhost:3001
```

**Terminal 3 - Monitor** (optional):
```bash
cd sharenowapi
npm run test:watch
```

### Frontend Environment for Development

Create `sharenow/.env.development`:
```
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_key
VITE_R2_PUBLIC_URL=https://your-bucket.r2.dev
```

---

## Deployment Workflow

### Frontend Deployment (Hostinger)

```bash
cd sharenow

# Build
npm run build

# Upload to Hostinger
scp -r -P 65002 dist/* u123456@yourdomain.com:~/public_html/
```

### Backend Deployment (Your Choice of Platform)

#### Option A: Hostinger

```bash
cd sharenowapi

# Upload to Hostinger
scp -r -P 65002 . u123456@yourdomain.com:~/applications/api/

# SSH and start
ssh -p 65002 u123456@yourdomain.com
cd ~/applications/api
npm install --production
pm2 restart api
```

#### Option B: Railway (Auto-Deploy)

```bash
cd sharenowapi

# Just push to main
git push origin main
# Railway automatically deploys
```

#### Option C: Other Platforms

See `sharenowapi/DEPLOYMENT.md` for:
- Render
- Heroku
- DigitalOcean
- AWS EC2

---

## File Structure

```
your-projects/
│
├── sharenow/                    # Frontend repo
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── .env.example
│   ├── .env.development
│   ├── .env.production
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── README.md
│
└── sharenowapi/                 # Backend repo
    ├── server-production.js
    ├── package.json
    ├── .env.example
    ├── .env.development
    ├── .github/workflows/
    ├── DEPLOYMENT.md
    ├── API_DOCUMENTATION.md
    ├── SECURITY.md
    └── README.md
```

---

## Environment Configuration

### Frontend Environments

**Development** (`.env.development`):
```
VITE_API_URL=http://localhost:3001
```

**Production** (`.env.production`):
```
VITE_API_URL=https://api.yourdomain.com
```

### Backend Environments

**Development** (`.env`):
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
R2_ACCOUNT_ID=your_r2_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=gallery-photos
ALLOWED_ORIGINS=http://localhost:5173
NODE_ENV=development
PORT=3001
```

**Production** (`.env`):
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

---

## CI/CD & Deployment

### Frontend CI/CD

Configured in: `sharenow/.github/workflows/deploy.yml`

On push to main:
1. Lint and type check
2. Build (npm run build)
3. Deploy to Hostinger

### Backend CI/CD

Configured in: `sharenowapi/.github/workflows/deploy.yml`

On push to main:
1. Lint and test
2. Security checks
3. Deploy to selected platform:
   - Railway (auto-deploy)
   - Heroku
   - Hostinger (SSH deploy)

---

## Database Setup

Database is shared (Supabase), so set up once:

```bash
# SSH to any server or use Supabase dashboard
# Run migrations

psql your-connection-string < sharenowapi/database-migrations.sql
```

Or use Supabase SQL Editor to run migrations.

---

## Versioning Strategy

### Frontend
```
sharenow/
├── v0.x - Alpha/Beta
├── v1.x - Production
└── v2.x - Future versions
```

### Backend
```
sharenowapi/
├── v0.x - Alpha/Beta
├── v1.x - Production
└── v2.x - Future versions
```

Tag releases:
```bash
# Frontend
cd sharenow
git tag -a v1.0.0 -m "Release 1.0.0"
git push origin v1.0.0

# Backend
cd sharenowapi
git tag -a v1.0.0 -m "Release 1.0.0"
git push origin v1.0.0
```

---

## Dependency Management

### Frontend Dependencies
- Managed in: `sharenow/package.json`
- Command: `npm update` or `npm install`
- Check: `npm outdated`

### Backend Dependencies
- Managed in: `sharenowapi/package.json`
- Command: `npm update` or `npm install`
- Check: `npm outdated`
- Security: `npm audit`

Update independently - no shared dependencies between repos.

---

## Communication Between Repos

### Frontend Calling Backend API

Frontend makes HTTP requests to backend:

```typescript
// Frontend code
const API_URL = import.meta.env.VITE_API_URL;

fetch(`${API_URL}/api/upload`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

Backend responds with JSON:

```javascript
// Backend code
app.post('/api/upload', async (req, res) => {
  // Process request
  res.json({ success: true, photo: data });
});
```

### No Direct Code Sharing

Never import code between repositories. Share only:
- API specifications (documented in API_DOCUMENTATION.md)
- Database schema (migrations.sql)
- Type definitions (if needed, document separately)

---

## Team Collaboration

### Multiple Developers

**Developer A - Frontend Only**:
```bash
git clone https://github.com/inepali/sharenow.git
cd sharenow
npm install
npm run dev
```

**Developer B - Backend Only**:
```bash
git clone https://github.com/inepali/sharenowapi.git
cd sharenowapi
npm install
npm run dev
```

**Developer C - Full Stack**:
```bash
git clone https://github.com/inepali/sharenow.git
git clone https://github.com/inepali/sharenowapi.git
# Run both services locally
```

### Code Review

Frontend PRs reviewed in: https://github.com/inepali/sharenow/pulls  
Backend PRs reviewed in: https://github.com/inepali/sharenowapi/pulls

---

## Troubleshooting

### Frontend can't reach API

1. Check `VITE_API_URL` in .env
2. Verify backend is running
3. Check CORS headers: `ALLOWED_ORIGINS` in backend .env
4. Test: `curl https://api.yourdomain.com/api/health`

### Backend won't start

1. Check Node.js version: `node --version` (need v20+)
2. Check dependencies: `npm install`
3. Check .env file exists
4. Check port isn't in use: `lsof -i :3001`
5. View logs: `npm run dev` or `pm2 logs api`

### Database connection issues

1. Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY`
2. Check Supabase project is active
3. Test connection manually:
   ```bash
   node -e "const {createClient} = require('@supabase/supabase-js'); const c = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY); c.auth.getSession().then(() => console.log('OK')).catch(e => console.error(e));"
   ```

### File upload issues

1. Verify R2 credentials in .env
2. Test R2 connection:
   ```bash
   aws s3 ls s3://your-bucket/ --endpoint-url https://your-account-id.r2.cloudflarestorage.com
   ```
3. Check file size (max 50MB)
4. Check file type (JPEG, PNG, WebP, GIF)

---

## Monitoring & Logs

### Frontend Logs
```bash
cd sharenow
npm run dev
# Browser DevTools Console
```

### Backend Logs
```bash
# Development
cd sharenowapi
npm run dev

# Production (PM2)
pm2 logs api

# Production (Heroku)
heroku logs --tail

# Production (Railway)
# Check dashboard
```

---

## Making Changes

### Frontend Change

```bash
cd sharenow
git checkout -b feature/my-feature
# Make changes
git commit -m "feat: my feature"
git push origin feature/my-feature
# Open PR on GitHub
```

### Backend Change

```bash
cd sharenowapi
git checkout -b feature/my-feature
# Make changes
git commit -m "feat: my feature"
git push origin feature/my-feature
# Open PR on GitHub
```

### Database Change

Document in: `sharenowapi/database-migrations.sql`

```bash
cd sharenowapi
git checkout -b feature/db-change
# Update migrations.sql
git commit -m "feat: add new table"
git push origin feature/db-change
# Open PR, review, then run migrations in production
```

---

## Rollback Procedures

### Frontend Rollback

```bash
cd sharenow
git revert <commit-hash>
git push origin main
# Redeploy
npm run build
scp -r dist/* u123456@yourdomain.com:~/public_html/
```

### Backend Rollback

```bash
cd sharenowapi
git revert <commit-hash>
git push origin main
# Auto-deploys to selected platform
# OR manually restart with PM2:
pm2 restart api
```

---

## Performance Tips

### Frontend
- Use lazy loading for routes
- Optimize images
- Enable gzip compression
- Cache static assets

### Backend
- Use connection pooling
- Cache frequently accessed data
- Implement pagination
- Monitor response times

### Database
- Use indexes (already configured)
- Enable RLS policies
- Regular backups

### Storage
- Resize images on upload
- Use CDN for image delivery
- Set cache headers

---

## Security Checklist

Both Repositories:
- [ ] No .env files in git
- [ ] Secrets in GitHub Secrets
- [ ] HTTPS on all connections
- [ ] JWT authentication working
- [ ] CORS properly configured
- [ ] Input validation in place
- [ ] Rate limiting enabled
- [ ] Error handling doesn't leak info
- [ ] Database RLS policies active
- [ ] Regular security updates

---

## Next Steps

1. **Set Up sharenowapi Repository**
   - See `SETUP_SHARENOWAPI_REPO.md` for detailed steps

2. **Configure GitHub Actions**
   - Add secrets for your chosen deployment platform
   - Update workflow files as needed

3. **Test Both Locally**
   - Run frontend and backend together
   - Verify API communication works

4. **Deploy to Production**
   - Frontend to Hostinger
   - Backend to chosen platform
   - Verify health checks

5. **Monitor**
   - Check logs regularly
   - Monitor performance
   - Update dependencies

---

**Summary**: You now have a clean separation with:
- ✅ Independent frontend repository
- ✅ Independent backend repository
- ✅ Separate CI/CD pipelines
- ✅ Flexible deployment options
- ✅ Easier team collaboration
- ✅ Production-ready setup

---

For detailed deployment instructions, see:
- `sharenow/DEPLOYMENT.md` - Frontend deployment
- `sharenowapi/DEPLOYMENT.md` - Backend deployment
