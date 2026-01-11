# Deployment Guide - Inventory Management System

This guide walks you through deploying the Inventory Management System to Vercel.

## Prerequisites

- Node.js 18 or higher
- npm 9 or higher
- Git
- GitHub account
- Vercel account (free tier available)

## Step 1: Prepare Environment Variables

### 1.1 Generate Session Secret

Generate a strong random secret for session encryption:

```bash
# Using OpenSSL (macOS/Linux)
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Save this value - you'll need it for Vercel configuration.

### 1.2 Review .env.example

The `.env.example` file contains all required environment variables:

```env
DATABASE_URL="postgresql://user:password@host:5432/inventory"
SESSION_SECRET="your-generated-secret-from-step-1.1"
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"
```

## Step 2: Push to GitHub

Your code should already be in a GitHub repository. If not:

```bash
# Initialize git repository
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - ready for deployment"

# Create GitHub repository and push
gh repo create inventory --public --source=. --remote=origin --push
```

## Step 3: Deploy to Vercel

### 3.1 Install Vercel CLI (Optional)

```bash
npm install -g vercel
```

### 3.2 Deploy via Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com)
2. Sign in with your GitHub account
3. Click "Add New Project"
4. Import your GitHub repository
5. Configure project:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./`
   - **Build Command**: `npm run vercel-build` (migrations optional; set `PRISMA_MIGRATE_DEPLOY=1` to enable)
   - **Output Directory**: `.next` (default)

### 3.3 Configure Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add:

| Name | Value | Environment |
|------|-------|-------------|
| `DATABASE_URL` | (will be set in Step 4) | Production |
| `POSTGRES_URL` | Direct PostgreSQL URL (same as `DATABASE_URL` is OK) | Production |
| `SESSION_SECRET` | Your generated secret from Step 1.1 | Production |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` | Production |

**Note**: Leave `DATABASE_URL` empty for now - it will be automatically set when you create the database.

### 3.4 Deploy

Click "Deploy" button. Vercel will:
1. Clone your repository
2. Install dependencies
3. Run build
4. Deploy to production

**First deployment will fail** because the database is not set up yet. This is expected.

## Step 4: Set Up Database

### 4.1 Create Vercel Postgres Database

1. In your Vercel project dashboard, go to **Storage** tab
2. Click "Create Database"
3. Select **Postgres**
4. Choose a database name (e.g., `inventory-db`)
5. Select a region (choose closest to your users)
6. Click "Create"

### 4.2 Verify Database Connection

Vercel will automatically:
- Create the PostgreSQL database
- Set `DATABASE_URL` environment variable
- Set `POSTGRES_*` helper variables

Verify in Settings → Environment Variables that `DATABASE_URL` and `POSTGRES_URL` are now set.

### 4.3 Run Database Migrations

#### Option A: Using Vercel CLI

```bash
# Login to Vercel
vercel login

# Link your project
vercel link

# Run migration
vercel env pull .env.production
npm run db:migrate:deploy
```

#### Option B: Using Vercel Terminal

1. Go to your Vercel project dashboard
2. Click on **Settings** → **Functions**
3. Enable "Enable Terminal" (if available)
4. Open terminal and run:

```bash
npx prisma migrate deploy
```

#### Option C: Run migration during build

Set the environment variable `PRISMA_MIGRATE_DEPLOY=1` and redeploy to run
`prisma migrate deploy` as part of the build.

### 4.4 Seed Initial Data

Run the seed script to create the admin user and initial data:

```bash
# Using Vercel CLI
vercel env pull .env.production
npm run db:seed

# Or use Vercel Terminal
npx prisma db seed
```

### 4.5 Redeploy

After database setup, trigger a new deployment:

1. Go to Vercel Dashboard → Deployments
2. Click on the three dots (⋯) on the latest deployment
3. Select "Redeploy"
4. Check "Use existing Build Cache"
5. Click "Redeploy"

Or push a new commit to trigger automatic deployment:

```bash
git commit --allow-empty -m "Trigger redeployment"
git push
```

## Step 5: Verify Deployment

### 5.1 Access Your Application

Visit your deployed application at: `https://your-app.vercel.app`

### 5.2 Test Login

Use the default admin credentials:
- **Username**: `admin`
- **Password**: `admin123`

**⚠️ IMPORTANT**: Change the admin password immediately after first login!

### 5.3 Test Core Features

- [ ] Login/Logout
- [ ] Dashboard displays correctly
- [ ] Product CRUD operations
- [ ] Category, Tag, Supplier management
- [ ] Image upload (if using Vercel Blob)
- [ ] Search and filtering

## Step 6: Post-Deployment Configuration

### 6.1 Update Admin Password

