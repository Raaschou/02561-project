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
@group(0) @binding(2)
var depthMapSampler: sampler;

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

/* // Example 16-1 rewritten in WGSL
fn generateSkinLUT(pos: vec2f) -> vec4f {
    let wrap = 0.2;
    let scatterWidth = 0.3;
    let scatterColor = vec3f(0.15, 0.0, 0.0);
    let shininess = 40.0;

    // remap from [0, 1] to [-1, 1]
    let NdotL = pos.x * 2 - 1;
    let NdotH = pos.y * 2 - 1;

    let NdotL_wrap = (NdotL + wrap) / (1 + wrap);
    let diffuse = max(0, NdotL_wrap);

    // add color tint at transition from light to dark
    let scatter = smoothstep(0.0, scatterWidth, NdotL_wrap)
        * smoothstep(scatterWidth * 2.0, scatterWidth, NdotL_wrap);

    var specular = pow(NdotH, shininess);
    if NdotL_wrap <= 0 {
        specular = 0.0;
    }

    let shading = diffuse + scatter * scatterColor;

    return vec4f(shading, specular);
}

fn shadeSkin(skinLUT: sampler, N: vec3f, L: vec3f, H: vec3f,
                diffuseColor: vec3f,  specularColor: vec3f) -> vec4f {
    let nDotL = dot(L, N);
    let nDotH = dot(H, N);
    let light = textureLoad(generateSkinLUT )
    return vec4f()
} */

@fragment
fn main_fs(in: VSOut) -> @location(0) vec4f {
    let depth = textureLoad(depthMap, vec2i(in.texCoord), 0).xy;
    let wrap = 0.75;
    // Simple Lambertian shading
    let nDotL = dot(uniforms.lightPos, in.normal);
    let diff = nDotL * 0.5 + 0.5;
    let diffuse = max(0, nDotL);
    let scatterColor = vec3f(0.15, 0.0, 0.0);

    let wrapDiffuse = max(0, (nDotL + wrap) / (1 + wrap));
    // Temporary grey coloring, because in.color is 
    // coloring teapot white with no shading
    let grey = vec3f(0.75);
    return vec4f(grey * wrapDiffuse + scatterColor, 1);
}
