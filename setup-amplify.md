# Content Localizer - AWS Amplify Setup Guide

This guide will help you set up the Smart AI Content Localizer application with AWS Amplify.

## Prerequisites

1. **Node.js** (v16 or later)
2. **AWS CLI** configured with appropriate credentials
3. **Amplify CLI** installed globally: `npm install -g @aws-amplify/cli`
4. **Git** for version control

## Initial Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Initialize Amplify

```bash
amplify init
```

When prompted, use these settings:
- **Project name**: content-localizer
- **Environment name**: dev
- **Default editor**: Visual Studio Code (or your preferred editor)
- **App type**: javascript
- **Framework**: react
- **Source directory**: src
- **Distribution directory**: build
- **Build command**: npm run-script build
- **Start command**: npm run-script start

### 3. Add Authentication (Cognito)

```bash
amplify add auth
```

Select:
- **Default configuration with Social Provider (Federation)**: No
- **Use the default authentication and security configuration**: Default configuration
- **How do you want users to be able to sign in**: Email
- **Do you want to configure advanced settings**: No

### 4. Add Storage (S3)

```bash
amplify add storage
```

Select:
- **Please select from one of the below mentioned services**: Content (Images, audio, video, etc.)
- **Please provide a friendly name for your resource**: contentLocalizerStorage
- **Please provide bucket name**: content-localizer-storage-[random-suffix]
- **Who should have access**: Auth users only
- **What kind of access do you want for Authenticated users**: create/update, read, delete
- **Do you want to add a Lambda Trigger for your S3 Bucket**: No

### 5. Add API (API Gateway + Lambda)

```bash
amplify add api
```

Select:
- **REST**
- **Provide a friendly name for your resource**: contentLocalizerApi
- **Provide a path**: /campaigns
- **Choose a Lambda source**: Create a new Lambda function
- **Provide a friendly name for your resource**: contentLocalizerFunction
- **Provide the AWS Lambda function name**: contentLocalizerFunction
- **Choose the function template**: Serverless ExpressJS function
- **Do you want to configure advanced settings**: Yes
- **Do you want to access other resources in this project from your Lambda function**: Yes
- **Select the categories**: storage
- **Select the operations you want to permit on contentLocalizerStorage**: create, read, update, delete
- **Do you want to edit the local lambda function now**: No
- **Restrict API access**: Yes
- **Who should have access**: Authenticated users only
- **What kind of access do you want for Authenticated users**: create, read, update, delete

### 6. Add DynamoDB Table

```bash
amplify add storage
```

Select:
- **NoSQL Database**
- **Provide a friendly name for your resource**: campaignsTable
- **Provide table name**: CampaignsTable
- **Please provide attribute name**: PK
- **Please choose the data type**: string
- **Would you like to add another column**: Yes
- **Please provide attribute name**: SK
- **Please choose the data type**: string
- **Would you like to add another column**: No
- **Please choose partition key for the table**: PK
- **Please choose a sort key for the table**: SK
- **Do you want to add global secondary indexes**: No
- **Do you want to add a Lambda Trigger for your Table**: No

### 7. Deploy the Backend

```bash
amplify push
```

This will create all the AWS resources and deploy your Lambda functions.

## Environment Configuration

After deployment, update your `src/aws-exports.js` file with the actual values from the deployment. The file will be automatically generated, but you may need to verify the values.

## Frontend Development

### Start the Development Server

```bash
npm start
```

The application will be available at `http://localhost:3000`.

### Build for Production

```bash
npm run build
```

## Deployment to Amplify Hosting

### 1. Initialize Git Repository

```bash
git init
git add .
git commit -m "Initial commit"
```

### 2. Connect to GitHub

1. Create a new repository on GitHub
2. Connect your local repository to GitHub:

```bash
git remote add origin https://github.com/yourusername/content-localizer.git
git push -u origin main
```

### 3. Deploy to Amplify Hosting

```bash
amplify add hosting
```

Select:
- **Publish and deploy**: Hosting with Amplify Console (Managed hosting with custom domains, Continuous deployment)
- **Choose the type of app you're building**: React
- **What is your source code provider**: GitHub
- **Repository**: yourusername/content-localizer
- **Branch**: main
- **The build setting**: Use a buildspec yml file for the build settings
- **Do you want to edit the buildspec now**: No

### 4. Deploy

```bash
amplify publish
```

## AWS Services Used

- **Amazon Cognito**: User authentication and authorization
- **Amazon S3**: File storage for campaign assets
- **Amazon DynamoDB**: Metadata storage for campaigns and localizations
- **Amazon API Gateway**: REST API endpoints
- **AWS Lambda**: Backend logic for API endpoints
- **Amazon Bedrock**: AI-powered text translation
- **Amplify Hosting**: Frontend hosting and CI/CD

## API Endpoints

- `GET /campaigns` - List all campaigns
- `GET /campaigns/{id}` - Get campaign details
- `POST /campaigns` - Create new campaign
- `POST /uploadAsset` - Upload file to S3
- `POST /localizeText` - Translate text using Bedrock

## DynamoDB Schema

**Table**: CampaignsTable

**Primary Key**: PK (Partition Key), SK (Sort Key)

**Item Types**:
- `CAMPAIGN#{id}` + `METADATA` - Campaign information
- `CAMPAIGN#{id}` + `FILE#{fileId}` - File metadata
- `CAMPAIGN#{id}` + `LOCALIZATION#{localizationId}` - Translation results

## Troubleshooting

### Common Issues

1. **Authentication errors**: Ensure Cognito is properly configured
2. **S3 upload failures**: Check IAM permissions for the Lambda function
3. **API Gateway errors**: Verify Lambda function permissions and CORS settings
4. **Bedrock access**: Ensure your AWS account has access to Amazon Bedrock

### Useful Commands

```bash
# View current status
amplify status

# View logs
amplify logs

# Remove resources
amplify remove [category]

# Delete entire project
amplify delete
```

## Security Considerations

1. **IAM Roles**: Ensure least privilege access for Lambda functions
2. **CORS**: Configure appropriate CORS settings for API Gateway
3. **Authentication**: Use Cognito for secure user management
4. **Data Encryption**: Enable encryption at rest for DynamoDB and S3
5. **API Keys**: Consider using API keys for additional security if needed

## Cost Optimization

1. **DynamoDB**: Use on-demand billing for variable workloads
2. **Lambda**: Monitor function execution time and memory usage
3. **S3**: Use appropriate storage classes for different file types
4. **API Gateway**: Monitor API usage and consider caching
5. **Bedrock**: Monitor token usage for AI translations
