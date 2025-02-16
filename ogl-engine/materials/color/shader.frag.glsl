#version 300 es
precision highp float;

#pragma glslify: blinnPhongSpec = require(glsl-specular-blinn-phong)
#pragma glslify: Light = require("./ogl-engine/shader/light");

in vec3 worldPosition;
in vec2 vUv;
in vec3 vNormal;

out vec4 fragData[2];

uniform vec3 uColor;
uniform bool bShaded;
uniform mat4 viewMatrix;
uniform sampler2D tNormal;
uniform vec3 cameraPosition;
uniform float fEmissive;
uniform vec3 ambient;
uniform Light lights[16];

#define shininess 64.0f

void main() {
    if(bShaded) {
        vec3 eyeDirection = normalize(cameraPosition - worldPosition);
        vec3 diffuse = vec3(0.0f);
        vec3 specular = vec3(0.0f);

        vec3 norm = normalize(vNormal);

        for(int i = 0; i < lights.length(); i++) {
            if(lights[i].visible) {
                vec3 lightDir = vec3(0.0f);
                float intensity = lights[i].intensity;
                if(lights[i].position.w == 0.0f) {
                    lightDir = normalize(-lights[i].position.xyz);
                } else {
                    vec3 d = lights[i].position.xyz - worldPosition;
                    lightDir = normalize(d);
                    intensity /= 1. + pow(length(d), 2.0f);
                }
                float diff = max(dot(norm, lightDir), 0.0f);
                vec3 color = lights[i].color * intensity;
                diffuse += diff * color;
                specular += blinnPhongSpec(lightDir, eyeDirection, norm, shininess) * color;
            }
        }

        fragData[0].rgb = (diffuse + ambient + specular) * uColor / 255.f;
    } else {
        fragData[0] = vec4(uColor / 255.f, 1.f);
    }

    fragData[0].a = 1.0f;
    fragData[1] = fragData[0] * fEmissive;
}