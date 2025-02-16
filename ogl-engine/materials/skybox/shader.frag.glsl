#version 300 es
precision highp float;

uniform samplerCube tMap;

in vec3 vDir;

out vec4 fragData[2];

void main() {
    fragData[0] = texture(tMap, vDir);
}