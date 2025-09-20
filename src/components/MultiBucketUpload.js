import React, { useState } from 'react';
import { uploadData } from 'aws-amplify/storage';
import { post } from 'aws-amplify/api';
import { API_NAME } from '../constants/api';
import { API_ENDPOINTS } from '../constants/api';
import { BUCKETS, FILE_PURPOSES, getPurposeForFileType, BUCKET_DESCRIPTIONS } from '../constants/buckets';

const MultiBucketUpload = ({ campaignId, onUploadComplete }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [selectedPurpose, setSelectedPurpose] = useState(FILE_PURPOSES.GENERAL);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const filesWithPurpose = files.map(file => ({
      file,
      purpose: getPurposeForFileType(file.type, file.name),
      bucket: BUCKETS[getPurposeForFileType(file.type, file.name).toUpperCase()] || BUCKETS.MAIN
    }));
    setSelectedFiles(filesWithPurpose);
  };

  const handlePurposeChange = (fileIndex, purpose) => {
    setSelectedFiles(prev => 
      prev.map((item, index) => 
        index === fileIndex 
          ? { ...item, purpose, bucket: BUCKETS[purpose.toUpperCase()] || BUCKETS.MAIN }
          : item
      )
    );
  };

  const uploadFile = async (fileItem, index) => {
    const { file, purpose, bucket } = fileItem;
    
    try {
      setUploadProgress(prev => ({ ...prev, [index]: 0 }));
      
      // Convert file to base64 for Lambda
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Upload via Lambda function
      const response = await post({
        apiName: API_NAME,
        path: API_ENDPOINTS.UPLOAD_ASSET,
        options: {
          body: {
            campaignId,
            fileName: `${campaignId}/${purpose}/${Date.now()}-${file.name}`,
            fileData: base64,
            fileType: file.type,
            fileSize: file.size,
            originalName: file.name,
            purpose,
            bucket,
            uploadedBy: 'current-user' // This should come from auth context
          }
        }
      });

      const data = await response.response.json();
      
      setUploadProgress(prev => ({ ...prev, [index]: 100 }));
      
      return {
        success: true,
        file: file.name,
        bucket,
        purpose,
        s3Key: data.fileName
      };
      
    } catch (error) {
      console.error(`Error uploading ${file.name}:`, error);
      setUploadProgress(prev => ({ ...prev, [index]: -1 }));
      
      return {
        success: false,
        file: file.name,
        error: error.message
      };
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    const results = [];

    try {
      // Upload files in parallel
      const uploadPromises = selectedFiles.map((fileItem, index) => 
        uploadFile(fileItem, index)
      );
      
      const uploadResults = await Promise.all(uploadPromises);
      results.push(...uploadResults);
      
      // Call completion callback
      if (onUploadComplete) {
        onUploadComplete(results);
      }
      
      // Reset form
      setSelectedFiles([]);
      setUploadProgress({});
      
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const getBucketDescription = (purpose) => {
    const bucket = BUCKETS[purpose.toUpperCase()] || BUCKETS.MAIN;
    return BUCKET_DESCRIPTIONS[bucket];
  };

  return (
    <div className="multi-bucket-upload">
      <h3>Multi-Bucket File Upload</h3>
      
      <div className="file-upload-area">
        <input
          type="file"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          id="multi-file-upload"
        />
        <label htmlFor="multi-file-upload" className="file-upload-label">
          {selectedFiles.length > 0 
            ? `${selectedFiles.length} file(s) selected` 
            : 'Click to select files or drag and drop'
          }
        </label>
      </div>

      {selectedFiles.length > 0 && (
        <div className="selected-files">
          <h4>Selected Files:</h4>
          {selectedFiles.map((fileItem, index) => (
            <div key={index} className="file-item">
              <div className="file-info">
                <strong>{fileItem.file.name}</strong>
                <span>{(fileItem.file.size / 1024).toFixed(1)} KB</span>
              </div>
              
              <div className="file-purpose">
                <label>Purpose:</label>
                <select
                  value={fileItem.purpose}
                  onChange={(e) => handlePurposeChange(index, e.target.value)}
                >
                  <option value={FILE_PURPOSES.GENERAL}>General</option>
                  <option value={FILE_PURPOSES.SOURCE}>Source</option>
                  <option value={FILE_PURPOSES.LOCALIZED}>Localized</option>
                  <option value={FILE_PURPOSES.PUBLISH}>Publish</option>
                  <option value={FILE_PURPOSES.LOGS}>Logs</option>
                </select>
                <div className="bucket-info">
                  <small>Bucket: {fileItem.bucket}</small>
                  <small>{getBucketDescription(fileItem.purpose)}</small>
                </div>
              </div>
              
              <div className="upload-progress">
                {uploadProgress[index] !== undefined && (
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ 
                        width: `${uploadProgress[index]}%`,
                        backgroundColor: uploadProgress[index] === -1 ? '#dc3545' : '#007bff'
                      }}
                    />
                    <span className="progress-text">
                      {uploadProgress[index] === -1 ? 'Error' : 
                       uploadProgress[index] === 100 ? 'Complete' : 
                       `${uploadProgress[index]}%`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          <div className="upload-actions">
            <button 
              className="btn" 
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload All Files'}
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => {
                setSelectedFiles([]);
                setUploadProgress({});
              }}
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiBucketUpload;
