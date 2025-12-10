/**
 * Feature flags that can be toggled per organization.
 * Matches the JSONB structure in the organizations.features column.
 */
export interface FeatureFlags {
  /** Track labor hours and worker assignments */
  labor_tracking: boolean;
  /** Inventory management module */
  inventory: boolean;
  /** In-app messaging and notifications */
  messaging: boolean;
  /** Invoice generation and payment tracking */
  invoicing: boolean;
  /** AI-powered assistant features */
  ai_assistant: boolean;
}

/**
 * Union type of all available feature names
 */
export type AvailableFeature = keyof FeatureFlags;

/**
 * Default feature flags for new organizations
 */
export const DEFAULT_FEATURES: FeatureFlags = {
  labor_tracking: true,
  inventory: false,
  messaging: true,
  invoicing: false,
  ai_assistant: false,
};

/**
 * Subscription plan tiers
 */
export type PlanTier = 'starter' | 'professional' | 'enterprise';

/**
 * Features available per plan tier
 */
export const PLAN_FEATURES: Record<PlanTier, AvailableFeature[]> = {
  starter: ['labor_tracking', 'messaging'],
  professional: ['labor_tracking', 'messaging', 'inventory', 'invoicing'],
  enterprise: ['labor_tracking', 'messaging', 'inventory', 'invoicing', 'ai_assistant'],
};
