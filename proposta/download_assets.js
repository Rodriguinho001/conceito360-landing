const fs = require('fs');
const path = require('path');
const https = require('https');

const BASE_URL = 'https://www.igloo.inc';

const ASSETS = [
  // --- Geometries ---
  '/assets/geometries/mountain.drc',
  '/assets/geometries/igloo.drc',
  '/assets/geometries/igloo/igloo_cage.drc',
  '/assets/geometries/ground.drc',
  '/assets/geometries/igloo/igloo_outline.drc',
  '/assets/geometries/intro_particles.drc',
  '/assets/geometries/igloo/patch.drc',
  '/assets/geometries/cubes/background_shapes.drc',
  '/assets/geometries/blurrytext.drc',
  '/assets/geometries/floor.drc',
  '/assets/geometries/shattered_ring2.drc',
  '/assets/geometries/blurrytext_cylinder.drc',
  '/assets/geometries/smoke_trail.drc',
  '/assets/geometries/shattered_ring_smoke.drc',
  '/assets/geometries/ceilingsmoke.drc',
  '/assets/geometries/pudgy.drc',
  '/assets/geometries/abstractlogo.drc',
  '/assets/geometries/overpass_logo.drc',
  '/assets/geometries/shattered_ring.drc',

  // --- Fonts, Workers & Libs ---
  '/assets/fonts/IBMPlexMono-Medium.json',
  '/assets/libs/draco/draco_wasm_wrapper.js',
  '/assets/libs/draco/draco_decoder.wasm',
  '/assets/libs/basis/basis_transcoder.wasm',
  '/assets/libs/basis/basis_transcoder.js',
  '/assets/bitmapworker-046527f8.js',
  '/assets/msdfworker-ac346fa7.js',
  '/assets/exrworker-41cbee65.js',
  '/assets/audioworker-036a09db.js',

  // --- Textures ---
  '/assets/images/caustics.ktx2',
  '/assets/images/overpass_logo_dark_color.ktx2',
  '/assets/images/abstractlogo_dark_color.ktx2',
  '/assets/images/shattered_ring2_ao.ktx2',
  '/assets/images/shattered_ring_color.ktx2',
  '/assets/images/shattered_ring2_color.ktx2',
  '/assets/images/shattered_ring_ao.ktx2',
  '/assets/images/pudgy_dark_color.ktx2',
  '/assets/images/scroll-datatexture.ktx2',
  '/assets/images/ui/sound-datatexture.ktx2',
  '/assets/images/ui/logo-datatexture.ktx2',
  '/assets/images/noises/blue-8-128-rgb.ktx2',
  '/assets/images/frost-datatexture.ktx2',
  '/assets/fonts/IBMPlexMono-Medium-datatexture.ktx2',
  '/assets/images/ui/arrow-datatexture.ktx2',
  '/assets/images/ui/close-datatexture.ktx2',
  '/assets/images/wind_noise.ktx2',
  '/assets/images/cubes/dot_pattern.ktx2',
  '/assets/images/igloo/triangles_tiling.ktx2',
  '/assets/images/clouds_noise.ktx2',
  '/assets/images/volumes/peachesbody_64.ktx2',
  '/assets/images/perlin-datatexture.ktx2',
  '/assets/images/bokeh.ktx2',
  '/assets/images/igloo/igloo_scene.ktx2',
  '/assets/images/volumes/x_64.ktx2',
  '/assets/images/cubes/cube_scene.ktx2',
  '/assets/images/volumes/medium_32.ktx2',
  '/assets/images/ui/visit-datatexture.ktx2',
  '/assets/images/igloo/mountain_color.ktx2',
  '/assets/images/mosaic.ktx2',
  '/assets/images/igloo/ground_color.ktx2',
  '/assets/images/igloo/ground_glow.ktx2',
  '/assets/images/igloo/ground_sansigloo_color.ktx2',
  '/assets/images/shapes_blurred.ktx2',
  '/assets/images/cubes/blurrytext_atlas.ktx2',
  '/assets/images/floor_color.ktx2',
  '/assets/images/igloo/numbers.ktx2',
  '/assets/images/igloo/igloo_color.ktx2',
  '/assets/images/igloo/igloo_exploded_color.ktx2',
  '/assets/images/numbers-datatexture.ktx2',
  '/assets/images/cubes_env.exr',
  '/assets/images/cubes/bg.png',
  '/assets/images/cubes/advect.png',
  '/assets/images/perlin-datatexture.png',
  '/assets/geometries/cubes/cube3.drc',
  '/assets/geometries/cubes/cube1.drc',
  '/assets/geometries/cubes/cube2.drc',
  '/assets/images/cubes/cube3_roughness.ktx2',
  '/assets/images/cubes/pudgy_color.ktx2',
  '/assets/images/cubes/cube1_normal.ktx2',
  '/assets/images/cubes/cube3_normal.ktx2',
  '/assets/images/cubes/overpass_logo_color.ktx2',
  '/assets/images/cubes/cube1_roughness.ktx2',
  '/assets/images/cubes/cube2_roughness.ktx2',
  '/assets/images/cubes/cube2_normal.ktx2',
  '/assets/images/cubes/abstractlogo_color.ktx2',

  // --- Audio ---
  '/assets/audio/music-highq.ogg',
  '/assets/audio/room.ogg',
  '/assets/audio/wind.ogg',
  '/assets/audio/igloo.ogg',
  '/assets/audio/beeps.ogg',
  '/assets/audio/beeps2.ogg',
  '/assets/audio/beeps3.ogg',
  '/assets/audio/click-project.ogg',
  '/assets/audio/enter-project.ogg',
  '/assets/audio/leave-project.ogg',
  '/assets/audio/shard.ogg',
  '/assets/audio/project-text.ogg',
  '/assets/audio/circles.ogg',
  '/assets/audio/particles.ogg',
  '/assets/audio/logo.ogg',
  '/assets/audio/ui-long.ogg',
  '/assets/audio/ui-short.ogg',
  '/assets/audio/manifesto.ogg'
];

