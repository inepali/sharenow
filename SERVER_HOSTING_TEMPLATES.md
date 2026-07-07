# Server Hosting Quick Setup Templates

Choose your hosting provider and follow the template below.

---

## ⚡ Railway (Recommended - Easiest & Cheapest)

**Cost**: $5-20/month | **Setup**: 5 minutes | **Features**: Auto-deploy, SSL included

### Quick Setup

```bash
# 1. Go to https://railway.app
# 2. Click "New Project"
# 3. Select "Deploy from GitHub"
# 4. Connect your GitHub account
# 5. Select this repository
# 6. Railway auto-detects Node.js project

# 7. Set Environment Variables in Railway Dashboard:
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
R2_ACCOUNT_ID=your_r2_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=your_bucket_name
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
NODE_ENV=production
PORT=3001

# 8. Railway will auto-deploy on git push
# Your API URL will be shown in dashboard
# Example: https://sharemy-shoot-api-prod.up.railway.app

# 9. Connect custom domain (optional)
# In Railway > Project > Settings > Custom Domain
# Add: api.yourdomain.com
```

### Railway Commands

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Deploy manually
railway up

# View logs
railway logs

# View variables
railway variable list
```

### Railway `railway.json` (Optional Config)

Create in root directory:

```json
{
  "name": "ShareMyShoot API",
  "build": {
    "builder": "nixpacks"
  },
  "deploy": {
    "startCommand": "node server/server-production.js"
  }
}
```

---

## 🚀 Render (Also Great - Good Free Tier)

**Cost**: Free (with limits) or $7+/month | **Setup**: 5 minutes | **Features**: Auto-deploy, SSL included

### Quick Setup

```bash
# 1. Go to https://render.com
# 2. Click "New +" → "Web Service"
# 3. Connect GitHub repository
# 4. Fill in:
#    - Name: sharemyshoot-api
#    - Environment: Node
#    - Build Command: npm install
#    - Start Command: node server/server-production.js
#    - Plan: Free (or Starter+ for production)

# 5. Add Environment Variables:
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
R2_ACCOUNT_ID=your_r2_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=your_bucket_name
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
NODE_ENV=production

# 6. Click "Create Web Service"
# Render auto-deploys on git push
```

### Render Custom Domain

```bash
# In Render Dashboard:
# Settings → Custom Domain
# Add: api.yourdomain.com
# 
# In your DNS provider, add CNAME:
# Name: api
# Value: [Render provided URL]
```

---

## 💜 Heroku (Easiest if Familiar)

**Cost**: $7-50/month | **Setup**: 10 minutes | **Features**: Well-documented, many tools

### Quick Setup

```bash
# 1. Install Heroku CLI
# https://devcenter.heroku.com/articles/heroku-cli

# 2. Login
heroku login

# 3. Create app
heroku create sharemyshoot-api

# 4. Set environment variables
heroku config:set SUPABASE_URL=https://your-project.supabase.co
heroku config:set SUPABASE_ANON_KEY=your_anon_key_here
heroku config:set R2_ACCOUNT_ID=your_r2_account_id
heroku config:set R2_ACCESS_KEY_ID=your_r2_access_key
heroku config:set R2_SECRET_ACCESS_KEY=your_r2_secret_key
heroku config:set R2_BUCKET_NAME=your_bucket_name
heroku config:set ALLOWED_ORIGINS=https://yourdomain.com
heroku config:set NODE_ENV=production

# 5. Create Procfile in root:
echo "web: node server/server-production.js" > Procfile

# 6. Deploy
git push heroku main

# 7. View logs
heroku logs --tail

# 8. Get your URL
heroku info sharemyshoot-api
# URL: https://sharemyshoot-api.herokuapp.com
```

### Heroku Custom Domain

```bash
heroku domains:add api.yourdomain.com

# In DNS provider, add CNAME:
# Name: api
# Value: [Heroku provided value]
```

---

## 🐳 DigitalOcean Droplet (Most Control)

**Cost**: $5-40/month | **Setup**: 30 minutes | **Features**: Full control, VPS

### Quick Setup Script

Save as `setup.sh` and run on your Droplet:

```bash
#!/bin/bash
set -e

# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs

# Install PM2
npm install -g pm2

# Create app directory
mkdir -p /var/www/sharemyshoot-api
cd /var/www/sharemyshoot-api

# Clone repository
git clone https://github.com/YOUR_USERNAME/sharenow.git .

# Install dependencies
npm install --production

# Copy production server
cp server/server-production.js ./

# Create .env file (you'll need to fill this in!)
cat > .env << 'EOF'
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
R2_ACCOUNT_ID=your_r2_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=your_bucket_name
ALLOWED_ORIGINS=https://yourdomain.com
NODE_ENV=production
PORT=3001
EOF

# Start with PM2
pm2 start server-production.js --name api
pm2 startup
pm2 save

# Install Nginx
apt install -y nginx

# Copy Nginx config (see below)
# Configure firewall
ufw allow 22
ufw allow 80
ufw allow 443
ufw enable

# Install SSL with Let's Encrypt
apt install -y certbot python3-certbot-nginx
certbot certonly --standalone -d api.yourdomain.com

# Restart Nginx
systemctl restart nginx
systemctl enable nginx
```

### DigitalOcean Manual SSH Steps

```bash
# 1. Connect to droplet
ssh root@your_droplet_ip

# 2. Run the script above, OR follow these steps:

# Update
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Create directory
sudo mkdir -p /var/www/sharemyshoot-api
cd /var/www/sharemyshoot-api

# Clone code
sudo git clone https://github.com/YOUR_USERNAME/sharenow.git .

