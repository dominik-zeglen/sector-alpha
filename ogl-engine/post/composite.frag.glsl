precision highp float;

#define texture2D_0 texture2D

#pragma glslify: godrays = require('./ogl-engine/shader/godrays.glsl');

uniform sampler2D tMap;
uniform sampler2D tBloom;
uniform vec2 uResolution;
uniform float uBloomStrength;
uniform vec2 uSunPos;
uniform float uDensity;
uniform float uWeight;
uniform float uDecay;
uniform float uExposure;

varying vec2 vUv;

void main() {
    vec4 godraysLayer = vec4(godrays(uDensity, uWeight, uDecay, uExposure, 20, tBloom, uSunPos, vUv), 1.0);
    gl_FragColor = texture2D(tMap, vUv) + texture2D(tBloom, vUv) * uBloomStrength + godraysLayer;
    // gl_FragColor = texture2D(tMap, vUv) + texture2D(tBloom, vUv) * uBloomStrength;
}