// Button Class adapted from dashersw/liquid-glass-js for React ES Modules
import { Container } from './container.js';
import { glassControls } from './controls.js';

export class Button extends Container {
  constructor(options = {}) {
    const text = options.text || '';
    const fontSize = parseInt(options.size) || 16;
    const onClick = options.onClick || null;
    const type = options.type || 'rounded'; // "rounded", "circle", or "pill"
    const warp = options.warp !== undefined ? options.warp : false;
    const tintOpacity = options.tintOpacity !== undefined ? options.tintOpacity : 0.0;

    super({
      borderRadius: options.borderRadius || fontSize,
      type: type,
      tintOpacity: tintOpacity,
      warp: warp,
      element: options.element
    });

    this.text = text;
    this.fontSize = fontSize;
    this.onClick = onClick;
    this.type = type;
    this.warp = warp;
    this.parent = options.parent || null;
    this.isNestedGlass = false;

    if (this.element) {
      this.element.classList.add('glass-button');
      if (this.type === 'circle') {
        this.element.classList.add('glass-button-circle');
      }
      if (this.text && !this.element.querySelector('.glass-button-text')) {
        this.createTextElement();
      }
      this.setupClickHandler();
    }
  }

  setupAsNestedGlass() {
    if (this.parent && !this.isNestedGlass) {
      this.isNestedGlass = true;
      if (this.webglInitialized) {
        this.initWebGL();
      }
    }
  }

  initWebGL() {
    if (!this.gl) return;

    if (this.parent && this.isNestedGlass) {
      this.initNestedGlass();
    } else {
      super.initWebGL();
    }
  }

  initNestedGlass() {
    if (!this.parent || !this.parent.webglInitialized) {
      setTimeout(() => this.initNestedGlass(), 80);
      return;
    }
    this.setupDynamicNestedShader();
    this.webglInitialized = true;
  }

