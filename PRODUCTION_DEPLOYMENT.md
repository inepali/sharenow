# Production Deployment Guide

## Overview
This document covers all necessary steps to deploy ShareMyShoot to production with security, reliability, and performance best practices.

## Phase 1: Pre-Deployment Checklist

### Security
- [ ] All secrets rotated and stored in GitHub Secrets, NOT in .env files
- [ ] .env file added to .gitignore
- [ ] No sensitive data in git history (use `git log --all -- .env`)
- [ ] ALLOWED_ORIGINS set to production domain(s) only
- [ ] HTTPS enforced on all endpoints
- [ ] Security headers configured (CSP, HSTS, etc.)
- [ ] Rate limiting configured for all API endpoints
- [ ] Input validation enabled on all endpoints

### Code Quality
- [ ] TypeScript strict mode enabled and no errors
- [ ] Linting passes: `npm run lint`
- [ ] Tests pass: `npm test`
- [ ] No console.log statements in production code
- [ ] Error handling implemented on all API endpoints
- [ ] Structured logging enabled

### Infrastructure
- [ ] Supabase production project configured
- [ ] R2 bucket configured and tested
- [ ] Database backups configured
- [ ] Monitoring and alerting setup
- [ ] Error tracking (Sentry) configured

## Phase 2: Environment Configuration

### GitHub Secrets
Configure the following secrets in GitHub Settings > Secrets and variables > Actions:

```
VITE_SUPABASE_PROJECT_ID        # Supabase project ID
VITE_SUPABASE_PUBLISHABLE_KEY   # Supabase anon key
VITE_SUPABASE_URL               # Supabase project URL
VITE_R2_PUBLIC_URL              # R2 public domain
SUPABASE_URL                    # Backend Supabase URL
SUPABASE_ANON_KEY               # Backend Supabase key
R2_ACCOUNT_ID                   # Cloudflare R2 account ID
R2_ACCESS_KEY_ID                # R2 access key
R2_SECRET_ACCESS_KEY            # R2 secret key
R2_BUCKET_NAME                  # R2 bucket name
ALLOWED_ORIGINS                 # Comma-separated domains
HOSTINGER_SSH_KEY               # SSH private key
HOSTINGER_HOST                  # Hosting server hostname
HOSTINGER_USER                  # SSH username
HOSTINGER_PATH                  # Deployment path
HOSTINGER_PORT                  # SSH port
```

### Environment Variables
Create `.env.production` on the server (NEVER commit):
```bash
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret
R2_BUCKET_NAME=your_bucket
PORT=3001
NODE_ENV=production
```

## Phase 3: Database Setup

### Supabase Configuration
1. Create tables if not already created:
   - `galleries`: Photo galleries
   - `sections`: Gallery sections
   - `photos`: Photo metadata
   - `print_orders`: Print orders
   - `favorites`: User favorites

2. Enable Row Level Security (RLS):
   ```sql
   ALTER TABLE galleries ENABLE ROW LEVEL SECURITY;
   ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
   ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
   ```

3. Create RLS policies:
   ```sql
   -- Only users can see their own galleries
   CREATE POLICY "Users see own galleries"
   ON galleries FOR SELECT
   USING (vendor_id = auth.uid());
   ```

4. Create indexes for performance:
   ```sql
   CREATE INDEX idx_galleries_vendor_id ON galleries(vendor_id);
   CREATE INDEX idx_sections_gallery_id ON sections(gallery_id);
   CREATE INDEX idx_photos_section_id ON photos(section_id);
   CREATE INDEX idx_photos_created_at ON photos(created_at);
   ```

### Backup Configuration
1. Enable automated backups in Supabase Settings
2. Set backup retention to 30+ days
3. Test restore procedure monthly

## Phase 4: Deployment Steps

### Manual Deployment
```bash
# 1. SSH to server
ssh -i ~/.ssh/id_ed25519 -p PORT user@host

# 2. Navigate to app directory
cd /path/to/app

# 3. Pull latest code
git pull origin main

# 4. Install dependencies
npm ci

# 5. Build frontend
npm run build

# 6. Restart backend service
pm2 restart sharemyshoot-api || pm2 start server-production.js --name sharemyshoot-api

# 7. Verify health
curl https://yourdomain.com/api/health
```

### Automated Deployment (GitHub Actions)
The CI/CD pipeline automatically:
1. Checks for exposed secrets
2. Runs linting and type checking
3. Builds the frontend
4. Deploys to Hostinger via rsync

Trigger manually via GitHub Actions tab.

## Phase 5: Post-Deployment Verification

### Health Checks
```bash
# API Health
curl https://yourdomain.com/api/health

# Frontend loads
curl https://yourdomain.com | grep -q "ShareMyShoot"

# Authentication works
curl -H "Authorization: Bearer $TOKEN" https://yourdomain.com/api/gallery-stats
```

### Monitoring
1. Check Supabase dashboard for errors
2. Monitor R2 storage usage
3. Review application logs
4. Verify error tracking (if configured)

### Performance Baseline
- [ ] Frontend loads in < 2s
- [ ] API response time < 500ms
- [ ] Database queries < 200ms
- [ ] Zero TypeScript errors

## Phase 6: Ongoing Operations

### Daily
- Monitor error logs and alerts
- Check API health endpoint

### Weekly
- Review performance metrics
- Check storage costs (R2)
- Verify backups are running

### Monthly
- Test database restore procedure
- Review security logs
- Update dependencies if needed
- Performance optimization review

## Rollback Procedure

If deployment fails:

```bash
# 1. SSH to server
ssh -i ~/.ssh/id_ed25519 -p PORT user@host

# 2. Rollback to previous version
git reset --hard HEAD~1
git push --force origin main

# 3. Rebuild and restart
npm ci && npm run build
pm2 restart sharemyshoot-api

# 4. Notify team and investigate
```

## Security Reminders

⚠️ **CRITICAL**:
- NEVER commit .env files
- NEVER share access keys
- ALWAYS use HTTPS
- ALWAYS validate user input
- ALWAYS authenticate API requests
- ALWAYS log security events
- ALWAYS rotate credentials regularly (every 90 days)

## Troubleshooting

### API not starting
```bash
# Check logs
pm2 logs sharemyshoot-api

# Verify environment variables
env | grep -E "SUPABASE|R2|ALLOWED"

# Check port 3001
lsof -i :3001
```

### Database connection errors
```bash
# Verify SUPABASE_URL is correct
echo $SUPABASE_URL

# Test connection
node -e "const { createClient } = require('@supabase/supabase-js'); const c = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY); console.log('OK');"
```

### R2 upload failures
```bash
# Verify credentials
echo "$R2_ACCESS_KEY_ID"
echo "$R2_BUCKET_NAME"

# Test S3 connection
aws s3 ls s3://$R2_BUCKET_NAME/ --endpoint-url https://$R2_ACCOUNT_ID.r2.cloudflarestorage.com
```

## Support & Escalation

- **API Errors**: Check server logs via `pm2 logs`
- **Database Issues**: Check Supabase dashboard
- **Deployment Failures**: Review GitHub Actions workflow logs
- **Performance Issues**: Use browser DevTools and Supabase analytics

## Version Control

Current production version: TBD
Last deployment: TBD
Last backup: TBD

Document these dates and commit them to this file after each deployment.
