---
to: ogl-engine/materials/<%= name %>/shader.vert.glsl
---

#version 300 es
precision highp float;

in vec3 position;
in vec2 uv;

out vec2 vUv;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0f);
}