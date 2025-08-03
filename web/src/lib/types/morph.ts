/**
 * MorphBox Panel File Format (.morph)
 * 
 * A single portable file format for custom panels that combines
 * code, metadata, and history into one shareable file.
 */

export interface MorphFileFormat {
  /**
   * Format version for future compatibility
   */
  formatVersion: '1.0';
  
  /**
   * Panel metadata
   */
  metadata: {
    /**
     * Unique identifier for the panel
     */
    id: string;
    
    /**
     * Display name of the panel
     */
    name: string;
    
    /**
     * Description of what the panel does
     */
    description: string;
    
    /**
     * Semantic version (e.g., "1.0.0")
     */
    version: string;
    
    /**
     * Panel author (optional)
     */
    author?: string;
    
    /**
     * Icon identifier (optional)
     */
    icon?: string;
    
    /**
     * List of features this panel provides
     */
    features: string[];
    
    /**
     * Default size for the panel (optional)
     */
    defaultSize?: {
      width: number;
      height: number;
    };
    
    /**
     * Whether this panel persists data (optional)
     */
    persistent?: boolean;
    
    /**
     * Tags for categorization (optional)
     */
    tags?: string[];
  };
  
  /**
   * The actual panel code (HTML/CSS/JavaScript)
   */
  code: string;
  
  /**
   * History of prompts used to create and modify this panel
   */
  promptHistory: Array<{
    /**
     * The prompt text
     */
    prompt: string;
    
    /**
     * ISO 8601 timestamp
     */
    timestamp: string;
    
    /**
     * Type of operation
     */
    type: 'create' | 'morph';
    
    /**
     * Version after this prompt was applied
     */
    resultingVersion?: string;
  }>;
  
  /**
   * ISO 8601 timestamp of creation
   */
  createdAt: string;
  
  /**
   * ISO 8601 timestamp of last update
   */
  updatedAt: string;
  
  /**
   * Optional custom data that panels can store
   */
  customData?: Record<string, any>;
}

/**
 * Helper function to create a new .morph file structure
 */
export function createMorphFile(
  metadata: MorphFileFormat['metadata'],
  code: string,
  initialPrompt?: string
): MorphFileFormat {
  const now = new Date().toISOString();
  
  return {
    formatVersion: '1.0',
    metadata,
    code,
    promptHistory: initialPrompt ? [{
      prompt: initialPrompt,
      timestamp: now,
      type: 'create',
      resultingVersion: metadata.version
    }] : [],
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Validates a .morph file structure
 */
export function validateMorphFile(data: any): data is MorphFileFormat {
  if (!data || typeof data !== 'object') return false;
  
  // Check format version
  if (data.formatVersion !== '1.0') return false;
  
  // Check required fields
  if (!data.metadata || typeof data.metadata !== 'object') return false;
  if (!data.metadata.id || typeof data.metadata.id !== 'string') return false;
  if (!data.metadata.name || typeof data.metadata.name !== 'string') return false;
  if (!data.metadata.description || typeof data.metadata.description !== 'string') return false;
  if (!data.metadata.version || typeof data.metadata.version !== 'string') return false;
  if (!Array.isArray(data.metadata.features)) return false;
  
  if (!data.code || typeof data.code !== 'string') return false;
  if (!Array.isArray(data.promptHistory)) return false;
  if (!data.createdAt || typeof data.createdAt !== 'string') return false;
  if (!data.updatedAt || typeof data.updatedAt !== 'string') return false;
  
  return true;
}