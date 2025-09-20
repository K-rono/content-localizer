@echo off
REM Content Localizer Deployment Script for Windows
REM This script automates the deployment process for the Content Localizer application

echo 🚀 Starting Content Localizer deployment...

REM Check if Amplify CLI is installed
where amplify >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ AWS Amplify CLI is not installed. Please install it first:
    echo npm install -g @aws-amplify/cli
    exit /b 1
)

REM Check if AWS CLI is configured
aws sts get-caller-identity >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ AWS CLI is not configured. Please run 'aws configure' first.
    exit /b 1
)

REM Install dependencies
echo 📦 Installing dependencies...
npm install

REM Initialize Amplify if not already done
if not exist "amplify" (
    echo 🔧 Initializing Amplify...
    amplify init --yes
)

REM Add auth if not exists
amplify status | findstr "auth" >nul
if %ERRORLEVEL% NEQ 0 (
    echo 🔐 Adding authentication...
    amplify add auth --yes
)

REM Add storage if not exists
amplify status | findstr "storage" >nul
if %ERRORLEVEL% NEQ 0 (
    echo 💾 Adding storage...
    amplify add storage --yes
)

REM Add API if not exists
amplify status | findstr "api" >nul
if %ERRORLEVEL% NEQ 0 (
    echo 🔌 Adding API...
    amplify add api --yes
)

REM Deploy backend
echo 🏗️ Deploying backend...
amplify push --yes

REM Build frontend
echo 🏗️ Building frontend...
npm run build

REM Deploy to hosting
echo 🌐 Deploying to hosting...
amplify publish --yes

echo ✅ Deployment completed successfully!
echo 🌍 Your app is now available at:
amplify status | findstr "Hosting endpoint" || echo Check the Amplify console for the hosting URL
