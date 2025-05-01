# Data Grabber

A collection of scripts and utilities for pulling user data from various services with a focus on **secure data handling and complete data destruction** after analysis.

## Features

- **Secure Data Handling**: Process sensitive data with isolation and protection
- **Complete Data Destruction**: Ensure no traces of sensitive data remain after analysis
- **Network Blocking**: Prevent any data exfiltration during analysis
- **Memory Protection**: Guard against memory scraping and leaks
- **Cross-Platform**: Works on macOS, Linux, and Windows

## Secure Architecture 

Data Grabber is designed from the ground up with security as the primary concern:

1. **Zero Persistence**: No sensitive data remains on disk after analysis completes
2. **Isolated Processing**: Data analysis happens in a controlled environment
3. **Defense in Depth**: Multiple layers of security prevent data leakage
4. **Verifiable Destruction**: You can verify that data has been completely destroyed
5. **Local Processing Only**: Data never leaves your machine

## Supported Services

- **Twitter/X**: Download and analyze your Twitter profile, tweets, followers, and more
- **Gmail Data** (from Google Takeout): Analyze your email data with complete privacy
- More services coming soon!

## Usage Examples

### Twitter Analysis

```bash
# Install dependencies
npm install

# Add your Twitter API credentials to .env
# See .env.example for required credentials

# Run Twitter analysis on your account
node examples/twitter-analysis.js your_username

# Results are saved to data/twitter-analysis/your_username/twitter-analysis-results.json
# All raw Twitter data is securely destroyed after analysis
```

### Gmail Analysis

```bash
# Install dependencies
npm install

# Run Gmail analysis on your downloaded Takeout data
node examples/gmail-analysis.js /path/to/gmail/export

# Results are saved to data/gmail-analysis/gmail-analysis-results.json
# All raw email data is securely destroyed after analysis
```

## Installation

```bash
# Clone the repository
git clone https://github.com/cmmurray/data-grabber.git
cd data-grabber

# Install dependencies
npm install

# Create a .env file from the example
cp .env.example .env
```

## Security Details

Data Grabber implements multiple layers of security:

- **Secure Storage**: All data is stored in encrypted containers during processing
- **Platform-Specific Secure Deletion**: Properly handles secure deletion differences between SSDs and HDDs
- **Network Blocking**: Prevents any network access during data analysis
- **Process Isolation**: Restricts what the analysis process can access
- **Memory Protection**: Zeros memory after use and prevents memory dumps

For a detailed explanation of the security architecture, see [SECURITY_ARCHITECTURE.md](docs/SECURITY_ARCHITECTURE.md).

## Service-Specific Documentation

- [Twitter Integration Guide](docs/TWITTER_INTEGRATION.md)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.