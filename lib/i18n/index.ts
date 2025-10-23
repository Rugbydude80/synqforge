/**
 * Simple i18n helper
 * In production, replace with next-i18next or similar
 */

const translations: Record<string, string> = {
  // Common
  'common.cancel': 'Cancel',
  
  // Story Split
  'story.split.title': 'Split Story',
  'story.split.description': 'Decompose this story into smaller, independently valuable stories following INVEST principles',
  'story.split.analyzing': 'Analyzing story...',
  'story.split.convert_to_epic': 'Convert parent story to epic',
  'story.split.create_stories': 'Create {{count}} stories',
  'story.split.creating': 'Creating stories...',
  'story.split.suggest': 'Suggest splits',
  'story.split.add_child': 'Add child story',
  
  'story.split.blocking.already_optimal': 'Splitting not recommended: story already fits timebox and remains independently valuable',
  'story.split.blocking.create_subtasks': 'Create sub-tasks instead',
  
  'story.split.analysis.invest': 'INVEST Analysis',
  'story.split.analysis.invest.score': 'INVEST Score',
  'story.split.analysis.invest.valuable': 'Valuable',
  'story.split.analysis.invest.independent': 'Independent',
  'story.split.analysis.invest.small': 'Small',
  'story.split.analysis.invest.testable': 'Testable',
  'story.split.analysis.invest.estimable': 'Estimable',
  'story.split.analysis.invest.valuable.no_description': 'Missing or insufficient description',
  'story.split.analysis.invest.valuable.no_acceptance_criteria': 'No acceptance criteria defined',
  'story.split.analysis.invest.independent.has_dependencies': 'Story has dependencies on other work',
  'story.split.analysis.invest.small.no_estimate': 'Story is not estimated',
  'story.split.analysis.invest.small.too_large': 'Story is too large for one sprint',
  'story.split.analysis.invest.testable.unclear_criteria': 'Acceptance criteria are not clear or testable',
  'story.split.analysis.invest.estimable.missing': 'Story lacks estimate',
  
  'story.split.analysis.spidr': 'SPIDR Splitting Strategies',
  'story.split.analysis.spidr.no_suggestions': 'No splitting strategies detected',
  'story.split.analysis.recommended': '✓ Splitting recommended',
  'story.split.analysis.not_recommended': '⚠ Splitting may not provide value',
  
  'story.split.children.title': 'Child Stories',
  'story.split.children.empty': 'No child stories yet',
  'story.split.children.empty_hint': 'Click "Suggest splits" or "Add child story" to begin',
  
  'story.split.child.number': 'Story {{number}}',
  'story.split.child.remove': 'Remove story',
  'story.split.child.title': 'Title',
  'story.split.child.title_placeholder': 'As a [persona], I want to...',
  'story.split.child.persona_goal': 'Persona-Goal Statement',
  'story.split.child.persona_goal_placeholder': 'As a [persona], I want [capability] so that [benefit]',
  'story.split.child.description': 'Description',
  'story.split.child.description_placeholder': 'Describe what this story delivers...',
  'story.split.child.acceptance_criteria': 'Acceptance Criteria',
  'story.split.child.add_ac': 'Add criterion',
  'story.split.child.ac_placeholder': 'Given... When... Then...',
  'story.split.child.estimate': 'Story Points',
  'story.split.child.provides_user_value': 'Provides user-visible value',
  
  'story.split.validation.valuable.no_user_value': 'Story must provide user-visible value',
  'story.split.validation.valuable.missing_persona_goal': 'Persona-goal statement is required (min 10 characters)',
  'story.split.validation.valuable.description_too_short': 'Description must be at least 20 characters',
  'story.split.validation.valuable.no_acceptance_criteria': 'At least one acceptance criterion is required',
  'story.split.validation.independent.coupling_detected': 'Potential coupling detected with another story',
  'story.split.validation.independent.has_dependencies': 'Story has dependencies',
  'story.split.validation.small.missing_estimate': 'Story points estimate is required',
  'story.split.validation.small.too_large': 'Story is too large (max 5 points)',
  'story.split.validation.testable.insufficient_criteria': 'At least 2 acceptance criteria required',
  'story.split.validation.testable.vague_criteria': 'Acceptance criteria contain vague terms',
  
  'story.split.spidr.spike.suggestion': 'Consider creating a research spike to reduce uncertainty',
  'story.split.spidr.paths.suggestion': 'Split by alternate paths or workflows',
  'story.split.spidr.interfaces.suggestion': 'Split by interface layers (UI first, then API)',
  'story.split.spidr.data.suggestion': 'Split by data formats or subsets',
  'story.split.spidr.rules.suggestion': 'Start with relaxed validation, add stricter rules later',
};

export function useTranslation() {
  const t = (key: string, params?: Record<string, any>) => {
    let text = translations[key] || key;
    
    if (params) {
      Object.keys(params).forEach(param => {
        text = text.replace(new RegExp(`{{${param}}}`, 'g'), String(params[param]));
      });
    }
    
    return text;
  };

  return { t };
}

export function t(key: string, params?: Record<string, any>): string {
  let text = translations[key] || key;
  
  if (params) {
    Object.keys(params).forEach(param => {
      text = text.replace(new RegExp(`{{${param}}}`, 'g'), String(params[param]));
    });
  }
  
  return text;
}

