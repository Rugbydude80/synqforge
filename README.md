# SynqForge

AI-powered project management and agile workflow platform with comprehensive story management, sprint planning, and team collaboration features.

## Features

- **Multi-tenant Architecture**: Organisation-based access control with role-based permissions
- **Epic & Story Management**: Full agile workflow with epics, stories, and sprints
- **AI-Powered**: Story generation, validation, and requirements analysis
- **Sprint Planning**: Complete sprint management with capacity planning and metrics
- **Activity Tracking**: Comprehensive audit logging and activity feeds
- **Document Processing**: Upload and analyse requirements documents
- **Credit System**: Usage-based billing with Stripe integration

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Database**: MySQL with Drizzle ORM
- **Authentication**: NextAuth.js
- **AI**: Qwen 3 Max via OpenRouter
- **Validation**: Zod
- **TypeScript**: Full type safety

## Getting Started

### Prerequisites

- Node.js 18+ 
- MySQL 8.0+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd synqforge
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and configure your database, authentication, and AI settings.

4. Generate and run database migrations:
```bash
npm run db:generate
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your application.

## Using Qwen 3 Max via OpenRouter

SynqForge uses Qwen 3 Max for AI-powered story generation. The model provides fast, cost-effective generation with support for UK English.

### API Example

```bash
curl -X POST http://localhost:3000/api/story \
  -H "Content-Type: application/json" \
  -d '{
    "feature": "User authentication system",
    "role": "registered user",
    "goal": "log in securely using email and password",
    "value": "I can access my account safely and manage my data",
    "context": "Supports OAuth and 2FA"
  }'
```

Response:
```json
{
  "story": "---\nUser Story\nAs a registered user...",
  "model": "qwen/qwen3-max",
  "usage": {
    "prompt": 245,
    "completion": 412,
    "total": 657
  },
  "elapsedMs": 1834
}
```

### CLI Example

```bash
npx tsx scripts/qwen3max.ts \
  --feature "Dashboard analytics" \
  --role "product manager" \
  --goal "view team velocity trends over multiple sprints" \
  --value "I can make data-driven planning decisions" \
  --context "Integrate with Jira and GitHub"
```

Token usage is printed to STDERR; story content to STDOUT.

### Configuration

Set your OpenRouter API key in `.env`:
```bash
OPENROUTER_API_KEY=sk-or-v1-your-key-here
```

Get your API key from [https://openrouter.ai/keys](https://openrouter.ai/keys).

## Database Schema

The application includes a comprehensive database schema with:

- **Organisations & Users**: Multi-tenant user management
- **Projects**: Project organisation and ownership
- **Epics & Stories**: Agile story hierarchy
- **Sprints**: Sprint planning and story assignment
- **AI Tracking**: AI generation history and cost tracking
- **Documents**: Document upload and processing
- **Activities**: Comprehensive audit logging
- **Sessions**: User session management
- **Billing**: Credit transactions and usage tracking

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate database migrations
- `npm run db:migrate` - Run migrations
- `npm run db:push` - Push schema to database
- `npm run db:studio` - Open Drizzle Studio

## Project Structure

```
synqforge/
├── app/
│   └── api/                    # API routes
│       ├── organisations/
│       │   └── [orgId]/
│       │       └── projects/   # Organisation projects endpoints
│       └── projects/
│           └── [projectId]/    # Project-specific endpoints
│               ├── archive/    # Archive project
│               └── stats/      # Project statistics
├── lib/
│   ├── ai/                     # AI services
│   │   ├── client.ts          # OpenRouter client
│   │   └── story.ts           # Story generation service
│   ├── auth/                   # Authentication configuration
│   │   ├── index.ts           # Auth utility functions
│   │   └── options.ts         # NextAuth options
│   ├── db/                     # Database
│   │   ├── index.ts           # DB connection & utilities
│   │   └── schema.ts          # Drizzle ORM schema
│   ├── middleware/             # API middleware
│   │   └── auth.ts            # Authentication middleware
│   ├── repositories/           # Data access layer
│   │   └── projects.ts        # Projects repository
│   ├── types/                  # TypeScript types
│   │   └── index.ts           # Zod schemas & types
│   └── utils/                  # Utility functions
│       └── api-helpers.ts     # API response helpers
├── drizzle/
│   └── migrations/             # Database migrations
└── public/                     # Static assets
```

## Authentication

The application uses NextAuth.js for authentication with support for:

- Google OAuth
- Credentials (email/password)

To set up authentication:

1. Configure `NEXTAUTH_SECRET` in your `.env` file
2. Set up OAuth providers (Google, etc.)
3. Implement password hashing for credentials provider (currently placeholder)

## API Routes

API routes will be protected with the `withAuth` middleware which provides:

- Session validation
- User context injection
- Organisation access control
- Project access verification
- Role-based authorisation

Example usage:
```typescript
import { withAuth } from '@/lib/middleware/auth'

export const GET = withAuth(
  async (req, { user }) => {
    // Your handler code with authenticated user context
    return NextResponse.json({ data: '...' })
  },
  { requireOrg: true, allowedRoles: ['admin', 'member'] }
)
```

## API Documentation

### Projects API

The Projects API is fully implemented and ready to use. See [TESTING.md](./TESTING.md) for detailed API documentation and testing examples.

**Available Endpoints:**

- `GET /api/organisations/:orgId/projects` - List all projects
- `POST /api/organisations/:orgId/projects` - Create a project
- `GET /api/projects/:projectId` - Get project details
- `PUT/PATCH /api/projects/:projectId` - Update a project
- `DELETE /api/projects/:projectId` - Delete a project (empty only)
- `GET /api/projects/:projectId/stats` - Get project statistics
- `POST /api/projects/:projectId/archive` - Archive a project

## Development Roadmap

- [x] Database schema design
- [x] Authentication system (NextAuth)
- [x] Projects API (CRUD + statistics)
- [x] API middleware (auth, validation, error handling)
- [x] AI Integration (Qwen 3 Max via OpenRouter)
- [ ] Epics API
- [ ] Stories API
- [ ] Sprints API
- [ ] Document processing
- [ ] Frontend UI
- [ ] Real-time collaboration
- [ ] Billing & credits system

## Licence

MIT
