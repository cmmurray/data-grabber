/**
 * Twitter/X API service implementation
 * Provides functions to securely download and process user data from Twitter
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { createSecureEnvironment } = require('../security');
const { ensureDirectoryExists } = require('../../utils/file-helpers');

/**
 * Twitter API client with secure handling of credentials and data
 */
class TwitterClient {
  /**
   * Create a new Twitter client
   * 
   * @param {Object} credentials - Twitter API credentials
   * @param {string} credentials.bearerToken - Bearer token for Twitter API v2
   * @param {string} credentials.apiKey - API key (for API v1.1)
   * @param {string} credentials.apiKeySecret - API key secret (for API v1.1)
   * @param {string} credentials.accessToken - Access token (for API v1.1)
   * @param {string} credentials.accessTokenSecret - Access token secret (for API v1.1)
   */
  constructor(credentials) {
    this.credentials = { ...credentials };
    
    // Validate required credentials
    if (!this.credentials.bearerToken) {
      throw new Error('Bearer token is required for Twitter API v2');
    }
    
    // Base URL for Twitter API v2
    this.baseUrl = 'https://api.twitter.com/2';
    
    // Set up axios instance with default configuration
    this.api = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Bearer ${this.credentials.bearerToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    // Track rate limits
    this.rateLimits = {
      remaining: 300, // Default rate limit for most endpoints
      reset: Date.now() + 900000, // 15 minutes from now
    };
    
    // Add response interceptor to handle rate limiting
    this.api.interceptors.response.use(
      (response) => {
        // Update rate limit info from headers
        if (response.headers['x-rate-limit-remaining']) {
          this.rateLimits.remaining = parseInt(response.headers['x-rate-limit-remaining'], 10);
        }
        if (response.headers['x-rate-limit-reset']) {
          this.rateLimits.reset = parseInt(response.headers['x-rate-limit-reset'], 10) * 1000; // Convert to milliseconds
        }
        return response;
      },
      async (error) => {
        if (error.response) {
          // Handle rate limiting
          if (error.response.status === 429) {
            const resetTime = error.response.headers['x-rate-limit-reset'];
            const waitTime = resetTime ? (parseInt(resetTime, 10) * 1000) - Date.now() : 60000;
            
            console.log(`Rate limited by Twitter API. Waiting ${Math.ceil(waitTime / 1000)} seconds...`);
            await new Promise(resolve => setTimeout(resolve, waitTime + 1000)); // Add 1 second buffer
            
            // Retry the request after waiting
            return this.api.request(error.config);
          }
        }
        return Promise.reject(error);
      }
    );
  }
  
  /**
   * Get a user's profile information
   * 
   * @param {string} username - Twitter username (without @)
   * @returns {Promise<Object>} - User profile data
   */
  async getUserProfile(username) {
    try {
      const response = await this.api.get(`/users/by/username/${username}`, {
        params: {
          'user.fields': 'description,created_at,location,profile_image_url,public_metrics,verified',
        },
      });
      
      return response.data.data;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        throw new Error(`User @${username} not found`);
      }
      throw new Error(`Error fetching user profile: ${error.message}`);
    }
  }
  
  /**
   * Get a user's tweets
   * 
   * @param {string} userId - Twitter user ID
   * @param {Object} options - Options for the request
   * @param {number} options.maxResults - Maximum number of results per page (max 100)
   * @param {number} options.maxTweets - Maximum total number of tweets to fetch
   * @returns {Promise<Array>} - List of tweets
   */
  async getUserTweets(userId, options = {}) {
    const maxResults = Math.min(options.maxResults || 100, 100);
    const maxTweets = options.maxTweets || 3200; // Twitter API limit is ~3200 tweets
    
    let tweets = [];
    let paginationToken = null;
    
    try {
      do {
        // Check if we should stop due to reaching maxTweets
        if (tweets.length >= maxTweets) {
          console.log(`Reached maximum number of tweets (${maxTweets})`);
          break;
        }
        
        // Check rate limits
        await this._checkRateLimits();
        
        // Make the API request with pagination
        const response = await this.api.get(`/users/${userId}/tweets`, {
          params: {
            'tweet.fields': 'created_at,public_metrics,entities,geo,lang,source,context_annotations',
            'max_results': maxResults,
            'pagination_token': paginationToken || undefined,
          },
        });
        
        const data = response.data.data || [];
        tweets = tweets.concat(data);
        
        // Update pagination token
        paginationToken = response.data.meta?.next_token;
        
        console.log(`Retrieved ${data.length} tweets. Total: ${tweets.length}. ${paginationToken ? 'More available.' : 'No more tweets.'}`);
        
        // A small delay to be nice to the API
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } while (paginationToken && tweets.length < maxTweets);
      
      return tweets;
    } catch (error) {
      throw new Error(`Error fetching user tweets: ${error.message}`);
    }
  }
  