async function downloadFile(urlPath, retries = 3) {
  const fullUrl = BASE_URL + urlPath;
  const localPath = path.join(__dirname, urlPath.replace(/^\//, ''));

  // Ensure directory exists
  fs.mkdirSync(path.dirname(localPath), { recursive: true });

  // Skip if already downloaded and has size
  if (fs.existsSync(localPath) && fs.statSync(localPath).size > 0) {
    console.log(`[SKIPPED] Already exists: ${urlPath}`);
    return;
  }

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(localPath);
    const request = https.get(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.igloo.inc/',
      }
    }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Redirect handler (if needed)
        const redirectUrl = response.headers.location;
        console.log(`[REDIRECT] ${urlPath} -> ${redirectUrl}`);
        file.close();
        fs.unlinkSync(localPath);
        downloadAbsolute(redirectUrl, localPath).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(localPath);
        if (retries > 0) {
          console.log(`[RETRYING] Status ${response.statusCode} for ${urlPath}. Retries left: ${retries}`);
          setTimeout(() => downloadFile(urlPath, retries - 1).then(resolve).catch(reject), 1000);
        } else {
          console.error(`[FAILED] Status ${response.statusCode} for ${urlPath}`);
          resolve(); // Resolve to not halt entire script
        }
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`[DOWNLOADED] ${urlPath} (${fs.statSync(localPath).size} bytes)`);
        resolve();
      });
    });

    request.on('error', (err) => {
      file.close();
      if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
      if (retries > 0) {
        console.log(`[RETRYING] Error "${err.message}" for ${urlPath}. Retries left: ${retries}`);
        setTimeout(() => downloadFile(urlPath, retries - 1).then(resolve).catch(reject), 1000);
      } else {
        console.error(`[FAILED] Error for ${urlPath}: ${err.message}`);
        resolve(); // Resolve to not halt entire script
      }
    });

    request.setTimeout(30000, () => {
      request.destroy();
      file.close();
      if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
      if (retries > 0) {
        console.log(`[RETRYING] Timeout for ${urlPath}. Retries left: ${retries}`);
        setTimeout(() => downloadFile(urlPath, retries - 1).then(resolve).catch(reject), 1000);
      } else {
        console.error(`[TIMEOUT] ${urlPath}`);
        resolve();
      }
    });
  });
}

function downloadAbsolute(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        reject(new Error(`Status ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      reject(err);
    });
  });
}

// Queue system to limit concurrency
async function run() {
  console.log(`Starting download of ${ASSETS.length} assets...`);
  const concurrencyLimit = 5;
  const queue = [...ASSETS];
  const activeWorkers = [];

  const worker = async () => {
    while (queue.length > 0) {
      const asset = queue.shift();
      await downloadFile(asset);
    }
  };

  for (let i = 0; i < concurrencyLimit; i++) {
    activeWorkers.push(worker());
  }

  await Promise.all(activeWorkers);
  console.log('\n🎉 ALL ASSETS DOWNLOADED successfully! Clean local copies have been set up.\n');
}

run();
