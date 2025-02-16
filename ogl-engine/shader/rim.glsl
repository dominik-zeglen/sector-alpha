vec3 rim(float power, vec3 viewDirection, vec3 worldNormal, vec3 color) {
    float rimFactor = 1.0 - dot(viewDirection, worldNormal);
    rimFactor = pow(rimFactor, power);

    return color * rimFactor;
}

#pragma glslify: export(rim) 