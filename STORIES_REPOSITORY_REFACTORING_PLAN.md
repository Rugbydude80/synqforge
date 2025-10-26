# 🔨 Stories Repository Refactoring Plan

**File:** `lib/repositories/stories.repository.ts`  
**Current Size:** 892 lines  
**Target Size:** ~550 lines core + ~300 lines helpers  
**Estimated Time:** 6-8 hours  
**Impact:** **MASSIVE** - Core of entire application

---

## 📊 Current State Analysis

### Method Complexity Breakdown

| Method | Lines | Complexity | Priority |
|--------|-------|------------|----------|
| `list()` | ~180 | 🔴 CRITICAL | P0 - Must refactor |
| `update()` | ~115 | 🔴 CRITICAL | P0 - Must refactor |
| `create()` | ~92 | 🟡 HIGH | P1 - Should refactor |
| `getById()` | ~85 | 🟡 HIGH | P1 - Should refactor |
| `assignToSprint()` | ~74 | 🟡 HIGH | P2 - Nice to refactor |
| Others | <65 | 🟠/🟢 | P3 - Optional |

### Key Issues

1. **`list()` method (180 lines)**
   - Complex filter building
   - Multiple conditional query clauses
   - Relation loading logic
   - Pagination logic
   - All mixed together

2. **`update()` method (115 lines)**
   - Validation logic mixed with updates
   - Transaction management
   - Activity logging
   - Sprint management
   - All in one function

3. **`create()` method (92 lines)**
   - Input validation
   - Project/Epic validation
   - Story creation
   - Activity creation
   - All sequential

4. **`getById()` method (85 lines)**
   - Complex query building
   - Multiple left joins
   - Data transformation
   - Error handling

---

## 🎯 Refactoring Strategy

### Phase 1: Extract Query Builders (Highest Impact)

**Create:** `lib/repositories/helpers/story-query-builder.ts`

```typescript
/**
 * Query builder helpers for stories repository
 */

export class StoryQueryBuilder {
  /**
   * Builds filter conditions for story queries
   */
  static buildFilters(filters: StoryFilters) {
    const conditions = []
    
    if (filters.organizationId) {
      conditions.push(eq(stories.organizationId, filters.organizationId))
    }
    if (filters.projectId) {
      conditions.push(eq(stories.projectId, filters.projectId))
    }
    if (filters.epic Id) {
      conditions.push(eq(stories.epicId, filters.epicId))
    }
    // ... more filters
    
    return and(...conditions)
  }

  /**
   * Builds order by clause for story queries
   */
  static buildOrderBy(
    orderBy?: string,
    orderDirection?: 'asc' | 'desc'
  ) {
    const column = orderBy || 'createdAt'
    const direction = orderDirection || 'desc'
    
    return direction === 'asc' 
      ? asc(stories[column]) 
      : desc(stories[column])
  }

  /**
   * Builds the complete story query with relations
   */
  static buildStoryQuery() {
    return db
      .select({
        // Story fields
        id: stories.id,
        title: stories.title,
        // ... all fields
        
        // Project relation
        project: {
          id: projects.id,
          name: projects.name,
          key: projects.key,
        },
        
        // Epic relation
        epic: {
          id: epics.id,
          title: epics.title,
          color: epics.color,
        },
        
        // ... other relations
      })
      .from(stories)
      .leftJoin(projects, eq(stories.projectId, projects.id))
      .leftJoin(epics, eq(stories.epicId, epics.id))
      // ... other joins
  }
}
```

**Impact:** `list()` method: 180 lines → ~60 lines (67% reduction!)

---

### Phase 2: Extract Validators

**Create:** `lib/repositories/helpers/story-validators.ts`

```typescript
/**
 * Validation helpers for stories repository
 */

export class StoryValidators {
  /**
   * Validates that a project exists and user has access
   */
  static async validateProjectAccess(
    projectId: string,
    organizationId: string
  ): Promise<{ id: string; name: string; organizationId: string }> {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    })

    if (!project) {
      throw new NotFoundError('Project', projectId)
    }

    if (project.organizationId !== organizationId) {
      throw new AuthorizationError(
        'Project does not belong to your organization',
        { projectId, organizationId }
      )
    }

    return project
  }

  /**
   * Validates that an epic exists and belongs to the project
   */
  static async validateEpicBelongsToProject(
    epicId: string,
    projectId: string
  ): Promise<void> {
    const epic = await db.query.epics.findFirst({
      where: eq(epics.id, epicId),
    })

    if (!epic) {
      throw new NotFoundError('Epic', epicId)
    }

    if (epic.projectId !== projectId) {
      throw new ValidationError(
        'Epic does not belong to the specified project',
        { epicId, projectId, epicProjectId: epic.projectId }
      )
    }
  }

  /**
   * Validates story update permissions and rules
   */
  static validateUpdatePermissions(
    existingStory: any,
    updates: UpdateStoryInput,
    userId: string
  ): void {
    // Add business rules here
    if (existingStory.status === 'done' && updates.status !== 'done') {
      // Reopening a done story - might need special permission
    }
    
    // More validation rules...
  }
}
```

