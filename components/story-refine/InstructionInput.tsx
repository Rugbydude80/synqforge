'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Lightbulb } from 'lucide-react';

export interface RefinementOptions {
  focus: string[]; // ['grammar', 'clarity', etc.]
  intensity: 'light' | 'moderate' | 'heavy';
  preserve: string[]; // ['character_names', 'plot_points', etc.]
}

interface InstructionInputProps {
  instructions: string;
  onChange: (value: string) => void;
  onSubmit: (options?: RefinementOptions) => void;
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

  // Refinement options state
  const [focusOptions, setFocusOptions] = useState<string[]>(['grammar', 'clarity']);
  const [intensity, setIntensity] = useState<'light' | 'moderate' | 'heavy'>('moderate');
  const [preserveOptions, setPreserveOptions] = useState<string[]>(['character_names', 'plot_points']);

  const toggleFocusOption = (option: string) => {
    setFocusOptions((prev) =>
      prev.includes(option)
        ? prev.filter((o) => o !== option)
        : [...prev, option]
    );
  };

  const togglePreserveOption = (option: string) => {
    setPreserveOptions((prev) =>
      prev.includes(option)
        ? prev.filter((o) => o !== option)
        : [...prev, option]
    );
  };

  const handleSubmit = () => {
    const options: RefinementOptions = {
      focus: focusOptions,
      intensity,
      preserve: preserveOptions,
    };
    onSubmit(options);
  };

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

      {/* Refinement Options Panel */}
      <div className="refinement-options border rounded-lg p-4 space-y-3 bg-muted/20">
        <h4 className="font-semibold text-sm">Refinement Focus</h4>

        <div className="grid grid-cols-2 gap-3">
          {[
            { id: 'grammar', label: 'Grammar & Spelling' },
            { id: 'clarity', label: 'Clarity & Readability' },
            { id: 'conciseness', label: 'Conciseness' },
            { id: 'descriptiveness', label: 'Descriptive Details' },
            { id: 'dialogue', label: 'Dialogue Quality' },
            { id: 'pacing', label: 'Pacing & Flow' },
          ].map((option) => (
            <div key={option.id} className="flex items-center space-x-2">
              <Checkbox
                id={option.id}
                checked={focusOptions.includes(option.id)}
                onCheckedChange={() => toggleFocusOption(option.id)}
              />
              <label
                htmlFor={option.id}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {option.label}
              </label>
            </div>
          ))}
        </div>

        <Separator />

        <div className="space-y-2">
          <Label>Refinement Intensity</Label>
          <RadioGroup
            value={intensity}
            onValueChange={(value) =>
              setIntensity(value as 'light' | 'moderate' | 'heavy')
            }
            className="space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="light" id="light" />
              <label
                htmlFor="light"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Light - Minimal changes
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="moderate" id="moderate" />
              <label
                htmlFor="moderate"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Moderate - Balanced improvements
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="heavy" id="heavy" />
              <label
                htmlFor="heavy"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Heavy - Comprehensive rewrite
              </label>
            </div>
          </RadioGroup>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label>Preserve</Label>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'character_names', label: 'Character names' },
              { id: 'plot_points', label: 'Plot points' },
              { id: 'dialogue', label: 'Dialogue' },
              { id: 'setting', label: 'Setting' },
            ].map((option) => (
              <Badge
                key={option.id}
                variant={preserveOptions.includes(option.id) ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-accent"
                onClick={() => togglePreserveOption(option.id)}
              >
                {option.label}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            These elements will remain unchanged
          </p>
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
        <Button onClick={handleSubmit} disabled={!isValid} size="lg" className="gap-2">
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
