import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { get, post } from 'aws-amplify/api';
import { uploadData, getUrl } from 'aws-amplify/storage';
import { getCurrentUser } from 'aws-amplify/auth';
import MultiBucketUpload from '../components/MultiBucketUpload';
import { BUCKETS, BUCKET_DESCRIPTIONS } from '../constants/buckets';

const CampaignDetail = () => {
  const { id } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [localizing, setLocalizing] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [textToLocalize, setTextToLocalize] = useState('');
  const [targetLocale, setTargetLocale] = useState('es');
  const [localizedResults, setLocalizedResults] = useState([]);
  const [bucketFiles, setBucketFiles] = useState({});
  const [selectedBucket, setSelectedBucket] = useState(Object.keys(BUCKETS)[0]);

  const supportedLocales = [
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'zh', name: 'Chinese' }
  ];

  useEffect(() => {
    fetchCampaign();
    fetchBucketFiles();
  }, [id]);

  const fetchBucketFiles = async () => {
    try {
      const files = {};
      for (const [bucketName, bucketValue] of Object.entries(BUCKETS)) {
        const response = await post({
          apiName: 'contentLocalizerApi',
          path: '/listFiles',
          options: {
            body: {
              bucketName: bucketValue,
              prefix: `${id}/`
            }
          }
        });
        const data = await response.response.json();
        files[bucketName] = data.files || [];
      }
      setBucketFiles(files);
    } catch (error) {
      console.error('Error fetching bucket files:', error);
    }
  };

  const fetchCampaign = async () => {
    try {
      setLoading(true);
      const response = await get({
        apiName: 'contentLocalizerApi',
        path: `/campaigns/${id}`
      });
      const data = await response.response.json();
      setCampaign(data.campaign);
    } catch (err) {
      console.error('Error fetching campaign:', err);
      setError('Failed to fetch campaign details');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
  };

  const handleFileUpload = async () => {
    if (selectedFiles.length === 0) return;

    try {
      setUploading(true);
      const user = await getCurrentUser();
      
      for (const file of selectedFiles) {
        // Upload file to S3
        const fileName = `${id}/${Date.now()}-${file.name}`;
        await uploadData({
          key: fileName,
          data: file,
          options: {
            contentType: file.type,
            metadata: {
              campaignId: id,
              uploadedBy: user.username,
              originalName: file.name
            }
          }
        }).result;

        // Save metadata to DynamoDB
        await post({
          apiName: 'contentLocalizerApi',
          path: '/uploadAsset',
          options: {
            body: {
              campaignId: id,
              fileName: fileName,
              originalName: file.name,
              fileSize: file.size,
              fileType: file.type,
              uploadedBy: user.username
            }
          }
        });
      }

      setSelectedFiles([]);
      await fetchCampaign(); // Refresh campaign data
    } catch (err) {
      console.error('Error uploading files:', err);
      setError('Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const handleTextLocalization = async () => {
    if (!textToLocalize.trim()) return;

    try {
      setLocalizing(true);
      const user = await getCurrentUser();
      
      const response = await post({
        apiName: 'contentLocalizerApi',
        path: '/localizeText',
        options: {
          body: {
            campaignId: id,
            originalText: textToLocalize,
            targetLocale: targetLocale,
            requestedBy: user.username
          }
        }
      });
      const data = await response.response.json();

      setLocalizedResults([...localizedResults, data.result]);
      setTextToLocalize('');
    } catch (err) {
      console.error('Error localizing text:', err);
      setError('Failed to localize text');
    } finally {
      setLocalizing(false);
    }
  };

  const downloadFile = async (fileKey) => {
    try {
      const url = await getUrl({
        key: fileKey
      });
      window.open(url.url.toString(), '_blank');
    } catch (err) {
      console.error('Error downloading file:', err);
      setError('Failed to download file');
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <h2>Loading campaign...</h2>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="alert alert-error">
        Campaign not found
      </div>
    );
  }

  return (
    <div className="campaign-detail">
      <div className="campaign-header">
        <h1>{campaign.campaignName}</h1>
        <div className="campaign-meta">
          <span className="status active">{campaign.status}</span>
          <span>Created: {new Date(campaign.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      <div className="campaign-sections">
        {/* Multi-Bucket File Upload Section */}
        <div className="card">
          <h3>Multi-Bucket File Upload</h3>
          <MultiBucketUpload 
            campaignId={id}
            onUploadComplete={(results) => {
              console.log('Upload results:', results);
              fetchBucketFiles(); // Refresh file lists
            }}
          />
        </div>

        {/* Text Localization Section */}
        <div className="card">
          <h3>Localize Text Content</h3>
          <div className="form-group">
            <label htmlFor="textToLocalize">Text to Localize</label>
            <textarea
              id="textToLocalize"
              value={textToLocalize}
              onChange={(e) => setTextToLocalize(e.target.value)}
              placeholder="Enter text content to localize..."
              rows="4"
            />
          </div>
          <div className="form-group">
            <label htmlFor="targetLocale">Target Language</label>
            <select
              id="targetLocale"
              value={targetLocale}
              onChange={(e) => setTargetLocale(e.target.value)}
            >
              {supportedLocales.map(locale => (
                <option key={locale.code} value={locale.code}>
                  {locale.name}
                </option>
              ))}
            </select>
          </div>
          <button 
            className="btn" 
            onClick={handleTextLocalization}
            disabled={localizing || !textToLocalize.trim()}
          >
            {localizing ? 'Localizing...' : 'Localize Text'}
          </button>
        </div>

        {/* Localized Results */}
        {localizedResults.length > 0 && (
          <div className="card">
            <h3>Localization Results</h3>
            {localizedResults.map((result, index) => (
              <div key={index} className="localization-result">
                <div className="result-header">
                  <strong>Original ({result.sourceLocale}):</strong>
                  <span className="status completed">{result.targetLocale}</span>
                </div>
                <div className="result-content">
                  <p><strong>Original:</strong> {result.originalText}</p>
                  <p><strong>Localized:</strong> {result.localizedText}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Multi-Bucket Files Display */}
        <div className="card">
          <h3>Files by Bucket</h3>
          <div className="bucket-selector">
            <label>Select Bucket:</label>
            <select 
              value={selectedBucket} 
              onChange={(e) => setSelectedBucket(e.target.value)}
            >
              {Object.entries(BUCKETS).map(([name, bucket]) => (
                <option key={name} value={name}>
                  {name} - {BUCKET_DESCRIPTIONS[bucket]}
                </option>
              ))}
            </select>
          </div>
          
          <div className="bucket-files">
            <h4>Files in {selectedBucket} Bucket:</h4>
            {bucketFiles[selectedBucket] && bucketFiles[selectedBucket].length > 0 ? (
              <div className="files-list">
                {bucketFiles[selectedBucket].map((file, index) => (
                  <div key={index} className="file-item">
                    <div className="file-info">
                      <strong>{file.key.split('/').pop()}</strong>
                      <span>{(file.size / 1024).toFixed(1)} KB</span>
                      <small>Modified: {new Date(file.lastModified).toLocaleDateString()}</small>
                    </div>
                    <button 
                      className="btn btn-secondary"
                      onClick={() => downloadFile(file.key)}
                    >
                      Download
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p>No files found in this bucket for this campaign.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignDetail;
