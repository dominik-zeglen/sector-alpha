#version 300 es
precision highp float;

in vec2 uv;
in vec3 position;

out vec2 vUv;

uniform float uTime;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

mat4 rotationZ(float angle) {
    float s = sin(angle);
    float c = cos(angle);

    return mat4(c, -s, 0.0f, 0.0f, s, c, 0.0f, 0.0f, 0.0f, 0.0f, 1.0f, 0.0f, 0.0f, 0.0f, 0.0f, 1.0f);
}

void main() {
    vUv = uv;

    vec3 vPosition = normalize(position);
    float noise = sin(dot(vPosition, vec3(1.f)) + uTime);
    vec3 displacement = vPosition * noise * 1.2f;

    gl_Position = projectionMatrix * modelViewMatrix * rotationZ(uTime / 10.f) * vec4(position, 1.0f) + vec4(displacement, 1.0f);
}
