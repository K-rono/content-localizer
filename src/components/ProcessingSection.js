import React, { useState, useEffect } from 'react';
import { processJob, pollJobStatus } from '../utils/api';

const ProcessingSection = ({ jobId, onComplete, onError }) => {
  const [status, setStatus] = useState('pending');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const statusMessages = {
    pending: 'Preparing your content for localization...',
    processing: 'Analyzing and localizing your content...',
    completed: 'Localization completed successfully!',
    failed: 'Localization failed. Please try again.'
  };

  const statusColors = {
    pending: 'text-yellow-600',
    processing: 'text-blue-600',
    completed: 'text-green-600',
    failed: 'text-red-600'
  };

  const statusIcons = {
    pending: (
      <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    processing: (
      <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    completed: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    failed: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    )
  };

  useEffect(() => {
    if (!jobId) {
      setError('No job ID provided');
      return;
    }

    const startProcessing = async () => {
      try {
        setStatus('pending');
        setProgress(20);

        // Start the job processing
        await processJob(jobId);
        setStatus('processing');
        setProgress(40);

        // Poll for job completion
        const completedJob = await pollJobStatus(
          jobId,
          (status, job, error) => {
            if (error) {
              setError(error);
              setStatus('failed');
              return;
            }

            setStatus(status);
            
            // Update progress based on status
            switch (status) {
              case 'pending':
                setProgress(20);
                break;
              case 'processing':
                setProgress(60);
                break;
              case 'completed':
                setProgress(100);
                break;
              case 'failed':
                setProgress(0);
                break;
              default:
                setProgress(40);
                break;
            }
          }
        );

        if (completedJob) {
          // Transform job data to results format
          const results = {
            jobId: completedJob.jobId,
            status: completedJob.status,
            originalFile: {
              name: completedJob.fileName,
              url: completedJob.originalFileUrl
            },
            localizedFile: {
              name: completedJob.fileName?.replace(/(\.[^.]+)$/, '_localized$1'),
              url: completedJob.localizedFileUrl
            },
            localizedContent: completedJob.localizedContent || 'Localized content will be available for download.',
            originalContent: completedJob.originalContent || 'Original content',
            processingTime: completedJob.processingTime || 'Unknown',
            language: completedJob.language || 'Unknown',
            tone: completedJob.tone || 'Unknown'
          };
          
          onComplete(results);
        }

      } catch (error) {
        console.error('Processing error:', error);
        setError(error.message || 'Processing failed');
        setStatus('failed');
        onError(error.message || 'Processing failed');
      }
    };

    startProcessing();
  }, [jobId, onComplete, onError]);

  const handleRetry = () => {
    setStatus('pending');
    setProgress(0);
    setError(null);
    // Restart processing logic here
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="text-center">
        <div className="mb-6">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
            status === 'completed' ? 'bg-green-100' : 
            status === 'failed' ? 'bg-red-100' : 'bg-blue-100'
          }`}>
            <div className={statusColors[status]}>
              {statusIcons[status]}
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {status === 'completed' ? 'Localization Complete!' : 
             status === 'failed' ? 'Processing Failed' : 'Processing Your Content'}
          </h2>
          
          <p className={`text-lg ${statusColors[status]}`}>
            {statusMessages[status]}
          </p>
        </div>

        {/* Progress Bar */}
        {status !== 'failed' && (
          <div className="mb-8">
            <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
              <div 
                className="bg-primary-600 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-600">{progress}% Complete</p>
          </div>
        )}

        {/* Processing Steps */}
        <div className="space-y-4 mb-8">
          <div className={`flex items-center space-x-3 p-3 rounded-lg ${
            status === 'pending' || status === 'processing' || status === 'completed' 
              ? 'bg-blue-50' : 'bg-gray-50'
          }`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
              status === 'pending' || status === 'processing' || status === 'completed'
                ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              {status === 'completed' ? '✓' : '1'}
            </div>
            <span className="text-sm font-medium text-gray-700">Uploading and validating file</span>
          </div>

          <div className={`flex items-center space-x-3 p-3 rounded-lg ${
            status === 'processing' || status === 'completed' 
              ? 'bg-blue-50' : 'bg-gray-50'
          }`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
              status === 'processing' || status === 'completed'
                ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              {status === 'completed' ? '✓' : '2'}
            </div>
            <span className="text-sm font-medium text-gray-700">Analyzing content structure</span>
          </div>

          <div className={`flex items-center space-x-3 p-3 rounded-lg ${
            status === 'processing' || status === 'completed' 
              ? 'bg-blue-50' : 'bg-gray-50'
          }`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
              status === 'processing' || status === 'completed'
                ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              {status === 'completed' ? '✓' : '3'}
            </div>
            <span className="text-sm font-medium text-gray-700">Applying localization rules</span>
          </div>

          <div className={`flex items-center space-x-3 p-3 rounded-lg ${
            status === 'completed' 
              ? 'bg-green-50' : 'bg-gray-50'
          }`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
              status === 'completed'
                ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              {status === 'completed' ? '✓' : '4'}
            </div>
            <span className="text-sm font-medium text-gray-700">Generating localized content</span>
          </div>
        </div>

        {/* Error Message */}
        {status === 'failed' && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">
              {error || 'An error occurred during processing. Please try again.'}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        {status === 'failed' && (
          <div className="flex justify-center space-x-4">
            <button
              onClick={handleRetry}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Retry Processing
            </button>
          </div>
        )}

        {status === 'completed' && (
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              Your content has been successfully localized and is ready for review.
            </p>
            <button
              onClick={() => {/* This will be handled by parent component */}}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              View Results
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcessingSection;
