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
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

const ddbClient = new DynamoDBClient({ region: process.env.REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);
const s3Client = new S3Client({ region: process.env.REGION });
const bedrockClient = new BedrockRuntimeClient({ region: 'us-east-1' }); // Nova Premier is only available in us-east-1

// Use the environment variable provided by Amplify
const tableName = process.env.STORAGE_CONTENTLOCALIZERDATASTORE_NAME || "contentLocalizerDatastore";
const bucketName = process.env.STORAGE_CONTENTLOCALIZERSTORAGE_BUCKETNAME;

// Malaysian cultural context database
const MALAYSIAN_CONTEXT = {
    holidays: {
        national: ['Hari Merdeka', 'Hari Malaysia', 'Hari Kebangsaan'],
        religious: {
            muslim: ['Hari Raya Aidilfitri', 'Hari Raya Aidiladha', 'Maulidur Rasul'],
            chinese: ['Chinese New Year', 'Mid-Autumn Festival', 'Qingming'],
            indian: ['Deepavali', 'Thaipusam', 'Ponggal'],
            christian: ['Christmas', 'Good Friday', 'Easter']
        }
    },
    culturalNuances: {
        malay: {
            greetings: ['Assalamualaikum', 'Selamat pagi', 'Apa khabar'],
            values: ['kesopanan', 'hormat kepada orang tua', 'gotong-royong', 'budi bahasa'],
            sensitivities: ['halal', 'aurat', 'alcohol-free', 'pork-free'],
            colors: { preferred: ['green', 'yellow'], avoid: ['white (funeral)'] }
        },
        chinese: {
            greetings: ['你好', '早安', '恭喜发财'],
            values: ['family harmony', 'prosperity', 'education', 'respect for elders'],
            sensitivities: ['number 4 (death)', 'clock gifts (funeral)'],
            colors: { preferred: ['red', 'gold'], avoid: ['white (funeral)', 'black'] }
        },
        indian: {
            greetings: ['Vanakkam', 'Namaste', 'Namaskaram'],
            values: ['family unity', 'respect for tradition', 'hospitality'],
            sensitivities: ['vegetarian options', 'beef considerations'],
            colors: { preferred: ['orange', 'yellow', 'red'], avoid: [] }
        }
    },
    platforms: {
        facebook: {
            style: 'detailed, informative, community-focused',
            length: 'medium to long',
            hashtags: '3-5 relevant hashtags',
            engagement: 'questions, polls, community discussions'
        },
        instagram: {
            style: 'visual-first, aesthetic, lifestyle-oriented',
            length: 'short and punchy',
            hashtags: '10-15 mix of popular and niche',
            engagement: 'stories, reels, user-generated content'
        },
        tiktok: {
            style: 'trendy, casual, entertaining',
            length: 'very short, hook-focused',
            hashtags: 'trending hashtags, challenges',
            engagement: 'challenges, duets, trending sounds'
        }
    }
};

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
  const contextData = job.contextData || {};
  
  console.log(`Processing job ${jobId} of type ${fileType} with context:`, contextData);
  console.log(`File path: ${filePath}, File name: ${fileName}`);
  
  // Validate required parameters
  if (!filePath) {
    throw new Error('File path is required for processing');
  }
  if (!fileType) {
    throw new Error('File type is required for processing');
  }
  
  // Update status to Processing
  await updateJobStatus(jobId, 'Processing');
  
  try {
    let resultPath;
    let localizedContent = '';
    
    // Get original content
    const originalContent = await getOriginalContent(filePath, fileType);
    
    // Generate localized content using Bedrock
    const targetLanguage = contextData.targetLanguage || 'English';
    const contentType = contextData.contentType || 'Marketing';
    const tone = contextData.tone || 'Professional';
    const specialNotes = contextData.specialNotes || '';
    
    localizedContent = await generateLocalizedContent(
      originalContent,
      targetLanguage,
      contentType,
      tone,
      specialNotes,
      fileType
    );
    
    // Create localized file
    resultPath = await createLocalizedFile(filePath, fileName, jobId, localizedContent, fileType);
    
    // Update job with result path and localized content
    await updateJobWithResult(jobId, resultPath, localizedContent, originalContent);
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

// Get original content from S3
async function getOriginalContent(filePath, fileType) {
  console.log(`Getting original content: ${filePath}`);
  
  if (!filePath) {
    throw new Error('File path is required');
  }
  
  const getObjectCommand = new GetObjectCommand({
    Bucket: bucketName,
    Key: filePath
  });
  
  try {
    const response = await s3Client.send(getObjectCommand);
    
    if (fileType === 'text') {
      return await streamToString(response.Body);
    } else {
      // For images and videos, return metadata
      return {
        fileType: fileType,
        fileName: filePath.split('/').pop(),
        size: response.ContentLength,
        lastModified: response.LastModified
      };
    }
  } catch (error) {
    console.error(`Error getting content from S3: ${filePath}`, error);
    throw new Error(`Failed to retrieve file from S3: ${error.message}`);
  }
}

// Generate localized content using Bedrock Nova Premier
async function generateLocalizedContent(originalContent, targetLanguage, contentType, tone, specialNotes, fileType) {
  console.log(`Generating localized content for ${targetLanguage} ${contentType} ${tone}`);
  
  const prompt = createAdvancedPrompt(originalContent, targetLanguage, contentType, tone, specialNotes, fileType);
  
  try {
    console.log('Attempting to invoke Bedrock model...');
    const response = await invokeBedrockModel(prompt);
    console.log('Bedrock response received:', response);
    return response;
  } catch (error) {
    console.error('Error generating localized content:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode
    });
    // Fallback to simple localization
    console.log('Using fallback content due to Bedrock error');
    return generateFallbackContent(originalContent, targetLanguage, fileType);
  }
}

// Create advanced prompt with Malaysian cultural context
function createAdvancedPrompt(originalContent, targetLanguage, contentType, tone, specialNotes, fileType) {
  const languageMap = {
    'English': 'English',
    'Malay': 'Bahasa Melayu',
    'Mandarin': 'Simplified Chinese',
    'Tamil': 'Tamil'
  };

  const culturalContext = getCulturalContext(targetLanguage);
  const platformStyle = MALAYSIAN_CONTEXT.platforms.facebook; // Default to Facebook style

  return `You are an expert Malaysian marketing content localizer with deep understanding of Malaysia's multicultural society. Your task is to adapt marketing content for the Malaysian market.

<context>
- Target Language: ${languageMap[targetLanguage] || 'English'}
- Content Type: ${contentType}
- Tone: ${tone}
- File Type: ${fileType}
- Special Notes: ${specialNotes}
</context>

<cultural_sensitivity_guidelines>
${culturalContext}
</cultural_sensitivity_guidelines>

<malaysia_specific_requirements>
1. HALAL Considerations:
   - Always mention if product is Halal-certified when relevant
   - Avoid any references to alcohol or pork
   - Use "Ramadan-friendly" messaging during fasting month

2. Racial Harmony:
   - Be inclusive of all Malaysian races
   - Avoid stereotypes or generalizations
   - Use "Malaysian" identity when appropriate

3. Local References:
   - Use local landmarks (KLCC, Penang Bridge, etc.)
   - Reference local food (nasi lemak, roti canai, char kuey teow)
   - Include local slang appropriately (lah, boss, tapau, etc.)

4. Price Points:
   - Use RM (Ringgit Malaysia)
   - Consider local purchasing power
   - Highlight value and savings

5. Language Nuances:
   ${getLanguageNuances(targetLanguage)}
</malaysia_specific_requirements>

<original_content>
${typeof originalContent === 'string' ? originalContent : JSON.stringify(originalContent)}
</original_content>

<task>
Create localized content in ${languageMap[targetLanguage] || 'English'} that:
1. Adapts the original message for Malaysian audience
2. Incorporates cultural elements naturally
3. Uses appropriate format and tone
4. Ensures cultural sensitivity and inclusivity
5. Adds call-to-action suitable for Malaysian market

IMPORTANT: 
- For Malay content: Use formal Malay, include Islamic greetings when appropriate
- For Chinese content: Include prosperity/luck elements, use traditional values
- For English content: Use Malaysian English style, be multicultural
- For Tamil content: Respect traditional values, include family elements

Output Format:
{
  "localizedText": "The localized marketing message",
  "culturalNote": "Brief explanation of cultural adaptations made",
  "hashtags": ["relevant", "hashtags"],
  "callToAction": "Clear CTA for Malaysian market"
}
</task>

Generate the localized content now:`;
}

// Get cultural context based on language
function getCulturalContext(language) {
  const contexts = {
    'Malay': `
- Primary audience: Malay-Muslim community (60% of population)
- Key values: Islamic principles, family, community, respect for elders
- Sensitivities: Halal requirements, modest imagery, avoid dogs/pigs
- Preferred tone: Respectful, warm, community-focused
- Important phrases: "InsyaAllah", "Alhamdulillah", "Bismillah"
    `,
    'Mandarin': `
- Primary audience: Malaysian Chinese community (23% of population)
- Key values: Prosperity, family harmony, education, hard work
- Sensitivities: Number symbolism (avoid 4, prefer 8), color meanings
- Preferred tone: Professional, success-oriented, family-focused
- Important elements: Lunar calendar events, prosperity symbols
    `,
    'English': `
- Primary audience: Urban, multicultural Malaysians
- Key values: Modern, progressive, inclusive, Malaysian pride
- Sensitivities: Religious and racial harmony, avoid stereotypes
- Preferred tone: Professional yet friendly, inclusive
- Important elements: Malaysian identity, local pride, unity
    `,
    'Tamil': `
- Primary audience: Malaysian Indian community (7% of population)
- Key values: Family, tradition, education, cultural heritage
- Sensitivities: Religious diversity (Hindu, Christian, Sikh), dietary preferences
- Preferred tone: Warm, respectful, tradition-aware
- Important elements: Festival celebrations, family bonds
    `
  };

  return contexts[language] || contexts['English'];
}

// Get language-specific nuances
function getLanguageNuances(language) {
  const nuances = {
    'Malay': `
- Use "Anda" for formal, "awak" for informal
- Include "lah" particle for friendliness
- Common expressions: "Jom", "Best gila", "Memang power"
- Avoid direct translations from English
    `,
    'Mandarin': `
- Use simplified Chinese characters
- Include Malaysian Chinese expressions: "好料" (ho liao), "够力" (gao lat)
- Mix with local Hokkien/Cantonese terms when appropriate
- Use red color text for important points
    `,
    'English': `
- Malaysian English style: "Can or not?", "Where got?"
- Include local terms: "mamak", "kopitiam", "pasar malam"
- Use "lah", "lor", "mah" particles naturally
- Be casual but professional
    `,
    'Tamil': `
- Use formal Tamil with local Malaysian Tamil influences
- Include respectful terms: "Anna", "Akka"
- Reference local Tamil culture and traditions
- Maintain traditional values while being modern
    `
  };

  return nuances[language] || '';
}

// Invoke Bedrock Nova Premier model
async function invokeBedrockModel(prompt) {
  const params = {
    modelId: 'amazon.titan-text-express-v1',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      inputText: prompt,
      textGenerationConfig: {
        maxTokenCount: 4096,
        temperature: 0.7,
        topP: 0.9,
        stopSequences: []
      }
    })
  };

  try {
    console.log('Invoking Bedrock with params:', JSON.stringify(params, null, 2));
    const command = new InvokeModelCommand(params);
    const response = await bedrockClient.send(command);
    
    console.log('Bedrock raw response:', response);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    console.log('Bedrock response body:', responseBody);
    
    const content = responseBody.results[0].outputText;
    console.log('Extracted content:', content);
    
    try {
      return JSON.parse(content);
    } catch (jsonError) {
      console.warn('Bedrock did not return valid JSON, returning raw text.', content);
      return {
        localizedText: content,
        culturalNote: "AI generated content",
        hashtags: [],
        callToAction: ""
      };
    }
  } catch (error) {
    console.error('Error invoking Bedrock:', error);
    throw error;
  }
}