1. Login as admin
2. Go to Settings → Users (to be implemented)
3. Change the default password

Alternatively, update directly in database:

```bash
# Generate new password hash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('newpassword', 10, (err, hash) => console.log(hash));"

# Update in Prisma Studio or via SQL
```

### 6.2 Configure Custom Domain (Optional)

1. Go to Vercel Dashboard → Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update `NEXT_PUBLIC_APP_URL` environment variable

### 6.3 Set Up Image Storage (Optional)

For production image uploads, consider using Vercel Blob:

1. In Vercel Dashboard → Storage → Create
2. Select **Blob**
3. Follow integration instructions
4. Update upload API to use Vercel Blob SDK

## Step 7: Monitoring and Maintenance

### 7.1 Monitor Application Logs

- View logs in Vercel Dashboard → Deployments → [Select deployment] → Logs
- Check for errors and warnings

### 7.2 Set Up Error Tracking (Optional)

Consider integrating error tracking:
- [Sentry](https://sentry.io)
- [LogRocket](https://logrocket.com)

### 7.3 Database Backups

Vercel Postgres (Paid plans):
- Automatic daily backups
- Point-in-time recovery

For free tier, consider:
- Regular database exports via Prisma Studio
- Scheduled backup scripts

### 7.4 Performance Monitoring

Monitor application performance:
- Vercel Analytics (built-in)
- Core Web Vitals
- API response times

## Troubleshooting

### Build Failures

**Error**: `Prisma Client not generated`

**Solution**:
```bash
# Ensure postinstall script is in package.json
"postinstall": "prisma generate"
```

### Database Connection Errors

**Error**: `Can't reach database server`

**Solution**:
1. Verify `DATABASE_URL` is set in Vercel environment variables
2. Check database is running in Vercel Storage tab
3. Try redeploying

### Migration Errors

**Error**: `Migration failed to apply`

**Solution**:
```bash
# Reset database (⚠️ destroys all data)
npx prisma migrate reset --force

# Re-run migrations
npx prisma migrate deploy

# Re-seed
npx prisma db seed
```

**Error**: `P3009 migrate found failed migrations`

**Solution**:
1. Identify the failed migration name in the error output.
2. Decide whether to mark it as applied or rolled back.
3. Resolve it in the target database:

```bash
# Mark as applied
npx prisma migrate resolve --applied <migration_name>

# Or mark as rolled back
npx prisma migrate resolve --rolled-back <migration_name>

# Re-run migrations
npx prisma migrate deploy
```

### Environment Variable Changes Not Applied

**Solution**:
After changing environment variables, you must redeploy for changes to take effect.

## Continuous Deployment

### Automatic Deployments

Vercel automatically deploys when you push to GitHub:

- **Production**: Pushes to `main` branch
- **Preview**: Pull requests and other branches

### Manual Deployments

```bash
# Using Vercel CLI
vercel --prod

# Or using Makefile
make deploy-vercel
```

## Security Checklist

- [x] SESSION_SECRET is a strong random value
- [x] DATABASE_URL is kept secret
- [x] Default admin password changed
- [x] HTTPS enabled (automatic on Vercel)
- [x] Environment variables configured correctly
- [ ] CSRF protection enabled (future enhancement)
- [ ] Rate limiting configured (future enhancement)

## Cost Estimation

### Vercel Free Tier Limits

- **Bandwidth**: 100GB/month
- **Function Execution**: 100GB-hours/month
- **Serverless Function Duration**: 10 seconds max

### Vercel Postgres Free Tier

- **Storage**: 256MB
- **Data Transfer**: 256MB/month
- **Rows**: Up to 10,000

### Expected Usage (Small Business)

- **Users**: 2-10
- **Products**: 500-1,000
- **Monthly Requests**: ~10,000
- **Storage**: ~50MB

**Estimated Cost**: $0/month (within free tier)

## Scaling Beyond Free Tier

When you exceed free tier limits:

1. **Upgrade Vercel Plan**: Pro ($20/month)
   - Unlimited bandwidth
   - Extended function execution time

2. **Upgrade Database**: Vercel Postgres Pro ($20/month)
   - 512MB storage
   - Higher data transfer limits

3. **Alternative Databases**:
   - Supabase (generous free tier)
   - Railway (affordable PostgreSQL)
   - AWS RDS (pay-as-you-go)

## Support

- **Documentation**: [CLAUDE.md](./CLAUDE.md)
- **Issues**: [GitHub Issues](https://github.com/yossii929-code/Inventory/issues)
- **Vercel Support**: [vercel.com/support](https://vercel.com/support)

---

**Last Updated**: 2026-01-02
**Version**: 1.0.0
