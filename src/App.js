import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Amplify } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

import awsconfig from './aws-exports';
import Navbar from './components/Navbar';
import UploadSection from './components/UploadSection';
import ContextForm from './components/ContextForm';
import ProcessingSection from './components/ProcessingSection';
import ResultsSection from './components/ResultsSection';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import ErrorBoundary from './components/ErrorBoundary';
import Notification from './components/Notification';
import { updateJobWithContext } from './utils/api';

Amplify.configure(awsconfig);

function App() {
  const [currentStep, setCurrentStep] = useState('upload');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [contextData, setContextData] = useState(null); // Used for API integration
  const [jobId, setJobId] = useState(null);
  const [results, setResults] = useState(null);
  const [notification, setNotification] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);

  const showNotification = (type, message, duration = 5000) => {
    setNotification({ type, message, duration });
  };

  const hideNotification = () => {
    setNotification(null);
  };

  const handleFileUpload = (file, result) => {
    setUploadedFile(file);
    setUploadResult(result);
    setCurrentStep('context');
    // Don't show success notification yet - wait for context submission
  };

  const handleUploadError = (error) => {
    showNotification('error', error);
  };

  const handleContextSubmit = async (context) => {
    setContextData(context);
    setCurrentStep('processing');
    
    // Now upload the file with context data
    if (uploadedFile && uploadResult?.jobId) {
      try {
        // Update the job with context data
        await updateJobWithContext(uploadResult.jobId, context);
        setJobId(uploadResult.jobId);
        showNotification('success', 'File uploaded and context saved!');
      } catch (error) {
        console.error('Error updating job with context:', error);
        showNotification('error', 'Failed to save context data');
      }
    }
  };

  const handleProcessingError = (error) => {
    showNotification('error', error);
  };

  const handleJobComplete = (jobResults) => {
    setResults(jobResults);
    setCurrentStep('results');
  };

  const resetProcess = () => {
    setCurrentStep('upload');
    setUploadedFile(null);
    setContextData(null);
    setJobId(null);
    setResults(null);
    setUploadResult(null);
    setNotification(null);
  };

  return (
    <ErrorBoundary>
      <Authenticator>
        {({ signOut, user }) => (
          <Router>
            <div className="min-h-screen bg-gray-50">
              <Navbar user={user} signOut={signOut} />
              
              {/* Notification */}
              {notification && (
                <Notification
                  type={notification.type}
                  message={notification.message}
                  duration={notification.duration}
                  onClose={hideNotification}
                />
              )}
              
              <main className="container mx-auto px-4 py-8">
              <Routes>
                <Route path="/" element={
                  <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-8">
                      <h1 className="text-4xl font-bold text-gray-900 mb-4">
                        Lokalize
                      </h1>
                      <p className="text-xl text-gray-600">
                        Transform your content for global audiences
                      </p>
                    </div>

                    {/* Progress Indicator */}
                    <div className="mb-8">
                      <div className="flex items-center justify-center space-x-4">
                        {['upload', 'context', 'processing', 'results'].map((step, index) => (
                          <div key={step} className="flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                              currentStep === step 
                                ? 'bg-primary-600 text-white' 
                                : index < ['upload', 'context', 'processing', 'results'].indexOf(currentStep)
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-300 text-gray-600'
                            }`}>
                              {index + 1}
                            </div>
                            <span className={`ml-2 text-sm font-medium ${
                              currentStep === step ? 'text-primary-600' : 'text-gray-500'
                            }`}>
                              {step.charAt(0).toUpperCase() + step.slice(1)}
                            </span>
                            {index < 3 && (
                              <div className={`w-8 h-0.5 ml-4 ${
                                index < ['upload', 'context', 'processing', 'results'].indexOf(currentStep)
                                  ? 'bg-green-500' 
                                  : 'bg-gray-300'
                              }`} />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Main Content Sections */}
                    {currentStep === 'upload' && (
                      <UploadSection 
                        onFileUpload={handleFileUpload}
                        onError={handleUploadError}
                        contextData={contextData}
                      />
                    )}
                    
                    {currentStep === 'context' && (
                      <ContextForm 
                        file={uploadedFile}
                        onSubmit={handleContextSubmit}
                        onBack={() => setCurrentStep('upload')}
                      />
                    )}
                    
                    {currentStep === 'processing' && (
                      <ProcessingSection 
                        jobId={jobId}
                        onComplete={handleJobComplete}
                        onError={handleProcessingError}
                      />
                    )}
                    
                    {currentStep === 'results' && (
                      <ResultsSection 
                        results={results}
                        onReset={resetProcess}
                      />
                    )}
                  </div>
                } />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/login" element={<Login />} />
              </Routes>
              </main>
            </div>
          </Router>
        )}
      </Authenticator>
    </ErrorBoundary>
  );
}

export default App;