// Generate fallback content if Bedrock fails
async function generateFallbackContent(originalContent, targetLanguage, fileType) {
  const basicContent = {
    'Malay': `🌟 Promosi Istimewa! 🌟\n\n${typeof originalContent === 'string' ? originalContent : 'Content localized for Malaysian market'}\n\nHubungi kami hari ini!\n\n#MalaysiaBoleh #Promosi #Istimewa`,
    'English': `🎯 Special Offer for Malaysians! 🎯\n\n${typeof originalContent === 'string' ? originalContent : 'Content localized for Malaysian market'}\n\nContact us today!\n\n#Malaysia #SpecialOffer #Local`,
    'Mandarin': `🏮 特别优惠！🏮\n\n${typeof originalContent === 'string' ? originalContent : 'Content localized for Malaysian market'}\n\n立即联系我们！\n\n#马来西亚 #优惠 #促销`,
    'Tamil': `🎊 சிறப்பு சலுகை! 🎊\n\n${typeof originalContent === 'string' ? originalContent : 'Content localized for Malaysian market'}\n\nஇன்றே எங்களைத் தொடர்பு கொள்ளுங்கள்!\n\n#மலேசியா #சலுகை #விற்பனை`
  };

  return {
    localizedText: basicContent[targetLanguage] || basicContent['English'],
    culturalNote: "Fallback content generated",
    hashtags: ["Malaysia", "Local", "Special"],
    callToAction: "Contact us today!"
  };
}

