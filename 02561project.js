window.onload = function () { main(); }

async function main() {

    // Get the context and devices
    const canvas = document.querySelector("canvas");

    const adapter = await navigator.gpu.requestAdapter();

    const device = await adapter.requestDevice();

    const context = canvas.getContext("webgpu");

    const canvasFormat = navigator.gpu.getPreferredCanvasFormat();

    context.configure({ device: device, format: canvasFormat });


    // Setup sphere using OBJParser instead of subdivider
    const obj_filename = "../3d_models/utah_teapot.obj";
    const sphereObj = await readOBJFile(obj_filename, 0.25, true);


    const sphereVertices = sphereObj.vertices;
    const flatSphereVertices = flatten(sphereVertices);



    const sphereIndices = sphereObj.indices;
    const flatSphereIndices = flatten(sphereIndices);

    const sphereNormals = sphereObj.normals;
    const flatSphereNormals = flatten(sphereNormals);

    const textureCoordinates = sphereObj.texCoords

    const spherePosBuffer = device.createBuffer({
        label: "positions buffer",
        size: flatSphereVertices.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });


    device.queue.writeBuffer(spherePosBuffer, 0, flatSphereVertices);
    const spherePosBufferLayout = {
        label: "pos buffer layout",
        arrayStride: sizeof["vec4"],
        attributes: [{
            format: "float32x4",
            offset: 0,
            shaderLocation: 0,
        }]
    };

    const sphereNormalBuffer = device.createBuffer({
        label: "sphere normal buffer",
        size: flatSphereNormals.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    const sphereNormalBufferLayout = {
        arrayStride: sizeof['vec4'],
        attributes: [{
            format: 'float32x4',
            offset: 0,
            shaderLocation: 1,
        }]
    }
    device.queue.writeBuffer(sphereNormalBuffer, 0, flatSphereNormals);

    const sphereIndexBuffer = device.createBuffer({
        label: "index buffer",
        size: sphereIndices.byteLength,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    })

    device.queue.writeBuffer(sphereIndexBuffer, 0, sphereIndices);


    const textureBuffer = device.createBuffer({
        label: "texture buffer",
        size: flatten(textureCoordinates).byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    })
    const textureBufferLayout = {
        label: "texture buffer layout",
        arrayStride: sizeof["vec2"],
        attributes: [{
            format: "float32x2",
            offset: 0,
            shaderLocation: 2,
        }]
    }
    device.queue.writeBuffer(textureBuffer, 0, flatten(textureCoordinates))



    // Import wgsl file
    const wgslfile = document.getElementById("wgsl").src;
    const wgslcode = await fetch(wgslfile, { cache: "reload" }).then(r => r.text());
    const wgsl = device.createShaderModule({ code: wgslcode });

    const pipeline = device.createRenderPipeline({
        label: "pipeline",
        layout: 'auto',
        vertex: {
            module: wgsl,
            entryPoint: 'main_vs',
            buffers: [spherePosBufferLayout, sphereNormalBufferLayout, textureBufferLayout],
        },
        fragment: {
            module: wgsl,
            entryPoint: 'main_fs',
            targets: [{ format: canvasFormat }],
        },
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: 'less',
            format: 'depth24plus'
        },
        primitive: {
            topology: 'triangle-list',
            frontFace: "ccw",
            cullMode: "back",
        },
        multisample: {
            count: 4,
        },
    });



    const canvasTexture = context.getCurrentTexture();

    const depthTexture = device.createTexture({
        label: "Depth texture",
        size: [canvas.width, canvas.height],
        format: 'depth24plus',
        sampleCount: 4,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });


    const msaaTexture = device.createTexture({
        label: "msaa texture",
        size: [canvas.width, canvas.height],
        format: canvasTexture.format,
        sampleCount: 4,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    // Seperate depth map, depth texture is used for culling
    const depthMap = device.createTexture({
        size: [canvas.width, canvas.height],
        format: 'depth32float',
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });

    depthMap.sampler = device.createSampler({
        label: "depthMap sampler",

    });


    const uniformBufferSize = 4 * 16; // 4x4 matrix

    const uniformBuffer = device.createBuffer({
        size: uniformBufferSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroup = device.createBindGroup({
        label: "bindgroup",
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: uniformBuffer,
                    offset: 0,
                    size: 64,
                },
            },
            {
                binding: 1,
                resource: depthMap.createView()
            },
            {
                binding: 2,
                resource: depthMap.sampler
            },
        ],
    });

    const aspect = canvas.width / canvas.height
    const projectionMatrix = perspective(90.0, aspect, 0.1, 100.0)
    const modelViewProjectionMatrix = mat4();
    const eye = vec3(1.0, 1.5, 1.5);
    const lookAtPoint = vec3(0.0, 0.0, 0.0);
    const upVec = vec3(0.0, 1.0, 0.0)
    const viewMatrix = lookAt(eye, lookAtPoint, upVec)
    const transformationMatrix = mult(projectionMatrix, mult(viewMatrix, modelViewProjectionMatrix))


    device.queue.writeBuffer(uniformBuffer, 0, flatten(transformationMatrix));

    function render() {
        const encoder = device.createCommandEncoder();

        const pass = encoder.beginRenderPass({
            label: "render pass",
            colorAttachments: [{
                view: msaaTexture.createView(),
                resolveTarget: canvasTexture.createView(),
                loadOp: "clear",
                clearValue: [0.5, 0.5, 0.5, 1.0],
                storeOp: "store",
            }],
            depthStencilAttachment: {
                view: depthTexture.createView(),
                depthLoadOp: "clear",
                depthClearValue: 1.0,
                depthStoreOp: "store",
            }
        });

        pass.setPipeline(pipeline);
        pass.setVertexBuffer(0, spherePosBuffer);
        pass.setVertexBuffer(1, sphereNormalBuffer);
        pass.setVertexBuffer(2, textureBuffer)
        pass.setBindGroup(0, bindGroup);
        pass.setIndexBuffer(sphereIndexBuffer, 'uint32');

        pass.drawIndexed(sphereIndices.length);
        //pass.draw(positions.length);
        pass.end();
        device.queue.submit([encoder.finish()]);

    }
    render()
}   