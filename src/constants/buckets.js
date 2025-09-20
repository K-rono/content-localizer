// Multi-bucket configuration for Content Localizer
export const BUCKETS = {
  // Amplify's auto-created bucket (for general app files)
  MAIN: 'content-localizer-storage-xxxxx', // Will be replaced with actual bucket name
  
  // Your existing buckets for specific purposes
  LOCALIZED: 'smart-content-localized',
  LOGS: 'smart-content-logs',
  PUBLISH: 'smart-content-publish',
  SOURCE: 'smart-content-source'
};

// File purpose to bucket mapping
export const FILE_PURPOSES = {
  GENERAL: 'general',
  LOCALIZED: 'localized',
  LOGS: 'logs',
  PUBLISH: 'publish',
  SOURCE: 'source'
};

// Get bucket name for specific purpose
export const getBucketForPurpose = (purpose) => {
  switch (purpose) {
    case FILE_PURPOSES.LOCALIZED:
      return BUCKETS.LOCALIZED;
    case FILE_PURPOSES.LOGS:
      return BUCKETS.LOGS;
    case FILE_PURPOSES.PUBLISH:
      return BUCKETS.PUBLISH;
    case FILE_PURPOSES.SOURCE:
      return BUCKETS.SOURCE;
    default:
      return BUCKETS.MAIN;
  }
};

// File type to purpose mapping
export const getPurposeForFileType = (fileType, fileName) => {
  const lowerFileName = fileName.toLowerCase();
  const lowerFileType = fileType.toLowerCase();
  
  // Check file extension and name patterns
  if (lowerFileName.includes('localized') || lowerFileName.includes('translated')) {
    return FILE_PURPOSES.LOCALIZED;
  }
  
  if (lowerFileName.includes('log') || lowerFileType.includes('log')) {
    return FILE_PURPOSES.LOGS;
  }
  
  if (lowerFileName.includes('publish') || lowerFileName.includes('final')) {
    return FILE_PURPOSES.PUBLISH;
  }
  
  if (lowerFileName.includes('source') || lowerFileName.includes('original')) {
    return FILE_PURPOSES.SOURCE;
  }
  
  // Default to general purpose
  return FILE_PURPOSES.GENERAL;
};

// Bucket descriptions for UI
export const BUCKET_DESCRIPTIONS = {
  [BUCKETS.MAIN]: 'General app files and user uploads',
  [BUCKETS.LOCALIZED]: 'Translated and localized content',
  [BUCKETS.LOGS]: 'Application logs and audit trails',
  [BUCKETS.PUBLISH]: 'Published and final content',
  [BUCKETS.SOURCE]: 'Original source files and uploads'
};
