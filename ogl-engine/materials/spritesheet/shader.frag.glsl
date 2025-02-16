#version 300 es
precision highp float;

in vec3 worldPosition;
in vec2 vUv;

out vec4 fragData[2];

uniform sampler2D tDiffuse;
uniform float fAlpha;
uniform float fEmissive;

void main() {
    vec4 tex = texture(tDiffuse, vUv);
    float alpha = tex.a * fAlpha;
    if(alpha < 0.005f) {
        discard;
    }
    fragData[0] = vec4(tex.rgb, alpha);
    fragData[1] = fEmissive * fragData[0];
}