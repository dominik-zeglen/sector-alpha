#version 300 es
precision highp float;

#pragma glslify: snoise2 = require(glsl-noise/simplex/2d)
#pragma glslify: snoise3 = require(glsl-noise/simplex/3d)
#pragma glslify: snoise4 = require(glsl-noise/simplex/4d)
#pragma glslify: pnoise2 = require(glsl-noise/periodic/2d)
#pragma glslify: luma = require(glsl-luma)
#pragma glslify: rim = require("./ogl-engine/shader/rim")
#pragma glslify: fbm3 = require("./ogl-engine/shader/fbm3")

in vec2 vUv;
in vec3 vPosition;
in vec3 vWorldNormal;
in vec3 vViewDirection;
in float fCameraDistance;

out vec4 fragData[2];

uniform float uTime;
uniform vec3 cameraPosition;
uniform vec3 uColor;
uniform vec3 uColor2;
uniform float uNoise;
uniform float uNoisePower;
uniform float uEmissive;

#define black vec3(0., 0., 0.)
#define white vec3(1., 1., 1.)

#define noiseScaleZ 1.

#define rimPower 0.4

void main() {
    vec3 scaledPosition = vec3(vPosition.x * noiseScaleZ, vPosition.y, vPosition.z * noiseScaleZ);
    float baseNoise = snoise4(vec4(scaledPosition * uNoise, uTime * 0.06f));
    float noise = clamp(snoise2(vec2(baseNoise * uNoisePower, uTime * 0.001f)), 0.0f, 0.3f);
    vec3 smokeColor = vec3(fbm3(scaledPosition, 7)) + 0.1f;

    vec3 color = mix(uColor, uColor2, smokeColor + noise);

    vec3 rimLighting = rim(rimPower, vViewDirection, vWorldNormal, mix(white, uColor, 0.9f));

    fragData[0] = vec4(color + rimLighting, 1.0f);
    fragData[1] = vec4(color, 0.4f) * uEmissive;
}