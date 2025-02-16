#version 300 es
precision highp float;

in vec2 uv;
in vec3 position;
in vec3 normal;

out vec2 vUv;
out vec3 vNormal;
out vec3 vMPos;
out vec3 worldPosition;

uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;

void main() {
    vec4 mPosition = modelMatrix * vec4(position, 1.0f);
    vec4 mvPosition = viewMatrix * mPosition;
    worldPosition = mPosition.xyz;

    vUv = uv;
    vNormal = mat3(modelMatrix) * normal;

    gl_Position = projectionMatrix * mvPosition;
}