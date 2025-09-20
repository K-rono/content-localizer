export const API_ENDPOINTS = {
  CAMPAIGNS: '/campaigns',
  CAMPAIGN_DETAIL: (id) => `/campaigns/${id}`,
  UPLOAD_ASSET: '/uploadAsset',
  UPLOAD_TO_SPECIFIC_BUCKET: '/uploadToSpecificBucket',
  LIST_FILES: '/listFiles',
  LOCALIZE_TEXT: '/localizeText'
};

export const API_NAME = 'contentLocalizerApi';

export const HTTP_METHODS = {
  GET: 'get',
  POST: 'post',
  PUT: 'put',
  DELETE: 'delete'
};

export const API_CONFIG = {
  headers: {
    'Content-Type': 'application/json'
  }
};
