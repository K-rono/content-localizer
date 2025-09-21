/* Amplify Params - DO NOT EDIT
	ENV
	REGION
	STORAGE_CONTENTLOCALIZERDATASTORE_ARN
	STORAGE_CONTENTLOCALIZERDATASTORE_NAME
	STORAGE_CONTENTLOCALIZERDATASTORE_STREAMARN
	STORAGE_CONTENTLOCALIZERSTORAGE_BUCKETNAME
Amplify Params - DO NOT EDIT */
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');

const ddbClient = new DynamoDBClient({ region: process.env.REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);
const s3Client = new S3Client({ region: process.env.REGION });

// Use the environment variable provided by Amplify
const tableName = process.env.STORAGE_CONTENTLOCALIZERDATASTORE_NAME || "contentLocalizerDatastore";

const bucketName = process.env.STORAGE_CONTENTLOCALIZERSTORAGE_BUCKETNAME;

/**
 * @type {import('@types/aws-lambda').Handler}
 */
exports.handler = async (event) => {
  console.log(`EVENT: ${JSON.stringify(event)}`);
  
  // Check if this is an API Gateway event (manual trigger)
  if (event.httpMethod) {
    return await handleApiGatewayEvent(event);
  }
  
  // Otherwise, handle as DynamoDB stream event
  for (const record of event.Records) {
    console.log('Processing record:', record.eventID);
    console.log('Event name:', record.eventName);
    
    // Only process INSERT events for new jobs
    if (record.eventName === 'INSERT') {
      try {
        await processJob(record.dynamodb.NewImage);
      } catch (error) {
        console.error('Error processing job:', error);
        // Mark job as failed
        await markJobAsFailed(record.dynamodb.NewImage.jobId.S, error.message);
      }
    }
  }
  
  return Promise.resolve('Successfully processed DynamoDB records');
};

async function handleApiGatewayEvent(event) {
  try {
    const jobId = event.pathParameters.jobId;
    
    if (!jobId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
        },
        body: JSON.stringify({
          success: false,
          error: 'Job ID is required'
        })
      };
    }
    
    // Get job details from DynamoDB
    const job = await getJobDetails(jobId);
    
    if (!job) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
        },
        body: JSON.stringify({
          success: false,
          error: 'Job not found'
        })
      };
    }
    
    // Process the job
    await processJobFromDb(job);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
      },
      body: JSON.stringify({
        success: true,
        jobId: jobId,
        status: 'Processing'
      })
    };
    
  } catch (error) {
    console.error('Error in API Gateway handler:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
      },
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
}

async function getJobDetails(jobId) {
  const getCommand = new GetCommand({
    TableName: tableName,
    Key: {
      PK: `JOB#${jobId}`,
      SK: 'METADATA'
    }
  });
  
  const result = await ddbDocClient.send(getCommand);
  return result.Item;
}

