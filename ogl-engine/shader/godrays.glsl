// @source https://github.com/Erkaman/glsl-godrays/blob/master/index.glsl

vec3 godrays(
    float density,
    float weight,
    float decay,
    float exposure,
    int numSamples,
    sampler2D occlusionTexture,
    vec2 screenSpaceLightPos,
    vec2 uv
) {

    vec3 fragColor = vec3(0.0, 0.0, 0.0);

    vec2 deltaTextCoord = uv - screenSpaceLightPos;

    vec2 textCoo = uv.xy;
    deltaTextCoord *= (1.0 / float(numSamples)) * density;
    float illuminationDecay = 1.0;

    for(int i = 0; i < 100; i++) {
        if(numSamples < i) {
            break;
        }

        textCoo -= deltaTextCoord;
        vec3 samp = texture2D(occlusionTexture, textCoo).xyz;
        samp *= illuminationDecay * weight;
        fragColor += samp;
        illuminationDecay *= decay;
    }

    fragColor *= exposure;

    return fragColor;

}

#pragma glslify: export(godrays)