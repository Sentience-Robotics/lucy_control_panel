import React from 'react';

interface DataFlowEffectProps {
  isActive: boolean;
  direction?: 'horizontal' | 'vertical';
  speed?: number;
  color?: string;
}

export const DataFlowEffect: React.FC<DataFlowEffectProps> = ({
  isActive,
  direction = 'horizontal',
  speed = 2,
  color = '#00ff41'
}) => {
  if (!isActive) return null;

  const isHorizontal = direction === 'horizontal';
  const animationName = isHorizontal ? 'dataFlowHorizontal' : 'dataFlowVertical';

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 1
      }}
    >
      {/* Data particles */}
      {[...Array(3)].map((_, index) => (
        <div
          key={index}
          style={{
            position: 'absolute',
            width: isHorizontal ? '20px' : '2px',
            height: isHorizontal ? '2px' : '20px',
            background: `linear-gradient(${isHorizontal ? '90deg' : '0deg'}, transparent, ${color}, transparent)`,
            animation: `${animationName} ${speed}s infinite linear`,
            animationDelay: `${index * 0.5}s`,
            top: isHorizontal ? '50%' : `${10 + index * 30}%`,
            left: isHorizontal ? `${10 + index * 30}%` : '50%',
            transform: 'translate(-50%, -50%)',
            boxShadow: `0 0 8px ${color}`,
            opacity: 0.8
          }}
        />
      ))}

      <style>{`
        @keyframes dataFlowHorizontal {
          0% {
            transform: translate(-100%, -50%);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translate(calc(100vw + 100%), -50%);
            opacity: 0;
          }
        }

        @keyframes dataFlowVertical {
          0% {
            transform: translate(-50%, -100%);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translate(-50%, calc(100vh + 100%));
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};