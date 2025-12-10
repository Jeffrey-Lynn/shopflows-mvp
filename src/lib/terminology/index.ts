'use client';

import { useMemo } from 'react';
import type { Industry, TerminologyConfig } from './types';

// =============================================================================
// Default/Universal Terminology
// =============================================================================

const universalTerminology: TerminologyConfig = {
  item: 'Item',
  itemPlural: 'Items',
  identifier: 'Identifier',
  identifierPlural: 'Identifiers',
  stage: 'Stage',
  stagePlural: 'Stages',
};

// =============================================================================
// Industry-Specific Terminology Configs
// =============================================================================

const terminologyConfigs: Record<Industry, TerminologyConfig> = {
  universal: universalTerminology,

  fabrication: {
    item: 'Work Order',
    itemPlural: 'Work Orders',
    identifier: 'Part Number',
    identifierPlural: 'Part Numbers',
    stage: 'Stage',
    stagePlural: 'Stages',
  },

  cleaning: {
    item: 'Job Site',
    itemPlural: 'Job Sites',
    identifier: 'Address',
    identifierPlural: 'Addresses',
    stage: 'Stage',
    stagePlural: 'Stages',
  },

  hvac: {
    item: 'Service Call',
    itemPlural: 'Service Calls',
    identifier: 'Work Order #',
    identifierPlural: 'Work Order #s',
    stage: 'Stage',
    stagePlural: 'Stages',
  },

  maintenance: {
    item: 'Work Order',
    itemPlural: 'Work Orders',
    identifier: 'Unit/Property',
    identifierPlural: 'Units/Properties',
    stage: 'Stage',
    stagePlural: 'Stages',
  },

  events: {
    item: 'Event',
    itemPlural: 'Events',
    identifier: 'Event Name',
    identifierPlural: 'Event Names',
    stage: 'Stage',
    stagePlural: 'Stages',
  },

  custom: universalTerminology, // Custom uses universal as base, can be overridden
};

// =============================================================================
// Getter Function
// =============================================================================

/**
 * Returns the terminology configuration for a given industry.
 * Defaults to universal terminology if industry is not found.
 */
export function getTerminology(industry: Industry): TerminologyConfig {
  return terminologyConfigs[industry] ?? universalTerminology;
}

// =============================================================================
// React Hook
// =============================================================================

/**
 * React hook that returns the appropriate terminology config for the current org.
 * 
 * TODO: Integrate with org context/database to get the actual industry.
 * Currently defaults to 'universal' terminology.
 * 
 * Usage:
 * ```tsx
 * const terms = useTerminology();
 * return <h1>{terms.itemPlural}</h1>; // "Items", "Work Orders", etc.
 * ```
 */
export function useTerminology(): TerminologyConfig {
  // TODO: Get industry from org context when available
  // const { org } = useOrg();
  // const industry = org?.industry ?? 'universal';
  
  const industry: Industry = 'universal';

  const terminology = useMemo(() => {
    return getTerminology(industry);
  }, [industry]);

  return terminology;
}

// =============================================================================
// Exports
// =============================================================================

export type { Industry, TerminologyConfig } from './types';
