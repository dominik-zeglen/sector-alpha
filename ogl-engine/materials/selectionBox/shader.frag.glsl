#version 300 es
precision highp float;

in vec2 vUv;

out vec4 fragData[2];

uniform float lineWidthX;
uniform float lineWidthY;
uniform float ratio;

#define color vec3(1.0, 1.0, 1.0)

void main() {
    if(vUv.x > lineWidthX && vUv.x < 1.0f - lineWidthX && vUv.y > lineWidthY && vUv.y < 1.0f - lineWidthY) {
        discard;
    }

    fragData[0] = vec4(color, 1.0f);
}