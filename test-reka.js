// Test script for reka.tsx
const { uploadVideoFile } = require('./src/features/reka.tsx');

// You'll need to set your API key
const apiKey = process.env.REKA_API_KEY || 'your-api-key-here';
const filePath = './src/features/demo.mp4';

console.log('Testing uploadVideoFile function...');
console.log('API Key:', apiKey ? 'Set' : 'Not set');
console.log('File path:', filePath);

uploadVideoFile(apiKey, filePath)
  .then(result => {
    console.log('Success:', result);
  })
  .catch(error => {
    console.error('Error:', error.message);
  });
