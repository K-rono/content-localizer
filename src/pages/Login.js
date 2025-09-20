import React from 'react';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

const Login = ({ onSignIn }) => {
  const handleStateChange = (authState) => {
    if (authState === 'signedIn') {
      onSignIn();
    }
  };

  return (
    <div className="login-container">
      <div className="login-header">
        <h1>Smart AI Content Localizer</h1>
        <p>Translate and localize your content with AI-powered tools</p>
      </div>
      
      <Authenticator 
        hideSignUp={false}
        onStateChange={handleStateChange}
        components={{
          Header() {
            return (
              <div className="auth-header">
                <h2>Welcome Back</h2>
                <p>Sign in to your account to continue</p>
              </div>
            );
          },
          Footer() {
            return (
              <div className="auth-footer">
                <p>
                  New to Content Localizer?{' '}
                  <a href="#signup" style={{ color: '#007bff' }}>
                    Create an account
                  </a>
                </p>
              </div>
            );
          }
        }}
      />
    </div>
  );
};

export default Login;
