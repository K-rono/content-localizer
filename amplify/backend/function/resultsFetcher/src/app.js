/* Amplify Params - DO NOT EDIT
	ENV
	REGION
	STORAGE_CONTENTLOCALIZERDATASTORE_ARN
	STORAGE_CONTENTLOCALIZERDATASTORE_NAME
	STORAGE_CONTENTLOCALIZERDATASTORE_STREAMARN
	STORAGE_CONTENTLOCALIZERSTORAGE_BUCKETNAME
Amplify Params - DO NOT EDIT */const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware');
const bodyParser = require('body-parser');
const express = require('express');

const ddbClient = new DynamoDBClient({ region: process.env.REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);
const s3Client = new S3Client({ region: process.env.REGION });

// Use the environment variable provided by Amplify
const tableName = process.env.STORAGE_CONTENTLOCALIZERDATASTORE_NAME || "contentLocalizerDatastore";

const bucketName = process.env.STORAGE_CONTENTLOCALIZERSTORAGE_BUCKETNAME;

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
* GET /results/{jobId} - Get job status and download URLs *
************************************/

app.get('/results/:jobId', async function(req, res) {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({
        error: 'Job ID is required'
      });
    }

    // Get job record from DynamoDB
    const getItemParams = {
      TableName: tableName,
      Key: {
        PK: `JOB#${jobId}`,
        SK: 'METADATA'
      }
    };

    const data = await ddbDocClient.send(new GetCommand(getItemParams));

    if (!data.Item) {
      return res.status(404).json({
        error: 'Job not found'
      });
    }

    const job = data.Item;
    const result = {
      jobId: job.jobId,
      status: job.status,
      fileType: job.fileType,
      fileName: job.fileName,
      fileSize: job.fileSize,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      userId: job.userId,
      contextData: job.contextData || {},
      originalContent: job.originalContent || null,
      localizedContent: job.localizedContent || null
    };

    // Generate presigned URLs for file downloads
    if (job.filePath) {
      try {
        const originalUrl = await generatePresignedUrl(job.filePath);
        result.originalFileUrl = originalUrl;
      } catch (error) {
        console.error('Error generating original file URL:', error);
        result.originalFileUrl = null;
      }
    }

    if (job.resultPath && job.status === 'Completed') {
      try {
        const localizedUrl = await generatePresignedUrl(job.resultPath);
        result.localizedFileUrl = localizedUrl;
      } catch (error) {
        console.error('Error generating localized file URL:', error);
        result.localizedFileUrl = null;
      }
    }

    // Include error message if job failed
    if (job.status === 'Failed' && job.errorMessage) {
      result.errorMessage = job.errorMessage;
    }

    res.json({
      success: true,
      job: result
    });

  } catch (err) {
    console.error('Results fetcher error:', err);
    res.status(500).json({
      error: 'Failed to fetch job results: ' + err.message
    });
  }
});

/************************************
* GET /jobs - Get job history for a user *
************************************/

app.get('/jobs', async function(req, res) {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Scan all jobs for the user
    // Since we're using a single-table design, we need to scan for all JOB# records
    // and filter by userId
    const scanParams = {
      TableName: tableName,
      FilterExpression: 'begins_with(PK, :pk) AND userId = :userId',
      ExpressionAttributeValues: {
        ':pk': 'JOB#',
        ':userId': userId
      }
    };

    const data = await ddbDocClient.send(new ScanCommand(scanParams));
    
    const jobs = data.Items ? data.Items.map(item => ({
      jobId: item.jobId,
      fileName: item.fileName,
      fileType: item.fileType,
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      contextData: item.contextData || {}
    })) : [];

    // Sort by creation date (newest first)
    jobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      jobs: jobs
    });

  } catch (error) {
    console.error('Error fetching job history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch job history: ' + error.message
    });
  }
});

// Helper function to generate presigned URL for S3 object
async function generatePresignedUrl(s3Key) {
  const getObjectCommand = new GetObjectCommand({
    Bucket: bucketName,
    Key: s3Key
  });

  return await getSignedUrl(s3Client, getObjectCommand, {
    expiresIn: 3600 // 1 hour
  });
}

app.listen(3000, function() {
  console.log("App started")
});

// Export the app object. When executing the application local this does nothing. However,
// to port it to AWS Lambda we will create a wrapper around that will load the app from
// this file
module.exports = app
