import { z } from 'zod';

export const uploadFileSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  file: z.instanceof(File).refine(
    (file) => file.size <= 50 * 1024 * 1024,
    'File size must be less than 50MB'
  ).refine(
    (file) => [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'text/markdown',
      'application/json',
    ].includes(file.type),
    'File type must be PDF, DOCX, DOC, TXT, MD, or JSON'
  ),
  extractContent: z.boolean().default(true),
});

export const processAndAnalyzeSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  file: z.instanceof(File),
  documentType: z.enum(['requirements', 'specification', 'notes', 'other']).default('requirements'),
  autoCreateEpics: z.boolean().default(false),
  autoCreateStories: z.boolean().default(false),
});

export type UploadFileInput = z.infer<typeof uploadFileSchema>;
export type ProcessAndAnalyzeInput = z.infer<typeof processAndAnalyzeSchema>;
