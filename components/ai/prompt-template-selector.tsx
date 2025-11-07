'use client';

import * as React from 'react';
import { Label } from '@/components/ui/label';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PromptTemplateMetadata {
  key: string;
  displayName: string;
  description: string;
  icon?: string;
  requiresAdminTier?: boolean;
}

interface PromptTemplateSelectorProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function PromptTemplateSelector({
  value,
  onChange,
  disabled = false,
  className = '',
}: PromptTemplateSelectorProps) {
  const [templates, setTemplates] = React.useState<PromptTemplateMetadata[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchTemplates = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ai/prompt-templates');
      
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }

      const data = await response.json();
      setTemplates(data.templates || []);
      
      // Set default value if not provided
      if (!value && data.templates.length > 0) {
        onChange(data.templates[0].key);
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [value, onChange]);

  React.useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const selectedTemplate = templates.find((t) => t.key === value);

  if (error) {
    return (
      <div className="text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <Label>Story Generation Template</Label>
        <div className="h-10 bg-muted animate-pulse rounded-md" />
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2">
        <Label htmlFor="prompt-template">Story Generation Template</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-sm">
                Select a template to guide how user stories are generated. Each template
                uses a different approach and level of detail.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <select
        id="prompt-template"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="flex h-10 w-full appearance-none rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2 text-sm text-white ring-offset-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all hover:border-gray-600"
      >
        {templates.map((template) => (
          <option key={template.key} value={template.key}>
            {template.icon} {template.displayName}
            {template.requiresAdminTier ? ' (Admin)' : ''}
          </option>
        ))}
      </select>

      {selectedTemplate && (
        <p className="text-xs text-muted-foreground">
          {selectedTemplate.description}
        </p>
      )}
    </div>
  );
}

