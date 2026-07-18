const fs = require('fs');
const readline = require('readline');

async function check() {
  const fileStream = fs.createReadStream('../urca_raw.obj');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let numVertices = 0;
  let numFaces = 0;
  let min = [Infinity, Infinity, Infinity];
  let max = [-Infinity, -Infinity, -Infinity];

  for await (const line of rl) {
    if (line.startsWith('v ')) {
      numVertices++;
      const parts = line.trim().split(/\s+/).slice(1).map(Number);
      min[0] = Math.min(min[0], parts[0]);
      min[1] = Math.min(min[1], parts[1]);
      min[2] = Math.min(min[2], parts[2]);
      max[0] = Math.max(max[0], parts[0]);
      max[1] = Math.max(max[1], parts[1]);
      max[2] = Math.max(max[2], parts[2]);
    } else if (line.startsWith('f ')) {
      numFaces++;
    }
  }

  console.log("Raw OBJ Stats:");
  console.log("  Vertices:", numVertices);
  console.log("  Faces:", numFaces);
  console.log("  Min:", min);
  console.log("  Max:", max);
  console.log("  Size X:", max[0] - min[0]);
  console.log("  Size Y:", max[1] - min[1]);
  console.log("  Size Z:", max[2] - min[2]);
}

check().catch(console.error);
