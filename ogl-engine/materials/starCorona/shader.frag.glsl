#version 300 es
precision highp float;

#pragma glslify: snoise2 = require(glsl-noise/simplex/2d)
#pragma glslify: snoise3 = require(glsl-noise/simplex/3d)

in vec2 vUv;

out vec4 fragData[2];

uniform vec3 uColor;
uniform float uTime;

#define endColor vec4(1.f, 1.f, 1.f, 0.f)
#define noiseScale 5.

float lerp(float a, float b, float t) {
    return a + (b - a) * t;
}

float glow(float x, float a, float b) {
    return 1.0f - exp(-pow(x, a) * b);
}

float getCoronaGlow(float dist) {
    float noise = snoise2(vec2(snoise2(vUv), uTime)) * 3.f;

    return glow(dist, 2.0f, 1.0f);
}

void main() {
    float dist = distance(vUv, vec2(0.5f, 0.5f)) * 2.f;
    float alpha = 1.f - dist * dist;

    vec4 coronaGlow = vec4(uColor * getCoronaGlow(dist), alpha);

    fragData[0] = coronaGlow;
    fragData[1] = fragData[0];

    if(fragData[0].a < 0.01f) {
        discard;
    }
}