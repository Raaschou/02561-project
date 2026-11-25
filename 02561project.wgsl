struct VSOut {
    @builtin(position) position: vec4f,
    @location(0) normal: vec3f,
    @location(1) color: vec4f,
    @location(2) texCoord: vec2f,
}

struct Uniforms {
    modelViewProjMat: mat4x4f,
    lightViewProjeMat: mat4x4f,
    lightPos: vec3f,
}

@group(0) @binding(0)
var<uniform> uniforms: Uniforms;
@group(0) @binding(1)
var depthMap: texture_2d<f32>;
/* @group(0) @binding(2)
var depthMapSampler: sampler; */

@vertex
fn main_vs(
    @location(0) inPos: vec4f,
    @location(1) inNormal: vec3f,
    @location(2) inColor: vec4f,
    @location(3) inCoord: vec2f,
) -> VSOut {
    var vsOut: VSOut;

    vsOut.position = uniforms.modelViewProjMat * inPos;
    vsOut.normal = inNormal;
    vsOut.color = inColor;
    vsOut.texCoord = inCoord;
    return vsOut;
}

@fragment
fn main_fs(in: VSOut) -> @location(0) vec4f {
    let depth = textureLoad(depthMap, vec2i(in.texCoord), 0);
    let wrap = 0.75;
    // Simple Lambertian shading
    let diffuse = max(0, dot(uniforms.lightPos, in.normal));
    let wrapDiffuse = max(0, (dot(uniforms.lightPos, in.normal) + wrap) / (1 + wrap));
    // Temporary grey coloring, because in.color is 
    // coloring teapot white with no shading
    let grey = vec3f(0.75);
    return vec4f(grey * wrapDiffuse, 1);
}