# Install dependencies
sudo npm install --production

# Edit .env file
sudo nano .env

# Start server
sudo pm2 start server-production.js --name api
sudo pm2 startup
sudo pm2 save

# Check status
pm2 status
pm2 logs api

# View API
curl http://localhost:3001/api/health
```

### DigitalOcean Nginx Config

Create `/etc/nginx/sites-available/api`:

```nginx
upstream app {
    server 127.0.0.1:3001;
}

server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    add_header Strict-Transport-Security "max-age=31536000" always;

    location / {
        proxy_pass http://app;
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

Enable it:

```bash
sudo ln -s /etc/nginx/sites-available/api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🟠 AWS EC2 (Powerful but Complex)

**Cost**: $5-50+/month | **Setup**: 45 minutes | **Features**: Highly scalable

### Quick Setup

```bash
# 1. Launch EC2 Instance from AWS Console
#    - Select: Ubuntu 22.04 LTS
#    - Instance type: t3.micro (free tier)
#    - Create security group allowing: 22, 80, 443
#    - Create/use key pair for SSH

# 2. SSH into instance
ssh -i your-key.pem ubuntu@your-instance-ip

# 3. Install dependencies (same as DigitalOcean)
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 4. Follow DigitalOcean setup from here
npm install -g pm2
# ... (continue with directory setup, .env, etc.)

# 5. Optional: Allocate Elastic IP
#    - In AWS Console: Elastic IPs → Allocate
#    - Associate with your instance
#    - Use Elastic IP for DNS

# 6. Optional: Use AWS Secrets Manager for .env
aws secretsmanager create-secret \
  --name sharemyshoot-api-prod \
  --secret-string file://env.json
```

---

## Comparison Matrix

| Feature | Railway | Render | Heroku | DigitalOcean | AWS |
|---------|---------|--------|--------|--------------|-----|
| **Cost** | $5-20 | Free/$7+ | $7+ | $5+ | Free+ |
| **Setup Time** | 5 min | 5 min | 10 min | 30 min | 45 min |
| **Auto-deploy** | ✅ | ✅ | ✅ | ⚠️ | ❌ |
| **SSL** | ✅ Free | ✅ Free | ✅ Free | 🔨 Manual | 🔨 Manual |
| **Custom Domain** | ✅ Easy | ✅ Easy | ✅ Easy | ✅ Medium | ✅ Complex |
| **Environment Vars** | ✅ UI | ✅ UI | ✅ CLI/UI | 🔨 .env | 🔨 Secrets |
| **Scale Easily** | ✅ | ✅ | ⚠️ | ✅ | ✅✅ |
| **Monitoring** | Basic | Basic | Good | 🔨 Manual | Excellent |
| **Support** | Good | Good | Excellent | Community | Excellent |
| **Learning Curve** | Easy | Easy | Easy | Medium | Hard |
| **Recommended** | 🌟 Best | 🌟 Best | ✅ Good | ✅ Good | ⚠️ Advanced |

**Best for most projects**: Railway or Render

---

## Environment Variables Quick Copy-Paste

### For Railway/Render Dashboard:

```
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

### For Heroku CLI:

```bash
heroku config:set \
  SUPABASE_URL=https://your-project.supabase.co \
  SUPABASE_ANON_KEY=your_anon_key_here \
  R2_ACCOUNT_ID=your_r2_account_id \
  R2_ACCESS_KEY_ID=your_r2_access_key \
  R2_SECRET_ACCESS_KEY=your_r2_secret_key \
  R2_BUCKET_NAME=gallery-photos \
  ALLOWED_ORIGINS=https://yourdomain.com \
  NODE_ENV=production
```

### For DigitalOcean .env file:

```bash
cat > /var/www/sharemyshoot-api/.env << 'EOF'
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
R2_ACCOUNT_ID=your_r2_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=gallery-photos
ALLOWED_ORIGINS=https://yourdomain.com
NODE_ENV=production
PORT=3001
EOF
```

---

## Testing Your Deployment

After setup, run these commands to verify:

```bash
# 1. Test API health
curl https://api.yourdomain.com/api/health

# 2. Check response time
time curl https://api.yourdomain.com/api/health

# 3. Verify CORS headers
curl -H "Origin: https://yourdomain.com" \
  https://api.yourdomain.com/api/health

# 4. Test from browser console (replace with your domain)
fetch('https://api.yourdomain.com/api/health')
  .then(r => r.json())
  .then(console.log)
```

---

## Troubleshooting

### "502 Bad Gateway"
- ✅ Check if app is running
- ✅ Verify environment variables are set
- ✅ Check logs for errors
- ✅ Restart the service

### "Cannot connect to database"
- ✅ Verify SUPABASE_URL is correct
- ✅ Verify SUPABASE_ANON_KEY is correct
- ✅ Check Supabase project is active
- ✅ Test: `curl https://your-project.supabase.co`

### "CORS error in browser"
- ✅ Verify ALLOWED_ORIGINS includes your frontend domain
- ✅ Check for typos in domain
- ✅ Restart API after changing env vars
- ✅ Clear browser cache

### "Cannot upload files"
- ✅ Verify R2 credentials
- ✅ Test: `aws s3 ls s3://your-bucket/ --endpoint-url https://your-account-id.r2.cloudflarestorage.com`
- ✅ Check bucket name spelling

---

## Next Steps

1. Choose your provider above
2. Follow the quick setup
3. Set environment variables
4. Test with the verification commands
5. Deploy your frontend pointing to this API

Questions? See `SEPARATE_SERVER_DEPLOYMENT.md` for detailed guide.
