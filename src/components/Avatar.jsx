import React, { useState } from 'react';

const Avatar = ({ playerId, name, size = 32 }) => {
  const [imgError, setImgError] = useState(false);
  const color = (() => {
    let h = 0;
    for (let i = 0; i < (name || '').length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return `hsl(${Math.abs(h) % 360}, 60%, 45%)`;
  })();
  const initials = (name || '?').slice(0, 2).toUpperCase();

  const baseStyle = {
    width: size, height: size, borderRadius: '50%',
    border: '1px solid rgba(0,240,255,0.25)', flexShrink: 0,
  };

  if (imgError || !playerId) {
    return (
      <div style={{
        ...baseStyle, background: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.35, fontFamily: 'var(--font-heading)',
        fontWeight: 700, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.5)',
      }}>
        {initials}
      </div>
    );
  }

  return (
    <img
      src={`https://avatars.torn.com/avatars/${playerId}_small.jpg`}
      alt={name}
      onError={() => setImgError(true)}
      style={{ ...baseStyle, objectFit: 'cover' }}
      loading="lazy"
    />
  );
};

export default Avatar;
