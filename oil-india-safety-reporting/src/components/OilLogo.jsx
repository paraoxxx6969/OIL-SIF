import React from 'react';

export default function OilLogo({ size = 42, showText = false, lightMode = false, className = '' }) {
  const height = size;
  const width = Math.round(size * 0.85);

  return (
    <div
      className={`oil-official-logo-wrap ${className}`}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1
      }}
    >
      <svg
        width={width}
        height={height}
        viewBox="0 0 100 105"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Top Black Oval "O" with center cutout */}
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M 50 5 C 26 5 8 20 8 38 C 8 56 26 71 50 71 C 74 71 92 56 92 38 C 92 20 74 5 50 5 Z M 50 23 C 60 23 68 30 68 38 C 68 46 60 53 50 53 C 40 53 32 46 32 38 C 32 30 40 23 50 23 Z"
          fill={lightMode ? '#FFFFFF' : '#1E1E1E'}
        />
        {/* Red Vertical Pillar "I" */}
        <rect x="40" y="70" width="20" height="32" fill="#E52321" rx="1" />
      </svg>

      {showText && (
        <div style={{ textAlign: 'center', marginTop: '6px' }}>
          <div
            style={{
              fontSize: `${Math.max(0.65, size * 0.016)}rem`,
              fontWeight: 700,
              color: lightMode ? '#FFFFFF' : '#1E1E1E',
              fontFamily: 'sans-serif',
              marginBottom: '2px',
              letterSpacing: '0.2px'
            }}
          >
            ऑयल इंडिया
          </div>
          <div
            style={{
              fontSize: `${Math.max(0.75, size * 0.018)}rem`,
              fontWeight: 900,
              color: lightMode ? '#FFFFFF' : '#1E1E1E',
              fontFamily: "'Outfit', 'Impact', sans-serif",
              letterSpacing: '0.8px',
              borderTop: `1px solid ${lightMode ? 'rgba(255,255,255,0.4)' : '#1E1E1E'}`,
              paddingTop: '2px'
            }}
          >
            OIL INDIA
          </div>
        </div>
      )}
    </div>
  );
}

