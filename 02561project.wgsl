struct VSOut {
    @builtin(position) position: vec4f,
    @location(0) normal: vec3f,
    @location(1) texCoord: vec2f,
}

struct Uniforms {
    modelViewProjectionMatrix: mat4x4f,
}

@group(0) @binding(0)
var<uniform> uniforms: Uniforms;
@group(0) @binding(1)
var depthMap: texture_2d<f32>;
@group(0) @binding(2)
var depthMapSampler: sampler;

@vertex
fn main_vs(
    @location(0) inPos: vec4f,
    @location(1) inNormal: vec3f,
    @location(2) inCoord: vec2f,
) -> VSOut {
    var vsOut: VSOut;

    vsOut.position = uniforms.modelViewProjectionMatrix * inPos;
    vsOut.normal = inNormal;
    vsOut.texCoord = inCoord;
    return vsOut;
}

@fragment
fn main_fs(in: VSOut) -> @location(0) vec4f {
    let depth = textureLoad(depthMap, vec2i(in.texCoord), 0);
    let sample = depthMapSampler;
    return depth - in.position * 0.25;
    //return vec4f(vec3f(depth), 1.0);
}
