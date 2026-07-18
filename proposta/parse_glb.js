const { NodeIO } = require('@gltf-transform/core');
const fs = require('fs');

async function parse() {
  const io = new NodeIO();
  const document = await io.read('../morro-da-urca.glb');
  
  const root = document.getRoot();
  const meshes = root.listMeshes();
  
  if (meshes.length === 0) {
    console.error("No meshes found");
    return;
  }
  
  const mesh = meshes[0];
  const primitive = mesh.listPrimitives()[0];
  
  const posAccessor = primitive.getAttribute('POSITION');
  const indexAccessor = primitive.getIndices();
  
  const positions = posAccessor.getArray();
  const indices = indexAccessor.getArray();
  
  const triangles = [];
  
  // 1. Calculate bounding box of the entire mesh
  let min = [Infinity, Infinity, Infinity];
  let max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i];
    const b = indices[i+1];
    const c = indices[i+2];
    
    const pA = [positions[a*3], positions[a*3+1], positions[a*3+2]];
    const pB = [positions[b*3], positions[b*3+1], positions[b*3+2]];
    const pC = [positions[c*3], positions[c*3+1], positions[c*3+2]];
    
    // We keep all triangles! The model looks better as a whole.
    triangles.push(...pA, ...pB, ...pC);
    
    for (let p of [pA, pB, pC]) {
      min[0] = Math.min(min[0], p[0]);
      min[1] = Math.min(min[1], p[1]);
      min[2] = Math.min(min[2], p[2]);
      max[0] = Math.max(max[0], p[0]);
      max[1] = Math.max(max[1], p[1]);
      max[2] = Math.max(max[2], p[2]);
    }
  }
  
  const bSizeX = max[0] - min[0];
  const bSizeY = max[1] - min[1];
  const bSizeZ = max[2] - min[2];
  const numTriangles = triangles.length / 9;
  
  // Group triangles into pieces (chunks) to avoid creating 40,000 separate geometries
  const targetPieces = 1000;
  let trianglesPerPiece = Math.ceil(numTriangles / targetPieces);
  if (trianglesPerPiece < 1) trianglesPerPiece = 1;
  const numPieces = Math.ceil(numTriangles / trianglesPerPiece);
  
  const floatArray = new Float32Array(triangles);
  fs.writeFileSync('morro_triangles.bin', Buffer.from(floatArray.buffer));
  
  const meta = {
    numTriangles,
    numPieces,
    trianglesPerPiece,
    min, max, bSizeX, bSizeY, bSizeZ
  };
  fs.writeFileSync('morro_meta.json', JSON.stringify(meta));
  console.log("Exported", meta.numTriangles, "triangles in", numPieces, "pieces");
  console.log("New Bounding Box:", JSON.stringify(meta));
}

parse().catch(console.error);
