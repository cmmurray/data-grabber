/**
 * OpenAI integration for generating integration code from captured network requests
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { HARTransformer } = require('./har-transformer');

/**
 * Generate integration code using OpenAI
 * 
 * @param {Object} options - Code generation options
 * @param {string} options.harPath - Path to the HAR file with captured network requests
 * @param {string} options.description - User description of the integration goal
 * @param {string} options.model - OpenAI model to use (default: "gpt-4o")
 * @returns {Promise<Object>} - Generated code and metadata
 */
async function generateIntegrationCode(options) {
  const { harPath, description, model = 'gpt-4o' } = options;
  
  // Check if OpenAI API key is set
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set in environment variables');
  }
  
  try {
    // Read and parse the HAR file
    const harData = JSON.parse(fs.readFileSync(harPath, 'utf8'));
    
    // Transform HAR data to create a dependency graph
    const transformer = new HARTransformer(harData);
    const requestGraph = transformer.generateDependencyGraph();
    
    // First, generate a graph representation
    console.log('Generating graph from network requests...');
    const graphResponse = await callOpenAI({
      model,
      messages: [
        {
          role: "system",
          content: "You are a network analysis expert that specializes in creating dependency graphs from network requests."
        },
        {
          role: "user",
          content: `I want to create an integration that will: ${description}\n\nHere is the dependency graph of network requests:\n${JSON.stringify(requestGraph, null, 2)}\n\nPlease analyze these network requests and create a simplified graph showing the key API endpoints and their dependencies to accomplish this goal.`
        }
      ]
    });
    
    const processedGraph = graphResponse.choices[0].message.content;
    
    // Then, generate the actual code based on the processed graph
    console.log('Generating integration code...');
    const codeResponse = await callOpenAI({
      model: model === 'gpt-4o' ? 'gpt-4o' : 'gpt-4o', // Use powerful model for code gen
      messages: [
        {
          role: "system",
          content: "You are an expert Python developer that specializes in creating API integrations. Generate clean, well-structured, and secure code."
        },
        {
          role: "user",
          content: `I want to create an integration that will: ${description}\n\nHere is the dependency graph of the API calls:\n${processedGraph}\n\nPlease generate a complete Python script that implements this integration. Include proper error handling, authentication management, and make the code secure. The code should be ready to run as a standalone script that accomplishes the described goal.`
        }
      ]
    });
    
    const generatedCode = codeResponse.choices[0].message.content;
    
    // Extract the Python code from the response (it might contain markdown)
    const codeMatch = generatedCode.match(/```python\n([\s\S]*?)```/);
    const cleanCode = codeMatch ? codeMatch[1] : generatedCode;
    
    return {
      success: true,
      code: cleanCode,
      description,
      language: 'python',
      model,
      timestamp: new Date().toISOString(),
      metadata: {
        // Additional metadata about the code generation
        graphComplexity: requestGraph.nodes.length,
        requestCount: harData.log.entries.length
      }
    };
  } catch (error) {
    console.error('Error generating integration code:', error);
    throw error;
  }
}

/**
 * Call the OpenAI API
 * 
 * @param {Object} params - API call parameters
 * @returns {Promise<Object>} - OpenAI API response
 * @private
 */
async function callOpenAI(params) {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      params,
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error('OpenAI API error:', error.response.data);
      throw new Error(`OpenAI API error: ${error.response.data.error.message}`);
    }
    throw error;
  }
}

/**
 * Class to transform HAR data into a dependency graph
 */
class HARTransformer {
  constructor(harData) {
    this.harData = harData;
  }
  
  /**
   * Generate a dependency graph from the HAR data
   * 
   * @returns {Object} - Dependency graph
   */
  generateDependencyGraph() {
    const entries = this.harData.log.entries;
    
    // Create nodes for each request
    const nodes = entries.map((entry, index) => {
      return {
        id: index,
        url: entry.request.url,
        method: entry.request.method,
        timestamp: new Date(entry.startedDateTime).getTime()
      };
    });
    
    // Create edges based on timing and cookies/request params
    const edges = [];
    const cookies = {};
    const headers = {};
    
    // First pass: track cookies and headers
    entries.forEach((entry, index) => {
      // Track cookies set in responses
      if (entry.response.cookies && entry.response.cookies.length > 0) {
        entry.response.cookies.forEach(cookie => {
          cookies[cookie.name] = {
            source: index,
            value: cookie.value
          };
        });
      }
      
      // Track important headers
      if (entry.response.headers) {
        entry.response.headers.forEach(header => {
          if (header.name.toLowerCase() === 'authorization' || 
              header.name.toLowerCase() === 'x-csrf-token') {
            headers[header.name] = {
              source: index,
              value: header.value
            };
          }
        });
      }
    });
    
    // Second pass: create dependency edges
    entries.forEach((entry, targetIndex) => {
      // Check for cookie dependencies
      if (entry.request.cookies) {
        entry.request.cookies.forEach(cookie => {
          if (cookies[cookie.name] && cookies[cookie.name].source !== targetIndex) {
            edges.push({
              source: cookies[cookie.name].source,
              target: targetIndex,
              type: 'cookie',
              name: cookie.name
            });
          }
        });
      }
      
      // Check for header dependencies
      if (entry.request.headers) {
        entry.request.headers.forEach(header => {
          if (headers[header.name] && headers[header.name].source !== targetIndex) {
            edges.push({
              source: headers[header.name].source,
              target: targetIndex,
              type: 'header',
              name: header.name
            });
          }
        });
      }
      
      // Check for temporal dependencies (time-based)
      entries.forEach((prevEntry, sourceIndex) => {
        if (sourceIndex !== targetIndex) {
          const timeDiff = new Date(entry.startedDateTime).getTime() - 
                          new Date(prevEntry.startedDateTime).getTime();
          
          // If this request happened shortly after another (< 1 second)
          if (timeDiff > 0 && timeDiff < 1000) {
            edges.push({
              source: sourceIndex,
              target: targetIndex,
              type: 'temporal',
              timeDiff
            });
          }
        }
      });
    });
    
    return { nodes, edges };
  }
}

module.exports = {
  generateIntegrationCode,
  HARTransformer
};