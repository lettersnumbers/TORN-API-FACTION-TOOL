import React from 'react';
import './HolographicLoader.css';

const MATRIX_CHARS = '01アイウエオカキクケコ10';

const HolographicLoader = ({ message = 'ESTABLISHING SECURE LINK' }) => {
  return (
    <div className="holo-loader">
      <div className="holo-matrix" aria-hidden="true">
        {MATRIX_CHARS.repeat(3)}
      </div>
      <div className="holo-label">{message}...</div>
      <div className="holo-bar-outer">
        <div className="holo-bar-inner" />
      </div>
    </div>
  );
};

export default HolographicLoader;
