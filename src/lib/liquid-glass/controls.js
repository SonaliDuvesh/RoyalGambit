// Glass Controls System based on dashersw/liquid-glass-js
// Exact parameters specified in prompt requirements

export const glassControls = {
  edgeIntensity: 0.000,
  rimIntensity: 0.000,
  baseIntensity: 0.000,
  edgeDistance: 0.500,
  rimDistance: 0.100,
  baseDistance: 0.300,
  cornerBoost: 0.000,
  rippleEffect: 0.000,
  blurRadius: 1.000,
  tintOpacity: 0.000,
  warp: false,
  hideButtons: false
};

if (typeof window !== 'undefined') {
  window.glassControls = glassControls;
}

// Update all active glass instances with new parameters
export function updateAllGlassInstances(ContainerClass) {
  if (!ContainerClass || !ContainerClass.instances) return;
  ContainerClass.instances.forEach(instance => {
    if (instance.gl_refs && instance.gl_refs.gl) {
      const gl = instance.gl_refs.gl;
      if (!instance.program) return;
      gl.useProgram(instance.program);

      if (instance.gl_refs.blurRadiusLoc) {
        gl.uniform1f(instance.gl_refs.blurRadiusLoc, glassControls.blurRadius);
      }
      if (instance.gl_refs.edgeIntensityLoc) {
        gl.uniform1f(instance.gl_refs.edgeIntensityLoc, glassControls.edgeIntensity);
      }
      if (instance.gl_refs.rimIntensityLoc) {
        gl.uniform1f(instance.gl_refs.rimIntensityLoc, glassControls.rimIntensity);
      }
      if (instance.gl_refs.baseIntensityLoc) {
        gl.uniform1f(instance.gl_refs.baseIntensityLoc, glassControls.baseIntensity);
      }
      if (instance.gl_refs.edgeDistanceLoc) {
        gl.uniform1f(instance.gl_refs.edgeDistanceLoc, glassControls.edgeDistance);
      }
      if (instance.gl_refs.rimDistanceLoc) {
        gl.uniform1f(instance.gl_refs.rimDistanceLoc, glassControls.rimDistance);
      }
      if (instance.gl_refs.baseDistanceLoc) {
        gl.uniform1f(instance.gl_refs.baseDistanceLoc, glassControls.baseDistance);
      }
      if (instance.gl_refs.cornerBoostLoc) {
        gl.uniform1f(instance.gl_refs.cornerBoostLoc, glassControls.cornerBoost);
      }
      if (instance.gl_refs.rippleEffectLoc) {
        gl.uniform1f(instance.gl_refs.rippleEffectLoc, glassControls.rippleEffect);
      }
      if (instance.gl_refs.warpLoc) {
        gl.uniform1f(instance.gl_refs.warpLoc, glassControls.warp ? 1.0 : 0.0);
      }
      if (instance.gl_refs.tintOpacityLoc) {
        gl.uniform1f(instance.gl_refs.tintOpacityLoc, instance.tintOpacity !== undefined ? instance.tintOpacity : glassControls.tintOpacity);
      }

      if (instance.render) {
        instance.render();
      }
    }
  });
}

