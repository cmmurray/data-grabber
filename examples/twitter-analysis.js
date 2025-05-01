#!/usr/bin/env node

/**
 * Example script for Twitter data analysis
 * Demonstrates secure downloading and processing of Twitter data
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { TwitterClient } = require('../src/services/twitter');
const { ensureDirectoryExists } = require('../utils/file-helpers');

// Sample analysis function - will run in secure environment
function analyzeTwitterData(data) {
  console.log(`Analyzing Twitter data for @${data.profile.username} securely...`);
  
  // This analysis function runs in the secure environment with no network access
  // Only the results will leave the secure environment
  
  const profile = data.profile;
  const tweets = data.tweets || [];
  const followers = data.followers || [];
  const following = data.following || [];
  const likes = data.likes || [];
  
  // 1. Tweet activity analysis
  const tweetActivity = {};
  const tweetsByHour = Array(24).fill(0);
  const tweetsByDay = {
    'Monday': 0, 'Tuesday': 0, 'Wednesday': 0, 'Thursday': 0,
    'Friday': 0, 'Saturday': 0, 'Sunday': 0
  };
  
  // Calculate tweet frequency by time and day
  tweets.forEach(tweet => {
    const date = new Date(tweet.created_at);
    const hour = date.getHours();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const day = days[date.getDay()];
    
    // Aggregate by hour
    tweetsByHour[hour]++;
    
    // Aggregate by day
    tweetsByDay[day]++;
    
    // Aggregate by month-year
    const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    tweetActivity[monthYear] = (tweetActivity[monthYear] || 0) + 1;
  });
  
  // 2. Content analysis
  const hashtagFrequency = {};
  const mentionFrequency = {};
  const sourceApps = {};
  const wordFrequency = {};
  let totalWords = 0;
  
  tweets.forEach(tweet => {
    // Count sources (Twitter clients)
    if (tweet.source) {
      sourceApps[tweet.source] = (sourceApps[tweet.source] || 0) + 1;
    }
    
    // Count hashtags
    if (tweet.entities?.hashtags) {
      tweet.entities.hashtags.forEach(tag => {
        const hashtag = tag.tag.toLowerCase();
        hashtagFrequency[hashtag] = (hashtagFrequency[hashtag] || 0) + 1;
      });
    }
    
    // Count mentions
    if (tweet.entities?.mentions) {
      tweet.entities.mentions.forEach(mention => {
        mentionFrequency[mention.username] = (mentionFrequency[mention.username] || 0) + 1;
      });
    }
    
    // Basic word frequency analysis
    if (tweet.text) {
      const words = tweet.text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3 && !word.startsWith('http'));
      
      words.forEach(word => {
        wordFrequency[word] = (wordFrequency[word] || 0) + 1;
        totalWords++;
      });
    }
  });
  
  // 3. Engagement analysis
  const engagementMetrics = {
    totalRetweets: 0,
    totalLikes: 0,
    totalReplies: 0,
    totalImpressions: 0,
    mostRetweeted: null,
    mostLiked: null
  };
  
  tweets.forEach(tweet => {
    if (tweet.public_metrics) {
      const metrics = tweet.public_metrics;
      engagementMetrics.totalRetweets += metrics.retweet_count || 0;
      engagementMetrics.totalLikes += metrics.like_count || 0;
      engagementMetrics.totalReplies += metrics.reply_count || 0;
      engagementMetrics.totalImpressions += metrics.impression_count || 0;
      
      // Track most popular tweets
      if (!engagementMetrics.mostRetweeted || 
          (metrics.retweet_count > engagementMetrics.mostRetweeted.public_metrics.retweet_count)) {
        engagementMetrics.mostRetweeted = tweet;
      }
      
      if (!engagementMetrics.mostLiked || 
          (metrics.like_count > engagementMetrics.mostLiked.public_metrics.like_count)) {
        engagementMetrics.mostLiked = tweet;
      }
    }
  });
  
  // 4. Network analysis
  const networkMetrics = {
    followerCount: profile.public_metrics?.followers_count || followers.length,
    followingCount: profile.public_metrics?.following_count || following.length,
    followersToFollowing: 0,
    mutualFollowPercentage: 0,
    topFollowerCategories: {}
  };
  
  // Calculate followers-to-following ratio
  if (networkMetrics.followingCount > 0) {
    networkMetrics.followersToFollowing = (networkMetrics.followerCount / networkMetrics.followingCount).toFixed(2);
  }
  
  // Calculate mutual follow percentage
  const followerIds = new Set(followers.map(f => f.id));
  const followingIds = new Set(following.map(f => f.id));
  let mutualCount = 0;
  
  followingIds.forEach(id => {
    if (followerIds.has(id)) {
      mutualCount++;
    }
  });
  
  if (followingIds.size > 0) {
    networkMetrics.mutualFollowPercentage = ((mutualCount / followingIds.size) * 100).toFixed(2);
  }
  
  // Clean up the most popular tweets to remove unnecessary data
  if (engagementMetrics.mostRetweeted) {
    engagementMetrics.mostRetweeted = {
      id: engagementMetrics.mostRetweeted.id,
      text: engagementMetrics.mostRetweeted.text,
      created_at: engagementMetrics.mostRetweeted.created_at,
      metrics: engagementMetrics.mostRetweeted.public_metrics
    };
  }
  
  if (engagementMetrics.mostLiked) {
    engagementMetrics.mostLiked = {
      id: engagementMetrics.mostLiked.id,
      text: engagementMetrics.mostLiked.text,
      created_at: engagementMetrics.mostLiked.created_at,
      metrics: engagementMetrics.mostLiked.public_metrics
    };
  }
  
  // Sort and limit results
  const topHashtags = Object.entries(hashtagFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([tag, count]) => ({ tag, count }));
    
  const topMentions = Object.entries(mentionFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([username, count]) => ({ username, count }));
    
  const topWords = Object.entries(wordFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 100)
    .map(([word, count]) => ({ 
      word, 
      count, 
      percentage: (count / totalWords * 100).toFixed(2) + '%' 
    }));
  
  const topSources = Object.entries(sourceApps)
    .sort((a, b) => b[1] - a[1])
    .map(([source, count]) => ({ source, count }));
  
  // Return results (NOT the raw data)
  return {
    user: {
      username: profile.username,
      displayName: profile.name,
      bio: profile.description,
      created: profile.created_at,
      location: profile.location,
      metrics: profile.public_metrics
    },
    tweetStats: {
      totalTweets: tweets.length,
      tweetsByHour,
      tweetsByDay,
      tweetActivity,
      topSources
    },
    contentAnalysis: {
      topHashtags,
      topMentions,
      topWords
    },
    engagement: engagementMetrics,
    network: networkMetrics,
    analysisDate: new Date().toISOString()
  };
}

// Main function
async function main() {
  try {
    // Check for Twitter credentials
    const bearerToken = process.env.TWITTER_BEARER_TOKEN;
    if (!bearerToken) {
      console.error('TWITTER_BEARER_TOKEN is required in .env file');
      process.exit(1);
    }
    
    // Get username from command line
    const username = process.argv[2];
    if (!username) {
      console.error('Please provide a Twitter username');
      console.error('Usage: node twitter-analysis.js [username]');
      process.exit(1);
    }
    
    console.log(`Starting Twitter data analysis for @${username}`);
    
    // Create client
    const client = new TwitterClient({ bearerToken });
    
    // Create output directories
    const dataDir = path.resolve(process.cwd(), './data/twitter', username);
    const outputDir = path.resolve(process.cwd(), './data/twitter-analysis', username);
    
    await ensureDirectoryExists(dataDir);
    await ensureDirectoryExists(outputDir);
    
    console.log('Downloading Twitter data...');
    console.log('This will collect profile data, tweets, followers, and following lists');
    
    // Download the data
    const downloadResult = await client.downloadUserData(username, {
      outputDir: dataDir,
      includeTweets: true,
      includeFollowers: true,
      includeFollowing: true,
      includeLikes: true,
      // Reasonable limits to avoid rate limiting issues
      maxTweets: 1000,
      maxFollowers: 500,
      maxFollowing: 500,
      maxLikes: 200
    });
    
    console.log(`Data downloaded successfully to ${downloadResult.outputPath}`);
    console.log('Starting secure analysis...');
    
    // Process the data with our analysis function
    const result = await client.processTwitterData({
      dataPath: downloadResult.outputPath,
      outputDir,
      analysisFunction: analyzeTwitterData
    });
    
    console.log('\nAnalysis complete!');
    console.log(`Results saved to: ${result.resultsPath}`);
    console.log('All raw Twitter data has been securely destroyed');
    
    // Clean up client
    client.destroy();
    
  } catch (error) {
    console.error('Error during Twitter analysis:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(console.error);