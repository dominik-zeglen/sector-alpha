vec3 viewNormal(
    vec3 vMPos,
    vec2 vUv,
    vec3 vNormal,
    sampler2D tNormal,
    float uNormalUVScale,
    float uNormalScale,
    mat4 viewMatrix
) {
    vec3 pos_dx = dFdx(vMPos.xyz);
    vec3 pos_dy = dFdy(vMPos.xyz);
    vec2 tex_dx = dFdx(vUv);
    vec2 tex_dy = dFdy(vUv);

    vec3 t = normalize(pos_dx * tex_dy.t - pos_dy * tex_dx.t);
    vec3 b = normalize(-pos_dx * tex_dy.s + pos_dy * tex_dx.s);
    mat3 tbn = mat3(t, b, normalize(vNormal));

    vec2 z = vUv * uNormalUVScale;
    vec3 n = texture(tNormal, z).rgb * 2.0 - 1.0;
    n.xy *= uNormalScale;

    vec3 worldNormal = normalize(tbn * n);

    return normalize((vec4(worldNormal, 0.0) * viewMatrix).xyz);
}

#pragma glslify: export(viewNormal) 