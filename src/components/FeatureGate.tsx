'use client';

import { ReactNode } from 'react';
import { useFeatures } from '@/lib/features';
import type { AvailableFeature } from '@/lib/features';

interface FeatureGateProps {
  /** The feature that must be enabled to show children */
  feature: AvailableFeature;
  /** Content to render when feature is enabled */
  children: ReactNode;
  /** Optional content to render when feature is disabled */
  fallback?: ReactNode;
  /** If true, show a loading state while checking features */
  showLoading?: boolean;
}

/**
 * Conditionally renders children based on whether a feature is enabled.
 * 
 * @example
 * ```tsx
 * <FeatureGate feature="labor_tracking">
 *   <LaborTrackingSection />
 * </FeatureGate>
 * 
 * <FeatureGate feature="inventory" fallback={<UpgradePrompt />}>
 *   <InventoryModule />
 * </FeatureGate>
 * ```
 */
export function FeatureGate({
  feature,
  children,
  fallback = null,
  showLoading = false,
}: FeatureGateProps) {
  const { hasFeature, loading } = useFeatures();

  if (loading && showLoading) {
    return null; // Or return a loading spinner
  }

  if (loading) {
    // While loading, don't show anything to prevent flash
    return null;
  }

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

/**
 * Hook-based alternative for more complex conditional logic
 * 
 * @example
 * ```tsx
 * const { hasFeature } = useFeatures();
 * 
 * return (
 *   <div>
 *     {hasFeature('labor_tracking') && <LaborSection />}
 *     {hasFeature('inventory') ? <InventoryFull /> : <InventoryLite />}
 *   </div>
 * );
 * ```
 */
