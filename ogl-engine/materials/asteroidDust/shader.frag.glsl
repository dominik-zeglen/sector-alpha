#version 300 es
precision highp float;

#pragma glslify: Light = require("./ogl-engine/shader/light");
#pragma glslify: luma = require(glsl-luma);

in vec2 vUv;

out vec4 fragData[2];

uniform sampler2D tMap;
uniform Light lights[16];

void main() {
    vec3 value = texture(tMap, vUv).rgb;
    vec3 lightColor = vec3(0.0f);

    for(int i = 0; i < lights.length(); i++) {
        if(lights[i].visible) {
             lightColor += lights[i].color * lights[i].intensity;
        }
    }

    vec4 color = vec4(luma(value) * clamp(lightColor, 0., 1.), value.r);
    if(color.a < 0.05f) {
        discard;
    }

    fragData[0] = color;
    fragData[1] = vec4(0.0f);
}