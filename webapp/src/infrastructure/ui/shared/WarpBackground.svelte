<script lang="ts">
  import { onMount } from 'svelte';
  import { Renderer, Program, Mesh, Triangle } from 'ogl';

  type Props = {
    timeSpeed?: number;
    colorBalance?: number;
    warpStrength?: number;
    warpFrequency?: number;
    warpSpeed?: number;
    warpAmplitude?: number;
    blendAngle?: number;
    blendSoftness?: number;
    rotationAmount?: number;
    noiseScale?: number;
    grainAmount?: number;
    grainScale?: number;
    grainAnimated?: boolean;
    contrast?: number;
    gamma?: number;
    saturation?: number;
    centerX?: number;
    centerY?: number;
    zoom?: number;
    color1?: string;
    color2?: string;
    color3?: string;
    class?: string;
  };

  let {
    timeSpeed = 0.22,
    colorBalance = 0,
    warpStrength = 1,
    warpFrequency = 5,
    warpSpeed = 2,
    warpAmplitude = 50,
    blendAngle = 0,
    blendSoftness = 0.05,
    rotationAmount = 500,
    noiseScale = 2,
    grainAmount = 0.06,
    grainScale = 2,
    grainAnimated = false,
    contrast = 1.35,
    gamma = 1,
    saturation = 1,
    centerX = 0,
    centerY = 0,
    zoom = 0.9,
    color1 = '#61E6E1',
    color2 = '#B7F56A',
    color3 = '#9C82FF',
    class: className = ''
  }: Props = $props();

  let containerRef: HTMLDivElement;

  const current = $derived({
    timeSpeed, colorBalance, warpStrength, warpFrequency, warpSpeed,
    warpAmplitude, blendAngle, blendSoftness, rotationAmount,
    noiseScale, grainAmount, grainScale, grainAnimated, contrast,
    gamma, saturation, centerX, centerY, zoom, color1, color2, color3
  });

  function hexToRgb(hex: string): [number, number, number] {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return r
      ? [parseInt(r[1], 16) / 255, parseInt(r[2], 16) / 255, parseInt(r[3], 16) / 255]
      : [1, 1, 1];
  }

  onMount(() => {
    const renderer = new Renderer({
      webgl: 2,
      alpha: true,
      antialias: false,
      dpr: Math.min(window.devicePixelRatio || 1, 2)
    });
    const gl = renderer.gl;
    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    containerRef.appendChild(canvas);

    const vertex = `#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }`;

    const fragment = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uTimeSpeed;
uniform float uColorBalance;
uniform float uWarpStrength;
uniform float uWarpFrequency;
uniform float uWarpSpeed;
uniform float uWarpAmplitude;
uniform float uBlendAngle;
uniform float uBlendSoftness;
uniform float uRotationAmount;
uniform float uNoiseScale;
uniform float uGrainAmount;
uniform float uGrainScale;
uniform float uGrainAnimated;
uniform float uContrast;
uniform float uGamma;
uniform float uSaturation;
uniform vec2 uCenterOffset;
uniform float uZoom;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
out vec4 fragColor;

#define S(a,b,t) smoothstep(a,b,t)

mat2 Rot(float a) {
  float s = sin(a), c = cos(a);
  return mat2(c,-s,s,c);
}

vec2 hash(vec2 p) {
  p = vec2(dot(p,vec2(2127.1,81.17)),dot(p,vec2(1269.5,283.37)));
  return fract(sin(p)*43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  float a = dot(-1.0+2.0*hash(i+vec2(0.0,0.0)),f-vec2(0.0,0.0));
  float b = dot(-1.0+2.0*hash(i+vec2(1.0,0.0)),f-vec2(1.0,0.0));
  float c = dot(-1.0+2.0*hash(i+vec2(0.0,1.0)),f-vec2(0.0,1.0));
  float d = dot(-1.0+2.0*hash(i+vec2(1.0,1.0)),f-vec2(1.0,1.0));
  return 0.5+0.5*mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
}

void mainImage(out vec4 o, vec2 C) {
  float t = iTime*uTimeSpeed;
  vec2 uv = C/iResolution.xy;
  float ratio = iResolution.x/iResolution.y;
  vec2 tuv = uv-0.5+uCenterOffset;
  tuv /= max(uZoom,0.001);

  float degree = noise(vec2(t*0.1,tuv.x*tuv.y)*uNoiseScale);
  tuv.y *= 1.0/ratio;
  tuv *= Rot(radians((degree-0.5)*uRotationAmount+180.0));
  tuv.y *= ratio;

  float frequency = uWarpFrequency;
  float ws = max(uWarpStrength,0.001);
  float amplitude = uWarpAmplitude/ws;
  float warpTime = t*uWarpSpeed;
  tuv.x += sin(tuv.y*frequency+warpTime)/amplitude;
  tuv.y += sin(tuv.x*(frequency*1.5)+warpTime)/(amplitude*0.5);

  vec3 colCyan = uColor1;
  vec3 colGreen = uColor2;
  vec3 colPurple = uColor3;
  float b = uColorBalance;
  float s = max(uBlendSoftness,0.0);
  mat2 blendRot = Rot(radians(uBlendAngle));
  float blendX = (tuv*blendRot).x;

  float edge0 = -0.3-b-s;
  float edge1 = 0.2-b+s;
  float v0 = 0.5-b+s;
  float v1 = -0.3-b-s;

  vec3 layer1 = mix(colPurple,colGreen,S(edge0,edge1,blendX));
  vec3 layer2 = mix(colGreen,colCyan,S(edge0,edge1,blendX));
  vec3 col = mix(layer1,layer2,S(v0,v1,tuv.y));

  vec2 grainUv = uv*max(uGrainScale,0.001);
  if (uGrainAnimated > 0.5) grainUv += vec2(iTime*0.05);
  float grain = fract(sin(dot(grainUv,vec2(12.9898,78.233)))*43758.5453);
  col += (grain-0.5)*uGrainAmount;
  col = (col-0.5)*uContrast+0.5;

  float luma = dot(col,vec3(0.2126,0.7152,0.0722));
  col = mix(vec3(luma),col,uSaturation);
  col = pow(max(col,0.0),vec3(1.0/max(uGamma,0.001)));
  col = clamp(col,0.0,1.0);
  o = vec4(col,1.0);
}

void main() {
  vec4 o = vec4(0.0);
  mainImage(o,gl_FragCoord.xy);
  fragColor = o;
}`;

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new Float32Array([1, 1]) },
        uTimeSpeed: { value: timeSpeed },
        uColorBalance: { value: colorBalance },
        uWarpStrength: { value: warpStrength },
        uWarpFrequency: { value: warpFrequency },
        uWarpSpeed: { value: warpSpeed },
        uWarpAmplitude: { value: warpAmplitude },
        uBlendAngle: { value: blendAngle },
        uBlendSoftness: { value: blendSoftness },
        uRotationAmount: { value: rotationAmount },
        uNoiseScale: { value: noiseScale },
        uGrainAmount: { value: grainAmount },
        uGrainScale: { value: grainScale },
        uGrainAnimated: { value: grainAnimated ? 1 : 0 },
        uContrast: { value: contrast },
        uGamma: { value: gamma },
        uSaturation: { value: saturation },
        uCenterOffset: { value: new Float32Array([centerX, centerY]) },
        uZoom: { value: zoom },
        uColor1: { value: new Float32Array(hexToRgb(color1)) },
        uColor2: { value: new Float32Array(hexToRgb(color2)) },
        uColor3: { value: new Float32Array(hexToRgb(color3)) }
      }
    });

    const mesh = new Mesh(gl, { geometry, program });

    const setSize = () => {
      const rect = containerRef.getBoundingClientRect();
      renderer.setSize(Math.max(1, Math.floor(rect.width)), Math.max(1, Math.floor(rect.height)));
      const resolution = (program.uniforms.iResolution as { value: Float32Array }).value;
      resolution[0] = gl.drawingBufferWidth;
      resolution[1] = gl.drawingBufferHeight;
    };

    const ro = new ResizeObserver(setSize);
    ro.observe(containerRef);
    setSize();

    let raf = 0;
    const t0 = performance.now();

    const loop = (t: number) => {
      const u = program.uniforms;
      (u.iTime as { value: number }).value = (t-t0)*0.001;
      (u.uTimeSpeed as { value: number }).value = current.timeSpeed;
      (u.uColorBalance as { value: number }).value = current.colorBalance;
      (u.uWarpStrength as { value: number }).value = current.warpStrength;
      (u.uWarpFrequency as { value: number }).value = current.warpFrequency;
      (u.uWarpSpeed as { value: number }).value = current.warpSpeed;
      (u.uWarpAmplitude as { value: number }).value = current.warpAmplitude;
      (u.uBlendAngle as { value: number }).value = current.blendAngle;
      (u.uBlendSoftness as { value: number }).value = current.blendSoftness;
      (u.uRotationAmount as { value: number }).value = current.rotationAmount;
      (u.uNoiseScale as { value: number }).value = current.noiseScale;
      (u.uGrainAmount as { value: number }).value = current.grainAmount;
      (u.uGrainScale as { value: number }).value = current.grainScale;
      (u.uGrainAnimated as { value: number }).value = current.grainAnimated ? 1 : 0;
      (u.uContrast as { value: number }).value = current.contrast;
      (u.uGamma as { value: number }).value = current.gamma;
      (u.uSaturation as { value: number }).value = current.saturation;
      (u.uZoom as { value: number }).value = current.zoom;
      const offset = (u.uCenterOffset as { value: Float32Array }).value;
      offset[0] = current.centerX;
      offset[1] = current.centerY;
      (u.uColor1 as { value: Float32Array }).value.set(hexToRgb(current.color1));
      (u.uColor2 as { value: Float32Array }).value.set(hexToRgb(current.color2));
      (u.uColor3 as { value: Float32Array }).value.set(hexToRgb(current.color3));
      renderer.render({ scene: mesh });
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    };
  });
</script>

<div bind:this={containerRef} class={"warp-background "+className} aria-hidden="true"></div>

<style>
  .warp-background {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    pointer-events: none;
  }
</style>