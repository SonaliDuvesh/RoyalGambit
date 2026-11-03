import React, { createContext, useContext, useEffect, useRef } from 'react';
import { Container } from './container.js';
import { Button } from './button.js';
import './glass.css';

export const GlassContext = createContext(null);

/**
 * LiquidGlassContainer component
 * Integrates dashersw/liquid-glass-js WebGL glass rendering into React
 */
export function LiquidGlassContainer({
  children,
  className = '',
  style = {},
  type = 'rounded', // 'rounded' | 'circle' | 'pill'
  borderRadius = 16,
  tintOpacity = 0.0,
  warp = false,
  as: Component = 'div',
  containerRef,
  ...props
}) {
  const localRef = useRef(null);
  const domRef = containerRef || localRef;
  const instanceRef = useRef(null);
  const parentContainer = useContext(GlassContext);

  useEffect(() => {
    const el = domRef.current;
    if (!el) return;

    let instance = null;
    try {
      instance = new Container({
        element: el,
        type,
        borderRadius,
        tintOpacity,
        warp
      });
      instanceRef.current = instance;

      if (parentContainer && parentContainer.addChild) {
        parentContainer.addChild(instance);
      }
    } catch (err) {
      console.warn('Could not initialize LiquidGlassContainer:', err);
    }

    return () => {
      if (instance) {
        if (parentContainer && parentContainer.removeChild) {
          parentContainer.removeChild(instance);
        }
        instance.destroy();
      }
      instanceRef.current = null;
    };
  }, [type, borderRadius, tintOpacity, warp]);

  return (
    <GlassContext.Provider value={instanceRef.current}>
      <Component
        ref={domRef}
        className={`glass-container ${className}`}
        style={{
          borderRadius: `${borderRadius}px`,
          position: 'relative',
          ...style
        }}
        {...props}
      >
        {children}
      </Component>
    </GlassContext.Provider>
  );
}

/**
 * LiquidGlassButton component
 * Integrates nested or standalone WebGL glass button
 */
export function LiquidGlassButton({
  children,
  className = '',
  style = {},
  type = 'rounded',
  borderRadius = 12,
  tintOpacity = 0.0,
  warp = false,
  onClick,
  disabled = false,
  ...props
}) {
  const btnRef = useRef(null);
  const instanceRef = useRef(null);
  const parentContainer = useContext(GlassContext);

  useEffect(() => {
    const el = btnRef.current;
    if (!el) return;

    let instance = null;
    try {
      instance = new Button({
        element: el,
        type,
        borderRadius,
        tintOpacity,
        warp,
        parent: parentContainer
      });
      instanceRef.current = instance;

      if (parentContainer && parentContainer.addChild) {
        parentContainer.addChild(instance);
      }
    } catch (err) {
      console.warn('Could not initialize LiquidGlassButton:', err);
    }

    return () => {
      if (instance) {
        if (parentContainer && parentContainer.removeChild) {
          parentContainer.removeChild(instance);
        }
        instance.destroy();
      }
      instanceRef.current = null;
    };
  }, [parentContainer, type, borderRadius, tintOpacity, warp]);

  return (
    <button
      ref={btnRef}
      className={`glass-button ${className}`}
      style={{
        borderRadius: `${borderRadius}px`,
        ...style
      }}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      <span className="glass-button-text" style={{ pointerEvents: 'auto' }}>
        {children}
      </span>
    </button>
  );
}

export { Container, Button };

