#version 300 es
precision highp float;

#pragma defines

#pragma glslify: billboard = require("./ogl-engine/shader/billboard")

in vec2 uv;
in vec3 position;
in float t;
in vec3 offset;
in vec3 scale;

out vec2 vUv;
out float vT;

uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;

void main() {
    vec4 worldPosition = vec4(billboard(position * scale, viewMatrix) + offset, 1.f);
    #ifdef USE_MODEL_MATRIX
    worldPosition += modelMatrix[3];
    worldPosition.w = 1.f;
    #endif
    vec4 viewPositionPosition = viewMatrix * worldPosition;

    vUv = uv;
    vT = t;

    gl_Position = projectionMatrix * viewPositionPosition;
}