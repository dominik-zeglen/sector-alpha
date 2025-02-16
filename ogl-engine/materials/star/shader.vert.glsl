#version 300 es
precision highp float;

#pragma glslify: snoise4 = require(glsl-noise/simplex/4d)

in vec3 position;
in vec3 normal;
in vec2 uv;

out vec3 vPosition;
out vec3 vWorldNormal;
out vec3 vViewDirection;
out vec2 vUv;
out float fCameraDistance;

uniform float uTime;
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform vec3 cameraPosition;

void main() {
    vPosition = normalize(position);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0f);
    vWorldNormal = normalize(modelMatrix * vec4(normal, 0.0f)).xyz;
    vViewDirection = normalize(cameraPosition - worldPosition.xyz);
    vUv = uv;
    fCameraDistance = distance(cameraPosition, worldPosition.xyz);

    float noise = snoise4(vec4(vPosition, uTime * 0.2f));

    vec3 displacement = vPosition * noise * 0.08f;

    // Standard position transformation for vertex shader
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0f) + vec4(displacement, 1.0f);
}
