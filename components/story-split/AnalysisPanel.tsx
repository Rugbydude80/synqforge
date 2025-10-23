'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import type { StorySplitAnalysis } from '@/lib/services/story-split-analysis.service';
import { useTranslation } from '@/lib/i18n';

interface AnalysisPanelProps {
  analysis: StorySplitAnalysis | undefined;
  storyId: string;
}

export function AnalysisPanel({ analysis }: AnalysisPanelProps) {
  const { t } = useTranslation();

  if (!analysis) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <p>Loading analysis...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const investScore = analysis.invest.score;
  const investColor = investScore >= 4 ? 'default' : 'destructive';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('story.split.analysis.invest')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {t('story.split.analysis.invest.score')}
            </span>
            <Badge variant={investColor}>
              {investScore}/5
            </Badge>
          </div>

          <div className="space-y-2">
            <InvestItem
              label={t('story.split.analysis.invest.valuable')}
              passed={analysis.invest.valuable}
            />
            <InvestItem
              label={t('story.split.analysis.invest.independent')}
              passed={analysis.invest.independent}
            />
            <InvestItem
              label={t('story.split.analysis.invest.small')}
              passed={analysis.invest.small}
            />
            <InvestItem
              label={t('story.split.analysis.invest.testable')}
              passed={analysis.invest.testable}
            />
            <InvestItem
              label={t('story.split.analysis.invest.estimable')}
              passed={analysis.invest.estimable}
            />
          </div>

          {analysis.invest.notes.length > 0 && (
            <div className="mt-4 space-y-1">
              {analysis.invest.notes.map((note, i) => (
                <p key={i} className="text-sm text-muted-foreground">
                  • {t(note)}
                </p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('story.split.analysis.spidr')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {analysis.spidr.suggestions.length > 0 ? (
            <div className="space-y-2">
              {analysis.spidr.suggestions.map((suggestion, i) => (
                <div key={i} className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">{t(suggestion)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t('story.split.analysis.spidr.no_suggestions')}
            </p>
          )}
        </CardContent>
      </Card>

      {analysis.splittingRecommended ? (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-green-900 dark:text-green-100">
              {t('story.split.analysis.recommended')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
              {t('story.split.analysis.not_recommended')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InvestItem({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {passed ? (
        <CheckCircle2 className="h-4 w-4 text-green-500" />
      ) : (
        <XCircle className="h-4 w-4 text-red-500" />
      )}
      <span className="text-sm">{label}</span>
    </div>
  );
}

