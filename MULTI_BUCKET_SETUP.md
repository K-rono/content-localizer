# Multi-Bucket Architecture Setup Guide

This project is configured to use 5 S3 buckets for different purposes:

## **Bucket Configuration:**

### **1. Amplify Main Bucket (Auto-created)**
- **Name**: `content-localizer-storage-xxxxx` (created by Amplify)
- **Purpose**: General app files and user uploads
- **Usage**: Default bucket for uncategorized files

### **2. Your Existing Buckets:**
- **`smart-content-localized`**: Translated and localized content
- **`smart-content-logs`**: Application logs and audit trails  
- **`smart-content-publish`**: Published and final content
- **`smart-content-source`**: Original source files and uploads

## **Setup Steps:**

### **Step 1: Deploy Amplify Backend**
```bash
amplify init
amplify add auth
amplify add storage
amplify add api
amplify push
```

### **Step 2: Update Bucket Names**
After deployment, update `src/constants/buckets.js` with the actual Amplify bucket name:

```javascript
export const BUCKETS = {
  MAIN: 'content-localizer-storage-ACTUAL_BUCKET_NAME', // Replace with real name
  LOCALIZED: 'smart-content-localized',
  LOGS: 'smart-content-logs',
  PUBLISH: 'smart-content-publish',
  SOURCE: 'smart-content-source'
};
```

### **Step 3: Configure IAM Permissions**
The Lambda function needs access to all 5 buckets. Update the IAM role to include:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::content-localizer-storage-*",
        "arn:aws:s3:::smart-content-localized",
        "arn:aws:s3:::smart-content-localized/*",
        "arn:aws:s3:::smart-content-logs",
        "arn:aws:s3:::smart-content-logs/*",
        "arn:aws:s3:::smart-content-publish",
        "arn:aws:s3:::smart-content-publish/*",
        "arn:aws:s3:::smart-content-source",
        "arn:aws:s3:::smart-content-source/*"
      ]
    }
  ]
}
```

## **File Flow Architecture:**

```
User Upload → Purpose Detection → Bucket Selection → Upload → Metadata Storage
     ↓
Source Files → smart-content-source
     ↓
Processing → smart-content-localized (translated content)
     ↓
Approval → smart-content-publish (final content)
     ↓
Logging → smart-content-logs (audit trail)
     ↓
General → content-localizer-storage-xxx (default)
```

## **API Endpoints:**

- `POST /uploadAsset` - Upload with automatic bucket selection
- `POST /uploadToSpecificBucket` - Upload to specific bucket
- `GET /listFiles` - List files from any bucket
- `POST /localizeText` - Saves to localized bucket

## **Frontend Features:**

### **Multi-Bucket Upload Component:**
- **File selection** with drag & drop
- **Purpose selection** (General, Source, Localized, Publish, Logs)
- **Automatic bucket assignment** based on purpose
- **Progress tracking** for each file
- **Batch upload** support

### **Bucket File Browser:**
- **Bucket selector** dropdown
- **File listing** by bucket
- **File metadata** display
- **Download functionality**

## **File Purpose Detection:**

The system automatically detects file purpose based on:
- **File name patterns**: `localized_`, `translated_`, `log_`, etc.
- **File extensions**: `.log`, `.audit`, etc.
- **Manual selection**: User can override automatic detection

## **Usage Examples:**

### **Upload Source Files:**
```javascript
// Files automatically go to smart-content-source
uploadFile(file, { purpose: 'source' });
```

### **Upload Localized Content:**
```javascript
// Files automatically go to smart-content-localized
uploadFile(file, { purpose: 'localized' });
```

### **Upload to Specific Bucket:**
```javascript
// Upload directly to any bucket
uploadToSpecificBucket({
  bucketName: 'smart-content-publish',
  fileName: 'final-content.pdf',
  fileData: base64Data
});
```

## **Benefits:**

1. **Organized Storage** - Files sorted by purpose
2. **Cost Optimization** - Different lifecycle policies per bucket
3. **Access Control** - Granular permissions per bucket
4. **Scalability** - Easy to add new buckets
5. **Audit Trail** - Clear file categorization

## **Troubleshooting:**

### **Permission Errors:**
- Check IAM role has access to all buckets
- Verify bucket names are correct
- Ensure bucket policies allow Lambda access

### **File Not Found:**
- Check bucket name in constants
- Verify file key format
- Check if file was uploaded to correct bucket

### **Upload Failures:**
- Check file size limits
- Verify file type is allowed
- Check network connectivity

## **Next Steps:**

1. **Deploy the backend** with `amplify push`
2. **Test file uploads** to different buckets
3. **Configure lifecycle policies** for each bucket
4. **Set up monitoring** for bucket usage
5. **Implement file versioning** if needed