**Impact:** 
- `create()`: 92 → ~70 lines (24% reduction)
- `update()`: 115 → ~90 lines (22% reduction)

---

### Phase 3: Extract Transformers

**Create:** `lib/repositories/helpers/story-transformers.ts`

```typescript
/**
 * Data transformation helpers for stories repository
 */

export class StoryTransformers {
  /**
   * Transforms raw database result to StoryWithRelations
   */
  static transformStoryResult(rawStory: any): StoryWithRelations {
    return {
      id: rawStory.id,
      projectId: rawStory.projectId,
      epicId: rawStory.epicId,
      title: rawStory.title,
      description: rawStory.description,
      acceptanceCriteria: rawStory.acceptanceCriteria as string[] | null,
      storyPoints: rawStory.storyPoints,
      storyType: rawStory.storyType,
      priority: rawStory.priority,
      status: rawStory.status,
      assigneeId: rawStory.assigneeId,
      tags: rawStory.tags as string[] | null,
      aiGenerated: rawStory.aiGenerated,
      aiPrompt: rawStory.aiPrompt,
      aiModelUsed: rawStory.aiModelUsed,
      createdBy: rawStory.createdBy,
      createdAt: rawStory.createdAt,
      updatedAt: rawStory.updatedAt,
      lastUpdatedAt: rawStory.lastUpdatedAt,
      updateVersion: rawStory.updateVersion,
      
      // Relations
      project: rawStory.project ? {
        id: rawStory.project.id,
        name: rawStory.project.name,
        key: rawStory.project.key,
      } : undefined,
      
      epic: rawStory.epic ? {
        id: rawStory.epic.id,
        title: rawStory.epic.title,
        color: rawStory.epic.color,
      } : null,
      
      assignee: rawStory.assignee ? {
        id: rawStory.assignee.id,
        name: rawStory.assignee.name,
        email: rawStory.assignee.email,
        avatar: rawStory.assignee.avatar,
      } : null,
      
      creator: rawStory.creator ? {
        id: rawStory.creator.id,
        name: rawStory.creator.name,
        email: rawStory.creator.email,
      } : undefined,
      
      currentSprint: rawStory.currentSprint ? {
        id: rawStory.currentSprint.id,
        name: rawStory.currentSprint.name,
        startDate: rawStory.currentSprint.startDate,
        endDate: rawStory.currentSprint.endDate,
        status: rawStory.currentSprint.status,
      } : undefined,
    }
  }

  /**
   * Prepares story data for database insertion
   */
  static prepareCreateData(
    input: CreateStoryInput,
    userId: string,
    organizationId: string
  ) {
    return {
      id: nanoid(),
      organizationId,
      projectId: input.projectId,
      epicId: input.epicId || null,
      title: input.title,
      description: input.description || null,
      acceptanceCriteria: input.acceptanceCriteria || null,
      storyPoints: input.storyPoints || null,
      priority: input.priority || 'medium',
      storyType: input.storyType || 'feature',
      status: input.status || 'backlog',
      assigneeId: input.assigneeId || null,
      tags: input.tags || null,
      labels: input.labels || null,
      aiGenerated: input.aiGenerated || false,
      aiPrompt: input.aiPrompt || null,
      aiModelUsed: input.aiModelUsed || null,
      aiValidationScore: input.aiValidationScore || null,
      aiSuggestions: input.aiSuggestions || null,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }
}
```

**Impact:**
- `getById()`: 85 → ~60 lines (29% reduction)
- `list()`: Additional 20-line reduction
- `create()`: Additional 10-line reduction

---

### Phase 4: Extract Activity Logger

**Create:** `lib/repositories/helpers/story-activity-logger.ts`

```typescript
/**
 * Activity logging helpers for stories repository
 */

export class StoryActivityLogger {
  /**
   * Logs story creation activity
   */
  static async logCreation(
    storyId: string,
    userId: string,
    organizationId: string
  ): Promise<void> {
    await db.insert(activities).values({
      id: nanoid(),
      organizationId,
      userId,
      action: 'created',
      entityType: 'story',
      entityId: storyId,
      createdAt: new Date(),
    })
  }

  /**
   * Logs story update activity with changes
   */
  static async logUpdate(
    storyId: string,
    userId: string,
    organizationId: string,
    changes: Partial<UpdateStoryInput>
  ): Promise<void> {
    await db.insert(activities).values({
      id: nanoid(),
      organizationId,
      userId,
      action: 'updated',
      entityType: 'story',
      entityId: storyId,
      metadata: changes,
      createdAt: new Date(),
    })
  }

  /**
   * Logs story deletion activity
   */
  static async logDeletion(
    storyId: string,
    userId: string,
    organizationId: string
  ): Promise<void> {
    await db.insert(activities).values({
      id: nanoid(),
      organizationId,
      userId,
      action: 'deleted',
      entityType: 'story',
      entityId: storyId,
      createdAt: new Date(),
    })
  }
}
```

