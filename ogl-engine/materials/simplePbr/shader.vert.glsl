#version 300 es
precision highp float;

in vec2 uv;
in vec3 position;
in vec3 normal;
in vec3 tangent;

uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;
uniform float uTime;

out vec2 vUv;
out vec3 vNormal;
out vec3 vTangent;
out vec3 worldPosition;

void main() {
    vec4 mPosition = modelMatrix * vec4(position, 1.0f);
    worldPosition = mPosition.xyz;

    vUv = uv;
    vTangent = mat3(modelMatrix) * tangent;
    vNormal = mat3(modelMatrix) * normal;

    gl_Position = projectionMatrix * viewMatrix * mPosition;
}