  setupDynamicNestedShader() {
    const gl = this.gl;
    if (!gl || !this.parent || !this.parent.canvas) return;

    const vsSource = `
      attribute vec2 a_position;
      attribute vec2 a_texcoord;
      varying vec2 v_texcoord;

      void main() {
        gl_Position = vec4(a_position, 0, 1);
        v_texcoord = a_texcoord;
      }
    `;

    const fsSource = `
      precision mediump float;
      uniform sampler2D u_image;
      uniform vec2 u_resolution;
      uniform vec2 u_textureSize;
      uniform float u_blurRadius;
      uniform float u_borderRadius;
      uniform vec2 u_buttonPosition;
      uniform vec2 u_containerPosition;
      uniform vec2 u_containerSize;
      uniform float u_warp;
      uniform float u_edgeIntensity;
      uniform float u_rimIntensity;
      uniform float u_baseIntensity;
      uniform float u_edgeDistance;
      uniform float u_rimDistance;
      uniform float u_baseDistance;
      uniform float u_cornerBoost;
      uniform float u_rippleEffect;
      uniform float u_tintOpacity;
      varying vec2 v_texcoord;

      float roundedRectDistance(vec2 coord, vec2 size, float radius) {
        vec2 center = size * 0.5;
        vec2 pixelCoord = coord * size;
        vec2 toCorner = abs(pixelCoord - center) - (center - radius);
        float outsideCorner = length(max(toCorner, 0.0));
        float insideCorner = min(max(toCorner.x, toCorner.y), 0.0);
        return (outsideCorner + insideCorner - radius);
      }
      
      float circleDistance(vec2 coord, vec2 size, float radius) {
        vec2 center = vec2(0.5, 0.5);
        vec2 pixelCoord = coord * size;
        vec2 centerPixel = center * size;
        float distFromCenter = length(pixelCoord - centerPixel);
        return distFromCenter - radius;
      }
      
      bool isPill(vec2 size, float radius) {
        float heightRatioDiff = abs(radius - size.y * 0.5);
        bool radiusMatchesHeight = heightRatioDiff < 2.0;
        bool isWiderThanTall = size.x > size.y + 4.0;
        return radiusMatchesHeight && isWiderThanTall;
      }
      
      bool isCircle(vec2 size, float radius) {
        float minDim = min(size.x, size.y);
        bool radiusMatchesMinDim = abs(radius - minDim * 0.5) < 1.0;
        bool isRoughlySquare = abs(size.x - size.y) < 4.0;
        return radiusMatchesMinDim && isRoughlySquare;
      }
      
      float pillDistance(vec2 coord, vec2 size, float radius) {
        vec2 center = size * 0.5;
        vec2 pixelCoord = coord * size;
        vec2 capsuleStart = vec2(radius, center.y);
        vec2 capsuleEnd = vec2(size.x - radius, center.y);
        vec2 capsuleAxis = capsuleEnd - capsuleStart;
        float capsuleLength = length(capsuleAxis);
        
        if (capsuleLength > 0.0) {
          vec2 toPoint = pixelCoord - capsuleStart;
          float t = clamp(dot(toPoint, capsuleAxis) / dot(capsuleAxis, capsuleAxis), 0.0, 1.0);
          vec2 closestPointOnAxis = capsuleStart + t * capsuleAxis;
          return length(pixelCoord - closestPointOnAxis) - radius;
        } else {
          return length(pixelCoord - center) - radius;
        }
      }

      void main() {
        vec2 coord = v_texcoord;
        vec2 buttonSize = u_resolution;
        vec2 containerSize = u_containerSize;
        
        vec2 containerTopLeft = u_containerPosition - containerSize * 0.5;
        vec2 buttonTopLeft = u_buttonPosition - buttonSize * 0.5;
        vec2 buttonRelativePos = buttonTopLeft - containerTopLeft;
        vec2 buttonPixel = coord * buttonSize;
        vec2 containerPixel = buttonRelativePos + buttonPixel;
        vec2 baseTextureCoord = containerPixel / max(containerSize, vec2(1.0));
        
        float distFromEdgeShape;
        vec2 shapeNormal;
        
        if (isPill(u_resolution, u_borderRadius)) {
          distFromEdgeShape = -pillDistance(coord, u_resolution, u_borderRadius);
          vec2 center = vec2(0.5, 0.5);
          vec2 pixelCoord = coord * u_resolution;
          vec2 capsuleStart = vec2(u_borderRadius, center.y * u_resolution.y);
          vec2 capsuleEnd = vec2(u_resolution.x - u_borderRadius, center.y * u_resolution.y);
          vec2 capsuleAxis = capsuleEnd - capsuleStart;
          float capsuleLength = length(capsuleAxis);
          
          if (capsuleLength > 0.0) {
            vec2 toPoint = pixelCoord - capsuleStart;
            float t = clamp(dot(toPoint, capsuleAxis) / dot(capsuleAxis, capsuleAxis), 0.0, 1.0);
            vec2 closestPointOnAxis = capsuleStart + t * capsuleAxis;
            vec2 normalDir = pixelCoord - closestPointOnAxis;
            shapeNormal = length(normalDir) > 0.0 ? normalize(normalDir) : vec2(0.0, 1.0);
          } else {
            shapeNormal = normalize(coord - center);
          }
        } else if (isCircle(u_resolution, u_borderRadius)) {
          distFromEdgeShape = -circleDistance(coord, u_resolution, u_borderRadius);
          vec2 center = vec2(0.5, 0.5);
          shapeNormal = normalize(coord - center);
        } else {
          distFromEdgeShape = -roundedRectDistance(coord, u_resolution, u_borderRadius);
          vec2 center = vec2(0.5, 0.5);
          shapeNormal = normalize(coord - center);
        }
        distFromEdgeShape = max(distFromEdgeShape, 0.0);
        
        float distFromLeft = coord.x;
        float distFromRight = 1.0 - coord.x;
        float distFromTop = coord.y;
        float distFromBottom = 1.0 - coord.y;
        float distFromEdge = distFromEdgeShape / max(min(u_resolution.x, u_resolution.y), 1.0);
        
        float normalizedDistance = distFromEdge * min(u_resolution.x, u_resolution.y);
        float baseIntensity = 1.0 - exp(-normalizedDistance * u_baseDistance);
        float edgeIntensity = exp(-normalizedDistance * u_edgeDistance);
        float rimIntensity = exp(-normalizedDistance * u_rimDistance);
        
        float baseComponent = u_warp > 0.5 ? baseIntensity * u_baseIntensity : 0.0;
        float totalIntensity = baseComponent + edgeIntensity * u_edgeIntensity + rimIntensity * u_rimIntensity;
        
        vec2 baseRefraction = shapeNormal * totalIntensity;
        
        float cornerProximityX = min(distFromLeft, distFromRight);
        float cornerProximityY = min(distFromTop, distFromBottom);
        float cornerDistance = max(cornerProximityX, cornerProximityY);
        float cornerNormalized = cornerDistance * min(u_resolution.x, u_resolution.y);
        
        float cornerBoost = exp(-cornerNormalized * 0.3) * u_cornerBoost;
        vec2 cornerRefraction = shapeNormal * cornerBoost;
        
        vec2 perpendicular = vec2(-shapeNormal.y, shapeNormal.x);
        float rippleEffect = sin(distFromEdge * 30.0) * u_rippleEffect * rimIntensity;
        vec2 textureRefraction = perpendicular * rippleEffect;
        
        vec2 totalRefraction = baseRefraction + cornerRefraction + textureRefraction;
        vec2 textureCoord = baseTextureCoord + totalRefraction;
        
        vec4 color = vec4(0.0);
        vec2 texelSize = 1.0 / max(containerSize, vec2(1.0));
        float sigma = max(u_blurRadius / 3.0, 0.001);
        vec2 blurStep = texelSize * sigma;
        
        float totalWeight = 0.0;
        for(float i = -4.0; i <= 4.0; i += 1.0) {
          for(float j = -4.0; j <= 4.0; j += 1.0) {
            float distance = length(vec2(i, j));
            if(distance > 4.0) continue;
            
            float weight = exp(-(distance * distance) / (2.0 * sigma * sigma));
            vec2 offset = vec2(i, j) * blurStep;
            color += texture2D(u_image, textureCoord + offset) * weight;
            totalWeight += weight;
          }
        }
        
        color /= max(totalWeight, 0.0001);
        
        float gradientPosition = coord.y;
        vec3 topTint = vec3(1.0, 1.0, 1.0);
        vec3 bottomTint = vec3(0.7, 0.7, 0.7);
        vec3 gradientTint = mix(topTint, bottomTint, gradientPosition);
        vec3 tintedColor = mix(color.rgb, gradientTint, u_tintOpacity * 0.7);
        color = vec4(tintedColor, color.a);
        
        vec2 viewportCenter = u_buttonPosition;
        float topY = max(0.0, (viewportCenter.y - buttonSize.y * 0.4) / max(containerSize.y, 1.0));
        float midY = viewportCenter.y / max(containerSize.y, 1.0);
        float bottomY = min(1.0, (viewportCenter.y + buttonSize.y * 0.4) / max(containerSize.y, 1.0));
        
        vec3 topColor = texture2D(u_image, vec2(0.5, topY)).rgb;
        vec3 midColor = texture2D(u_image, vec2(0.5, midY)).rgb;
        vec3 bottomColor = texture2D(u_image, vec2(0.5, bottomY)).rgb;
        
        vec3 sampledGradient;
        if (gradientPosition < 0.1) {
          sampledGradient = topColor;
        } else if (gradientPosition > 0.9) {
          sampledGradient = bottomColor;
        } else {
          float transitionPos = (gradientPosition - 0.1) / 0.8;
          if (transitionPos < 0.5) {
            float t = transitionPos * 2.0;
            sampledGradient = mix(topColor, midColor, t);
          } else {
            float t = (transitionPos - 0.5) * 2.0;
            sampledGradient = mix(midColor, bottomColor, t);
          }
        }
        
        vec3 secondTinted = mix(color.rgb, sampledGradient, u_tintOpacity * 0.4);
        vec3 buttonTopTint = vec3(1.08, 1.08, 1.08);    
        vec3 buttonBottomTint = vec3(0.92, 0.92, 0.92); 
        vec3 buttonGradient = mix(buttonTopTint, buttonBottomTint, gradientPosition);
        vec3 finalTinted = secondTinted * buttonGradient;
        
        float maskDistance;
        if (isPill(u_resolution, u_borderRadius)) {
          maskDistance = pillDistance(coord, u_resolution, u_borderRadius);
        } else if (isCircle(u_resolution, u_borderRadius)) {
          maskDistance = circleDistance(coord, u_resolution, u_borderRadius);
        } else {
          maskDistance = roundedRectDistance(coord, u_resolution, u_borderRadius);
        }
        float mask = 1.0 - smoothstep(-1.0, 1.0, maskDistance);
        
        gl_FragColor = vec4(finalTinted, mask);
      }
    `;

    const program = this.createProgram(gl, vsSource, fsSource);
    if (!program) return;
    this.program = program;

    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

    const texcoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0]), gl.STATIC_DRAW);

    const positionLoc = gl.getAttribLocation(program, 'a_position');
    const texcoordLoc = gl.getAttribLocation(program, 'a_texcoord');
    const resolutionLoc = gl.getUniformLocation(program, 'u_resolution');
    const textureSizeLoc = gl.getUniformLocation(program, 'u_textureSize');
    const blurRadiusLoc = gl.getUniformLocation(program, 'u_blurRadius');
    const borderRadiusLoc = gl.getUniformLocation(program, 'u_borderRadius');
    const buttonPositionLoc = gl.getUniformLocation(program, 'u_buttonPosition');
    const containerPositionLoc = gl.getUniformLocation(program, 'u_containerPosition');
    const containerSizeLoc = gl.getUniformLocation(program, 'u_containerSize');
    const warpLoc = gl.getUniformLocation(program, 'u_warp');
    const edgeIntensityLoc = gl.getUniformLocation(program, 'u_edgeIntensity');
    const rimIntensityLoc = gl.getUniformLocation(program, 'u_rimIntensity');
    const baseIntensityLoc = gl.getUniformLocation(program, 'u_baseIntensity');
    const edgeDistanceLoc = gl.getUniformLocation(program, 'u_edgeDistance');
    const rimDistanceLoc = gl.getUniformLocation(program, 'u_rimDistance');
    const baseDistanceLoc = gl.getUniformLocation(program, 'u_baseDistance');
    const cornerBoostLoc = gl.getUniformLocation(program, 'u_cornerBoost');
    const rippleEffectLoc = gl.getUniformLocation(program, 'u_rippleEffect');
    const tintOpacityLoc = gl.getUniformLocation(program, 'u_tintOpacity');
    const imageLoc = gl.getUniformLocation(program, 'u_image');

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const containerCanvas = this.parent.canvas;
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      containerCanvas.width,
      containerCanvas.height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.gl_refs = {
      gl,
      texture,
      textureSizeLoc,
      positionLoc,
      texcoordLoc,
      resolutionLoc,
      blurRadiusLoc,
      borderRadiusLoc,
      buttonPositionLoc,
      containerPositionLoc,
      containerSizeLoc,
      warpLoc,
      edgeIntensityLoc,
      rimIntensityLoc,
      baseIntensityLoc,
      edgeDistanceLoc,
      rimDistanceLoc,
      baseDistanceLoc,
      cornerBoostLoc,
      rippleEffectLoc,
      tintOpacityLoc,
      imageLoc,
      positionBuffer,
      texcoordBuffer
    };

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    gl.enableVertexAttribArray(texcoordLoc);
    gl.vertexAttribPointer(texcoordLoc, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(resolutionLoc, this.canvas.width, this.canvas.height);
    gl.uniform2f(textureSizeLoc, containerCanvas.width, containerCanvas.height);
    gl.uniform1f(blurRadiusLoc, glassControls.blurRadius);
    gl.uniform1f(borderRadiusLoc, this.borderRadius);
    gl.uniform1f(warpLoc, this.warp ? 1.0 : (glassControls.warp ? 1.0 : 0.0));
    gl.uniform1f(edgeIntensityLoc, glassControls.edgeIntensity);
    gl.uniform1f(rimIntensityLoc, glassControls.rimIntensity);
    gl.uniform1f(baseIntensityLoc, glassControls.baseIntensity);
    gl.uniform1f(edgeDistanceLoc, glassControls.edgeDistance);
    gl.uniform1f(rimDistanceLoc, glassControls.rimDistance);
    gl.uniform1f(baseDistanceLoc, glassControls.baseDistance);
    gl.uniform1f(cornerBoostLoc, glassControls.cornerBoost);
    gl.uniform1f(rippleEffectLoc, glassControls.rippleEffect);
    gl.uniform1f(tintOpacityLoc, this.tintOpacity !== undefined ? this.tintOpacity : glassControls.tintOpacity);

    const buttonPosition = this.getPosition();
    const containerPosition = this.parent.getPosition();
    gl.uniform2f(buttonPositionLoc, buttonPosition.x, buttonPosition.y);
    gl.uniform2f(containerPositionLoc, containerPosition.x, containerPosition.y);
    gl.uniform2f(containerSizeLoc, this.parent.width, this.parent.height);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(imageLoc, 0);

    this.startNestedRenderLoop();
  }

  startNestedRenderLoop() {
    const render = () => {
      if (!this.gl_refs || !this.gl_refs.gl || !this.parent || !this.parent.canvas || !this.program) return;
      const gl = this.gl_refs.gl;
      gl.useProgram(this.program);

      const containerCanvas = this.parent.canvas;
      gl.bindTexture(gl.TEXTURE_2D, this.gl_refs.texture);
      try {
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, containerCanvas);
      } catch {}

      gl.clear(gl.COLOR_BUFFER_BIT);

      const buttonPosition = this.getPosition();
      const containerPosition = this.parent.getPosition();
      gl.uniform2f(this.gl_refs.buttonPositionLoc, buttonPosition.x, buttonPosition.y);
      gl.uniform2f(this.gl_refs.containerPositionLoc, containerPosition.x, containerPosition.y);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    render();
    this.render = render;
  }

  createTextElement() {
    this.textElement = document.createElement('div');
    this.textElement.className = 'glass-button-text';
    this.textElement.textContent = this.text;
    this.textElement.style.fontSize = this.fontSize + 'px';
    this.element.appendChild(this.textElement);
  }

  setupClickHandler() {
    if (this.onClick && this.element) {
      this.element.addEventListener('click', (e) => {
        this.onClick(e);
      });
    }
  }
}

