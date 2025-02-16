#version 300 es
precision highp float;

in vec2 vUv;

out vec4 fragData[2];

uniform sampler2D tMap;
uniform vec3 uColor;
uniform float fEmissive;

void main() {
    vec4 tex = texture(tMap, vUv);
    if(tex.a < 0.1f) {
        discard;
    }

    fragData[0] = tex * vec4(uColor, 1.0f);
    fragData[1] = fragData[0] * fEmissive;
}