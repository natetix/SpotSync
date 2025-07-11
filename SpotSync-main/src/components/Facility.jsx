import React from 'react';

const Facility = ({ facility, onClick, statusColor, userType }) => {
  const getIcon = (type) => {
    switch (type.toLowerCase()) {
      case 'pool table':
        return '🎱';
      case 'cubicle':
        return '📚';
      case 'study room':
        return '🏢';
      case 'discussion room':
        return '👥';
      default:
        return '📍';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'available':
        return 'Available';
      case 'in-use':
        return 'In Use';
      case 'reserved':
        return 'Reserved';
      default:
        return 'Unknown';
    }
  };

  const canInteract = () => {
    if (userType === 'admin') return true;
    return facility.status === 'available';
  };

  return (
    <div
      className={`facility ${facility.status} ${canInteract() ? 'interactive' : 'non-interactive'}`}
      style={{
        left: `${facility.position.x}px`,
        top: `${facility.position.y}px`,
        borderColor: statusColor
      }}
      onClick={canInteract() ? onClick : undefined}
      title={`${facility.name} - ${getStatusText(facility.status)}${facility.requires_payment ? ' (RM5/hr)' : ''}`}
    >
      <div className="facility-icon">
        {getIcon(facility.type)}
      </div>
      <div className="facility-info">
        <div className="facility-name">{facility.name}</div>
        <div className="facility-status">{getStatusText(facility.status)}</div>
        {facility.status === 'available' && facility.requires_payment && (
          <div className="facility-price">RM5/hr</div>
        )}
        {userType === 'admin' && (
          <div className="facility-floor">F{facility.floor}</div>
        )}
      </div>
      <div 
        className="facility-status-indicator"
        style={{ backgroundColor: statusColor }}
      ></div>
    </div>
  );
};

export default Facility; 