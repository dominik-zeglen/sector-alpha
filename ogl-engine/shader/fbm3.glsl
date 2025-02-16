#pragma glslify: noise3 = require(glsl-noise/simplex/3d)

float fbm3(vec3 st, int octaves) {
    float value = 0.0;
    float amplitude = .5;

    for(int i = 0; i < octaves; i++) {
        value += amplitude * noise3(st);
        st *= 2.;
        amplitude *= .5;
    }

    return value;
}

#pragma glslify: export(fbm3)