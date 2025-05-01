import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const IntegrationList = () => {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Fetch integrations on component mount
  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const result = await window.api.listIntegrations();
      
      if (result.success) {
        setIntegrations(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this integration?')) {
      try {
        const result = await window.api.deleteIntegration(id);
        
        if (result.success) {
          // Remove from state
          setIntegrations(integrations.filter(integration => integration.id !== id));
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-body">
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
            <div className="spinner"></div>
            <span style={{ marginLeft: '10px' }}>Loading integrations...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        Error loading integrations: {error}
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <div className="card-body">
          {integrations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <p>No integrations found. Create your first integration to get started!</p>
              <button 
                className="btn btn-primary" 
                onClick={() => navigate('/create')}
                style={{ marginTop: '10px' }}
              >
                Create Integration
              </button>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Service</th>
                  <th>Description</th>
                  <th>Created</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {integrations.map(integration => (
                  <tr key={integration.id}>
                    <td>{integration.name}</td>
                    <td>{integration.service}</td>
                    <td>{integration.description}</td>
                    <td>{formatDate(integration.created)}</td>
                    <td>
                      <span 
                        className={`badge ${integration.status === 'ready' ? 'bg-success' : 'bg-warning'}`}
                        style={{ 
                          padding: '5px 10px', 
                          borderRadius: '4px', 
                          backgroundColor: integration.status === 'ready' ? '#2ecc71' : '#f39c12',
                          color: 'white'
                        }}
                      >
                        {integration.status === 'ready' ? 'Ready' : 'Draft'}
                      </span>
                    </td>
                    <td>
                      <div className="btn-group">
                        <button 
                          className="btn btn-primary" 
                          onClick={() => navigate(`/run/${integration.id}`)}
                          disabled={integration.status !== 'ready'}
                        >
                          Run
                        </button>
                        <button 
                          className="btn btn-warning" 
                          onClick={() => navigate(`/edit/${integration.id}`)}
                        >
                          Edit
                        </button>
                        <button 
                          className="btn btn-danger" 
                          onClick={() => handleDelete(integration.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default IntegrationList;