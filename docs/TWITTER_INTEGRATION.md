# Twitter Integration Guide

This guide explains how to use Data Grabber to securely download and analyze your Twitter data.

## Overview

The Twitter integration allows you to:

1. Download your Twitter profile data, tweets, followers, following, and likes
2. Process this data securely with no data persistence after analysis
3. Generate insights without risking your private data

## Prerequisites

To use the Twitter integration, you need:

- A Twitter Developer Account
- Twitter API Bearer Token (from the Twitter Developer Portal)

## Setting Up Twitter API Credentials

1. Visit [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a Project and App (if you don't have one already)
3. Generate a Bearer Token for API v2
4. Add these credentials to your `.env` file:

```
TWITTER_BEARER_TOKEN=your_bearer_token_here
```

## Usage

### Basic Example

The simplest way to use the Twitter integration is with the provided example script:

```bash
# Run the Twitter analysis script with your username
node examples/twitter-analysis.js your_username
```

This script will:
1. Download your Twitter data using the Twitter API
2. Process and analyze the data in a secure environment
3. Generate a summary report of insights
4. Securely delete all raw data after analysis

### Using the TwitterClient in Your Own Scripts

You can also integrate the Twitter client into your own code:

```javascript
const { TwitterClient } = require('./src/services/twitter');

async function run() {
  // Create a client with your credentials
  const client = new TwitterClient({ 
    bearerToken: process.env.TWITTER_BEARER_TOKEN 
  });
  
  try {
    // Download data
    const downloadResult = await client.downloadUserData('username', {
      outputDir: './data/twitter',
      includeTweets: true,
      includeFollowers: true,
      includeFollowing: true,
      includeLikes: true
    });
    
    // Process with a custom analysis function
    const result = await client.processTwitterData({
      dataPath: downloadResult.outputPath,
      outputDir: './data/analysis',
      analysisFunction: (data) => {
        // Your analysis function here
        return {
          summary: 'Results of my analysis',
          tweetCount: data.tweets.length
        };
      }
    });
    
    console.log(`Analysis saved to: ${result.resultsPath}`);
  } finally {
    // Always destroy the client to clear credentials from memory
    client.destroy();
  }
}

run().catch(console.error);
```

## Security Features

The Twitter integration includes these security features:

- **API Credential Protection:** Credentials are stored only in memory
- **Secure Storage:** Downloaded data is stored in encrypted form
- **Network Isolation:** During analysis, network access is blocked
- **Complete Data Destruction:** After analysis, all sensitive data is securely deleted
- **Memory Protection:** Sensitive data in memory is zeroed out when no longer needed

## Available Data Types

The Twitter client can download:

| Data Type | Description | Limit |
|-----------|-------------|-------|
| Profile | User profile information | 1 |
| Tweets | User's posts | Up to 3,200 (API limit) |
| Followers | People following the user | Configurable (default 1,000) |
| Following | People the user follows | Configurable (default 1,000) |
| Likes | Tweets the user has liked | Configurable (default 1,000) |

## Rate Limiting

The Twitter client handles rate limiting automatically. If you hit a rate limit:

1. The client will pause until the rate limit resets
2. It will automatically resume downloading afterward
3. It keeps track of how many requests remain

## Example Analysis Results

The example script generates the following insights:

- **Tweet Activity**: When you tweet most often (by hour, day, month)
- **Content Analysis**: Most frequent hashtags, mentions, and words
- **Engagement**: Retweet and like counts, most popular tweets
- **Network Analysis**: Follower-to-following ratio, mutual follows

## Troubleshooting

Common issues:

- **Authentication Errors**: Check your Bearer Token in the .env file
- **Rate Limit Errors**: The API limits how much data you can download; try reducing the maxTweets, maxFollowers, etc.
- **Network Errors**: Ensure you have internet access and the Twitter API is not down

## Advanced Configuration

You can configure the Twitter client with these options:

```javascript
// During download
await client.downloadUserData('username', {
  maxTweets: 500,      // Max tweets to download
  maxFollowers: 200,   // Max followers to download
  maxFollowing: 200,   // Max following to download
  maxLikes: 100,       // Max likes to download
  outputDir: './data'  // Where to save the downloaded data
});
```