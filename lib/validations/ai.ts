import { z } from 'zod';

export const generateStoriesSchema = z.object({
  requirements: z.string().min(10, 'Requirements must be at least 10 characters'),
  projectId: z.string().min(1, 'Project ID is required'),
  epicId: z.string().optional(),
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

export const validateStorySchema = z.object({
  storyId: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  acceptanceCriteria: z.array(z.string()).optional(),
});

export const analyzeDocumentSchema = z.object({
  content: z.string().min(50, 'Document content must be at least 50 characters'),
  documentType: z.enum(['requirements', 'specification', 'notes', 'other']).default('requirements'),
  projectId: z.string().min(1, 'Project ID is required'),
});

export const batchCreateStoriesSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  epicId: z.string().optional(),
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
