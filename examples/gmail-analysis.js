#!/usr/bin/env node

/**
 * Example script for Gmail data analysis
 * Demonstrates secure processing of Gmail data
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { processGmailData } = require('../src/services/gmail');

// Sample analysis function - will run in secure environment
function analyzeGmailData(emails) {
  console.log(`Analyzing ${emails.length} emails securely...`);
  
  // This analysis function runs in the secure environment with no network access
  // Only the results will leave the secure environment
  
  // Sample analysis: Email summary by year and month
  const monthlyCounts = {};
  const contactFrequency = {};
  const wordFrequency = {};
  let totalWords = 0;
  
  emails.forEach(email => {
    if (!email.date) return;
    
    // Count emails by year and month
    const date = new Date(email.date);
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    monthlyCounts[yearMonth] = (monthlyCounts[yearMonth] || 0) + 1;
    
    // Count contact frequency
    if (email.from) {
      contactFrequency[email.from] = (contactFrequency[email.from] || 0) + 1;
    }
    
    // Basic word frequency analysis
    if (email.body) {
      const words = email.body
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3);
      
      words.forEach(word => {
        wordFrequency[word] = (wordFrequency[word] || 0) + 1;
        totalWords++;
      });
    }
  });
  
  // Sort and limit results
  const topContacts = Object.entries(contactFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([contact, count]) => ({ contact, count }));
    
  const topWords = Object.entries(wordFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 100)
    .map(([word, count]) => ({ word, count, percentage: (count / totalWords * 100).toFixed(2) + '%' }));
  
  // Return results (NOT the raw emails)
  return {
    totalEmails: emails.length,
    analysisDate: new Date().toISOString(),
    monthlyCounts,
    topContacts,
    topWords
  };
}

// Main function
async function main() {
  try {
    const archivePath = process.argv[2];
    if (!archivePath) {
      console.error('Please provide the path to your Gmail data export');
      console.error('Usage: node gmail-analysis.js /path/to/gmail/export');
      process.exit(1);
    }
    
    // Create output directory if it doesn't exist
    const outputDir = path.resolve(process.cwd(), './data/gmail-analysis');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    console.log('Starting secure Gmail data analysis');
    console.log('Note: This process will DESTROY all raw email data after analysis');
    console.log('Only the aggregated analysis results will be preserved');
    
    // Process the Gmail data with our analysis function
    const result = await processGmailData({
      archivePath,
      outputDir,
      analysisFunction: analyzeGmailData
    });
    
    console.log('\nAnalysis complete!');
    console.log(`Results saved to: ${result.resultsPath}`);
    console.log('All raw email data has been securely destroyed');
    
  } catch (error) {
    console.error('Error during Gmail analysis:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(console.error);