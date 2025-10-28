import { z } from 'zod';

export const generateStoriesSchema = z.object({
  requirements: z.string().min(10, 'Requirements must be at least 10 characters'),
  projectId: z.string().min(1, 'Project ID is required'),
  epicId: z.union([z.string().min(1), z.literal(''), z.undefined()]).optional().transform(val => val === '' ? undefined : val),
  projectContext: z.string().optional(),
  targetUsers: z.string().optional(),
  businessGoals: z.string().optional(),
  model: z.string().optional(),
});

export const generateEpicSchema = z.object({
  description: z.string().min(20, 'Description must be at least 20 characters'),
  projectId: z.string().min(1, 'Project ID is required'),
  projectContext: z.string().optional(),
  goals: z.string().optional(),
});

export const validateStorySchema = z
  .object({
    storyId: z.string().min(1).optional(),
    projectId: z.string().min(1, 'Project ID is required when storyId is not provided').optional(),
    title: z
      .string()
      .min(1, 'Title is required')
      .max(180, 'Title must be 180 characters or fewer'),
    description: z
      .string()
      .min(10, 'Description must be at least 10 characters')
      .max(2000, 'Description must be under 2000 characters'),
    acceptanceCriteria: z
      .array(
        z
          .string()
          .min(10, 'Each acceptance criterion must be at least 10 characters')
          .max(500, 'Acceptance criteria must be concise (under 500 characters)')
          .regex(
            /^(?:-\s|\*\s|Given|When|Then)/,
            'Acceptance criteria should start with "-", "*", "Given", "When", or "Then".'
          )
      )
      .max(25, 'Provide no more than 25 acceptance criteria')
      .optional(),
  })
  .refine((data) => !!data.storyId || !!data.projectId, {
    message: 'Provide a storyId or projectId for validation.',
    path: ['projectId'],
  });

export const analyzeDocumentSchema = z.object({
  content: z.string().min(50, 'Document content must be at least 50 characters'),
  documentType: z.enum(['requirements', 'specification', 'notes', 'other']).default('requirements'),
  projectId: z.string().min(1, 'Project ID is required'),
});

export const batchCreateStoriesSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  epicId: z.union([z.string().min(1), z.literal(''), z.undefined()]).optional().transform(val => val === '' ? undefined : val),
  stories: z.array(
    z.object({
      title: z.string().min(1),
      description: z.string().min(1),
      acceptanceCriteria: z.array(z.string()).optional(),
      priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
      storyPoints: z.number().int().min(0).max(100).nullable().optional(),
    })
  ).min(1, 'At least one story is required'),
});

export type GenerateStoriesInput = z.infer<typeof generateStoriesSchema>;
export type GenerateEpicInput = z.infer<typeof generateEpicSchema>;
export type ValidateStoryInput = z.infer<typeof validateStorySchema>;
export type AnalyzeDocumentInput = z.infer<typeof analyzeDocumentSchema>;
export type BatchCreateStoriesInput = z.infer<typeof batchCreateStoriesSchema>;
