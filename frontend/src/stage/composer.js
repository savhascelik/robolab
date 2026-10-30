import * as THREE from 'three';

const OUTLINE_LAYER = 0;

const fullscreenQuadGeo = new THREE.BufferGeometry();
fullscreenQuadGeo.setAttribute(
  'position',
  new THREE.Float32BufferAttribute([-1, 3, 0, -1, -1, 0, 3, -1, 0], 3)
);
fullscreenQuadGeo.setAttribute(
  'uv',
  new THREE.Float32BufferAttribute([0, 2, 0, 0, 2, 0], 2)
);

const fullscreenCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D tColor;
  uniform sampler2D tNormal;
  uniform sampler2D tDepth;
  uniform vec2 texel;
  uniform float thickness;
  uniform float depthRange;
  uniform float depthThreshold;
  uniform float normalThreshold;
  uniform vec3 lineColor;
  uniform float lineOpacity;
  uniform bool srgbOut;
  varying vec2 vUv;

  float depthAt(vec2 uv) {
    return texture2D(tDepth, uv).r * depthRange;
  }

  // Edge strength between the centre pixel and a pair of opposite neighbours:
  // 1) Silhouette against empty space
  // 2) Depth 2nd derivative (Laplacian) — ignores sloped planes, catches steps
  // 3) Normal creases between faces
  float edgePair(vec2 uv, vec2 off, float d0, vec4 n0) {
    vec4 na = texture2D(tNormal, uv + off);
    vec4 nb = texture2D(tNormal, uv - off);
    float da = depthAt(uv + off);
    float db = depthAt(uv - off);

    float e = max(abs(na.a - n0.a), abs(nb.a - n0.a));

    if (n0.a > 0.5) {
      float lap = abs(da + db - 2.0 * d0);
      float stepA = (na.a > 0.5) ? abs(da - d0) : 0.0;
      float stepB = (nb.a > 0.5) ? abs(db - d0) : 0.0;
      float dEdge = smoothstep(
        depthThreshold,
        depthThreshold * 2.0,
        min(lap, max(stepA, stepB) * 2.0)
      );
      e = max(e, dEdge);

      vec3 c = n0.xyz * 2.0 - 1.0;
      float ca = na.a > 0.5 ? 1.0 - dot(c, na.xyz * 2.0 - 1.0) : 0.0;
      float cb = nb.a > 0.5 ? 1.0 - dot(c, nb.xyz * 2.0 - 1.0) : 0.0;
      e = max(e, 0.9 * smoothstep(normalThreshold, normalThreshold * 2.2, max(ca, cb)));
    }
    return e;
  }

  void main() {
    vec4 col = texture2D(tColor, vUv);
    vec4 n0 = texture2D(tNormal, vUv);
    float d0 = depthAt(vUv);

    vec2 o = texel * thickness;
    float e = 0.0;
    e = max(e, edgePair(vUv, vec2(o.x, 0.0), d0, n0));
    e = max(e, edgePair(vUv, vec2(0.0, o.y), d0, n0));
    e = max(e, edgePair(vUv, vec2(o.x, o.y) * 0.7071, d0, n0));
    e = max(e, edgePair(vUv, vec2(o.x, -o.y) * 0.7071, d0, n0));

    // Softer outer ring for anti-aliased ink lines
    float e2 = 0.0;
    vec2 o2 = o * 1.5;
    e2 = max(e2, edgePair(vUv, vec2(o2.x, 0.0), d0, n0));
    e2 = max(e2, edgePair(vUv, vec2(0.0, o2.y), d0, n0));
    e = max(e, e2 * 0.35);
    e *= lineOpacity;

    vec3 rgb = col.a > 0.0 ? col.rgb / col.a : vec3(0.0);
    float a = col.a;
    float outA = a + e * (1.0 - a);
    vec3 mixed = (rgb * a * (1.0 - e) + lineColor * e) / max(outA, 1e-4);

    gl_FragColor = vec4(mixed, outA);
    #include <colorspace_fragment>
    if (srgbOut) {
      gl_FragColor = sRGBTransferOETF(gl_FragColor);
    } else {
      gl_FragColor.rgb *= gl_FragColor.a;
    }
  }
`;

export class OutlineComposer {
  constructor(renderer, { lineColor = '#151a2c', thickness = 1.0, opacity = 1.0 } = {}) {
    this.renderer = renderer;
    this.thickness = thickness;
    this.pixelRatio = 1;
    this.lineScale = 1;

    this.colorTarget = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      samples: 4
    });

    this.normalTarget = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      depthTexture: new THREE.DepthTexture(1, 1, THREE.UnsignedIntType)
    });

    this.normalMaterial = new THREE.MeshNormalMaterial();

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        tColor: { value: this.colorTarget.texture },
        tNormal: { value: this.normalTarget.texture },
        tDepth: { value: this.normalTarget.depthTexture },
        texel: { value: new THREE.Vector2(1, 1) },
        thickness: { value: thickness },
        depthRange: { value: 1 },
        depthThreshold: { value: 0.35 },
        normalThreshold: { value: 0.22 },
        lineColor: { value: new THREE.Color(lineColor) },
        lineOpacity: { value: opacity },
        srgbOut: { value: false }
      },
      depthTest: false,
      depthWrite: false,
      transparent: true,
      blending: THREE.NoBlending
    });

    this.quadMesh = new THREE.Mesh(fullscreenQuadGeo, this.material);
    this.clearColor = new THREE.Color();
  }

  setSize(width, height, pixelRatio = 1) {
    const w = Math.max(1, Math.round(width * pixelRatio));
    const h = Math.max(1, Math.round(height * pixelRatio));
    this.colorTarget.setSize(w, h);
    this.normalTarget.setSize(w, h);
    this.material.uniforms.texel.value.set(1 / w, 1 / h);
    this.pixelRatio = pixelRatio;
    this.setLineScale(this.lineScale);
  }

  setLineScale(scale) {
    this.lineScale = scale;
    this.material.uniforms.thickness.value = this.thickness * this.pixelRatio * scale;
  }

  render(scene, camera, target = null) {
    const r = this.renderer;
    const prevAlpha = r.getClearAlpha();
    r.getClearColor(this.clearColor);
    const prevMask = camera.layers.mask;

    this.material.uniforms.depthRange.value = camera.far - camera.near;

    // Pass 1: Normal + Depth buffer on OUTLINE_LAYER (0)
    r.setClearColor(0x000000, 0);
    camera.layers.set(OUTLINE_LAYER);
    scene.overrideMaterial = this.normalMaterial;
    r.setRenderTarget(this.normalTarget);
    r.clear();
    r.render(scene, camera);
    scene.overrideMaterial = null;
    camera.layers.mask = prevMask;

    // Pass 2: Standard lit color pass on all active camera layers
    r.setRenderTarget(this.colorTarget);
    r.clear();
    r.render(scene, camera);

    // Pass 3: Composite with ink edges
    this.material.uniforms.srgbOut.value = Boolean(target);
    r.setClearColor(this.clearColor, prevAlpha);
    r.setRenderTarget(target);
    r.clear();
    r.render(this.quadMesh, fullscreenCamera);
  }

  dispose() {
    this.colorTarget.dispose();
    this.normalTarget.dispose();
    this.normalMaterial.dispose();
    this.material.dispose();
  }
}
