precision highp float;

uniform sampler2D tMap;
uniform sampler2D tEmissive;
uniform float uThreshold;
varying vec2 vUv;

void main() {
    vec4 tex = texture2D(tMap, vUv);
    float emissive = texture2D(tEmissive, vUv).r;
    if(emissive == 0.0) {
        discard;
    }

    gl_FragColor = tex * emissive;
}