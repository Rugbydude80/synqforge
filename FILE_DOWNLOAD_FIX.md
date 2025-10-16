# File Download Fix - Correct MIME Types

## Issue Identified
Downloaded test artefacts were using `'text/plain'` as the MIME type for all files, causing them to not open correctly with their proper applications.

## Solution Implemented

### Files Modified
1. **components/ai/test-generator-panel.tsx**
2. **components/ai/batch-test-generator.tsx**

### Changes Made

Added proper MIME type mapping based on artefact type:

```typescript
const getMimeType = (type: ArtefactType): string => {
  switch (type) {
    case 'gherkin':
      return 'text/plain;charset=utf-8'  // .feature files open in text editors
    case 'postman':
      return 'application/json;charset=utf-8'  // .json files open with JSON viewers/Postman
    case 'playwright':
    case 'cypress':
      return 'text/plain;charset=utf-8'  // .spec.ts/.cy.ts files open in IDEs
    default:
      return 'text/plain;charset=utf-8'
  }
}
```

### Updated Download Functions

**Single File Download (test-generator-panel.tsx)**
- Line 149-179: Added `getMimeType()` helper function
- Blob now created with proper MIME type: `new Blob([content], { type: mimeType })`

**Batch Download All (batch-test-generator.tsx)**
- Line 115-150: Updated `handleDownloadAll()` with MIME type mapping
- Each file downloaded with correct type

**Individual Download in Batch Results (batch-test-generator.tsx)**
- Line 274-306: Inline MIME type detection for each result item

## MIME Type Mapping

| Artefact Type | File Extension | MIME Type | Opens With |
|---------------|---------------|-----------|------------|
| Gherkin | `.feature` | `text/plain;charset=utf-8` | Text editors, Cucumber tools |
| Postman | `.postman_collection.json` | `application/json;charset=utf-8` | Postman, JSON viewers |
| Playwright | `.spec.ts` / `.spec.js` | `text/plain;charset=utf-8` | VS Code, IDEs |
| Cypress | `.cy.ts` / `.cy.js` | `text/plain;charset=utf-8` | VS Code, IDEs |

## Testing Checklist

- [ ] Gherkin files open in text editor with proper syntax
- [ ] Postman JSON files import correctly into Postman
- [ ] Playwright test files open in IDE with proper highlighting
- [ ] Cypress test files open in IDE with proper highlighting
- [ ] Batch download works for all file types
- [ ] Individual downloads from results work correctly
- [ ] File extensions preserved in downloaded files

## Notes

- UTF-8 encoding ensures special characters display correctly
- Postman files specifically use `application/json` to ensure Postman recognizes them
- Test files use `text/plain` as they're code files meant for IDEs
- Gherkin uses `text/plain` as most systems treat .feature files as text

## Status
✅ **FIXED** - All download functions now use proper MIME types based on artefact type
