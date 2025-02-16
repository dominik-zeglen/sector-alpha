vec4 bloom(int size, float separation, float threshold, float amount, tx Sampler2D) {
    vec2 texSize = textureSize(tx, 0).xy;

    vec4 result = vec4(0.0);
    vec4 color = vec4(0.0);

    float value = 0.0;
    float count = 0.0;

    for(int i = -size; i <= size; ++i) {
        for(int j = -size; j <= size; ++j) {
            color = texture(colorTexture, (vec2(i, j) * separation + gl_FragCoord.xy) / texSize);
            value = max(color.r, max(color.g, color.b));
            if(value < threshold) {
                color = vec4(0.0);
            }
            result += color;
            count += 1.0;
        }
    }

    result /= count;
    return mix(vec4(0.0), result, amount);
}