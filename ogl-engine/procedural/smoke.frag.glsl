#version 300 es
precision highp float;

in vec2 vUv;

out vec4 fragColor;

uniform float uSeed;
uniform float uTime;

#pragma glslify: noise3 = require(glsl-noise/simplex/3d)
#pragma glslify: fbm2  =  require("./ogl-engine/shader/fbm2.glsl")

float vignette(vec2 uv, float roundness) {
    float dist = length(uv - 0.5f);
    return clamp(pow(dist * 2.0f, roundness), 0.f, 1.f);
}

void main() {
    float noise = fbm2(vUv * 8.f * clamp(uSeed, 0.5f, 2.f) + uSeed * 100.f, 6);
    float maskNoise = noise3(vec3(vUv, uSeed));
    float value = (1.f - vignette(vUv, uSeed * 0.4f)) * noise * maskNoise * 2.f;

    fragColor = vec4(vec3(value), 1.0f);
}