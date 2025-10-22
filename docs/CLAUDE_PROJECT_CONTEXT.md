# SynqForge - Claude Project Context & Development Principles

## 🎯 **Project Overview**

SynqForge is an **AI-powered project management and agile workflow platform** that transforms how teams create, manage, and execute user stories. We've built a comprehensive multi-tenant SaaS platform with advanced AI capabilities, real-time collaboration, and sophisticated billing systems.

## 🏗️ **Current Architecture & Tech Stack**

### **Database (PostgreSQL + Drizzle ORM)**
- **Multi-tenant architecture** with organization-based access control
- **Comprehensive schema** with 50+ tables covering all aspects of agile project management
- **Real-time triggers** for automatic aggregate calculations (epic progress, sprint velocity)
- **Advanced AI tracking** with token usage, cost analysis, and generation history
- **Stripe integration** with subscription management and fair-usage enforcement

### **Backend (Next.js 14 + TypeScript)**
- **API-first design** with comprehensive REST endpoints
- **Authentication** via NextAuth.js with Google OAuth and credentials
- **Middleware system** for auth, validation, and error handling
- **Repository pattern** for clean data access
- **Service layer** for business logic separation

### **Frontend (React 19 + Tailwind)**
- **Modern UI** with Radix UI components and Framer Motion animations
- **Real-time updates** with activity feeds and notifications
- **AI-powered interfaces** for story generation and validation
- **Responsive design** with mobile-first approach
- **Dark theme** with purple/emerald brand colors

### **AI Integration (Anthropic Claude)**
- **Claude 3.5 Sonnet** for story generation and validation
- **Document processing** (PDF, DOCX, TXT, MD) with content extraction
- **Token tracking** with usage enforcement and cost analysis
- **Rate limiting** and fair-usage guards
- **Advanced features** like backlog autopilot and test generation

## 📊 **Current Feature Set**

### **✅ Completed Core Features**
1. **Multi-tenant Organizations** with role-based access (owner, admin, member, viewer)
2. **Project Management** with full CRUD operations and status tracking
3. **Epic & Story Management** with AI generation and validation
4. **Sprint Planning** with velocity tracking and capacity management
5. **AI Story Generation** from documents and text descriptions
6. **Real-time Analytics** with comprehensive dashboards
7. **Billing System** with Stripe integration and subscription tiers
8. **Activity Tracking** with audit logs and notifications
9. **Document Processing** with AI analysis and story extraction
10. **Team Management** with invitations and user roles

### **🚧 Advanced AI Features (In Progress)**
1. **Backlog Autopilot** - Automated backlog management
2. **AC Validation** - AI-powered acceptance criteria validation
3. **Test Generation** - Automated test case creation
4. **Effort Scoring** - AI-estimated story points
5. **Impact Scoring** - RICE/WSJF prioritization
6. **Knowledge Search** - RAG-based project search
7. **Workflow Agents** - Automated workflow triggers

### **📋 Planned Features**
1. **Mobile App** - React Native implementation
2. **Advanced Integrations** - GitHub, Jira, Slack
3. **Custom AI Models** - Organization-specific training
4. **Enterprise Features** - SSO, advanced RBAC, compliance
5. **API Marketplace** - Third-party integrations

## 🎨 **UI/UX Design System**

