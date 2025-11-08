# Custom Document Template Upload Guide

## 📋 Overview

Custom document templates allow you to define your own story format structure for AI-generated user stories. This guide explains the required format and best practices.

## ✅ Supported File Types

- **PDF** (.pdf) - Up to 10MB
- **Word Document** (.docx, .dotx, .dotm) - Up to 10MB  
- **Text File** (.txt) - Up to 10MB
- **Markdown** (.md) - Up to 10MB

## 📄 Before Uploading Your Word Template

**Before uploading your document template:**

- Ensure your template is a Microsoft Word file in `.docx`, `.dotx`, or `.dotm` format. Other formats will not be accepted.

- The template should use Word styles (such as Title, Heading 1, Heading 2, Body Text) for formatting text consistently, rather than direct formatting.

- Include any standard organizational elements you need, such as headers, footers, cover pages, or boilerplate text.

- Structure your template so it's easy to apply for story generation, with clearly defined sections, headings, and instructions if needed.

- Avoid using macros unless you save your template as `.dotm` and understand the security implications.

- Test your template by creating a new Word document from it to ensure everything appears correctly and functions as expected.

- Document any special instructions or fields within the template for clarity, especially if other users will be working with it.

Only well-structured, appropriately formatted Word templates will be accepted and used for story generation.

## 📝 Required Template Structure

Your template document should include clear sections that define how stories should be structured. The AI will extract these sections and use them to format generated stories.

### Minimum Required Sections

Your template **must** include at least one of these sections:

1. **Title** or **User Story** - Defines the story title format
2. **Description** - Defines the story description format
3. **Acceptance Criteria** or **AC** - Defines acceptance criteria format

### Recommended Sections

For best results, include these sections:

- **Title/User Story** - Story title format
- **Description** - Story description format  
- **Acceptance Criteria** - AC format (Given/When/Then or numbered)
- **Priority** - Priority levels (low, medium, high, critical)
- **Story Points** - Estimation format
- **Context** - Background information format
- **Dependencies** - Dependency tracking format
- **Out of Scope** - What's excluded from the story

## 📐 Format Examples

### Example 1: Standard User Story Format

```
Title: As a [persona], I want [goal], so that [benefit]

Description:
[Provide context about the user need and business value]

Acceptance Criteria:
Given [initial context]
When [action is performed]
Then [expected outcome]

Priority: low | medium | high | critical
Story Points: 1, 2, 3, 5, 8, 13
```

### Example 2: Detailed Enterprise Format

```
User Story Title:
As a [user type], I want [capability], so that [business value]

Background:
[Context and problem statement]

Description:
[Detailed description of the feature]

In Scope:
- [Feature 1]
- [Feature 2]

Out of Scope:
- [Excluded feature 1]
- [Excluded feature 2]

Acceptance Criteria:
1. Given [context], when [action], then [outcome]
2. Given [context], when [action], then [outcome]

Priority: critical | high | medium | low

Story Points: [Fibonacci sequence]

Dependencies:
- [System/Team dependency]

Risks:
- [Risk 1]
- [Risk 2]
```

### Example 3: Simple Bullet Format

```
Title: [Story title]

Description: [Story description]

Acceptance Criteria:
- [Criterion 1]
- [Criterion 2]
- [Criterion 3]

Priority: high
```

## 🎯 Best Practices

### 1. **Clear Section Headers**
Use clear, consistent section headers:
- ✅ "Acceptance Criteria"
- ✅ "AC"
- ✅ "Acceptance_Criteria"
- ❌ "Things to check" (too vague)

### 2. **Consistent Formatting**
- Use consistent formatting throughout
- Use bullet points or numbered lists for acceptance criteria
- Keep sections clearly separated

### 3. **Include Examples**
Include example content in your template to guide the AI:
```
Example:
Title: As a customer, I want to reset my password, so that I can regain access to my account
```

### 4. **Specify Language**
If you need UK English:
- Use UK spelling (behaviour, colour, organise)
- The AI will detect and match your preference

### 5. **Define Priority Levels**
List your priority options:
```
Priority Options: critical, high, medium, low
```

## ⚠️ Important Constraints

### Content Guidelines

1. **No Inappropriate Content**
   - Templates are scanned for inappropriate language
   - Templates with profanity or offensive content will be rejected

2. **Professional Tone**
   - Keep content professional and work-appropriate
   - Focus on business and technical requirements

3. **Clear Structure**
   - Use clear headings and sections
   - Avoid ambiguous or vague language

### Technical Constraints

1. **File Size**: Maximum 10MB
2. **File Type**: PDF, DOCX, TXT, or MD only
3. **Structure**: Must contain at least one recognizable section
4. **Format Detection**: AI extracts structure automatically - ensure sections are clearly labeled

## 🔍 How Template Parsing Works

The system automatically:

1. **Extracts Text**: Converts your document to text
2. **Identifies Sections**: Finds section headers (Title, Description, AC, etc.)
3. **Detects Format**: Identifies format patterns (Given/When/Then, numbered lists, etc.)
4. **Creates Template**: Builds a template structure from your document
5. **Validates**: Ensures template has required sections

### What Gets Extracted

- **Section Names**: Title, Description, Acceptance Criteria, etc.
- **Format Patterns**: Given/When/Then, numbered lists, bullet points
- **Priority Options**: Available priority levels
- **Language**: UK vs US English
- **Tone**: Formal vs casual

## 📊 Template Validation

After upload, your template is validated:

✅ **Passes if:**
- Contains at least one recognized section
- File size under 10MB
- Valid file type
- No inappropriate content

❌ **Fails if:**
- No recognizable sections found
- File too large
- Invalid file type
- Contains inappropriate content

## 🚀 Using Your Template

Once uploaded:

1. **Select Template**: Choose your template from the dropdown on the AI Generate page
2. **Generate Stories**: All generated stories will follow your template format
3. **Automatic Compliance**: Stories are validated to match your template structure

## 💡 Tips for Best Results

1. **Start Simple**: Begin with a basic template, then refine
2. **Test First**: Upload a template and generate a test story to verify format
3. **Iterate**: Adjust your template based on generated results
4. **Be Specific**: More specific templates produce better results
5. **Include Examples**: Show the AI what good looks like

## 🛡️ Platform Protection

To protect the platform while maintaining flexibility:

- ✅ **Content Filtering**: All generated stories are filtered for inappropriate content
- ✅ **Format Validation**: Stories must match SynqForge quality standards
- ✅ **Template Compliance**: Stories are validated against your template format
- ✅ **Size Limits**: File size restrictions prevent abuse
- ✅ **Type Restrictions**: Only safe file types allowed

## 📞 Support

If you encounter issues:

1. **Check File Format**: Ensure your document has clear sections
2. **Review Examples**: Compare your template to the examples above
3. **Test Parsing**: Upload and check if sections are detected correctly
4. **Contact Support**: If issues persist, contact support with your template file

## 📄 Example Template Files

See the `/docs/templates` directory for example template files:
- `standard-user-story.md` - Basic user story format
- `enterprise-detailed.md` - Comprehensive enterprise format
- `simple-bullet.md` - Minimal format

---

**Remember**: Your template defines the structure - the AI fills in the content. Make your template clear and specific for best results!

