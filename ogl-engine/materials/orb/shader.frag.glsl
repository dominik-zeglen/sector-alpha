#version 300 es
precision highp float;

in vec2 vUv;
in float vT;

out vec4 fragData[2];

uniform vec4 uStart;
uniform vec4 uEnd;
uniform float fEmissive;

void main() {
    float dist = distance(vUv, vec2(0.5f, 0.5f));
    float alpha = 1.0f - 2.0f * dist;

    fragData[0] = mix(uStart / 255.f, uEnd / 255.f, vT);
    fragData[0].a *= alpha;
    if(fragData[0].a < 0.1f) {
        discard;
    }
    fragData[1] = fragData[0] * fEmissive;
}