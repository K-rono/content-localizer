const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Initialize AWS services
const dynamodb = new AWS.DynamoDB.DocumentClient();
const bedrock = new AWS.BedrockRuntime();
const s3 = new AWS.S3();

const TABLE_NAME = process.env.CAMPAIGNS_TABLE;

// Multi-bucket configuration
const BUCKETS = {
  // Amplify's auto-created bucket (for general app files)
  MAIN: process.env.STORAGE_BUCKET,
  
  // Your existing buckets for specific purposes
  LOCALIZED: 'smart-content-localized',
  LOGS: 'smart-content-logs',
  PUBLISH: 'smart-content-publish',
  SOURCE: 'smart-content-source'
};

// Language mapping for Bedrock
const LANGUAGE_MAP = {
  'es': 'Spanish',
  'fr': 'French', 
  'de': 'German',
  'it': 'Italian',
  'pt': 'Portuguese',
  'ja': 'Japanese',
  'ko': 'Korean',
  'zh': 'Chinese'
};

// File type to bucket mapping
const getBucketForFileType = (fileType, purpose = 'general') => {
  switch (purpose) {
    case 'localized':
      return BUCKETS.LOCALIZED;
    case 'logs':
      return BUCKETS.LOGS;
    case 'publish':
      return BUCKETS.PUBLISH;
    case 'source':
      return BUCKETS.SOURCE;
    default:
      return BUCKETS.MAIN;
  }
};

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  const { httpMethod, path, body, pathParameters } = event;
  const route = `${httpMethod} ${path}`;
  
  try {
    switch (route) {
      case 'GET /campaigns':
        return await getCampaigns();
      
      case 'GET /campaigns/{id}':
        return await getCampaign(pathParameters.id);
      
      case 'POST /campaigns':
        return await createCampaign(JSON.parse(body));
      
      case 'POST /uploadAsset':
        return await uploadAsset(JSON.parse(body));
      
      case 'POST /localizeText':
        return await localizeText(JSON.parse(body));
      
      case 'POST /uploadToSpecificBucket':
        return await uploadToSpecificBucket(JSON.parse(body));
      
      case 'GET /listFiles':
        return await listFiles(JSON.parse(body));
      
      default:
        return {
          statusCode: 404,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
          },
          body: JSON.stringify({ error: 'Route not found' })
        };
    }
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

async function getCampaigns() {
  const params = {
    TableName: TABLE_NAME,
    FilterExpression: 'begins_with(PK, :pk)',
    ExpressionAttributeValues: {
      ':pk': 'CAMPAIGN#'
    }
  };
  
  const result = await dynamodb.scan(params).promise();
  
  const campaigns = result.Items.map(item => ({
    campaignId: item.PK.replace('CAMPAIGN#', ''),
    campaignName: item.CampaignName,
    status: item.Status,
    createdAt: item.CreatedAt,
    createdBy: item.CreatedBy,
    locales: item.Locales || [],
    fileCount: item.FileCount || 0
  }));
  
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    },
    body: JSON.stringify({ campaigns })
  };
}

async function getCampaign(campaignId) {
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: {
      ':pk': `CAMPAIGN#${campaignId}`
    }
  };
  
  const result = await dynamodb.query(params).promise();
  
  if (result.Items.length === 0) {
    return {
      statusCode: 404,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({ error: 'Campaign not found' })
    };
  }
  
  const campaign = result.Items.find(item => item.SK === 'METADATA');
  const files = result.Items.filter(item => item.SK.startsWith('FILE#'));
  
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    },
    body: JSON.stringify({
      campaign: {
        campaignId: campaign.PK.replace('CAMPAIGN#', ''),
        campaignName: campaign.CampaignName,
        status: campaign.Status,
        createdAt: campaign.CreatedAt,
        createdBy: campaign.CreatedBy,
        locales: campaign.Locales || [],
        files: files.map(file => ({
          fileKey: file.S3Key,
          originalName: file.OriginalName,
          fileSize: file.FileSize,
          fileType: file.FileType,
          uploadedAt: file.UploadedAt,
          bucket: file.Bucket || BUCKETS.MAIN,
          purpose: file.Purpose || 'general'
        }))
      }
    })
  };
}

async function createCampaign(data) {
  const campaignId = uuidv4();
  const now = new Date().toISOString();
  
  const campaign = {
    PK: `CAMPAIGN#${campaignId}`,
    SK: 'METADATA',
    CampaignName: data.campaignName,
    Status: data.status || 'active',
    CreatedAt: now,
    CreatedBy: data.createdBy,
    Locales: [],
    FileCount: 0
  };
  
  await dynamodb.put({
    TableName: TABLE_NAME,
    Item: campaign
  }).promise();
  
  return {
    statusCode: 201,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    },
    body: JSON.stringify({ campaign })
  };
}

