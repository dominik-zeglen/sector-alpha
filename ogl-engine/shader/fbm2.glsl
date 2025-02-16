#pragma glslify: noise2 = require(glsl-noise/simplex/2d)

float fbm2(vec2 st, int octaves) {
    float value = 0.0;
    float amplitude = .5;

    for(int i = 0; i < octaves; i++) {
        value += amplitude * noise2(st);
        st *= 2.;
        amplitude *= .5;
    }

    return value;
}

#pragma glslify: export(fbm2)