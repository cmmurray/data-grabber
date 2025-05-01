# Integuru UI Design Document

## Overview

This document outlines the design for a simple UI that wraps Integuru functionality, allowing users to create custom integrations for data extraction within the Data Grabber project. The UI will guide users through the process of capturing network requests, generating integration code, and running the integration securely.

## User Flow

1. **Start Integration Creation**
   - User initiates integration creation process
   - User provides basic information about the target service

2. **Capture Network Requests**
   - User follows instructions to launch a browser session
   - User performs the action they want to integrate
   - System captures network requests via HAR file

3. **Generate Integration**
   - User reviews captured requests
   - User describes the integration goal
   - System uses OpenAI to generate integration code

4. **Test & Save Integration**
   - User reviews generated code
   - User can test the integration
   - User can save the integration for future use

5. **Run Integration**
   - User can run saved integrations
   - Results are processed in secure environment
   - Original data is destroyed after analysis

## UI Components

### 1. Integration Manager Screen

**Purpose:** Main dashboard for managing integrations

**Components:**
- List of existing integrations
- Create new integration button
- Import/export integration buttons
- Integration status indicators
- Edit/delete buttons for each integration

**Layout:**
```
+----------------------------------------------+
| DATA GRABBER - INTEGRATION MANAGER           |
+----------------------------------------------+
| [+ New Integration]  [Import]  [Export]      |
+----------------------------------------------+
| NAME        | SERVICE   | STATUS    | ACTIONS |
|-------------|-----------|-----------|---------|
| Gmail Data  | Google    | Ready     | [Run][Edit][Delete] |
| FB Posts    | Facebook  | Ready     | [Run][Edit][Delete] |
| Twitter... | Twitter   | Ready     | [Run][Edit][Delete] |
+----------------------------------------------+
```

### 2. Create Integration Wizard

**Purpose:** Guide users through integration creation process

**Step 1: Basic Information**
- Integration name
- Service name
- Description
- Action type (e.g., download, analyze)

**Step 2: Network Capture**
- Instructions for using browser
- Launch browser button
- Status indicator
- Stop capture button
- Preview captured requests

**Step 3: Integration Definition**
- Text area for describing the integration goal
- Model selection (e.g., GPT-4o, o1-preview)
- Generate integration button
- Preview generated code
- Edit code option

**Step 4: Test & Save**
- Test integration button
- Save integration button
- Status messages
- Back to manager button

**Layout Example (Step 2):**
```
+----------------------------------------------+
| CREATE INTEGRATION - NETWORK CAPTURE         |
+----------------------------------------------+
| 1. Basic Info | [2. Network Capture] | 3. Define | 4. Test |
+----------------------------------------------+
| Instructions:                                |
| 1. Click "Launch Browser" below              |
| 2. Log in to the target service              |
| 3. Perform the exact action you want to      |
|    integrate (e.g., download bills)          |
| 4. Click "Stop Capture" when finished        |
|                                              |
| [Launch Browser]        [Stop Capture]       |
|                                              |
| Status: Waiting to start...                  |
|                                              |
| [< Back]                     [Next >]        |
+----------------------------------------------+
```

### 3. Integration Runner

**Purpose:** Execute saved integrations securely

**Components:**
- Integration details
- Input parameters (if any)
- Run button
- Progress indicator
- Results display
- Security settings
- Export results option

**Layout:**
```
+----------------------------------------------+
| RUN INTEGRATION - TWITTER ARCHIVE            |
+----------------------------------------------+
| Description: Download all tweets and media   |
|                                              |
| Parameters:                                  |
| - Username: [____________]                   |
| - Start Date: [__/__/____]                   |
| - End Date: [__/__/____]                     |
|                                              |
| Security Options:                            |
| [x] Block network during analysis            |
| [x] Securely delete raw data after analysis  |
| [x] Use memory protection                    |
|                                              |
| [Run Integration]                            |
|                                              |
| Progress: [                    ] 0%          |
|                                              |
| [< Back to Manager]                          |
+----------------------------------------------+
```

## Technical Components

### 1. Browser Request Capture

- Wrapper around Integuru's `create_har.py`
- Browser launching mechanism
- HAR file processing
- Cookie handling

### 2. OpenAI Integration

- API key management
- Model selection
- Graph generation from HAR data
- Code generation from graph

### 3. Integration Storage

- Integration metadata storage
- Secure code storage
- Version tracking

### 4. Secure Execution Environment

- Isolated execution
- Network controls
- Memory protection
- Data destruction

### 5. UI Framework

- Electron.js for desktop application
- React for UI components
- Secure storage for credentials

## Security Considerations

1. **User Credentials**
   - Never store service credentials
   - Use secure browser sessions

2. **Generated Code**
   - Review before execution
   - Run in sandbox environment
   - Restrict network access during analysis

3. **Data Handling**
   - Apply same security principles as core Data Grabber
   - Secure temporary storage
   - Complete data destruction

4. **API Keys**
   - Secure storage of OpenAI API keys
   - Local-only authentication

## Future Enhancements

1. **Integration Sharing**
   - Community sharing of integration templates
   - Rating system

2. **Advanced Customization**
   - Code editor for advanced users
   - Custom data processing rules

3. **Integration Monitoring**
   - Detect service API changes
   - Auto-repair broken integrations

4. **Batch Processing**
   - Run multiple integrations sequentially
   - Aggregate results