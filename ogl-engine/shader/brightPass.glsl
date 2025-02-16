vec4 brightPass(vec4 color, float threshold) {
    return color * (step(threshold, length(color.rgb) / 1.73205));
}

#pragma glslify: export(brightPass) 