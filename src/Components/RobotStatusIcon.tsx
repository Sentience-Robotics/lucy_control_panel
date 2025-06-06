import React from 'react';

interface RobotStatusIconProps {
  isConnected: boolean;
  isMoving?: boolean;
  hasError?: boolean;
  size?: number;
}

export const RobotStatusIcon: React.FC<RobotStatusIconProps> = ({
  isConnected,
  isMoving = false,
  hasError = false,
  size = 24
}) => {
  const getStatusClass = () => {
    if (hasError) return 'robot-status-error';
    if (isMoving) return 'robot-status-moving';
    if (isConnected) return 'robot-status-connected';
    return 'robot-status-disconnected';
  };

  const getColor = () => {
    if (hasError) return '#ff4d4f';
    if (isConnected) return '#00ff41';
    return '#666';
  };

  const robotIcon = `
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="4" width="12" height="8" stroke="${getColor()}" stroke-width="1.5" fill="none"/>
      <circle cx="9" cy="7" r="1" fill="${getColor()}"/>
      <circle cx="15" cy="7" r="1" fill="${getColor()}"/>
      <rect x="10" y="9" width="4" height="1" fill="${getColor()}"/>
      <rect x="4" y="6" width="2" height="4" stroke="${getColor()}" stroke-width="1.5" fill="none"/>
      <rect x="18" y="6" width="2" height="4" stroke="${getColor()}" stroke-width="1.5" fill="none"/>
      <rect x="8" y="12" width="2" height="6" stroke="${getColor()}" stroke-width="1.5" fill="none"/>
      <rect x="14" y="12" width="2" height="6" stroke="${getColor()}" stroke-width="1.5" fill="none"/>
      <rect x="7" y="18" width="3" height="2" stroke="${getColor()}" stroke-width="1.5" fill="none"/>
      <rect x="14" y="18" width="3" height="2" stroke="${getColor()}" stroke-width="1.5" fill="none"/>
      ${isMoving ? `<circle cx="12" cy="8" r="0.5" fill="${getColor()}" opacity="0.8"/>` : ''}
    </svg>
  `;

  return (
    <div
      className={getStatusClass()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        color: getColor()
      }}
      dangerouslySetInnerHTML={{ __html: robotIcon }}
    />
  );
};