**Impact:**
- `create()`, `update()`, `delete()`: ~10 lines saved each

---

## 📈 Expected Results

### Before Refactoring
```
File: 892 lines total
- 180-line list() method
- 115-line update() method
- 92-line create() method
- 85-line getById() method
- No helper modules
- No JSDoc
```

### After Refactoring
```
Main File: ~550 lines
- 60-line list() method (67% reduction)
- 90-line update() method (22% reduction)
- 70-line create() method (24% reduction)
- 60-line getById() method (29% reduction)
- Comprehensive JSDoc

Helper Modules: ~300 lines
- story-query-builder.ts (~100 lines)
- story-validators.ts (~100 lines)
- story-transformers.ts (~80 lines)
- story-activity-logger.ts (~20 lines)

Total Improvement:
- Main file: 38% smaller
- Each method: 20-67% smaller
- Modular, testable helpers
- Production-ready documentation
```

---

## 🚀 Implementation Steps

### Step 1: Create Helper Modules (2 hours)
1. Create `lib/repositories/helpers/` directory
2. Implement `story-query-builder.ts`
3. Implement `story-validators.ts`
4. Implement `story-transformers.ts`
5. Implement `story-activity-logger.ts`
6. Add comprehensive JSDoc to all helpers

### Step 2: Refactor `list()` Method (1.5 hours)
1. Replace filter building with `StoryQueryBuilder.buildFilters()`
2. Replace query building with `StoryQueryBuilder.buildStoryQuery()`
3. Replace ordering with `StoryQueryBuilder.buildOrderBy()`
4. Add JSDoc
5. Test thoroughly

### Step 3: Refactor `create()` Method (1 hour)
1. Replace validation with `StoryValidators.validateProjectAccess()`
2. Replace epic validation with `StoryValidators.validateEpicBelongsToProject()`
3. Replace data prep with `StoryTransformers.prepareCreateData()`
4. Replace activity logging with `StoryActivityLogger.logCreation()`
5. Add JSDoc

### Step 4: Refactor `update()` Method (1.5 hours)
1. Extract validation logic to `StoryValidators.validateUpdatePermissions()`
2. Replace activity logging with `StoryActivityLogger.logUpdate()`
3. Simplify transaction logic
4. Add JSDoc

### Step 5: Refactor `getById()` Method (1 hour)
1. Use `StoryQueryBuilder.buildStoryQuery()`
2. Use `StoryTransformers.transformStoryResult()`
3. Add JSDoc

### Step 6: Add Custom Error Classes (0.5 hours)
1. Replace `throw new Error()` with custom error classes throughout
2. Add proper error handling

### Step 7: Final Polish & Testing (1.5 hours)
1. Run full build
2. Fix any TypeScript errors
3. Test critical paths
4. Update documentation

**Total Estimated Time: 6-8 hours**

---

## ✅ Success Criteria

- [ ] Main repository file < 600 lines
- [ ] No method > 100 lines
- [ ] All helper modules have comprehensive JSDoc
- [ ] All methods have JSDoc with @param, @returns, @throws
- [ ] Build compiles successfully
- [ ] No new linter warnings
- [ ] All custom error classes integrated
- [ ] Test coverage for new helpers (optional but recommended)

---

## 🎯 Impact Assessment

### Code Quality
- **Before:** Large, monolithic repository (892 lines)
- **After:** Modular, testable, well-documented (~550 + 300 helpers)

### Maintainability
- **Before:** Hard to understand, modify, test
- **After:** Clear separation of concerns, easy to test, easy to extend

### Team Productivity
- **Before:** New developers struggle with complexity
- **After:** Clear, documented patterns to follow

### Production Readiness
- **Before:** Generic error handling, hard to debug
- **After:** Specific error types, detailed logging, clear error messages

---

## 📝 Notes

This refactoring is **HIGH RISK** because the stories repository is used everywhere. Recommendations:

1. **Create a feature branch** for this refactoring
2. **Test thoroughly** after each step
3. **Keep the build working** - verify after each module
4. **Don't rush** - better to take 8 hours and do it right
5. **Consider pair programming** for the refactoring

The payoff is worth it: this single refactoring will improve the entire application's maintainability more than any other single change.

---

**Created:** October 26, 2025  
**Status:** Ready to implement  
**Priority:** P0 - Highest Impact

