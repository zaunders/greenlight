This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


for deployment server:

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx -y

# Install Certbot for SSL
sudo apt install certbot python3-certbot-nginx -y



## ** Deployment Options for Hetzner:**

### **Option 1: Hetzner Cloud (Recommended)**
**Best for:** Full control, scalability, cost-effective

#### **Setup Steps:**
1. **Create Hetzner Cloud Server:**
   - Choose Ubuntu 22.04 LTS
   - CX11 (2GB RAM, 1 vCPU) for testing
   - CX21 (4GB RAM, 2 vCPU) for production
   - Add your SSH key

2. **Server Setup:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx -y

# Install Certbot for SSL
sudo apt install certbot python3-certbot-nginx -y
```

3. **Deploy Your App:**
```bash
<code_block_to_apply_changes_from>
```

4. **Configure Nginx:**
```nginx
# /etc/nginx/sites-available/greenlight
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

5. **Enable SSL:**
```bash
sudo certbot --nginx -d your-domain.com
```

### **Option 2: Hetzner Cloud + Docker**
**Best for:** Containerized deployment, easy scaling

#### **Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

#### **Docker Compose:**
```yaml
version: '3.8'
services:
  greenlight:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
    restart: unless-stopped
```

### **Option 3: Hetzner Cloud + GitHub Actions**
**Best for:** Automated deployments

#### **GitHub Actions Workflow:**
```yaml
name: Deploy to Hetzner

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to server
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.HETZNER_HOST }}
          username: ${{ secrets.HETZNER_USER }}
          key: ${{ secrets.HETZNER_SSH_KEY }}
          script: |
            cd /path/to/greenlight
            git pull origin main
            npm install
            npm run build
            pm2 restart greenlight
```

## **🔧 Environment Setup:**

### **Create .env.production:**
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NODE_ENV=production
```

### **Update Supabase Settings:**
1. **Go to Supabase Dashboard → Settings → API**
2. **Add your domain to allowed origins:**
   - `https://your-domain.com`
   - `http://localhost:3000` (for development)

## **📊 Monitoring & Maintenance:**

### **PM2 Commands:**
```bash
pm2 status          # Check app status
pm2 logs greenlight # View logs
pm2 restart greenlight # Restart app
pm2 monit           # Monitor resources
```

### **Nginx Commands:**
```bash
sudo nginx -t        # Test config
sudo systemctl reload nginx # Reload config
sudo systemctl status nginx # Check status
```

## **💰 Cost Estimation:**
- **CX11 (2GB RAM):** ~€4.15/month
- **CX21 (4GB RAM):** ~€8.30/month
- **Domain:** ~€10-15/year
- **SSL Certificate:** Free (Let's Encrypt)

## ** Quick Start Script:**

Would you like me to create a deployment script that automates the entire setup process? I can create a bash script that:

1. **Sets up the server environment**
2. **Installs all dependencies**
3. **Configures Nginx**
4. **Sets up SSL certificates**
5. **Deploys your app**

Just let me know which option you prefer, and I'll provide the detailed setup instructions or create the automation scripts for you!


