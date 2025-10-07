# AI Single Story Generation

## Overview
Users can now generate individual user stories using AI directly from the story creation modal. This feature allows quick story creation by simply describing what the story should accomplish.

---

## User Journey

### 1. Access Story Creation
Navigate to any project and click the "New Story" button to open the story creation modal.

### 2. Generate with AI
1. Click the **"Generate with AI"** button at the top of the form
2. An AI input section appears with a purple border
3. Enter a brief description of what the story should accomplish (minimum 10 characters)
4. Click **"Generate Story"**

### 3. AI Processing
- The system sends your requirement to Claude AI
- Processing typically takes 5-15 seconds
- A loading state indicates generation is in progress

### 4. Review Generated Content
The AI populates the form with:
- **Title** - Formatted as "As a [user], I want [goal]..."
- **Description** - Detailed explanation of the story
- **Acceptance Criteria** - 3-5 specific, testable criteria
- **Priority** - Suggested priority level (low, medium, high, critical)
- **Story Points** - Estimated complexity (1-13 scale)

### 5. Edit and Submit
- Review the AI-generated content
- Make any necessary adjustments
- Add epic assignment if needed
- Click **"Create Story"** to save

---

## Example Prompts

### Good Prompts (Specific and Clear)
```
"Allow users to reset their password via email"
"Add ability to export project data as CSV file"
"Implement real-time notifications for story updates"
"Create a dashboard showing sprint velocity charts"
```

### Avoid (Too Vague)
```
"User login"
"Make it better"
"Add feature"
```

---

## API Endpoint

### POST `/api/ai/generate-single-story`

**Request Body:**
```json
{
  "requirement": "Allow users to reset their password via email",
  "projectId": "uuid-string",
  "projectContext": "Optional context about the project"
}
```

**Response:**
```json
{
  "success": true,
  "story": {
    "title": "As a user, I want to reset my password via email...",
    "description": "Detailed description...",
    "acceptanceCriteria": [
      "User can request password reset link",
      "Email contains secure reset link",
      "Link expires after 24 hours"
    ],
    "priority": "high",
    "storyPoints": 5,
    "reasoning": "This is important for security and user experience..."
  }
}
```

---

## Implementation Details

### Files Modified
1. **`/app/api/ai/generate-single-story/route.ts`** - New API endpoint
2. **`/components/story-form-modal.tsx`** - Updated UI with AI generation
3. **`.env.example`** - Added ANTHROPIC_API_KEY

### Key Features
- ✅ Validates input (minimum 10 characters)
- ✅ Generates context-aware stories using Claude 3.5 Sonnet
- ✅ Tracks AI usage in database
- ✅ Error handling with user feedback
- ✅ Loading states during generation
- ✅ Pre-fills form fields (user can still edit)
- ✅ Character counter (500 max)

### AI Model Used
- **Model:** `claude-3-5-sonnet-20241022`
- **Temperature:** 0.7 (balanced creativity/consistency)
- **Max Tokens:** 4000
- **Average Response Time:** 5-15 seconds

---

## Environment Setup

Add to your `.env` file:
```bash
# AI Configuration (Anthropic Claude)
# Get API key from: https://console.anthropic.com/
ANTHROPIC_API_KEY=your-anthropic-api-key-here
```

---

## Benefits

1. **Speed** - Generate stories in seconds instead of minutes
2. **Consistency** - Stories follow best practices and proper format
3. **Quality** - AI suggests comprehensive acceptance criteria
4. **Flexibility** - Generated content is fully editable
5. **Learning** - See examples of well-written stories

---

## Limitations

- Requires active Anthropic API key
- Minimum 10 characters for requirement input
- Maximum 500 characters for requirement
- Generates one story at a time (use batch generation for multiple stories)
- AI suggestions should be reviewed and validated

---

## Troubleshooting

### "Failed to generate story"
- Check that `ANTHROPIC_API_KEY` is set in `.env`
- Verify API key is valid and has credits
- Check server logs for detailed error messages

### Empty or Poor Quality Output
- Make requirements more specific
- Add more context to the prompt
- Try rephrasing the requirement

### Generation Takes Too Long
- Normal processing: 5-15 seconds
- If > 30 seconds, check network connection
- Check Anthropic API status

---

## Future Enhancements

- [ ] Save favorite prompts/templates
- [ ] Learn from user edits to improve suggestions
- [ ] Multi-language support
- [ ] Integration with project context (existing stories, epics)
- [ ] Bulk generation from single requirement
- [ ] Story improvement suggestions for existing stories

---

## Related Features

- **Batch Story Generation** - Generate multiple stories from requirements document
- **Document Analysis** - Extract stories from uploaded documents
- **Story Validation** - AI validation of existing stories
- **Epic Generation** - AI-powered epic creation