// Create localized file in S3
async function createLocalizedFile(originalPath, fileName, jobId, localizedContent, fileType) {
  console.log(`Creating localized file for job ${jobId}`);
  
  if (!fileName) {
    throw new Error('File name is required for creating localized file');
  }
  
  const localizedFileName = fileName.replace(/(\.[^.]+)$/, '_localized$1');
  const resultPath = `jobs/${jobId}/localized/${localizedFileName}`;
  
  let contentToStore;
  let contentType;
  
  if (fileType === 'text') {
    contentToStore = localizedContent.localizedText || localizedContent;
    contentType = 'text/plain';
  } else {
    // For images and videos, store metadata as JSON
    contentToStore = JSON.stringify(localizedContent, null, 2);
    contentType = 'application/json';
  }
  
  try {
    const putObjectCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: resultPath,
      Body: contentToStore,
      ContentType: contentType,
      Metadata: {
        'original-file': originalPath || 'unknown',
        'job-id': jobId,
        'localization-language': 'Malaysian',
        'cultural-adaptations': localizedContent.culturalNote || 'AI generated'
      }
    });
    
    await s3Client.send(putObjectCommand);
    console.log(`Localized file created: ${resultPath}`);
    
    return resultPath;
  } catch (error) {
    console.error(`Error creating localized file: ${resultPath}`, error);
    throw new Error(`Failed to create localized file: ${error.message}`);
  }
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

async function updateJobWithResult(jobId, resultPath, localizedContent, originalContent) {
  const updateCommand = new UpdateCommand({
    TableName: tableName,
    Key: {
      PK: `JOB#${jobId}`,
      SK: 'METADATA'
    },
    UpdateExpression: 'SET #status = :status, resultPath = :resultPath, localizedContent = :localizedContent, originalContent = :originalContent, updatedAt = :updatedAt',
    ExpressionAttributeNames: {
      '#status': 'status'
    },
    ExpressionAttributeValues: {
      ':status': 'Completed',
      ':resultPath': resultPath,
      ':localizedContent': localizedContent,
      ':originalContent': originalContent,
      ':updatedAt': new Date().toISOString()
    }
  });
  
  await ddbDocClient.send(updateCommand);
  console.log(`Job ${jobId} updated with result path: ${resultPath}`);
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
