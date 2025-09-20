import { Amplify } from 'aws-amplify';
import awsconfig from '../aws-exports';

// Configure Amplify with the generated config
Amplify.configure(awsconfig);

// Export configured services for easy access
export { get, post, put, del } from 'aws-amplify/api';
export { getCurrentUser, signOut } from 'aws-amplify/auth';
export { uploadData, getUrl } from 'aws-amplify/storage';

// Helper functions for common operations
export const uploadFile = async (fileName, file, metadata = {}) => {
  try {
    return await uploadData({
      key: fileName,
      data: file,
      options: {
        contentType: file.type,
        metadata
      }
    }).result;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

export const downloadFile = async (fileKey) => {
  try {
    const url = await getUrl({ key: fileKey });
    return url.url.toString();
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
};

export const callAPI = async (apiName, path, options = {}) => {
  try {
    const method = options.method || 'get';
    const apiCall = method === 'get' ? get : method === 'post' ? post : method === 'put' ? put : del;
    const response = await apiCall({
      apiName,
      path,
      options
    });
    return await response.response.json();
  } catch (error) {
    console.error('Error calling API:', error);
    throw error;
  }
};
