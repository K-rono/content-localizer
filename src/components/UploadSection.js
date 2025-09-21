import React, { useState, useRef } from 'react';
import { uploadFile } from '../utils/api';

const UploadSection = ({ onFileUpload, onError, contextData }) => {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = (selectedFile) => {
    // Validate file type - only text files
    const allowedTypes = ['text/plain'];
    if (!allowedTypes.includes(selectedFile.type)) {
      alert('Please upload a text file (.txt) only.');
      return;
    }

    // Validate file size
    const maxSizes = {
      'text/plain': 1 * 1024 * 1024, // 1MB
    };

    if (selectedFile.size > maxSizes[selectedFile.type]) {
      const maxSizeMB = maxSizes[selectedFile.type] / (1024 * 1024);
      alert(`File size exceeds ${maxSizeMB}MB limit for this file type.`);
      return;
    }

    setFile(selectedFile);
    createPreview(selectedFile);
  };

  const createPreview = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview({
        type: 'text',
        url: e.target.result,
        name: file.name,
        size: file.size
      });
    };
    reader.readAsDataURL(file);
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleContinue = async () => {
    if (!file) return;

    try {
      setUploading(true);
      setUploadProgress(0);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      // Upload file with context data
      const result = await uploadFile(file, contextData || {});
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Pass the uploaded file and job info to parent
      onFileUpload(file, result);
      
    } catch (error) {
      console.error('Upload error:', error);
      onError(error.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Your Content</h2>
        <p className="text-gray-600">Choose a file to localize for your target audience</p>
      </div>

      {!file ? (
        <div
          className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
            dragActive
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 hover:border-primary-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900">Drop your file here</p>
              <p className="text-gray-600">or click to browse</p>
            </div>
            <div className="text-sm text-gray-500">
              <p>Supported formats:</p>
              <p>Text: .txt (max 1MB)</p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleFileInput}
            accept=".txt"
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* File Preview */}
          <div className="border rounded-lg p-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                {preview?.type === 'image' && (
                  <img
                    src={preview.url}
                    alt="Preview"
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                )}
                {preview?.type === 'video' && (
                  <video
                    src={preview.url}
                    className="w-20 h-20 object-cover rounded-lg"
                    controls
                  />
                )}
                {preview?.type === 'text' && (
                  <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-medium text-gray-900 truncate">
                  {file.name}
                </h3>
                <p className="text-sm text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <p className="text-sm text-gray-500 capitalize">
                  {file.type.split('/')[0]} file
                </p>
              </div>
              <button
                onClick={handleRemoveFile}
                className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Text Preview for text files */}
          {preview?.type === 'text' && (
            <div className="border rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Content Preview:</h4>
              <div className="bg-gray-50 rounded p-3 max-h-32 overflow-y-auto">
                <pre className="text-sm text-gray-600 whitespace-pre-wrap">
                  {preview.url ? atob(preview.url.split(',')[1]) : 'Loading...'}
                </pre>
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Uploading...</span>
                <span className="text-sm text-gray-500">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              onClick={handleRemoveFile}
              disabled={uploading}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Choose Different File
            </button>
            <button
              onClick={handleContinue}
              disabled={uploading}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {uploading && (
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              <span>{uploading ? 'Uploading...' : 'Continue to Context'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadSection;
