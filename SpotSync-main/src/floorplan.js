import React from 'react';
import ReactDOM from 'react-dom/client';
import Floorplan from './components/Floorplan';

// Initialize the floorplan when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  const floorplanContainer = document.getElementById('floorplan-container');
  if (floorplanContainer) {
    // Detect user type based on the current page
    const isAdminPage = window.location.pathname.includes('admin-floorplan') || 
                       window.location.pathname.includes('admin-dashboard');
    const userType = isAdminPage ? 'admin' : 'user';
    
    // Get current floor from URL parameter or default to 2
    const urlParams = new URLSearchParams(window.location.search);
    const currentFloor = parseInt(urlParams.get('floor')) || 2;
    
    const root = ReactDOM.createRoot(floorplanContainer);
    root.render(
      <Floorplan userType={userType} currentFloor={currentFloor} />
    );
  }
}); 