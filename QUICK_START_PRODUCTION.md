# Quick Start: Production Launch

## 30-Minute Pre-Launch Checklist

### 1. Setup Environment (5 min)
```bash
# Create .env.production on server
cat > .env.production << 'EOF'
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_key_here
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret
R2_BUCKET_NAME=your_bucket
PORT=3001
NODE_ENV=production
EOF

# Verify it's NOT in git
git status | grep -q ".env.production" || echo "✓ .env not in git"
```

### 2. Database Setup (5 min)
```sql
-- Run in Supabase SQL Editor
-- Copy contents of database/migrations.sql
-- Execute all migrations
-- Verify RLS is enabled:
SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename IN ('galleries', 'sections', 'photos');
```

### 3. Dependencies (5 min)
```bash
# Install new security packages
npm install --save \
  express-rate-limit \
  helmet \
  zod

# Verify installation
npm list express-rate-limit helmet zod
```

### 4. Build & Test (10 min)
```bash
# Type check
npx tsc --noEmit

# Lint
npm run lint --if-present

# Build frontend
npm run build

# Verify build output
ls -la dist/
```

### 5. Final Verification (5 min)
```bash
# Check for secrets in code
! grep -r "VITE_SUPABASE_PUBLISHABLE_KEY\|R2_SECRET" src/ --include="*.js" --include="*.ts"

# Verify .env is in .gitignore
grep -q ".env" .gitignore && echo "✓ .env protected"

# Check git status
git status | head -20
```

---

## Launch Commands

### Terminal 1: Backend API
```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Run production server
npm run start:prod
# OR with PM2 for process management
pm2 start server-production.js --name sharemyshoot-api
```

### Terminal 2: Monitor
```bash
# Watch logs
pm2 logs sharemyshoot-api --tail 100

# Monitor system
pm2 monit
```

### Test API Health
```bash
curl http://localhost:3001/api/health

# Should return:
# {"status":"ok","timestamp":"2024-01-15T10:30:00Z","uptime":123}
```

---

## Deployment to Hostinger

```bash
# 1. Build everything locally
npm run build

# 2. Commit changes (except .env)
git add -A
git commit -m "feat: production-ready deployment"

# 3. Push to main (triggers auto-deploy)
git push origin main

# 4. GitHub Actions will:
#    ✓ Check for secrets
#    ✓ Run linting
#    ✓ Run type checks
#    ✓ Build frontend
#    ✓ Deploy to Hostinger via rsync

# 5. Monitor deployment progress
# Go to: https://github.com/your-repo/actions

# 6. Verify production
curl https://yourdomain.com/api/health
```

---

## Monitoring After Launch

### First Hour Checks
- [ ] API responding (`/api/health`)
- [ ] Frontend loads without errors
- [ ] Authentication works
- [ ] Error logs are clean
- [ ] No 500 errors in logs

### First Day Checks
- [ ] No spike in error rates
- [ ] Response times normal (< 500ms)
- [ ] Database connections stable
- [ ] R2 uploads working
- [ ] Rate limiting functioning

### Troubleshooting

#### API won't start
```bash
# Check environment variables
env | grep -E "SUPABASE|R2|ALLOWED"

# Check logs
pm2 logs

# Verify ports are free
lsof -i :3001
```

#### Database connection errors
```bash
# Test Supabase connection
node << 'EOF'
const { createClient } = require('@supabase/supabase-js');
const c = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);
c.auth.getSession().then(console.log);
EOF
```

#### File uploads failing
```bash
# Test R2 connection
aws s3 ls s3://$R2_BUCKET_NAME/ \
  --endpoint-url https://$R2_ACCOUNT_ID.r2.cloudflarestorage.com \
  --region auto
```

---

## Quick Reference

### Environment Variables
```
SUPABASE_URL               ← Database
SUPABASE_ANON_KEY         ← Database key
R2_*                      ← Storage
ALLOWED_ORIGINS           ← CORS allowed domains
PORT                      ← Server port (default 3001)
NODE_ENV                  ← Set to "production"
```

### Key Endpoints
```
GET  /api/health              ← Health check
POST /api/upload              ← Upload image (auth required)
POST /api/gallery-stats       ← Get storage stats (auth required)
GET  /api/settings            ← Get settings (auth required)
POST /api/settings            ← Update settings (auth required, limited)
```

### Useful Commands
```bash
# Restart API
pm2 restart sharemyshoot-api

# Rebuild frontend
npm run build

# Check TypeScript
npx tsc --noEmit

# Lint code
npm run lint

# Run tests
npm test

# View logs
pm2 logs sharemyshoot-api
```

### Files to Know
```
.env.production           ← Production secrets (not in git)
server/server-production.js  ← Production API server
SECURITY.md               ← Security policy
API_DOCUMENTATION.md      ← API reference
PRODUCTION_DEPLOYMENT.md  ← Detailed deployment guide
database/migrations.sql   ← Database setup
```

---

## Rollback (If Needed)

```bash
# 1. Stop the server
pm2 stop sharemyshoot-api

# 2. Revert to previous version
git reset --hard HEAD~1

# 3. Rebuild and restart
npm run build
pm2 start sharemyshoot-api

# 4. Verify
curl http://localhost:3001/api/health
```

---

## Success Criteria

Launch is successful when:
- ✅ API health endpoint responds
- ✅ Frontend loads without errors
- ✅ Users can authenticate
- ✅ File uploads work
- ✅ Error logs are clean
- ✅ No TypeScript errors
- ✅ Security headers present
- ✅ Rate limiting works

---

## Need Help?

1. **Check logs**: `pm2 logs`
2. **Review docs**: See PRODUCTION_DEPLOYMENT.md
3. **Test locally**: Run `npm run dev` first
4. **Check GitHub**: Review Actions workflow status

---

## Post-Launch (Next 24 Hours)

### Essential
- [ ] Monitor error rates
- [ ] Monitor API response times
- [ ] Check database performance
- [ ] Verify backup process

### Recommended
- [ ] Set up monitoring alerts
- [ ] Configure error tracking (Sentry)
- [ ] Review security logs
- [ ] Document any issues

---

## Celebrate! 🎉

Your production-ready ShareMyShoot is now live!

Next: Configure monitoring, analytics, and schedule regular security reviews.