async function processJobFromDb(job) {
  const jobId = job.jobId;
  const fileType = job.fileType;
  const filePath = job.filePath;
  const fileName = job.fileName;
  
  console.log(`Processing job ${jobId} of type ${fileType}`);
  
  // Update status to Processing
  await updateJobStatus(jobId, 'Processing');
  
  try {
    let resultPath;
    
    switch (fileType) {
      case 'text':
        resultPath = await processTextFile(filePath, fileName, jobId);
        break;
      case 'image':
        resultPath = await processImageFile(filePath, fileName, jobId);
        break;
      case 'video':
        resultPath = await processVideoFile(filePath, fileName, jobId);
        break;
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
    
    // Update job with result path and mark as completed
    await updateJobWithResult(jobId, resultPath);
    console.log(`Job ${jobId} completed successfully`);
    
  } catch (error) {
    console.error(`Job ${jobId} failed:`, error);
    await markJobAsFailed(jobId, error.message);
  }
}

async function processJob(newImage) {
  const jobId = newImage.jobId.S;
  const fileType = newImage.fileType.S;
  const filePath = newImage.filePath.S;
  const fileName = newImage.fileName.S;
  
  console.log(`Processing job ${jobId} of type ${fileType}`);
  
  // Update status to Processing
  await updateJobStatus(jobId, 'Processing');
  
  try {
    let resultPath;
    
    switch (fileType) {
      case 'text':
        resultPath = await processTextFile(filePath, fileName, jobId);
        break;
      case 'image':
        resultPath = await processImageFile(filePath, fileName, jobId);
        break;
      case 'video':
        resultPath = await processVideoFile(filePath, fileName, jobId);
        break;
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
    
    // Update job with result path and mark as completed
    await updateJobWithResult(jobId, resultPath);
    console.log(`Job ${jobId} completed successfully`);
    
  } catch (error) {
    console.error(`Job ${jobId} failed:`, error);
    await markJobAsFailed(jobId, error.message);
  }
}

async function processTextFile(filePath, fileName, jobId) {
  console.log(`Processing text file: ${filePath}`);
  
  // Get the original text file from S3
  const getObjectCommand = new GetObjectCommand({
    Bucket: bucketName,
    Key: filePath
  });
  
  const response = await s3Client.send(getObjectCommand);
  const textContent = await streamToString(response.Body);
  
  // For MVP: Just append "(localized)" to the text
  const localizedContent = textContent + ' (localized)';
  
  // Create localized file path
  const localizedFileName = fileName.replace(/(\.[^.]+)$/, '_localized$1');
  const resultPath = `jobs/${jobId}/localized/${localizedFileName}`;
  
  // Upload localized content to S3
  const putObjectCommand = new PutObjectCommand({
    Bucket: bucketName,
    Key: resultPath,
    Body: localizedContent,
    ContentType: 'text/plain'
  });
  
  await s3Client.send(putObjectCommand);
  
  return resultPath;
}

async function processImageFile(filePath, fileName, jobId) {
  console.log(`Processing image file: ${filePath}`);
  
  // For MVP: Just copy the file to localized folder
  const getObjectCommand = new GetObjectCommand({
    Bucket: bucketName,
    Key: filePath
  });
  
  const response = await s3Client.send(getObjectCommand);
  const imageBuffer = await streamToBuffer(response.Body);
  
  // Create localized file path
  const localizedFileName = fileName.replace(/(\.[^.]+)$/, '_localized$1');
  const resultPath = `jobs/${jobId}/localized/${localizedFileName}`;
  
  // Upload localized content to S3
  const putObjectCommand = new PutObjectCommand({
    Bucket: bucketName,
    Key: resultPath,
    Body: imageBuffer,
    ContentType: response.ContentType || 'image/jpeg'
  });
  
  await s3Client.send(putObjectCommand);
  
  return resultPath;
}

async function processVideoFile(filePath, fileName, jobId) {
  console.log(`Processing video file: ${filePath}`);
  
  // For MVP: Just copy the file to localized folder
  const getObjectCommand = new GetObjectCommand({
    Bucket: bucketName,
    Key: filePath
  });
  
  const response = await s3Client.send(getObjectCommand);
  const videoBuffer = await streamToBuffer(response.Body);
  
  // Create localized file path
  const localizedFileName = fileName.replace(/(\.[^.]+)$/, '_localized$1');
  const resultPath = `jobs/${jobId}/localized/${localizedFileName}`;
  
  // Upload localized content to S3
  const putObjectCommand = new PutObjectCommand({
    Bucket: bucketName,
    Key: resultPath,
    Body: videoBuffer,
    ContentType: response.ContentType || 'video/mp4'
  });
  
  await s3Client.send(putObjectCommand);
  
  return resultPath;
}

async function updateJobStatus(jobId, status) {
  const updateCommand = new UpdateCommand({
    TableName: tableName,
    Key: {
      PK: `JOB#${jobId}`,
      SK: 'METADATA'
    },
    UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
    ExpressionAttributeNames: {
      '#status': 'status'
    },
    ExpressionAttributeValues: {
      ':status': status,
      ':updatedAt': new Date().toISOString()
    }
  });
  
  await ddbDocClient.send(updateCommand);
}

async function updateJobWithResult(jobId, resultPath) {
  const updateCommand = new UpdateCommand({
    TableName: tableName,
    Key: {
      PK: `JOB#${jobId}`,
      SK: 'METADATA'
    },
    UpdateExpression: 'SET #status = :status, resultPath = :resultPath, updatedAt = :updatedAt',
    ExpressionAttributeNames: {
      '#status': 'status'
    },
    ExpressionAttributeValues: {
      ':status': 'Completed',
      ':resultPath': resultPath,
      ':updatedAt': new Date().toISOString()
    }
  });
  
  await ddbDocClient.send(updateCommand);
}

async function markJobAsFailed(jobId, errorMessage) {
  const updateCommand = new UpdateCommand({
    TableName: tableName,
    Key: {
      PK: `JOB#${jobId}`,
      SK: 'METADATA'
    },
    UpdateExpression: 'SET #status = :status, errorMessage = :errorMessage, updatedAt = :updatedAt',
    ExpressionAttributeNames: {
      '#status': 'status'
    },
    ExpressionAttributeValues: {
      ':status': 'Failed',
      ':errorMessage': errorMessage,
      ':updatedAt': new Date().toISOString()
    }
  });
  
  await ddbDocClient.send(updateCommand);
}

// Helper function to convert stream to string
async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

// Helper function to convert stream to buffer
async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
