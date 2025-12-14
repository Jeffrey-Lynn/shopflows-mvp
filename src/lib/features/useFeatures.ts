'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import type { FeatureFlags, AvailableFeature } from './types';
import { DEFAULT_FEATURES } from './types';


interface UseFeaturesReturn {
  /** Current feature flags for the organization */
  features: FeatureFlags;
  /** Whether features are still loading */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Check if a specific feature is enabled */
  hasFeature: (feature: AvailableFeature) => boolean;
  /** Enable a feature (requires admin) */
  enableFeature: (feature: AvailableFeature) => Promise<boolean>;
  /** Disable a feature (requires admin) */
  disableFeature: (feature: AvailableFeature) => Promise<boolean>;
  /** Refresh features from database */
  refresh: () => Promise<void>;
}

/**
 * Hook to access and manage feature flags for the current organization.
 * Falls back to default features if database column doesn't exist yet.
 */
export function useFeatures(): UseFeaturesReturn {
  const { session } = useAuth();
  const [features, setFeatures] = useState<FeatureFlags>(DEFAULT_FEATURES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeatures = useCallback(async () => {
    const orgId = session?.orgId || session?.shopId;
    if (!orgId) {
      setFeatures(DEFAULT_FEATURES);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      
      // Fetch features from organizations table
      const { data, error: fetchError } = await supabase
        .from('organizations')
        .select('features')
        .eq('id', orgId)
        .single();

      if (fetchError) {
        // If column doesn't exist or other error, use defaults
        console.warn('Could not fetch features, using defaults:', fetchError.message);
        setFeatures(DEFAULT_FEATURES);
      } else if (data?.features) {
        // Merge with defaults to ensure all keys exist
        setFeatures({ ...DEFAULT_FEATURES, ...data.features });
      } else {
        setFeatures(DEFAULT_FEATURES);
      }
    } catch (err) {
      console.error('Error fetching features:', err);
      setError('Failed to load features');
      setFeatures(DEFAULT_FEATURES);
    } finally {
      setLoading(false);
    }
  }, [session?.orgId, session?.shopId]);

  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

  const hasFeature = useCallback(
    (feature: AvailableFeature): boolean => {
      return features[feature] ?? false;
    },
    [features]
  );

  const updateFeature = useCallback(
    async (feature: AvailableFeature, enabled: boolean): Promise<boolean> => {
      const orgId = session?.orgId || session?.shopId;
      if (!orgId) return false;

      try {
        const updatedFeatures = { ...features, [feature]: enabled };

        // Update in database
        const { error: updateError } = await supabase
          .from('organizations')
          .update({ features: updatedFeatures })
          .eq('id', orgId);

        if (updateError) {
          console.error('Failed to update feature:', updateError.message);
          return false;
        }

        // Update local state
        setFeatures(updatedFeatures);
        return true;
      } catch (err) {
        console.error('Error updating feature:', err);
        return false;
      }
    },
    [session?.orgId, session?.shopId, features]
  );

  const enableFeature = useCallback(
    (feature: AvailableFeature) => updateFeature(feature, true),
    [updateFeature]
  );

  const disableFeature = useCallback(
    (feature: AvailableFeature) => updateFeature(feature, false),
    [updateFeature]
  );

  return {
    features,
    loading,
    error,
    hasFeature,
    enableFeature,
    disableFeature,
    refresh: fetchFeatures,
  };
}
