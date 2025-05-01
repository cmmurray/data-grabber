#!/usr/bin/env node

require('dotenv').config();
const { program } = require('commander');
const path = require('path');
const fs = require('fs');
const { version } = require('../package.json');

// Import service modules
const googleTakeout = require('./services/google-takeout');

program
  .version(version)
  .description('A tool to grab user data from various services');

program
  .command('google')
  .description('Download data from Google Takeout')
  .option('-o, --output <directory>', 'Output directory for downloaded data', './data/google')
  .option('-t, --types <types>', 'Comma-separated list of data types to download')
  .action(async (options) => {
    try {
      console.log('Starting Google Takeout download...');
      // Create output directory if it doesn't exist
      const outputDir = path.resolve(process.cwd(), options.output);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      // To be implemented
      console.log('Google Takeout functionality not yet implemented');
      
    } catch (error) {
      console.error('Error downloading Google data:', error.message);
      process.exit(1);
    }
  });

program
  .command('list-services')
  .description('List all available services')
  .action(() => {
    console.log('Available services:');
    console.log('- Google Takeout');
    // Add more services as they are implemented
  });

// Add help text if no command provided
if (process.argv.length <= 2) {
  program.help();
}

program.parse(process.argv);