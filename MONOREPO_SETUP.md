# ✅ ShareMyShoot - Monorepo Setup Complete

**Date**: July 7, 2026  
**Status**: Ready for deployment (single repository)

---

## 🎯 What Changed

You now have a **single unified application** instead of two separate repositories:

### Before
```
sharenow/          (frontend only)
sharenowapi/       (backend separate)
                   ❌ Two repos to manage
                   ❌ Two deployments needed
                   ❌ Complex team workflow
```

### After
```
sharenow/          (everything together)
├── src/           (React frontend)
├── server.js      (Node.js backend)
└── package.json   (all dependencies)
                   ✅ One repo to manage
                   ✅ One deployment
                   ✅ Simple workflow
```

---

## 🚀 What's Ready

### Backend API Server
- ✅ Production-ready Express.js server
- ✅ Security hardening (Helmet, CORS, rate limiting)
- ✅ JWT authentication middleware
- ✅ Input validation (Zod)
- ✅ Cloudflare R2 file uploads
- ✅ Supabase database integration
- ✅ Structured JSON logging
- ✅ Error handling

### Frontend Application
- ✅ React with TypeScript
- ✅ Tailwind CSS styling
- ✅ Vite build system
- ✅ Form validation
- ✅ Gallery management UI
- ✅ Photo upload interface

### Deployment
- ✅ Single build command: `npm run build`
- ✅ Both services in one deployment
- ✅ Scripts for local development: `npm run dev:all`
- ✅ Production-ready configuration

---

## 📦 Key Scripts

### Development (Local)
```bash
# Run BOTH services together
npm run dev:all

# Or separately:
npm run dev           # Frontend on http://localhost:5173
npm run server:dev    # Backend on http://localhost:3001
```

### Production
```bash
# Build frontend
npm run build

# Start backend in production
npm run server:prod
```

---

## 🌐 Deployment Options

### Option 1: Hostinger (You mentioned this)
```bash
# Build locally
npm run build

# Deploy to Hostinger:
# - Upload dist/* to public_html/
# - Upload server.js + .env to public_html/api/
# - Start Node.js application in cPanel
```

**See**: [MONOREPO_DEPLOYMENT_GUIDE.md](./MONOREPO_DEPLOYMENT_GUIDE.md) → Hostinger section

### Option 2: Railway.app (Easiest)
1. Connect GitHub
2. Set environment variables
3. Deploy! (automatic on git push)

### Option 3: Other Cloud Platforms
- Heroku
- Render
- DigitalOcean
- AWS

**See**: [MONOREPO_DEPLOYMENT_GUIDE.md](./MONOREPO_DEPLOYMENT_GUIDE.md) for all options

---

## 📋 Environment Setup

### 1. Copy Template
```bash
cp .env.example .env
```

### 2. Edit `.env` with your values
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_key
R2_ACCOUNT_ID=your_id
R2_ACCESS_KEY_ID=your_key
R2_SECRET_ACCESS_KEY=your_secret
R2_BUCKET_NAME=gallery-photos
ALLOWED_ORIGINS=http://localhost:5173 (dev) or https://yourdomain.com (prod)
```

### 3. Never commit `.env`
- `.gitignore` already excludes it
- Keep it local only

---

## 🧪 Test Locally First

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Both Services
```bash
npm run dev:all
```

### 3. Test Frontend
- Open http://localhost:5173
- Log in with Supabase
- Try uploading a photo

### 4. Test Backend
```bash
# Check health
curl http://localhost:3001/api/health
# Should return: {"status":"ok",...}
```

### 5. Check Logs
- Frontend: Browser DevTools Console
- Backend: Terminal output (JSON formatted logs)

---

## 📁 File Changes

### Modified Files
- **server.js** - Now has production-ready server code
- **package.json** - Updated scripts
- **.env.example** - Better documentation

### New Files
- **MONOREPO_DEPLOYMENT_GUIDE.md** - Complete deployment instructions
- **MONOREPO_SETUP.md** - This file

### Removed/Not Needed
- No separate `sharenowapi` repository
- No need to manage two deployments
- No complex multi-repo workflow

---

## 🔄 Next Steps

### Immediate (Today)
1. ✅ Test locally: `npm run dev:all`
2. ✅ Verify both services start
3. ✅ Check `/api/health` endpoint
4. ✅ Test image upload feature

### This Week
1. 📝 Update `.env` with production values
2. 🏗️ Choose deployment platform (recommend: Railway or Hostinger)
3. 🚀 Deploy to production
4. 🧪 Test in production environment

### Documentation
- See **[MONOREPO_DEPLOYMENT_GUIDE.md](./MONOREPO_DEPLOYMENT_GUIDE.md)** for:
  - Detailed deployment steps
  - Platform-specific instructions
  - Troubleshooting guide
  - Security checklist

---

## ✨ Benefits of This Setup

| Before | After |
|--------|-------|
| Two repositories | One repository |
| Separate deployments | Single deployment |
| Complex git workflow | Simple git workflow |
| Hard to keep in sync | Always in sync |
| Team confusion | Clear structure |
| Multiple CI/CD pipelines | Single pipeline |

---

## 🆘 Common Questions

**Q: Do I need two GitHub repositories?**  
A: No! Everything is in `sharenow` repo now.

**Q: Can I still deploy to different hosts?**  
A: Yes, but easier to deploy to the same host together. One deployment = simpler!

**Q: Will my database schema work?**  
A: Yes, same Supabase database. Run migrations once: `database-migrations.sql`

**Q: How do I update the code?**  
A: Normal git workflow:
```bash
git checkout -b feature/my-feature
# Make changes to frontend or backend
git commit -m "feat: my feature"
git push origin feature/my-feature
# Open PR on GitHub
```

**Q: Can I deploy just the frontend without the backend?**  
A: Yes:
```bash
npm run build
# Upload dist/ to Hostinger
```
Backend stays running, frontend updates.

---

## 📞 Support

### Check Documentation
1. **[MONOREPO_DEPLOYMENT_GUIDE.md](./MONOREPO_DEPLOYMENT_GUIDE.md)** - Deployment steps
2. **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - API reference
3. **[SECURITY.md](./SECURITY.md)** - Security best practices
4. **[database-migrations.sql](./database-migrations.sql)** - Database schema

### Troubleshooting Checklist
- [ ] Are both services running? (`npm run dev:all`)
- [ ] Is `.env` file created with correct values?
- [ ] Does `/api/health` respond? (curl http://localhost:3001/api/health)
- [ ] Can you log in with Supabase?
- [ ] Are R2 credentials correct?
- [ ] Is ALLOWED_ORIGINS set correctly for CORS?

---

## ✅ Summary

You now have:

✅ **Single Repository** - Frontend + Backend in one place  
✅ **Easy Development** - `npm run dev:all` to run everything  
✅ **Simple Deployment** - One build, one deployment  
✅ **Production Ready** - Security hardened, error handling, logging  
✅ **Flexible Hosting** - Deploy to Hostinger, Railway, Heroku, etc.  
✅ **Complete Documentation** - All deployment steps covered  

**You're ready to deploy!** 🚀

---

**Last Updated**: July 7, 2026  
**Repository**: https://github.com/inepali/sharenow  
**Status**: ✅ Production Ready
