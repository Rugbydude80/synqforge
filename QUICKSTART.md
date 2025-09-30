# SynqForge - Quick Start Guide

Get your SynqForge development environment up and running in minutes!

## Prerequisites

Before you begin, ensure you have:
- **Node.js 18+** installed ([Download](https://nodejs.org/))
- **MySQL 8.0+** running locally or remotely
- **npm** or **yarn** package manager

## Step 1: Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Next.js 14
- Drizzle ORM
- NextAuth.js
- Zod for validation
- MySQL2 driver
- And more...

## Step 2: Set Up MySQL Database

### Option A: Local MySQL

1. **Start MySQL** (if not already running):
```bash
# macOS with Homebrew
brew services start mysql

# Or manually
mysql.server start
```

2. **Create the database**:
```bash
mysql -u root -p
```

Then in the MySQL console:
```sql
CREATE DATABASE synqforge CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

### Option B: Docker MySQL

```bash
docker run --name synqforge-mysql \
  -e MYSQL_ROOT_PASSWORD=your_password \
  -e MYSQL_DATABASE=synqforge \
  -p 3306:3306 \
  -d mysql:8.0
```

## Step 3: Configure Environment Variables

The `.env` file should already exist with default values. Update it with your settings:

```bash
# Edit .env file
nano .env
```

**Update these values:**
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=synqforge

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here  # Generate with: openssl rand -base64 32

# OAuth Providers (optional for now)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

## Step 4: Initialize Database Schema

Push the schema to your database:

```bash
npm run db:push
```

This will create all the tables defined in `lib/db/schema.ts`.

**Alternatively**, you can generate and run migrations:
```bash
npm run db:generate  # Generate migration files
npm run db:migrate   # Apply migrations
```

## Step 5: Verify Database Setup

Open Drizzle Studio to browse your database:

```bash
npm run db:studio
```

This will open a web interface at `https://local.drizzle.studio` where you can:
- View all tables
- Inspect schema
- Run queries
- Add test data

## Step 6: Seed Test Data (Optional)

For testing, you'll need at least one organization and user. You can add them via Drizzle Studio or MySQL:

```sql
-- Insert test organization
INSERT INTO organizations (id, name, slug, subscription_tier, created_at, updated_at)
VALUES ('org-test-123', 'Test Organization', 'test-org', 'free', NOW(), NOW());

-- Insert test user
INSERT INTO users (id, email, name, organization_id, role, is_active, created_at)
VALUES ('user-test-123', 'test@example.com', 'Test User', 'org-test-123', 'admin', true, NOW());
```

## Step 7: Start Development Server

```bash
npm run dev
```

Your app will be running at **http://localhost:3000**

## Step 8: Test the API

### Using cURL

```bash
# Health check (create this endpoint first, or skip)
curl http://localhost:3000/api/health

# Test projects endpoint (requires authentication)
curl http://localhost:3000/api/organizations/org-test-123/projects
```

### Using the Testing Guide

See [TESTING.md](./TESTING.md) for comprehensive API testing instructions.

## Verify Everything Works

1. **Database Connection**: `npm run db:studio` should open without errors
2. **TypeScript Compilation**: No errors when running `npm run dev`
3. **API Response**: Test any API endpoint (see TESTING.md)

## Next Steps

### 1. Set Up Authentication

For production, configure OAuth providers:

**Google OAuth:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Secret to `.env`

### 2. Create Your First Project

Once authenticated, create a project via API:

```bash
curl -X POST http://localhost:3000/api/organizations/org-test-123/projects \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION" \
  -d '{
    "name": "My First Project",
    "slug": "my-first-project",
    "description": "Testing SynqForge",
    "ownerId": "user-test-123"
  }'
```

### 3. Explore the Codebase

Key files to understand:
- `lib/db/schema.ts` - Database schema
- `lib/repositories/projects.ts` - Business logic
- `app/api/projects/` - API routes
- `lib/middleware/auth.ts` - Authentication middleware
- `lib/types/index.ts` - Type definitions and validation

### 4. Build Additional Features

The foundation is ready! Now you can:
- Implement Epics API (similar to Projects)
- Build Stories API
- Create Sprints API
- Add AI integration
- Develop frontend UI

## Troubleshooting

### Error: "Cannot connect to database"
- Verify MySQL is running: `mysql -u root -p`
- Check credentials in `.env`
- Ensure database exists: `SHOW DATABASES;`

### Error: "NEXTAUTH_SECRET must be provided"
- Generate a secret: `openssl rand -base64 32`
- Add it to `.env` as `NEXTAUTH_SECRET`

### Error: "Port 3000 already in use"
- Change the port: `PORT=3001 npm run dev`
- Or kill the process using port 3000

### TypeScript Errors
- Ensure all dependencies are installed: `npm install`
- Restart your IDE/editor
- Run type checking: `npx tsc --noEmit`

### Database Schema Out of Sync
- Reset and push: `npm run db:push`
- Or drop all tables and re-run migrations

## Development Tools

### Drizzle Studio
```bash
npm run db:studio
```
Visual database browser at `https://local.drizzle.studio`

### Generate Database Migrations
```bash
npm run db:generate
```
Creates migration files in `drizzle/migrations/`

### Apply Migrations
```bash
npm run db:migrate
```
Runs pending migrations

### TypeScript Type Checking
```bash
npx tsc --noEmit
```

### Linting
```bash
npm run lint
```

## Project Structure Overview

```
synqforge/
├── app/api/              # API routes (Next.js 14 App Router)
├── lib/
│   ├── auth/            # Authentication setup
│   ├── db/              # Database connection & schema
│   ├── middleware/      # API middleware
│   ├── repositories/    # Data access layer
│   ├── types/           # TypeScript types
│   └── utils/           # Utility functions
├── drizzle/             # Database migrations
├── .env                 # Environment variables
├── package.json         # Dependencies
└── tsconfig.json        # TypeScript config
```

## Support & Resources

- **Documentation**: See [README.md](./README.md)
- **API Testing**: See [TESTING.md](./TESTING.md)
- **Database Schema**: `lib/db/schema.ts`
- **Drizzle ORM Docs**: https://orm.drizzle.team/
- **Next.js Docs**: https://nextjs.org/docs
- **NextAuth.js Docs**: https://next-auth.js.org/

---

**You're all set!** 🚀 Start building amazing features with SynqForge!
