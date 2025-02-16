vec3 billboard(vec3 position, mat4 viewMatrix) {
    vec3 cameraRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 cameraUp = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);

    return position.x * cameraRight + position.y * cameraUp;
}

#pragma glslify: export(billboard)