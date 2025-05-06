/**
 * HAR Transformer
 * Utility for transforming HTTP Archive (HAR) data into dependency graphs
 */

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
  
  /**
   * Extract API endpoints from the HAR data
   * @returns {Array} - List of unique API endpoints
   */
  extractAPIEndpoints() {
    const entries = this.harData.log.entries;
    const endpoints = new Set();
    
    entries.forEach(entry => {
      try {
        const url = new URL(entry.request.url);
        const pathname = url.pathname;
        // Only include API-like endpoints
        if (pathname.includes('/api/') || 
            pathname.includes('/v1/') || 
            pathname.includes('/v2/') ||
            pathname.includes('/graphql')) {
          endpoints.add(`${entry.request.method} ${pathname}`);
        }
      } catch (error) {
        // Skip invalid URLs
      }
    });
    
    return Array.from(endpoints);
  }
  
  /**
   * Analyze authentication flow
   * @returns {Object} - Authentication flow information
   */
  analyzeAuthFlow() {
    const entries = this.harData.log.entries;
    const authEndpoints = [];
    
    entries.forEach(entry => {
      const url = entry.request.url;
      const headers = entry.request.headers || [];
      const postData = entry.request.postData || {};
      
      // Look for auth-related endpoints
      if (url.includes('login') || 
          url.includes('auth') || 
          url.includes('token') ||
          url.includes('oauth')) {
        authEndpoints.push({
          url,
          method: entry.request.method,
          timestamp: entry.startedDateTime
        });
      }
      
      // Look for auth-related headers
      headers.forEach(header => {
        if (header.name.toLowerCase() === 'authorization' ||
            header.name.toLowerCase() === 'x-auth-token') {
          authEndpoints.push({
            url,
            method: entry.request.method,
            header: header.name,
            timestamp: entry.startedDateTime
          });
        }
      });
      
      // Look for auth-related post data
      if (postData.text && (
          postData.text.includes('password') ||
          postData.text.includes('token') ||
          postData.text.includes('apiKey'))) {
        authEndpoints.push({
          url,
          method: entry.request.method,
          hasCredentials: true,
          timestamp: entry.startedDateTime
        });
      }
    });
    
    return {
      authEndpoints,
      hasAuthentication: authEndpoints.length > 0
    };
  }
}

module.exports = {
  HARTransformer
};