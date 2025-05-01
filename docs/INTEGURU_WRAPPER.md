# Integuru Wrapper User Guide

This guide explains how to use the Integuru Wrapper in Data Grabber to create custom integrations for data extraction from any web service.

## Overview

The Integuru Wrapper is a UI tool that simplifies the process of creating custom integrations by:

1. Capturing network requests as you interact with a web service
2. Using AI to analyze these requests and generate integration code
3. Providing a secure environment to run the generated integrations
4. Ensuring complete data destruction after analysis

## Getting Started

### Prerequisites

To use the Integuru Wrapper, you need:

- Node.js (v14 or later)
- An OpenAI API Key for code generation
- Python 3.7+ (for executing Python-based integrations)

### Setup

1. Install Data Grabber and its dependencies:
   ```bash
   git clone https://github.com/cmmurray/data-grabber.git
   cd data-grabber
   npm install
   ```

2. Set up your OpenAI API key in the `.env` file:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

3. Launch the Integuru UI:
   ```bash
   npm run integuru
   ```

## Creating an Integration

### Step 1: Basic Information

1. Click "New Integration" in the Integration Manager
2. Fill out the basic information:
   - **Name**: Give your integration a descriptive name
   - **Service**: The domain name of the service (e.g., twitter.com)
   - **Description**: Clearly describe what the integration should do

### Step 2: Network Capture

1. Click "Launch Browser" to start a browser session
2. Log in to the target service
3. Perform the exact actions you want to automate
   - For example, if you want to download your Twitter likes, navigate to your likes page and load some likes
4. Close the browser when you're done
5. The system will save the captured network requests

### Step 3: Integration Definition

1. Refine the description of what you want the integration to do
   - Be specific about what data you want to extract
   - Mention any filters or limits (e.g., "only download tweets from the last week")
2. Select an AI model for code generation:
   - **GPT-4o**: Balanced choice (recommended)
   - **o1-preview**: Highest quality but more expensive
3. Click "Generate Integration Code"
4. Review the generated code (Python or JavaScript)

### Step 4: Test and Save

1. Review the integration details
2. Save the integration for future use

## Running an Integration

1. In the Integration Manager, find your integration and click "Run"
2. Fill in any required parameters specific to this integration
3. Configure security options:
   - **Block network during analysis**: Prevents data exfiltration
   - **Securely delete raw data**: Ensures no sensitive data remains
   - **Use memory protection**: Guards against memory scraping
4. Click "Run Integration"
5. View the results when processing completes

## Security Considerations

The Integuru Wrapper uses the same security principles as Data Grabber:

1. **Zero Persistence**: No sensitive data remains after analysis completes
2. **Isolated Processing**: Integrations run in a controlled environment
3. **Network Blocking**: Network access is blocked during data analysis
4. **Complete Data Destruction**: All raw data is securely deleted

## Tips for Better Integrations

1. **Be specific in your actions**: Only perform the exact actions needed for the integration
2. **Clear your browser state**: Start with a fresh browser session
3. **Detailed descriptions**: Provide clear, specific descriptions of what you want the integration to do
4. **Review generated code**: Always review the code before running it
5. **Start simple**: Begin with simple integrations before trying complex ones

## Troubleshooting

### Common Issues:

1. **Browser capture doesn't start**: 
   - Ensure Playwright is properly installed (`npm install playwright`)
   - Check for firewall blocking the browser

2. **Code generation fails**:
   - Verify your OpenAI API key
   - Try a simpler description
   - Ensure captured network requests contain the necessary API calls

3. **Integration runs but doesn't work**:
   - Check if the service requires additional authentication
   - Verify that you captured all necessary network requests
   - Some services may have anti-scraping measures

4. **Security blocks execution**:
   - If you need network access during execution, disable the network blocking option

## Example Use Cases

### 1. Download Your Spotify Playlists

1. Capture: Log in to Spotify web player, open and scroll through your playlists
2. Description: "Download a list of all my Spotify playlists including song names, artists, and album info"
3. Generated code will use Spotify's API to extract your playlist data

### 2. Export Fitness Data

1. Capture: Log in to your fitness app's website, navigate to your activity history
2. Description: "Export my workout data including dates, types, duration, and calories burned"
3. Run the integration to export your fitness data in a structured format

### 3. Download Financial Transactions

1. Capture: Log in to your banking portal, navigate to transaction history
2. Description: "Download my transactions for the past 3 months including date, amount, category, and description"
3. Run in secure mode to ensure financial data is protected

## Advanced Features

### Custom Parameters

You can define custom parameters for your integrations:

1. In the Integration Definition step, add parameter definitions in the description
2. For example: "Download tweets with hashtag {hashtag} from {start_date} to {end_date}"
3. The UI will automatically create input fields for these parameters

### Integration Editing

You can edit existing integrations:

1. From the Integration Manager, click "Edit" on any integration
2. You can modify the description, regenerate code, or manually edit the code
3. Save your changes when done

## Feedback and Support

If you encounter issues or have suggestions for improving the Integuru Wrapper, please open an issue on the GitHub repository at:
https://github.com/cmmurray/data-grabber/issues