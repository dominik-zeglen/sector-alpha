#version 300 es
precision highp float;

#pragma glslify: billboard = require("./ogl-engine/shader/billboard")

in vec2 uv;
in vec3 position;

out vec2 vUv;
out float vDist;

uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform vec3 cameraPosition;
uniform float uSize;

void main() {
    vec3 worldPosition = billboard(position, viewMatrix) * distance(cameraPosition, modelMatrix[3].xyz) / 60.f * uSize + modelMatrix[3].xyz;
    vec4 viewPosition = viewMatrix * vec4(worldPosition, 1.0f);

    vUv = uv;

    gl_Position = projectionMatrix * viewPosition;
}