import { get, post } from 'aws-amplify/api';
import { getCurrentUser } from 'aws-amplify/auth';

// API Configuration
const API_NAME = 'contentLocalizerEndpoints';

// Error handling utility
const handleApiError = (error, operation) => {
  console.error(`${operation} error:`, error);
  
  // Handle Amplify API errors
  if (error.name === 'RestApiError') {
    const status = error.statusCode;
    const message = error.message || 'Server error';
    
    switch (status) {
      case 400:
        return `Invalid request: ${message}`;
      case 401:
        return 'Authentication required. Please sign in again.';
      case 403:
        return 'Access denied. You do not have permission to perform this action.';
      case 404:
        return 'Resource not found.';
      case 413:
        return 'File too large. Please check file size limits.';
      case 429:
        return 'Too many requests. Please try again later.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return `Error ${status}: ${message}`;
    }
  } else if (error.name === 'NetworkError') {
    // Network error
    return 'Network error. Please check your connection and try again.';
  } else {
    // Other error
    return error.message || 'An unexpected error occurred.';
  }
};

// Upload file and create job
export const uploadFile = async (file, contextData) => {
  try {
    const user = await getCurrentUser();
    
    // First, create the upload job
    const uploadResponse = await post({
      apiName: API_NAME,
      path: '/upload',
      options: {
        body: {
          fileName: file.name,
          fileType: getFileType(file.type),
          fileSize: file.size,
          userId: user.username || user.userId || 'anonymous',
          contextData: contextData
        }
      }
    });

    // For Amplify v6, we need to await the response and parse the body
    const response = await uploadResponse.response;
    console.log('Upload response:', response);
    
    // Parse the response body as JSON
    const uploadData = await response.body.json();
    console.log('Upload data:', uploadData);
    
    if (!uploadData.success) {
      throw new Error(uploadData.error || 'Upload failed');
    }

    // Upload file to S3 using presigned URL
    const uploadResult = await fetch(uploadData.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type
      }
    });

    if (!uploadResult.ok) {
      throw new Error('Failed to upload file to storage');
    }

    return {
      success: true,
      jobId: uploadData.jobId,
      s3Key: uploadData.s3Key
    };

  } catch (error) {
    console.error('Upload error details:', {
      name: error.name,
      message: error.message,
      statusCode: error.statusCode,
      cause: error.cause,
      stack: error.stack
    });
    throw new Error(handleApiError(error, 'File upload'));
  }
};

// Process job
export const processJob = async (jobId) => {
  try {
    const response = await post({
      apiName: API_NAME,
      path: `/process/${jobId}`,
      options: {
        body: {}
      }
    });

    // For Amplify v6, we need to await the response and parse the body
    const res = await response.response;
    const data = await res.body.json();

    if (!data.success) {
      throw new Error(data.error || 'Processing failed');
    }

    return {
      success: true,
      jobId: data.jobId,
      status: data.status
    };

  } catch (error) {
    throw new Error(handleApiError(error, 'Job processing'));
  }
};

// Get job results
export const getJobResults = async (jobId) => {
  try {
    const response = await get({
      apiName: API_NAME,
      path: `/results/${jobId}`
    });

        // For Amplify v6, we need to await the response and parse the body
        const res = await response.response;
        const data = await res.body.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch results');
        }

    return {
      success: true,
      job: data.job
    };

  } catch (error) {
    throw new Error(handleApiError(error, 'Results fetching'));
  }
};

// Get user's job history
export const getJobHistory = async () => {
  try {
    const user = await getCurrentUser();
    
    const response = await get({
      apiName: API_NAME,
      path: `/jobs?userId=${user.username || user.userId}`
    });

    // For Amplify v6, we need to await the response and parse the body
    const res = await response.response;
    const data = await res.body.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch job history');
    }

    return {
      success: true,
      jobs: data.jobs || []
    };

  } catch (error) {
    throw new Error(handleApiError(error, 'Job history fetching'));
  }
};

// Utility function to determine file type
const getFileType = (mimeType) => {
  if (mimeType.startsWith('text/')) return 'text';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  return 'text'; // default fallback
};

// Poll job status until completion
export const pollJobStatus = async (jobId, onStatusUpdate, maxAttempts = 30, interval = 2000) => {
  let attempts = 0;
  
  const poll = async () => {
    try {
      const result = await getJobResults(jobId);
      const job = result.job;
      
      onStatusUpdate(job.status, job);
      
      if (job.status === 'Completed' || job.status === 'Failed') {
        return job;
      }
      
      if (attempts >= maxAttempts) {
        throw new Error('Job processing timeout. Please try again later.');
      }
      
      attempts++;
      setTimeout(poll, interval);
      
    } catch (error) {
      onStatusUpdate('error', null, error.message);
      throw error;
    }
  };
  
  return poll();
};
