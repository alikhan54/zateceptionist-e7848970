// ============================================================
// ONBOARDING STEP COMPONENTS - BARREL EXPORT
// ============================================================

export { DiscoverStep } from './DiscoverStep';
export { AnalyzeStep } from './AnalyzeStep';
export { ProfileStep } from './ProfileStep';
export { ServicesStep } from './ServicesStep';
export { PersonasStep } from './PersonasStep';
export { AIConfigStep } from './AIConfigStep';
export { ChannelsStep } from './ChannelsStep';
export { TrainingStep } from './TrainingStep';
export { CompleteStep } from './CompleteStep';

// Step configuration type
export interface StepProps {
  onNext: () => void;
  onPrevious: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}
