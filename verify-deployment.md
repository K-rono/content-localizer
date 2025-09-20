# Deployment Verification Checklist

After running `amplify push`, verify these files contain real AWS values:

## 1. Check aws-exports.js
```bash
cat src/aws-exports.js
```
Should contain real values like:
- `aws_cognito_identity_pool_id`: `us-east-1:12345678-1234-1234-1234-123456789012`
- `aws_user_pools_id`: `us-east-1_ABC123DEF`
- `aws_user_pools_web_client_id`: `1234567890abcdef1234567890`
- `aws_user_files_s3_bucket`: `content-localizer-storage-1234567890`
- `aws_cloud_logic_custom`: Real API Gateway endpoints

## 2. Check team-provider-info.json
```bash
cat amplify/team-provider-info.json
```
Should contain real ARNs and resource names.

## 3. Test the Configuration
```bash
npm start
```
- App should load without errors
- Login/signup should work
- API calls should succeed

## 4. Common Issues and Fixes

### If aws-exports.js has placeholder values:
```bash
amplify pull
# or
amplify env pull
```

### If you see "Resource not found" errors:
```bash
amplify status
# Check if all resources are deployed
amplify push
```

### If authentication doesn't work:
1. Check Cognito User Pool is created
2. Verify the user pool ID in aws-exports.js
3. Check if users can sign up in the AWS Console

### If S3 uploads fail:
1. Check S3 bucket exists
2. Verify bucket name in aws-exports.js
3. Check IAM permissions for Lambda function

### If API calls fail:
1. Check API Gateway is deployed
2. Verify endpoint URL in aws-exports.js
3. Check Lambda function is attached
4. Verify CORS settings

## 5. Manual Verification in AWS Console

1. **Cognito**: Go to AWS Console > Cognito > User Pools
2. **S3**: Go to AWS Console > S3 > Buckets
3. **DynamoDB**: Go to AWS Console > DynamoDB > Tables
4. **Lambda**: Go to AWS Console > Lambda > Functions
5. **API Gateway**: Go to AWS Console > API Gateway > APIs

## 6. Environment Variables Check

The Lambda function should have these environment variables:
- `CAMPAIGNS_TABLE`: Real DynamoDB table name
- `STORAGE_BUCKET`: Real S3 bucket name

Check in AWS Console > Lambda > Functions > contentLocalizerFunction > Configuration > Environment variables
