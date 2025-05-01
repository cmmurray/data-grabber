import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const IntegrationRunner = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [progress, setProgress] = useState(0);
  
  // Integration data
  const [integration, setIntegration] = useState(null);
  
  // Parameters for running the integration
  const [params, setParams] = useState({});
  
  // Security options
  const [securityOptions, setSecurityOptions] = useState({
    blockNetwork: true,
    secureDelete: true,
    memoryProtection: true
  });
  
  // Results
  const [results, setResults] = useState(null);
  
  // Load integration on component mount
  useEffect(() => {
    loadIntegration();
  }, [id]);
  
  const loadIntegration = async () => {
    try {
      setLoading(true);
      const result = await window.api.getIntegration(id);
      
      if (result.success) {
        setIntegration(result.data);
        
        // Initialize params from integration parameters
        const initialParams = {};
        result.data.parameters?.forEach(param => {
          initialParams[param.name] = param.defaultValue || '';
        });
        setParams(initialParams);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleParamChange = (e) => {
    const { name, value } = e.target;
    setParams({
      ...params,
      [name]: value
    });
  };
  
  const handleSecurityOptionChange = (e) => {
    const { name, checked } = e.target;
    setSecurityOptions({
      ...securityOptions,
      [name]: checked
    });
  };
  
  const runIntegration = async () => {
    try {
      setRunning(true);
      setProgress(0);
      setError(null);
      setSuccess(null);
      setResults(null);
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + Math.random() * 10;
          return newProgress >= 100 ? 100 : newProgress;
        });
      }, 500);
      
      // Call the API to run the integration
      const result = await window.api.runIntegration(id, params, securityOptions);
      
      // Clear progress interval
      clearInterval(progressInterval);
      setProgress(100);
      
      if (result.success) {
        setSuccess(result.message);
        setResults(result.result);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  };
  
  if (loading) {
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
  
  if (!integration) {
    return (
      <div className="alert alert-danger">
        Integration not found. It may have been deleted.
        <div style={{ marginTop: '10px' }}>
          <button 
            className="btn btn-primary" 
            onClick={() => navigate('/')}
          >
            Back to Integration List
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="card">
      <div className="card-header">
        <h2>Run Integration: {integration.name}</h2>
      </div>
      
      <div className="card-body">
        <div style={{ marginBottom: '20px' }}>
          <h3>Integration Details</h3>
          <p><strong>Service:</strong> {integration.service}</p>
          <p><strong>Description:</strong> {integration.description}</p>
        </div>
        
        {integration.parameters && integration.parameters.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h3>Parameters</h3>
            {integration.parameters.map(param => (
              <div className="form-group" key={param.name}>
                <label className="form-label" htmlFor={param.name}>
                  {param.label || param.name}
                  {param.required && <span style={{ color: 'red' }}>*</span>}
                </label>
                <input
                  type={param.type || 'text'}
                  className="form-control"
                  id={param.name}
                  name={param.name}
                  value={params[param.name] || ''}
                  onChange={handleParamChange}
                  placeholder={param.placeholder}
                  required={param.required}
                />
                {param.description && (
                  <small className="form-text text-muted">{param.description}</small>
                )}
              </div>
            ))}
          </div>
        )}
        
        <div style={{ marginBottom: '20px' }}>
          <h3>Security Options</h3>
          <div className="form-check">
            <input
              type="checkbox"
              className="form-check-input"
              id="blockNetwork"
              name="blockNetwork"
              checked={securityOptions.blockNetwork}
              onChange={handleSecurityOptionChange}
            />
            <label className="form-check-label" htmlFor="blockNetwork">
              Block network during analysis
            </label>
          </div>
          
          <div className="form-check">
            <input
              type="checkbox"
              className="form-check-input"
              id="secureDelete"
              name="secureDelete"
              checked={securityOptions.secureDelete}
              onChange={handleSecurityOptionChange}
            />
            <label className="form-check-label" htmlFor="secureDelete">
              Securely delete raw data after analysis
            </label>
          </div>
          
          <div className="form-check">
            <input
              type="checkbox"
              className="form-check-input"
              id="memoryProtection"
              name="memoryProtection"
              checked={securityOptions.memoryProtection}
              onChange={handleSecurityOptionChange}
            />
            <label className="form-check-label" htmlFor="memoryProtection">
              Use memory protection
            </label>
          </div>
        </div>
        
        {error && (
          <div className="alert alert-danger">
            {error}
          </div>
        )}
        
        {success && (
          <div className="alert alert-success">
            {success}
          </div>
        )}
        
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <button 
            className="btn btn-primary" 
            onClick={runIntegration}
            disabled={running}
            style={{ minWidth: '150px' }}
          >
            {running ? (
              <>
                <div className="spinner"></div>
                <span style={{ marginLeft: '10px' }}>Running...</span>
              </>
            ) : 'Run Integration'}
          </button>
        </div>
        
        {(running || results) && (
          <div style={{ marginBottom: '20px' }}>
            <h3>Progress</h3>
            <div className="progress">
              <div 
                className="progress-bar" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div style={{ textAlign: 'center' }}>
              {progress.toFixed(0)}% Complete
            </div>
          </div>
        )}
        
        {results && (
          <div style={{ marginTop: '20px' }}>
            <h3>Results</h3>
            <div className="card">
              <div className="card-body">
                <pre style={{ whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(results, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="card-footer">
        <button 
          className="btn btn-secondary" 
          onClick={() => navigate('/')}
        >
          Back to Integration List
        </button>
      </div>
    </div>
  );
};

export default IntegrationRunner;