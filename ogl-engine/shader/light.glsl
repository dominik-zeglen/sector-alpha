struct Light {
    vec4 position;
    vec3 color;
    float intensity;
    bool visible;
};

#pragma glslify: export(Light)