  /**
   * Get a user's followers
   * 
   * @param {string} userId - Twitter user ID
   * @param {Object} options - Options for the request
   * @param {number} options.maxResults - Maximum number of results per page (max 100)
   * @param {number} options.maxFollowers - Maximum total number of followers to fetch
   * @returns {Promise<Array>} - List of followers
   */
  async getUserFollowers(userId, options = {}) {
    const maxResults = Math.min(options.maxResults || 100, 100);
    const maxFollowers = options.maxFollowers || 1000;
    
    let followers = [];
    let paginationToken = null;
    
    try {
      do {
        // Check if we should stop due to reaching maxFollowers
        if (followers.length >= maxFollowers) {
          console.log(`Reached maximum number of followers (${maxFollowers})`);
          break;
        }
        
        // Check rate limits
        await this._checkRateLimits();
        
        // Make the API request with pagination
        const response = await this.api.get(`/users/${userId}/followers`, {
          params: {
            'user.fields': 'description,created_at,location,profile_image_url,public_metrics,verified',
            'max_results': maxResults,
            'pagination_token': paginationToken || undefined,
          },
        });
        
        const data = response.data.data || [];
        followers = followers.concat(data);
        
        // Update pagination token
        paginationToken = response.data.meta?.next_token;
        
        console.log(`Retrieved ${data.length} followers. Total: ${followers.length}. ${paginationToken ? 'More available.' : 'No more followers.'}`);
        
        // A small delay to be nice to the API
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } while (paginationToken && followers.length < maxFollowers);
      
      return followers;
    } catch (error) {
      throw new Error(`Error fetching user followers: ${error.message}`);
    }
  }
  
  /**
   * Get a user's following (accounts they follow)
   * 
   * @param {string} userId - Twitter user ID
   * @param {Object} options - Options for the request
   * @param {number} options.maxResults - Maximum number of results per page (max 100)
   * @param {number} options.maxFollowing - Maximum total number of following to fetch
   * @returns {Promise<Array>} - List of accounts the user is following
   */
  async getUserFollowing(userId, options = {}) {
    const maxResults = Math.min(options.maxResults || 100, 100);
    const maxFollowing = options.maxFollowing || 1000;
    
    let following = [];
    let paginationToken = null;
    
    try {
      do {
        // Check if we should stop due to reaching maxFollowing
        if (following.length >= maxFollowing) {
          console.log(`Reached maximum number of following (${maxFollowing})`);
          break;
        }
        
        // Check rate limits
        await this._checkRateLimits();
        
        // Make the API request with pagination
        const response = await this.api.get(`/users/${userId}/following`, {
          params: {
            'user.fields': 'description,created_at,location,profile_image_url,public_metrics,verified',
            'max_results': maxResults,
            'pagination_token': paginationToken || undefined,
          },
        });
        
        const data = response.data.data || [];
        following = following.concat(data);
        
        // Update pagination token
        paginationToken = response.data.meta?.next_token;
        
        console.log(`Retrieved ${data.length} following. Total: ${following.length}. ${paginationToken ? 'More available.' : 'No more following.'}`);
        
        // A small delay to be nice to the API
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } while (paginationToken && following.length < maxFollowing);
      
      return following;
    } catch (error) {
      throw new Error(`Error fetching user following: ${error.message}`);
    }
  }
  
