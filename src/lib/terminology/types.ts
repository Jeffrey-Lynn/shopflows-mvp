/**
 * Terminology configuration that defines what labels an industry sees
 * for the same underlying data structures.
 */
export interface TerminologyConfig {
  /** Singular label for a job item (e.g., "Work Order", "Job Site", "Vehicle") */
  item: string;
  /** Plural label for job items (e.g., "Work Orders", "Job Sites", "Vehicles") */
  itemPlural: string;
  /** Label for the item identifier (e.g., "Part Number", "Address", "VIN") */
  identifier: string;
  /** Plural label for identifiers */
  identifierPlural: string;
  /** Label for a workflow stage (default "Stage") */
  stage: string;
  /** Plural label for stages (default "Stages") */
  stagePlural: string;
}

/**
 * Supported industry types for terminology customization
 */
export type Industry =
  | 'universal'
  | 'fabrication'
  | 'cleaning'
  | 'hvac'
  | 'maintenance'
  | 'events'
  | 'custom';