async function uploadAsset(data) {
  const now = new Date().toISOString();
  const fileId = uuidv4();
  
  // Determine which bucket to use based on file purpose
  const bucket = getBucketForFileType(data.fileType, data.purpose);
  const fileName = `${data.campaignId}/${data.purpose || 'general'}/${Date.now()}-${data.originalName}`;
  
  // Upload to S3
  await s3.putObject({
    Bucket: bucket,
    Key: fileName,
    Body: data.fileData, // Base64 encoded file data
    ContentType: data.fileType,
    Metadata: {
      campaignId: data.campaignId,
      uploadedBy: data.uploadedBy,
      originalName: data.originalName,
      purpose: data.purpose || 'general'
    }
  }).promise();
  
  const fileItem = {
    PK: `CAMPAIGN#${data.campaignId}`,
    SK: `FILE#${fileId}`,
    S3Key: fileName,
    Bucket: bucket,
    OriginalName: data.originalName,
    FileSize: data.fileSize,
    FileType: data.fileType,
    Purpose: data.purpose || 'general',
    UploadedAt: now,
    UploadedBy: data.uploadedBy
  };
  
  await dynamodb.put({
    TableName: TABLE_NAME,
    Item: fileItem
  }).promise();
  
  // Update file count
  await dynamodb.update({
    TableName: TABLE_NAME,
    Key: {
      PK: `CAMPAIGN#${data.campaignId}`,
      SK: 'METADATA'
    },
    UpdateExpression: 'ADD FileCount :inc',
    ExpressionAttributeValues: {
      ':inc': 1
    }
  }).promise();
  
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    },
    body: JSON.stringify({ 
      success: true, 
      fileId,
      bucket,
      fileName,
      purpose: data.purpose || 'general'
    })
  };
}

async function uploadToSpecificBucket(data) {
  const { bucketName, fileName, fileData, contentType, metadata } = data;
  
  try {
    await s3.putObject({
      Bucket: bucketName,
      Key: fileName,
      Body: fileData,
      ContentType: contentType,
      Metadata: metadata || {}
    }).promise();
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({ 
        success: true,
        bucket: bucketName,
        fileName
      })
    };
  } catch (error) {
    console.error('Error uploading to specific bucket:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({ error: 'Failed to upload to bucket' })
    };
  }
}

async function listFiles(data) {
  const { bucketName, prefix = '' } = data;
  
  try {
    const params = {
      Bucket: bucketName,
      Prefix: prefix,
      MaxKeys: 1000
    };
    
    const result = await s3.listObjectsV2(params).promise();
    
    const files = result.Contents.map(file => ({
      key: file.Key,
      size: file.Size,
      lastModified: file.LastModified,
      etag: file.ETag
    }));
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({ 
        files,
        bucket: bucketName,
        count: files.length
      })
    };
  } catch (error) {
    console.error('Error listing files:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({ error: 'Failed to list files' })
    };
  }
}

async function localizeText(data) {
  const { campaignId, originalText, targetLocale, requestedBy } = data;
  
  try {
    // Call Bedrock for translation
    const prompt = `Translate the following text to ${LANGUAGE_MAP[targetLocale] || targetLocale}. Only return the translated text, nothing else:\n\n${originalText}`;
    
    const bedrockParams = {
      modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
      contentType: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    };
    
    const bedrockResponse = await bedrock.invokeModel(bedrockParams).promise();
    const responseBody = JSON.parse(bedrockResponse.body.toString());
    const localizedText = responseBody.content[0].text.trim();
    
    // Save to DynamoDB
    const localizationId = uuidv4();
    const now = new Date().toISOString();
    
    const localizationItem = {
      PK: `CAMPAIGN#${campaignId}`,
      SK: `LOCALIZATION#${localizationId}`,
      OriginalText: originalText,
      LocalizedText: localizedText,
      SourceLocale: 'en',
      TargetLocale: targetLocale,
      Status: 'completed',
      CreatedAt: now,
      RequestedBy: requestedBy
    };
    
    await dynamodb.put({
      TableName: TABLE_NAME,
      Item: localizationItem
    }).promise();
    
    // Save localized text to S3 in the localized bucket
    const localizedFileName = `localized/${campaignId}/${targetLocale}/${localizationId}.txt`;
    await s3.putObject({
      Bucket: BUCKETS.LOCALIZED,
      Key: localizedFileName,
      Body: localizedText,
      ContentType: 'text/plain',
      Metadata: {
        campaignId,
        originalText: originalText.substring(0, 100), // First 100 chars
        targetLocale,
        sourceLocale: 'en'
      }
    }).promise();
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({
        result: {
          localizationId,
          originalText,
          localizedText,
          sourceLocale: 'en',
          targetLocale,
          status: 'completed',
          s3Key: localizedFileName,
          bucket: BUCKETS.LOCALIZED
        }
      })
    };
    
  } catch (error) {
    console.error('Bedrock translation error:', error);
    
    // Log error to logs bucket
    const errorLog = {
      timestamp: new Date().toISOString(),
      error: error.message,
      campaignId,
      originalText: originalText.substring(0, 100),
      targetLocale
    };
    
    await s3.putObject({
      Bucket: BUCKETS.LOGS,
      Key: `errors/${campaignId}/${Date.now()}-translation-error.json`,
      Body: JSON.stringify(errorLog, null, 2),
      ContentType: 'application/json'
    }).promise();
    
    // Fallback: return original text with error status
    const localizationId = uuidv4();
    const now = new Date().toISOString();
    
    const localizationItem = {
      PK: `CAMPAIGN#${campaignId}`,
      SK: `LOCALIZATION#${localizationId}`,
      OriginalText: originalText,
      LocalizedText: originalText,
      SourceLocale: 'en',
      TargetLocale: targetLocale,
      Status: 'failed',
      Error: error.message,
      CreatedAt: now,
      RequestedBy: requestedBy
    };
    
    await dynamodb.put({
      TableName: TABLE_NAME,
      Item: localizationItem
    }).promise();
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
      },
      body: JSON.stringify({
        result: {
          localizationId,
          originalText,
          localizedText: originalText,
          sourceLocale: 'en',
          targetLocale,
          status: 'failed',
          error: 'Translation service temporarily unavailable'
        }
      })
    };
  }
}