  /**
   * Get a user's liked tweets
   * 
   * @param {string} userId - Twitter user ID
   * @param {Object} options - Options for the request
   * @param {number} options.maxResults - Maximum number of results per page (max 100)
   * @param {number} options.maxLikes - Maximum total number of likes to fetch
   * @returns {Promise<Array>} - List of liked tweets
   */
  async getUserLikes(userId, options = {}) {
    const maxResults = Math.min(options.maxResults || 100, 100);
    const maxLikes = options.maxLikes || 1000;
    
    let likes = [];
    let paginationToken = null;
    
    try {
      do {
        // Check if we should stop due to reaching maxLikes
        if (likes.length >= maxLikes) {
          console.log(`Reached maximum number of likes (${maxLikes})`);
          break;
        }
        
        // Check rate limits
        await this._checkRateLimits();
        
        // Make the API request with pagination
        const response = await this.api.get(`/users/${userId}/liked_tweets`, {
          params: {
            'tweet.fields': 'created_at,public_metrics,entities,geo,lang,source',
            'max_results': maxResults,
            'pagination_token': paginationToken || undefined,
          },
        });
        
        const data = response.data.data || [];
        likes = likes.concat(data);
        
        // Update pagination token
        paginationToken = response.data.meta?.next_token;
        
        console.log(`Retrieved ${data.length} likes. Total: ${likes.length}. ${paginationToken ? 'More available.' : 'No more likes.'}`);
        
        // A small delay to be nice to the API
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } while (paginationToken && likes.length < maxLikes);
      
      return likes;
    } catch (error) {
      throw new Error(`Error fetching user likes: ${error.message}`);
    }
  }
  
  /**
   * Download a user's complete profile data
   * 
   * @param {string} username - Twitter username (without @)
   * @param {Object} options - Download options
   * @param {string} options.outputDir - Directory to save data
   * @param {boolean} options.includeTweets - Whether to download tweets
   * @param {boolean} options.includeFollowers - Whether to download followers
   * @param {boolean} options.includeFollowing - Whether to download following
   * @param {boolean} options.includeLikes - Whether to download likes
   * @returns {Promise<Object>} - Summary of downloaded data
   */
  async downloadUserData(username, options = {}) {
    try {
      console.log(`Starting download of Twitter data for @${username}`);
      
      // Create output directory
      const outputDir = options.outputDir || path.join(process.cwd(), 'data', 'twitter', username);
      await ensureDirectoryExists(outputDir);
      
      // Create secure environment for downloading
      const secureEnv = await createSecureEnvironment({
        name: `twitter-download-${username}`,
        blockNetwork: false, // We need network access for downloading
        protectMemory: true
      });
      
      try {
        // Get user profile first
        const profile = await this.getUserProfile(username);
        const userId = profile.id;
        
        console.log(`Found user @${username} with ID ${userId}`);
        
        // Download profile data
        await secureEnv.storeData('profile', JSON.stringify(profile));
        
        // Download tweets if requested
        let tweetCount = 0;
        if (options.includeTweets !== false) {
          console.log('Downloading tweets...');
          const tweets = await this.getUserTweets(userId, { maxTweets: options.maxTweets || 3200 });
          tweetCount = tweets.length;
          await secureEnv.storeData('tweets', JSON.stringify(tweets));
        }
        
        // Download followers if requested
        let followerCount = 0;
        if (options.includeFollowers !== false) {
          console.log('Downloading followers...');
          const followers = await this.getUserFollowers(userId, { maxFollowers: options.maxFollowers || 1000 });
          followerCount = followers.length;
          await secureEnv.storeData('followers', JSON.stringify(followers));
        }
        
        // Download following if requested
        let followingCount = 0;
        if (options.includeFollowing !== false) {
          console.log('Downloading following...');
          const following = await this.getUserFollowing(userId, { maxFollowing: options.maxFollowing || 1000 });
          followingCount = following.length;
          await secureEnv.storeData('following', JSON.stringify(following));
        }
        
        // Download likes if requested
        let likeCount = 0;
        if (options.includeLikes !== false) {
          console.log('Downloading likes...');
          const likes = await this.getUserLikes(userId, { maxLikes: options.maxLikes || 1000 });
          likeCount = likes.length;
          await secureEnv.storeData('likes', JSON.stringify(likes));
        }
        
        // Save the data to the output directory
        const allData = {
          profile,
          meta: {
            username,
            userId,
            downloadDate: new Date().toISOString(),
            tweetCount,
            followerCount,
            followingCount,
            likeCount
          }
        };
        
        // Get each data type from secure storage
        if (options.includeTweets !== false) {
          const tweetData = await secureEnv.retrieveData('tweets');
          allData.tweets = JSON.parse(tweetData.toString());
        }
        
        if (options.includeFollowers !== false) {
          const followerData = await secureEnv.retrieveData('followers');
          allData.followers = JSON.parse(followerData.toString());
        }
        
        if (options.includeFollowing !== false) {
          const followingData = await secureEnv.retrieveData('following');
          allData.following = JSON.parse(followingData.toString());
        }
        
        if (options.includeLikes !== false) {
          const likeData = await secureEnv.retrieveData('likes');
          allData.likes = JSON.parse(likeData.toString());
        }
        
        // Write to output file
        const outputPath = path.join(outputDir, `${username}-twitter-data.json`);
        await fs.promises.writeFile(outputPath, JSON.stringify(allData, null, 2));
        
        console.log(`Twitter data for @${username} downloaded successfully to ${outputPath}`);
        
        return {
          success: true,
          outputPath,
          summary: allData.meta
        };
      } finally {
        // Always destroy the secure environment when done
        await secureEnv.destroy();
      }
    } catch (error) {
      console.error(`Error downloading Twitter data for @${username}:`, error);
      throw error;
    }
  }
  
