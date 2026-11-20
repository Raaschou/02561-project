struct VSOut {
    @builtin(position) position: vec4f,
    @location(0) normal: vec3f,
}

struct Uniforms {
    modelViewProjectionMatrix: mat4x4f,
}

@group(0) @binding(0)
var<uniform> uniforms: Uniforms;

@vertex
fn main_vs(@location(0) inPos: vec4f, @location(1) inNormal: vec3f) -> VSOut {
    var vsOut: VSOut;

    vsOut.position = uniforms.modelViewProjectionMatrix * inPos;
    vsOut.normal = inNormal;
    return vsOut;
}

@fragment
fn main_fs(@location(0) inNormal: vec3f) -> @location(0) vec4f {
    return vec4f(inNormal, 1.0);
}
