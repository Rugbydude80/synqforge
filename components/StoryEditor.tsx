'use client';

/**
 * StoryEditor Component
 *
 * A comprehensive story editing component with:
 * - Tier-based update limit enforcement
 * - Version tracking and display
 * - Real-time validation
 * - Upgrade prompts for quota exceeded
 * - Concurrent edit warnings (Team tier)
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Save, AlertTriangle, Lock, TrendingUp } from 'lucide-react';

interface StoryEditorProps {
  storyId: string;
  initialData: {
    title: string;
    description?: string;
    acceptanceCriteria?: string[];
    storyPoints?: number;
    priority: 'low' | 'medium' | 'high' | 'critical';
    status: 'backlog' | 'ready' | 'in_progress' | 'review' | 'done' | 'blocked';
    storyType: 'feature' | 'bug' | 'task' | 'spike';
    assigneeId?: string;
    epicId?: string;
    tags?: string[];
    updateVersion?: number;
    lastUpdatedAt?: string;
  };
  onSave?: (updatedStory: any) => void;
  onCancel?: () => void;
}

interface UpdateUsage {
  used: number;
  limit: number | null;
  remaining: number | null;
  percentUsed: number;
  unlimitedUpdates: boolean;
}

export function StoryEditor({
  storyId,
  initialData,
  onSave,
  onCancel,
}: StoryEditorProps) {
  const router = useRouter();
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Update usage state
  const [updateUsage, setUpdateUsage] = useState<UpdateUsage | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [upgradeTier, setUpgradeTier] = useState<string>('');

  // Track changes
  useEffect(() => {
    const changed = JSON.stringify(formData) !== JSON.stringify(initialData);
    setHasChanges(changed);
  }, [formData, initialData]);

  // Handle form field changes
  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle acceptance criteria changes
  const handleACChange = (index: number, value: string) => {
    const newAC = [...(formData.acceptanceCriteria || [])];
    newAC[index] = value;
    handleChange('acceptanceCriteria', newAC);
  };

  const addAcceptanceCriteria = () => {
    const newAC = [...(formData.acceptanceCriteria || []), ''];
    handleChange('acceptanceCriteria', newAC);
  };

  const removeAcceptanceCriteria = (index: number) => {
    const newAC = (formData.acceptanceCriteria || []).filter((_, i) => i !== index);
    handleChange('acceptanceCriteria', newAC);
  };

  // Submit story update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasChanges) {
      toast({
        title: 'No changes',
        description: 'No changes were made to the story.',
        variant: 'default',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/stories/${storyId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle quota exceeded
        if (response.status === 429) {
          setQuotaExceeded(true);
          setUpgradeRequired(data.upgradeRequired || false);
          setUpgradeTier(data.upgradeTier || 'pro');
          setUpdateUsage({
            used: data.used || 0,
            limit: data.limit || null,
            remaining: data.remaining || 0,
            percentUsed: 100,
            unlimitedUpdates: false,
          });

          toast({
            title: 'Update limit reached',
            description: data.message,
            variant: 'destructive',
          });
          return;
        }

        // Handle approval required (Team tier)
        if (response.status === 403 && data.requiresApproval) {
          toast({
            title: 'Approval required',
            description: data.message,
            variant: 'destructive',
          });
          return;
        }

        throw new Error(data.message || 'Failed to update story');
      }

      // Update successful
      setUpdateUsage(data.usage);
      toast({
        title: 'Story updated',
        description: `Story updated successfully (v${data.audit.version})`,
        variant: 'default',
      });

      // Call onSave callback
      if (onSave) {
        onSave(data);
      }

      // Reset form
      setHasChanges(false);
    } catch (error: any) {
      console.error('Error updating story:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update story',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render upgrade prompt
  const renderUpgradePrompt = () => {
    if (!quotaExceeded || !upgradeRequired) return null;

    return (
      <Alert className="mb-4 bg-orange-50 border-orange-200">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-orange-900">
              You've reached your monthly update limit
            </p>
            <p className="text-sm text-orange-700 mt-1">
              Upgrade to {upgradeTier === 'pro' ? 'Pro' : 'Team'} for{' '}
              {upgradeTier === 'pro' ? '1,000' : 'unlimited'} updates/month
            </p>
          </div>
          <Button
            onClick={() => router.push('/pricing')}
            className="ml-4"
            variant="default"
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            Upgrade Now
          </Button>
        </AlertDescription>
      </Alert>
    );
  };

  // Render usage indicator
  const renderUsageIndicator = () => {
    if (!updateUsage) return null;

    if (updateUsage.unlimitedUpdates) {
      return (
        <div className="text-sm text-green-600 mb-4">
          Unlimited story updates available
        </div>
      );
    }

    const percentUsed = updateUsage.percentUsed;
    const warningThreshold = 80;

    return (
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span>Updates this month</span>
          <span>
            {updateUsage.used} / {updateUsage.limit}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              percentUsed >= 100
                ? 'bg-red-500'
                : percentUsed >= warningThreshold
                ? 'bg-orange-500'
                : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(percentUsed, 100)}%` }}
          />
        </div>
        {percentUsed >= warningThreshold && percentUsed < 100 && (
          <p className="text-xs text-orange-600 mt-1">
            {updateUsage.remaining} updates remaining this month
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {renderUpgradePrompt()}
      {renderUsageIndicator()}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Version info */}
        {initialData.updateVersion && (
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Version {initialData.updateVersion}</span>
            {initialData.lastUpdatedAt && (
              <span>
                Last updated{' '}
                {new Date(initialData.lastUpdatedAt).toLocaleString()}
              </span>
            )}
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Title <span className="text-red-500">*</span>
          </label>
          <Input
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="Story title"
            required
            disabled={isSubmitting || quotaExceeded}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <Textarea
            value={formData.description || ''}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Describe the story..."
            rows={4}
            disabled={isSubmitting || quotaExceeded}
          />
        </div>

        {/* Acceptance Criteria */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Acceptance Criteria
          </label>
          {(formData.acceptanceCriteria || []).map((ac, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <Input
                value={ac}
                onChange={(e) => handleACChange(index, e.target.value)}
                placeholder={`Criterion ${index + 1}`}
                disabled={isSubmitting || quotaExceeded}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => removeAcceptanceCriteria(index)}
                disabled={isSubmitting || quotaExceeded}
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={addAcceptanceCriteria}
            disabled={isSubmitting || quotaExceeded}
            className="mt-2"
          >
            Add Criterion
          </Button>
        </div>

        {/* Row: Priority, Status, Type, Points */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Priority</label>
            <Select
              value={formData.priority}
              onValueChange={(value: any) => handleChange('priority', value)}
              disabled={isSubmitting || quotaExceeded}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <Select
              value={formData.status}
              onValueChange={(value: any) => handleChange('status', value)}
              disabled={isSubmitting || quotaExceeded}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="backlog">Backlog</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="done">Done</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Type</label>
            <Select
              value={formData.storyType}
              onValueChange={(value: any) => handleChange('storyType', value)}
              disabled={isSubmitting || quotaExceeded}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="feature">Feature</SelectItem>
                <SelectItem value="bug">Bug</SelectItem>
                <SelectItem value="task">Task</SelectItem>
                <SelectItem value="spike">Spike</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Points</label>
            <Input
              type="number"
              value={formData.storyPoints || ''}
              onChange={(e) =>
                handleChange('storyPoints', parseInt(e.target.value) || undefined)
              }
              placeholder="0"
              min="0"
              max="100"
              disabled={isSubmitting || quotaExceeded}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={!hasChanges || isSubmitting || quotaExceeded}
          >
            {isSubmitting ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Locked state indicator */}
      {quotaExceeded && (
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg flex items-center gap-3">
          <Lock className="h-5 w-5 text-gray-400" />
          <p className="text-sm text-gray-600">
            Story editing is locked due to quota limit. Please upgrade to continue.
          </p>
        </div>
      )}
    </div>
  );
}