### **Brand Identity**
- **Primary Colors**: Purple (#a855f7) and Emerald (#10b981)
- **Gradient Themes**: Purple-to-pink gradients for AI features
- **Dark Theme**: Gray-900 base with accent colors
- **Typography**: Modern sans-serif with proper hierarchy

### **Component Library**
- **Radix UI** for accessible, unstyled components
- **Custom components** for AI-specific interfaces
- **Framer Motion** for smooth animations
- **Responsive grid** system with Tailwind CSS

### **Key UI Patterns**
- **Dashboard Cards** with hover effects and metrics
- **AI Generation Panels** with step-by-step workflows
- **Kanban Boards** with drag-and-drop functionality
- **Real-time Activity Feeds** with status indicators
- **Modal Systems** for forms and confirmations

## 💰 **Business Model & Billing**

### **Subscription Tiers**
- **Free**: 5K tokens/month, 2 docs/month, 1 project, 1 seat
- **Solo**: 50K tokens/month, 10 docs/month, 5 projects, 1 seat  
- **Team**: 200K tokens/month, 50 docs/month, unlimited projects, 5 seats
- **Pro**: 1M tokens/month, 200 docs/month, unlimited projects, 20 seats
- **Business**: 5M tokens/month, 1000 docs/month, unlimited projects, 100 seats
- **Enterprise**: Unlimited usage, custom limits, dedicated support

### **Fair Usage Enforcement**
- **Hard blocks** when limits are reached (no soft warnings)
- **Token tracking** with real-time usage monitoring
- **Document limits** with monthly ingestion tracking
- **Throughput controls** for stories per minute
- **Bulk limits** for maximum stories per generation

## 🔧 **Development Principles**

### **1. Database-First Approach**
- **Always use Drizzle ORM** for database operations
- **Leverage database triggers** for aggregate calculations
- **Maintain referential integrity** with proper foreign keys
- **Use database views** for complex queries
- **Implement proper indexing** for performance

### **2. API-First Design**
- **RESTful endpoints** with consistent response formats
- **Middleware protection** for authentication and validation
- **Error handling** with proper HTTP status codes
- **Rate limiting** for AI endpoints
- **Comprehensive logging** for debugging

### **3. AI Integration Best Practices**
- **Token tracking** for all AI operations
- **Cost analysis** with usage enforcement
- **Rate limiting** to prevent abuse
- **Error handling** for AI service failures
- **Caching** for expensive AI operations

### **4. Frontend Development**
- **Component composition** over inheritance
- **TypeScript strict mode** for type safety
- **Responsive design** with mobile-first approach
- **Accessibility** with proper ARIA labels
- **Performance** with code splitting and lazy loading

### **5. Security & Privacy**
- **Multi-tenant isolation** with organization scoping
- **Role-based access control** with granular permissions
- **Data encryption** for sensitive information
- **Audit logging** for compliance
- **PII detection** and redaction

## 🚀 **User Journey Patterns**

### **AI Story Generation Flow**
```
Input (Document/Text) → AI Analysis → Review Results → Edit Stories → Assign to Project/Epic → Create Stories → Track Progress
```

### **Sprint Planning Flow**
```
Create Sprint → Set Capacity → Add Stories → Review Velocity → Start Sprint → Track Progress → Complete Sprint
```

### **Project Management Flow**
```
Create Project → Define Epics → Generate Stories → Plan Sprints → Track Progress → Analyze Metrics → Complete Project
```

## 📁 **Key File Structure**

```
synqforge/
├── app/                          # Next.js App Router
│   ├── (dashboard)/             # Dashboard routes
│   ├── api/                     # API endpoints
│   │   ├── ai/                  # AI-related endpoints
│   │   ├── projects/            # Project management
│   │   ├── sprints/             # Sprint management
│   │   └── billing/             # Stripe integration
│   └── auth/                    # Authentication pages
├── components/                   # React components
│   ├── ui/                      # Base UI components
│   ├── ai/                      # AI-specific components
│   └── analytics/               # Analytics components
├── lib/                         # Core business logic
│   ├── db/                      # Database schema & connection
│   ├── services/                # Business services
│   ├── repositories/            # Data access layer
│   ├── billing/                 # Billing & usage logic
│   └── ai/                      # AI service integration
└── docs/                        # Documentation
```

## 🎯 **Development Guidelines**

### **When Adding New Features:**
1. **Start with database schema** - Define tables and relationships
2. **Create API endpoints** - Follow existing patterns and middleware
3. **Implement business logic** - Use service layer for complex operations
4. **Build UI components** - Follow design system and accessibility
5. **Add AI integration** - Include token tracking and error handling
6. **Write tests** - Unit tests for business logic, integration tests for APIs
7. **Update documentation** - Keep docs current with changes

### **When Modifying Existing Features:**
1. **Maintain backward compatibility** - Don't break existing APIs
2. **Update database migrations** - Use proper migration scripts
3. **Preserve user data** - Never lose user-generated content
4. **Test thoroughly** - Ensure all existing functionality works
5. **Update documentation** - Reflect changes in user guides

### **When Working with AI Features:**
1. **Always track tokens** - Use the token tracking system
2. **Implement rate limiting** - Prevent abuse and control costs
3. **Handle errors gracefully** - AI services can fail
4. **Cache expensive operations** - Don't regenerate the same content
5. **Provide user feedback** - Show progress and results clearly

### **When Working with Billing:**
1. **Enforce usage limits** - Hard blocks when limits are reached
2. **Track all usage** - Every AI operation must be tracked
3. **Handle subscription changes** - Update entitlements immediately
4. **Provide upgrade paths** - Clear upgrade options when limits hit
5. **Maintain audit trails** - All billing changes must be logged

## 🔍 **Common Patterns & Conventions**

### **API Response Format**
```typescript
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    limit?: number;
    page?: number;
    total?: number;
  };
}
```

### **Database Query Pattern**
```typescript
// Always use repositories for data access
const repository = new ProjectsRepository(user);
const project = await repository.getProjectById(projectId);
```

### **AI Service Pattern**
```typescript
// Always track tokens and handle errors
const response = await aiService.generateStories(requirements);
await incrementTokenUsage(organizationId, response.usage.totalTokens);
```

### **Component Pattern**
```typescript
// Use TypeScript interfaces for props
interface StoryCardProps {
  story: Story;
  onUpdate: (story: Story) => void;
  onDelete: (id: string) => void;
}
```

## 🚨 **Critical Constraints**

### **Never Break These:**
1. **Multi-tenant isolation** - Always scope queries by organization
2. **Authentication** - All API endpoints must be protected
3. **Token tracking** - Every AI operation must be tracked
4. **Usage limits** - Hard blocks when limits are reached
5. **Data integrity** - Never lose user data or break relationships

### **Always Consider:**
1. **Performance** - Database queries should be optimized
2. **Scalability** - Design for growth and high usage
3. **Security** - Protect user data and prevent abuse
4. **User Experience** - Make features intuitive and responsive
5. **Cost Control** - AI operations are expensive, optimize usage

## 📚 **Key Documentation Files**

- `README.md` - Project overview and setup
- `docs/AI_STORY_GENERATION_USER_JOURNEY.md` - AI generation flow
- `docs/AI_SINGLE_STORY_GENERATION.md` - Single story creation
- `docs/BACKLOG_ENGINE.md` - Epic progress and velocity tracking
- `lib/db/schema.ts` - Complete database schema
- `lib/billing/entitlements.ts` - Subscription model
- `lib/billing/fair-usage-guards.ts` - Usage enforcement

## 🎯 **Success Metrics**

### **Technical Metrics**
- **API Response Time** < 200ms for most endpoints
- **Database Query Performance** < 100ms for complex queries
- **AI Generation Time** < 30 seconds for story generation
- **Uptime** > 99.9% availability
- **Error Rate** < 0.1% for critical operations

### **Business Metrics**
- **User Engagement** - Daily active users and session duration
- **AI Usage** - Token consumption and generation success rates
- **Revenue Growth** - Monthly recurring revenue and churn rate
- **Feature Adoption** - Usage of AI features and advanced capabilities
- **Customer Satisfaction** - User feedback and support tickets

---

**Remember**: SynqForge is a sophisticated AI-powered platform that combines modern web development with advanced AI capabilities. Every feature should enhance the user experience while maintaining the high standards of performance, security, and usability we've established. Always consider the impact on the entire system when making changes, and prioritize user value over technical complexity.
