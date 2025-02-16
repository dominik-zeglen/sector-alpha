#version 300 es
precision highp float;

in vec2 vUv;

out vec4 fragColor;

uniform sampler2D tMap;
uniform vec3 uColor;

void main() {
    vec3 tex = texture(tMap, vUv).rgb;
    float signedDist = max(min(tex.r, tex.g), min(max(tex.r, tex.g), tex.b)) - 0.5f;
    float d = fwidth(signedDist);
    float alpha = smoothstep(-d, d, signedDist);

    if(alpha < 0.01f)
        discard;

    fragColor.rgb = uColor;
    fragColor.a = alpha;
}