  /**
   * Process downloaded Twitter data with secure handling
   *
   * @param {Object} options - Processing options
   * @param {string} options.dataPath - Path to the downloaded Twitter data
   * @param {string} options.outputDir - Directory to save analysis results
   * @param {Function} options.analysisFunction - Function to analyze the data
   * @returns {Promise<Object>} - Results of the analysis
   */
  async processTwitterData(options) {
    const { dataPath, outputDir, analysisFunction } = options;
    
    if (!fs.existsSync(dataPath)) {
      throw new Error(`Twitter data file not found at ${dataPath}`);
    }
    
    console.log(`Starting secure Twitter data processing from ${dataPath}`);
    
    // Create a secure environment for processing
    const secureEnv = await createSecureEnvironment({
      name: 'twitter-analysis',
      blockNetwork: true,  // Block network during analysis
      protectMemory: true
    });
    
    try {
      // Read and import the data into secure storage
      console.log('Importing Twitter data into secure storage...');
      const data = await fs.promises.readFile(dataPath, 'utf8');
      await secureEnv.storeData('twitter-data', data);
      
      // Run the analysis function in the secure environment
      console.log('Running secure analysis...');
      const analysisResults = await secureEnv.execute(async () => {
        if (typeof analysisFunction !== 'function') {
          throw new Error('Analysis function is required');
        }
        
        // Get data from secure storage
        const dataBuffer = await secureEnv.retrieveData('twitter-data');
        const twitterData = JSON.parse(dataBuffer.toString());
        
        // Run the provided analysis function
        return analysisFunction(twitterData);
      });
      
      // Create output directory if needed
      await ensureDirectoryExists(outputDir);
      
      // Export only the analysis results, not the raw data
      const resultsPath = path.join(outputDir, 'twitter-analysis-results.json');
      await fs.promises.writeFile(
        resultsPath,
        JSON.stringify(analysisResults, null, 2)
      );
      
      console.log(`Analysis complete. Results saved to ${resultsPath}`);
      return {
        success: true,
        message: 'Twitter data processed and securely destroyed',
        resultsPath
      };
    } finally {
      // Ensure data is destroyed even if there's an error
      console.log('Destroying secure environment and all data...');
      await secureEnv.destroy();
      console.log('Secure environment destroyed, all sensitive data has been removed');
    }
  }
  
  /**
   * Check and handle Twitter API rate limits
   * 
   * @private
   * @returns {Promise<void>}
   */
  async _checkRateLimits() {
    if (this.rateLimits.remaining <= 5) {
      const now = Date.now();
      const waitTime = Math.max(0, this.rateLimits.reset - now);
      
      if (waitTime > 0) {
        console.log(`Rate limit almost reached. Waiting ${Math.ceil(waitTime / 1000)} seconds...`);
        await new Promise(resolve => setTimeout(resolve, waitTime + 1000)); // Add 1 second buffer
      }
    }
  }
  
  /**
   * Safely destroy the client, clearing credentials from memory
   */
  destroy() {
    // Zero out credentials in memory
    if (this.credentials) {
      Object.keys(this.credentials).forEach(key => {
        if (typeof this.credentials[key] === 'string') {
          // Overwrite with empty string, then delete
          this.credentials[key] = '';
          delete this.credentials[key];
        }
      });
      this.credentials = null;
    }
  }
}

module.exports = {
  TwitterClient
};