#!/bin/bash

# Content Localizer Deployment Script
# This script automates the deployment process for the Content Localizer application

set -e

echo "🚀 Starting Content Localizer deployment..."

# Check if Amplify CLI is installed
if ! command -v amplify &> /dev/null; then
    echo "❌ AWS Amplify CLI is not installed. Please install it first:"
    echo "npm install -g @aws-amplify/cli"
    exit 1
fi

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS CLI is not configured. Please run 'aws configure' first."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Initialize Amplify if not already done
if [ ! -d "amplify" ]; then
    echo "🔧 Initializing Amplify..."
    amplify init --yes
fi

# Add auth if not exists
if ! amplify status | grep -q "auth"; then
    echo "🔐 Adding authentication..."
    amplify add auth --yes
fi

# Add storage if not exists
if ! amplify status | grep -q "storage"; then
    echo "💾 Adding storage..."
    amplify add storage --yes
fi

# Add API if not exists
if ! amplify status | grep -q "api"; then
    echo "🔌 Adding API..."
    amplify add api --yes
fi

# Deploy backend
echo "🏗️ Deploying backend..."
amplify push --yes

# Build frontend
echo "🏗️ Building frontend..."
npm run build

# Deploy to hosting
echo "🌐 Deploying to hosting..."
amplify publish --yes

echo "✅ Deployment completed successfully!"
echo "🌍 Your app is now available at:"
amplify status | grep "Hosting endpoint" || echo "Check the Amplify console for the hosting URL"
