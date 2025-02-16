#version 300 es
precision highp float;

in vec2 uv;
in vec3 position;

out vec2 vUv;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

void main() {
    vUv = uv;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0f);
}