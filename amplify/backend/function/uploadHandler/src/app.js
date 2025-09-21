/* Amplify Params - DO NOT EDIT
	ENV
	REGION
	STORAGE_CONTENTLOCALIZERDATASTORE_ARN
	STORAGE_CONTENTLOCALIZERDATASTORE_NAME
	STORAGE_CONTENTLOCALIZERDATASTORE_STREAMARN
	STORAGE_CONTENTLOCALIZERSTORAGE_BUCKETNAME
Amplify Params - DO NOT EDIT */const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware');
const bodyParser = require('body-parser');
const express = require('express');
const { v4: uuidv4 } = require('uuid');

const ddbClient = new DynamoDBClient({ region: process.env.REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);
const s3Client = new S3Client({ region: process.env.REGION });

// Use the environment variable provided by Amplify
const tableName = process.env.STORAGE_CONTENTLOCALIZERDATASTORE_NAME || "contentLocalizerDatastore";

const bucketName = process.env.STORAGE_CONTENTLOCALIZERSTORAGE_BUCKETNAME;

// File size limits (in bytes)
const FILE_SIZE_LIMITS = {
  text: 1 * 1024 * 1024,    // 1 MB
  image: 10 * 1024 * 1024,  // 10 MB
  video: 100 * 1024 * 1024  // 100 MB
};

// declare a new express app
const app = express();
app.use(bodyParser.json());
app.use(awsServerlessExpressMiddleware.eventContext());

// Enable CORS for all methods
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  next();
});

/************************************
* POST /upload - Create job and generate presigned URL *
************************************/

app.post('/upload', async function(req, res) {
  try {
    const { fileName, fileType, fileSize, userId, contextData } = req.body;

    // Validate required fields
    if (!fileName || !fileType || !fileSize || !userId) {
      return res.status(400).json({
        error: 'Missing required fields: fileName, fileType, fileSize, userId'
      });
    }

    // Validate file type
    const validFileTypes = ['text', 'image', 'video'];
    if (!validFileTypes.includes(fileType)) {
      return res.status(400).json({
        error: 'Invalid file type. Must be one of: text, image, video'
      });
    }

    // Validate file size
    if (fileSize > FILE_SIZE_LIMITS[fileType]) {
      return res.status(400).json({
        error: `File size exceeds limit for ${fileType} files (${FILE_SIZE_LIMITS[fileType] / (1024 * 1024)}MB)`
      });
    }

    // Generate unique job ID
    const jobId = uuidv4();
    const now = new Date().toISOString();

    // Create S3 key for original file
    const s3Key = `jobs/${jobId}/original/${fileName}`;

    // Generate presigned URL for S3 upload
    const putObjectCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      ContentType: getContentType(fileType)
    });

    const presignedUrl = await getSignedUrl(s3Client, putObjectCommand, {
      expiresIn: 3600 // 1 hour
    });

    // Create job record in DynamoDB
    const jobRecord = {
      PK: `JOB#${jobId}`,
      SK: 'METADATA',
      jobId: jobId,
      userId: userId,
      status: 'Pending',
      fileType: fileType,
      filePath: s3Key,
      resultPath: null,
      createdAt: now,
      updatedAt: now,
      fileName: fileName,
      fileSize: fileSize,
      contextData: contextData || {}
    };

    await ddbDocClient.send(new PutCommand({
      TableName: tableName,
      Item: jobRecord
    }));

    res.json({
      success: true,
      jobId: jobId,
      uploadUrl: presignedUrl,
      s3Key: s3Key,
      expiresIn: 3600
    });

  } catch (err) {
    console.error('Upload handler error:', err);
    res.status(500).json({
      error: 'Failed to create upload job: ' + err.message
    });
  }
});

/************************************
* POST /update-context/{jobId} - Update job with context data *
************************************/

app.post('/update-context/:jobId', async function(req, res) {
  try {
    const { jobId } = req.params;
    const { contextData } = req.body;

    if (!jobId) {
      return res.status(400).json({
        success: false,
        error: 'Job ID is required'
      });
    }

    if (!contextData) {
      return res.status(400).json({
        success: false,
        error: 'Context data is required'
      });
    }

    // Update the job record with context data
    const updateCommand = new UpdateCommand({
      TableName: tableName,
      Key: {
        PK: `JOB#${jobId}`,
        SK: 'METADATA'
      },
      UpdateExpression: 'SET contextData = :contextData, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':contextData': contextData,
        ':updatedAt': new Date().toISOString()
      }
    });

    await ddbDocClient.send(updateCommand);

    res.json({
      success: true,
      jobId: jobId,
      message: 'Context data updated successfully'
    });

  } catch (error) {
    console.error('Error updating job context:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update job context: ' + error.message
    });
  }
});

// Helper function to get content type based on file type
function getContentType(fileType) {
  switch (fileType) {
    case 'text':
      return 'text/plain';
    case 'image':
      return 'image/jpeg';
    case 'video':
      return 'video/mp4';
    default:
      return 'application/octet-stream';
  }
}

app.listen(3000, function() {
  console.log("App started")
});

// Export the app object. When executing the application local this does nothing. However,
// to port it to AWS Lambda we will create a wrapper around that will load the app from
// this file
module.exports = app
