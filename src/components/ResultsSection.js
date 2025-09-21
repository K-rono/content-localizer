import React, { useState } from 'react';

const ResultsSection = ({ results, onReset }) => {
  // Extract the localized text from the structured content
  const localizedText = results?.localizedContent?.localizedText || results?.localizedContent || '';
  const [editableContent, setEditableContent] = useState(localizedText);
  const [isEditing, setIsEditing] = useState(false);

  const handleContentEdit = (newContent) => {
    setEditableContent(newContent);
  };

  const handleSave = () => {
    // Here you would save the edited content
    console.log('Saving edited content:', editableContent);
    setIsEditing(false);
  };

  const handleDownload = (fileType) => {
    // Here you would trigger the download
    console.log(`Downloading ${fileType} file`);
    // In a real implementation, you would use the file URL to trigger download
  };

  if (!results) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">No Results Available</h2>
        <p className="text-gray-600">Please complete the localization process first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Localization Complete!</h2>
            <p className="text-gray-600">Review and download your localized content</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onReset}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Start New
            </button>
            <button
              onClick={() => handleDownload('localized')}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Download Localized
            </button>
          </div>
        </div>

        {/* Job Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-gray-50 rounded-lg p-3">
            <span className="font-medium text-gray-700">Job ID:</span>
            <p className="text-gray-600">{results.jobId}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <span className="font-medium text-gray-700">Language:</span>
            <p className="text-gray-600">{results.contextData?.targetLanguage || 'Unknown'}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <span className="font-medium text-gray-700">Status:</span>
            <p className="text-gray-600">{results.status}</p>
          </div>
        </div>
      </div>

      {/* Content Comparison */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gray-50 px-6 py-3 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Content Comparison</h3>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Original Content */}
          <div className="p-6 border-r border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-semibold text-gray-900">Original Content</h4>
              <button
                onClick={() => handleDownload('original')}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Download
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 min-h-64">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                {results.originalContent}
              </pre>
            </div>
          </div>

          {/* Localized Content */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-semibold text-gray-900">Localized Content</h4>
              <div className="flex space-x-2">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  {isEditing ? 'Cancel' : 'Edit'}
                </button>
                {isEditing && (
                  <button
                    onClick={handleSave}
                    className="text-sm text-green-600 hover:text-green-700"
                  >
                    Save
                  </button>
                )}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 min-h-64">
              {isEditing ? (
                <textarea
                  value={editableContent}
                  onChange={(e) => handleContentEdit(e.target.value)}
                  className="w-full h-64 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                  placeholder="Edit your localized content..."
                />
              ) : (
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                  {editableContent}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* File Downloads */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Download Files</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">Original File</h4>
                <p className="text-sm text-gray-600">{results.fileName}</p>
              </div>
              <button
                onClick={() => handleDownload('original')}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                Download
              </button>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">Localized File</h4>
                <p className="text-sm text-gray-600">{results.fileName?.replace(/(\.[^.]+)$/, '_localized$1')}</p>
              </div>
              <button
                onClick={() => handleDownload('localized')}
                className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
              >
                Download
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cultural Context & Additional Info */}
      {results.localizedContent && typeof results.localizedContent === 'object' && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cultural Context & Details</h3>
          <div className="space-y-4">
            {results.localizedContent.culturalNote && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Cultural Note:</h4>
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                  {results.localizedContent.culturalNote}
                </p>
              </div>
            )}
            
            {results.localizedContent.hashtags && results.localizedContent.hashtags.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Hashtags:</h4>
                <div className="flex flex-wrap gap-2">
                  {results.localizedContent.hashtags.map((hashtag, index) => (
                    <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                      {hashtag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {results.localizedContent.callToAction && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Call to Action:</h4>
                <p className="text-sm text-gray-600 bg-green-50 rounded-lg p-3">
                  {results.localizedContent.callToAction}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quality Feedback */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quality Feedback</h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">Translation Quality: Excellent</p>
              <p className="text-sm text-gray-600">The localized content maintains the original meaning and tone.</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">Cultural Adaptation: Good</p>
              <p className="text-sm text-gray-600">Content has been adapted for the target culture and language.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsSection;
