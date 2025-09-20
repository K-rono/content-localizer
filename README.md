# Smart AI Content Localizer

A React + AWS Amplify application for translating and localizing content using AI-powered tools.

## Features

- **User Authentication**: Secure login/signup with AWS Cognito
- **Campaign Management**: Create and manage localization campaigns
- **File Upload**: Upload assets to S3 for localization
- **AI Translation**: Translate text content using Amazon Bedrock
- **Multi-language Support**: Support for 8+ languages
- **Real-time Dashboard**: Monitor campaign progress and status

## Tech Stack

- **Frontend**: React 18, React Router, AWS Amplify UI
- **Backend**: AWS Lambda, API Gateway, DynamoDB
- **Storage**: Amazon S3
- **Authentication**: Amazon Cognito
- **AI/ML**: Amazon Bedrock (Claude 3 Sonnet)
- **Hosting**: AWS Amplify Hosting

## Quick Start

### Prerequisites

- Node.js 16+
- AWS CLI configured
- Amplify CLI installed

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd content-localizer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up AWS Amplify**
   ```bash
   amplify init
   amplify add auth
   amplify add storage
   amplify add api
   amplify push
   ```

4. **Start development server**
   ```bash
   npm start
   ```

For detailed setup instructions, see [setup-amplify.md](setup-amplify.md).

## Project Structure

```
content-localizer/
├── public/
│   ├── index.html
│   └── manifest.json
├── src/
│   ├── components/
│   │   └── Navbar.js
│   ├── pages/
│   │   ├── Dashboard.js
│   │   ├── CampaignDetail.js
│   │   └── Login.js
│   ├── App.js
│   ├── App.css
│   ├── index.js
│   ├── index.css
│   └── aws-exports.js
├── amplify/
│   ├── backend/
│   │   ├── auth/
│   │   ├── storage/
│   │   ├── function/
│   │   └── api/
│   └── team-provider-info.json
├── package.json
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/campaigns` | List all campaigns |
| GET | `/campaigns/{id}` | Get campaign details |
| POST | `/campaigns` | Create new campaign |
| POST | `/uploadAsset` | Upload file to S3 |
| POST | `/localizeText` | Translate text content |

## Supported Languages

- Spanish (es)
- French (fr)
- German (de)
- Italian (it)
- Portuguese (pt)
- Japanese (ja)
- Korean (ko)
- Chinese (zh)

## Usage

### Creating a Campaign

1. Sign in to the application
2. Click "Create New Campaign" on the dashboard
3. Enter a campaign name
4. Click "Create Campaign"

### Uploading Assets

1. Navigate to a campaign
2. Use the file upload area to select files
3. Files will be uploaded to S3 automatically

### Translating Content

1. Go to the campaign detail page
2. Enter text in the "Text to Localize" field
3. Select target language
4. Click "Localize Text"
5. View results in the Localization Results section

## Configuration

### Environment Variables

The application uses AWS Amplify configuration. Update `src/aws-exports.js` with your actual AWS resource details after deployment.

### Lambda Function Environment

The Lambda function requires these environment variables:
- `CAMPAIGNS_TABLE`: DynamoDB table name
- `STORAGE_BUCKET`: S3 bucket name

## Deployment

### Development

```bash
npm start
```

### Production

```bash
npm run build
amplify publish
```

## Security

- User authentication via AWS Cognito
- IAM roles with least privilege access
- Encrypted data at rest (S3, DynamoDB)
- CORS configuration for API Gateway

## Monitoring

- CloudWatch logs for Lambda functions
- Amplify console for deployment monitoring
- DynamoDB metrics for database performance

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
1. Check the [setup guide](setup-amplify.md)
2. Review AWS Amplify documentation
3. Open an issue in this repository

## Roadmap

- [ ] Batch translation support
- [ ] Translation memory integration
- [ ] Advanced file format support
- [ ] Team collaboration features
- [ ] Analytics dashboard
- [ ] Custom AI model training
