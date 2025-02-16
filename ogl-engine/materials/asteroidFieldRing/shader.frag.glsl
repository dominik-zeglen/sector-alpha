#version 300 es
precision highp float;

in vec2 vUv;
in float vT;

out vec4 fragData[2];

uniform mat4 modelMatrix;
uniform vec4 uColor;

#define width 0.1f

void main() {
    float dist = distance(vUv, vec2(0.5f, 0.5f));
    float offset = width / modelMatrix[0][0];

    if(dist > 0.5f || dist < 0.5f - offset) {
        discard;
    }

    fragData[0] = vec4(uColor.r, uColor.g, uColor.b, 1.0f - smoothstep(0.5f - offset, 0.5f, dist));
}