'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Lightbulb } from 'lucide-react';

interface InstructionInputProps {
  instructions: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  storyTitle: string;
  storyExcerpt: string;
  error?: string | null;
}

const EXAMPLE_PROMPTS = [
  'Make the dialogue more natural and conversational',
  'Add more descriptive details to the setting',
  'Improve pacing in the middle section',
  'Enhance character development for the protagonist',
  'Adjust tone to be more suspenseful',
  'Simplify complex sentences for better readability',
  'Add more sensory details throughout',
  'Strengthen the emotional impact of key scenes',
];

export function InstructionInput({
  instructions,
  onChange,
  onSubmit,
  storyTitle,
  storyExcerpt,
  error,
}: InstructionInputProps) {
  const charCount = instructions.length;
  const isValid = charCount >= 10 && charCount <= 500;

  return (
    <div className="space-y-6 py-4">
      {/* Story Preview */}
      <div className="rounded-lg border p-4 bg-muted/30">
        <h4 className="font-semibold mb-2">{storyTitle}</h4>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {storyExcerpt}...
        </p>
      </div>

      {/* Instructions Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          How should the AI refine your story?
        </label>
        <Textarea
          value={instructions}
          onChange={(e) => onChange(e.target.value)}
          placeholder="E.g., Make the dialogue more natural, add more descriptive details to the setting, improve pacing..."
          className="min-h-32 resize-none"
          maxLength={500}
        />
        <div className="flex justify-between items-center text-xs">
          <span
            className={
              charCount < 10 ? 'text-destructive' : 'text-muted-foreground'
            }
          >
            {charCount < 10
              ? `${10 - charCount} more characters needed`
              : ''}
          </span>
          <span
            className={
              charCount > 500 ? 'text-destructive' : 'text-muted-foreground'
            }
          >
            {charCount}/500
          </span>
        </div>
      </div>

      {/* Example Prompts */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Lightbulb className="h-4 w-4" />
          <span>Example instructions:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_PROMPTS.slice(0, 4).map((prompt, i) => (
            <Badge
              key={i}
              variant="outline"
              className="cursor-pointer hover:bg-accent"
              onClick={() => onChange(prompt)}
            >
              {prompt}
            </Badge>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Submit Button */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button onClick={onSubmit} disabled={!isValid} size="lg" className="gap-2">
          Generate Refinement
        </Button>
      </div>

      {/* Info Box */}
      <Alert>
        <AlertDescription className="text-xs">
          <strong>Note:</strong> Refinement typically takes 30-60 seconds. The AI
          will preserve your story's core narrative while applying your
          instructions.
        </AlertDescription>
      </Alert>
    </div>
  );
}

