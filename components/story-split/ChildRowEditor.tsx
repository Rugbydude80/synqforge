'use client';

import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Trash2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import type { ChildStoryInput } from '@/lib/services/story-split-validation.service';
import type { ChildValidationResult } from '@/lib/services/story-split-validation.service';
import { useTranslation } from '@/lib/i18n';
import { useState } from 'react';

interface ChildRowEditorProps {
  child: ChildStoryInput;
  index: number;
  validation?: ChildValidationResult;
  onChange: (child: ChildStoryInput) => void;
  onRemove: () => void;
  disabled?: boolean;
}

export function ChildRowEditor({
  child,
  index,
  validation,
  onChange,
  onRemove,
  disabled,
}: ChildRowEditorProps) {
  const { t } = useTranslation();
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  const updateField = (field: keyof ChildStoryInput, value: any) => {
    onChange({ ...child, [field]: value });
  };

  const handleBlur = (field: string) => {
    setTouchedFields(prev => new Set(prev).add(field));
  };

  const hasTitleError = validation && !validation.valid && (
    validation.errors.some(e => e.includes('persona_goal') || e.includes('title'))
  );
  const hasPersonaGoalError = validation && !validation.valid && (
    validation.errors.some(e => e.includes('persona_goal'))
  );
  const hasDescriptionError = validation && !validation.valid && (
    validation.errors.some(e => e.includes('description'))
  );
  const hasAcceptanceCriteriaError = validation && !validation.valid && (
    validation.errors.some(e => e.includes('acceptance_criteria') || e.includes('testable'))
  );
  const hasEstimateError = validation && !validation.valid && (
    validation.errors.some(e => e.includes('estimate') || e.includes('small'))
  );
  const hasUserValueError = validation && !validation.valid && (
    validation.errors.some(e => e.includes('user_value'))
  );

  const updateAC = (acIndex: number, value: string) => {
    const newAC = [...child.acceptanceCriteria];
    newAC[acIndex] = value;
    onChange({ ...child, acceptanceCriteria: newAC });
  };

  const addAC = () => {
    onChange({
      ...child,
      acceptanceCriteria: [...child.acceptanceCriteria, ''],
    });
  };

  const removeAC = (acIndex: number) => {
    onChange({
      ...child,
      acceptanceCriteria: child.acceptanceCriteria.filter((_, i) => i !== acIndex),
    });
  };

  return (
    <Card className={`${validation?.valid === false ? 'border-red-500 border-2 bg-red-50 dark:bg-red-950/20' : 'border-border'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">
              {t('story.split.child.number', { number: index + 1 })}
            </span>
            {validation?.valid === false && (
              <Badge variant="destructive" className="text-xs">
                <XCircle className="h-3 w-3 mr-1" />
                Errors
              </Badge>
            )}
            {validation?.valid === true && (
              <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Valid
              </Badge>
            )}
            <InvestBadges validation={validation} />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            disabled={disabled}
            aria-label={t('story.split.child.remove')}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div>
          <label htmlFor={`title-${index}`} className="text-sm font-medium">
            {t('story.split.child.title')} <span className="text-red-500">*</span>
          </label>
          <Input
            id={`title-${index}`}
            value={child.title}
            onChange={(e) => updateField('title', e.target.value)}
            onBlur={() => handleBlur('title')}
            placeholder={t('story.split.child.title_placeholder')}
            disabled={disabled}
            className={`mt-1 ${hasTitleError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
          />
          {hasTitleError && touchedFields.has('title') && (
            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
              <XCircle className="h-3 w-3" />
              {validation?.errors.find(e => e.includes('persona_goal') || e.includes('title')) && 
                t(validation.errors.find(e => e.includes('persona_goal') || e.includes('title'))!)}
            </p>
          )}
        </div>

        <div>
          <label htmlFor={`persona-goal-${index}`} className="text-sm font-medium">
            {t('story.split.child.persona_goal')} <span className="text-red-500">*</span>
          </label>
          <Textarea
            id={`persona-goal-${index}`}
            value={child.personaGoal}
            onChange={(e) => updateField('personaGoal', e.target.value)}
            onBlur={() => handleBlur('personaGoal')}
            placeholder={t('story.split.child.persona_goal_placeholder')}
            disabled={disabled}
            className={`mt-1 ${hasPersonaGoalError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
            rows={2}
          />
          {hasPersonaGoalError && touchedFields.has('personaGoal') && (
            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
              <XCircle className="h-3 w-3" />
              {validation?.errors.find(e => e.includes('persona_goal')) && 
                t(validation.errors.find(e => e.includes('persona_goal'))!)}
            </p>
          )}
        </div>

        <div>
          <label htmlFor={`description-${index}`} className="text-sm font-medium">
            {t('story.split.child.description')} <span className="text-red-500">*</span>
          </label>
          <Textarea
            id={`description-${index}`}
            value={child.description}
            onChange={(e) => updateField('description', e.target.value)}
            onBlur={() => handleBlur('description')}
            placeholder={t('story.split.child.description_placeholder')}
            disabled={disabled}
            className={`mt-1 ${hasDescriptionError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
            rows={3}
          />
          {hasDescriptionError && touchedFields.has('description') && (
            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
              <XCircle className="h-3 w-3" />
              {validation?.errors.find(e => e.includes('description')) && 
                t(validation.errors.find(e => e.includes('description'))!)}
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">
              {t('story.split.child.acceptance_criteria')} <span className="text-red-500">*</span>
            </label>
            <Button
              variant="ghost"
              size="sm"
              onClick={addAC}
              disabled={disabled}
            >
              {t('story.split.child.add_ac')}
            </Button>
          </div>
          <div className="space-y-2">
            {child.acceptanceCriteria.map((ac, acIndex) => (
              <div key={acIndex} className="flex gap-2">
                <Textarea
                  value={ac}
                  onChange={(e) => updateAC(acIndex, e.target.value)}
                  onBlur={() => handleBlur('acceptanceCriteria')}
                  placeholder={t('story.split.child.ac_placeholder')}
                  disabled={disabled}
                  rows={2}
                  className={`flex-1 ${hasAcceptanceCriteriaError && !ac.trim() ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
                {child.acceptanceCriteria.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAC(acIndex)}
                    disabled={disabled}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          {hasAcceptanceCriteriaError && touchedFields.has('acceptanceCriteria') && (
            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
              <XCircle className="h-3 w-3" />
              {validation?.errors.find(e => e.includes('acceptance_criteria') || e.includes('testable')) && 
                t(validation.errors.find(e => e.includes('acceptance_criteria') || e.includes('testable'))!)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label htmlFor={`estimate-${index}`} className="text-sm font-medium">
              {t('story.split.child.estimate')} <span className="text-red-500">*</span>
            </label>
            <Input
              id={`estimate-${index}`}
              type="number"
              min={1}
              max={5}
              value={child.estimatePoints}
              onChange={(e) => updateField('estimatePoints', parseInt(e.target.value) || 0)}
              onBlur={() => handleBlur('estimatePoints')}
              disabled={disabled}
              className={`mt-1 ${hasEstimateError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
            />
            {hasEstimateError && touchedFields.has('estimatePoints') && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                {validation?.errors.find(e => e.includes('estimate') || e.includes('small')) && 
                  t(validation.errors.find(e => e.includes('estimate') || e.includes('small'))!)}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-2 pt-6">
            <Checkbox
              id={`user-value-${index}`}
              checked={child.providesUserValue}
              onCheckedChange={(checked) => {
                updateField('providesUserValue', checked === true);
                handleBlur('providesUserValue');
              }}
              disabled={disabled}
              className={hasUserValueError ? 'border-red-500' : ''}
            />
            <label
              htmlFor={`user-value-${index}`}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {t('story.split.child.provides_user_value')} <span className="text-red-500">*</span>
            </label>
          </div>
          {hasUserValueError && touchedFields.has('providesUserValue') && (
            <p className="text-xs text-red-600 mt-1 flex items-center gap-1 pt-6">
              <XCircle className="h-3 w-3" />
              {validation?.errors.find(e => e.includes('user_value')) && 
                t(validation.errors.find(e => e.includes('user_value'))!)}
            </p>
          )}
        </div>

        {/* General validation errors */}
        {validation && !validation.valid && (
          <div className="mt-3 space-y-1 pt-3 border-t">
            {validation.errors.map((error, i) => (
              <p key={i} className="text-sm text-red-600 flex items-start gap-2">
                <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                {t(error)}
              </p>
            ))}
          </div>
        )}

        {validation && validation.warnings.length > 0 && (
          <div className="mt-3 space-y-1">
            {validation.warnings.map((warning, i) => (
              <p key={i} className="text-sm text-yellow-600 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                {t(warning)}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InvestBadges({ validation }: { validation?: ChildValidationResult }) {
  if (!validation) return null;

  return (
    <div className="flex gap-1">
      {validation.valuable && (
        <Badge variant="outline" className="text-xs">
          <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
          V
        </Badge>
      )}
      {validation.independent && (
        <Badge variant="outline" className="text-xs">
          <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
          I
        </Badge>
      )}
      {validation.small && (
        <Badge variant="outline" className="text-xs">
          <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
          S
        </Badge>
      )}
      {validation.testable && (
        <Badge variant="outline" className="text-xs">
          <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
          T
        </Badge>
      )}
    </div>
  );
}

