import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';

// Component imports
import IntegrationList from './components/IntegrationList';
import IntegrationWizard from './components/IntegrationWizard';
import IntegrationRunner from './components/IntegrationRunner';

// Main App component
const App = () => {
  return (
    <Router>
      <div className="container">
        <Header />
        <Routes>
          <Route path="/" element={<IntegrationList />} />
          <Route path="/create" element={<IntegrationWizard />} />
          <Route path="/edit/:id" element={<IntegrationWizard />} />
          <Route path="/run/:id" element={<IntegrationRunner />} />
        </Routes>
      </div>
    </Router>
  );
};

// Header component
const Header = () => {
  const navigate = useNavigate();
  
  return (
    <div className="header">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Data Grabber - Integration Manager</h1>
        <div>
          <button 
            className="btn btn-primary" 
            onClick={() => navigate('/')}
            style={{ marginRight: '10px' }}
          >
            All Integrations
          </button>
          <button 
            className="btn btn-success" 
            onClick={() => navigate('/create')}
          >
            + New Integration
          </button>
        </div>
      </div>
    </div>
  );
};

// Initialize the app
const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);