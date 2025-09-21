import { Amplify } from 'aws-amplify';
import awsconfig from '../aws-exports';

// Configure Amplify with the generated config
Amplify.configure(awsconfig);

// Export configured services for easy access
export { get, post, put, del } from 'aws-amplify/api';
export { getCurrentUser, signOut } from 'aws-amplify/auth';
export { uploadData, getUrl } from 'aws-amplify/storage';

