import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// Integration Wizard Component
const IntegrationWizard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Integration data
  const [integration, setIntegration] = useState({
    id: id || `integration-${Date.now()}`,
    name: '',
    service: '',
    description: '',
    status: 'draft',
    created: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    code: '',
    language: 'python',
    capturedData: null,
    parameters: []
  });
  
  // Network capture state
  const [captureStatus, setCaptureStatus] = useState('idle');
  const [capturePath, setCapturePath] = useState(null);
  
  // Code generation state
  const [generatingCode, setGeneratingCode] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  
  // Load existing integration if editing
  useEffect(() => {
    if (id && id !== integration.id) {
      loadIntegration(id);
    }
  }, [id]);
  
  const loadIntegration = async (integrationId) => {
    try {
      setLoading(true);
      const result = await window.api.getIntegration(integrationId);
      
      if (result.success) {
        setIntegration(result.data);
        
        // If we already have captured data, move to step 3
        if (result.data.capturedData) {
          setCapturePath(result.data.capturedData.harPath);
          setCaptureStatus('complete');
        }
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setIntegration({
      ...integration,
      [name]: value,
      lastModified: new Date().toISOString()
    });
  };
  
  const startNetworkCapture = async () => {
    try {
      setCaptureStatus('capturing');
      setError(null);
      
      const result = await window.api.captureNetworkRequests({
        url: integration.service ? `https://${integration.service}` : null
      });
      
      if (result.success) {
        setCaptureStatus('complete');
        setCapturePath(result.data.harPath);
        
        // Update integration state
        setIntegration({
          ...integration,
          capturedData: {
            harPath: result.data.harPath,
            cookiesPath: result.data.cookiesPath,
            timestamp: result.data.timestamp
          },
          lastModified: new Date().toISOString()
        });
        
        setSuccess('Network requests captured successfully');
      } else {
        setCaptureStatus('error');
        setError(result.error);
      }
    } catch (err) {
      setCaptureStatus('error');
      setError(err.message);
    }
  };
  
  const generateCode = async () => {
    if (!capturePath) {
      setError('No captured network requests found');
      return;
    }
    
    try {
      setGeneratingCode(true);
      setError(null);
      
      const result = await window.api.generateIntegrationCode({
        harPath: capturePath,
        description: integration.description,
        model: selectedModel
      });
      
      if (result.success) {
        setIntegration({
          ...integration,
          code: result.code,
          language: result.language,
          status: 'ready',
          lastModified: new Date().toISOString()
        });
        
        setSuccess('Integration code generated successfully');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setGeneratingCode(false);
    }
  };
  
  const saveIntegration = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Validate integration
      if (!integration.name) {
        setError('Integration name is required');
        setLoading(false);
        return;
      }
      
      const result = await window.api.saveIntegration(integration);
      
      if (result.success) {
        setSuccess('Integration saved successfully');
        // Navigate back to list after short delay
        setTimeout(() => navigate('/'), 1500);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const nextStep = () => {
    if (step === 1 && (!integration.name || !integration.service)) {
      setError('Name and service are required');
      return;
    }
    
    if (step === 2 && !capturePath) {
      setError('You must capture network requests before proceeding');
      return;
    }
    
    setStep(step + 1);
    setError(null);
  };
  
  const prevStep = () => {
    setStep(step - 1);
    setError(null);
  };
  
  // Render different steps
  const renderStep = () => {
    switch (step) {
      case 1:
        return renderBasicInfo();
      case 2:
        return renderNetworkCapture();
      case 3:
        return renderIntegrationDefinition();
      case 4:
        return renderTestAndSave();
      default:
        return renderBasicInfo();
    }
  };
  
  // Step 1: Basic Information
  const renderBasicInfo = () => (
    <div className="card-body">
      <div className="form-group">
        <label className="form-label" htmlFor="name">Integration Name</label>
        <input
          type="text"
          className="form-control"
          id="name"
          name="name"
          value={integration.name}
          onChange={handleInputChange}
          placeholder="e.g., Gmail Data Export"
        />
      </div>
      
      <div className="form-group">
        <label className="form-label" htmlFor="service">Service Name</label>
        <input
          type="text"
          className="form-control"
          id="service"
          name="service"
          value={integration.service}
          onChange={handleInputChange}
          placeholder="e.g., gmail.com"
        />
      </div>
      
      <div className="form-group">
        <label className="form-label" htmlFor="description">Description</label>
        <textarea
          className="form-control"
          id="description"
          name="description"
          value={integration.description}
          onChange={handleInputChange}
          placeholder="Describe what this integration should do..."
          rows={4}
        />
      </div>
    </div>
  );
  
  // Step 2: Network Capture
  const renderNetworkCapture = () => (
    <div className="card-body">
      <div style={{ marginBottom: '20px' }}>
        <h3>Network Request Capture</h3>
        <p>Follow these steps to capture the network requests for your integration:</p>
        <ol>
          <li>Click "Launch Browser" below</li>
          <li>Log in to the service ({integration.service})</li>
          <li>Perform the exact action you want to integrate</li>
          <li>Close the browser window when finished</li>
        </ol>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
        {captureStatus === 'idle' ? (
          <button 
            className="btn btn-primary" 
            onClick={startNetworkCapture}
          >
            Launch Browser
          </button>
        ) : captureStatus === 'capturing' ? (
          <div>
            <div className="spinner"></div>
            <span style={{ marginLeft: '10px' }}>Browser session active. Close the browser when finished.</span>
          </div>
        ) : captureStatus === 'complete' ? (
          <div>
            <span style={{ color: '#2ecc71', marginRight: '10px' }}>✓</span>
            Network requests captured successfully!
            <button 
              className="btn btn-secondary" 
              onClick={startNetworkCapture}
              style={{ marginLeft: '10px' }}
            >
              Capture Again
            </button>
          </div>
        ) : (
          <div>
            <span style={{ color: '#e74c3c', marginRight: '10px' }}>✗</span>
            Error capturing network requests.
            <button 
              className="btn btn-secondary" 
              onClick={startNetworkCapture}
              style={{ marginLeft: '10px' }}
            >
              Try Again
            </button>
          </div>
        )}
      </div>
      
      {capturePath && (
        <div className="alert alert-success">
          <p>Capture saved to: {capturePath}</p>
        </div>
      )}
    </div>
  );
  
  // Step 3: Integration Definition
  const renderIntegrationDefinition = () => (
    <div className="card-body">
      <div className="form-group">
        <label className="form-label" htmlFor="goal">Integration Goal</label>
        <textarea
          className="form-control"
          id="goal"
          name="description"
          value={integration.description}
          onChange={handleInputChange}
          placeholder="Describe exactly what you want this integration to do..."
          rows={4}
        />
        <small className="form-text text-muted">
          Be specific about what data you want to extract and what actions should be performed.
        </small>
      </div>
      
      <div className="form-group">
        <label className="form-label">Select Model</label>
        <select
          className="form-control"
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
        >
          <option value="gpt-4o">GPT-4o (Recommended)</option>
          <option value="gpt-4-turbo">GPT-4 Turbo</option>
          <option value="o1-preview">o1-preview (Highest Quality)</option>
        </select>
        <small className="form-text text-muted">
          Better models provide higher quality code but may cost more.
        </small>
      </div>
      
      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
        <button 
          className="btn btn-primary"
          onClick={generateCode}
          disabled={generatingCode}
        >
          {generatingCode ? (
            <>
              <div className="spinner"></div>
              <span style={{ marginLeft: '10px' }}>Generating Code...</span>
            </>
          ) : 'Generate Integration Code'}
        </button>
      </div>
      
      {integration.code && (
        <div style={{ marginTop: '20px' }}>
          <h4>Generated Code</h4>
          <div className="code-viewer">
            {integration.code}
          </div>
        </div>
      )}
    </div>
  );
  
  // Step 4: Test and Save
  const renderTestAndSave = () => (
    <div className="card-body">
      <div style={{ marginBottom: '20px' }}>
        <h3>Test and Save Integration</h3>
        <p>Your integration is ready! You can review the details below, test it, and save it for future use.</p>
      </div>
      
      <div className="form-group">
        <label className="form-label">Integration Name</label>
        <div className="form-control">{integration.name}</div>
      </div>
      
      <div className="form-group">
        <label className="form-label">Service</label>
        <div className="form-control">{integration.service}</div>
      </div>
      
      <div className="form-group">
        <label className="form-label">Description</label>
        <div className="form-control" style={{ minHeight: '80px' }}>{integration.description}</div>
      </div>
      
      <div className="form-group">
        <label className="form-label">Code Language</label>
        <div className="form-control">{integration.language}</div>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
        <button 
          className="btn btn-success"
          onClick={saveIntegration}
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="spinner"></div>
              <span style={{ marginLeft: '10px' }}>Saving...</span>
            </>
          ) : 'Save Integration'}
        </button>
      </div>
    </div>
  );
  
  if (loading && !id) {
    return (
      <div className="card">
        <div className="card-body">
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
            <div className="spinner"></div>
            <span style={{ marginLeft: '10px' }}>Loading integration...</span>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="card">
      <div className="card-header">
        <h2>{id ? 'Edit Integration' : 'Create New Integration'}</h2>
      </div>
      
      <div className="wizard-steps">
        <div className={`wizard-step ${step === 1 ? 'active' : ''}`} onClick={() => setStep(1)}>
          1. Basic Info
        </div>
        <div className={`wizard-step ${step === 2 ? 'active' : ''}`} onClick={() => step > 1 && setStep(2)}>
          2. Network Capture
        </div>
        <div className={`wizard-step ${step === 3 ? 'active' : ''}`} onClick={() => step > 2 && setStep(3)}>
          3. Define Integration
        </div>
        <div className={`wizard-step ${step === 4 ? 'active' : ''}`} onClick={() => step > 3 && setStep(4)}>
          4. Test & Save
        </div>
      </div>
      
      {error && (
        <div className="alert alert-danger" style={{ margin: '10px' }}>
          {error}
        </div>
      )}
      
      {success && (
        <div className="alert alert-success" style={{ margin: '10px' }}>
          {success}
        </div>
      )}
      
      {renderStep()}
      
      <div className="card-footer">
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => step === 1 ? navigate('/') : prevStep()}
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          
          <button 
            className="btn btn-primary" 
            onClick={step === 4 ? saveIntegration : nextStep}
            disabled={loading}
          >
            {step === 4 ? 'Save' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default IntegrationWizard;