const turf = require('@turf/turf');

let sharp = null;
try {
  sharp = require('sharp');
} catch {
  sharp = null;
}

function calculateMetrics(geojson) {
  const areaSqMeters = turf.area(geojson);
  const coords =
    geojson.type === 'Feature' ? geojson.geometry.coordinates : geojson.coordinates;
  const perimeterMeters = Math.round(
    turf.length(turf.lineString(coords[0]), { units: 'meters' })
  );

  return {
    areaSqMeters: Math.round(areaSqMeters),
    acres: Number((areaSqMeters * 0.0002471053814671653).toFixed(2)),
    hectares: Number((areaSqMeters / 10000).toFixed(2)),
    perimeterMeters,
  };
}

function latLngToTile(lat, lng, zoom) {
  const n = Math.pow(2, zoom);
  const xFloat = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const yFloat =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;

  const tileX = Math.floor(xFloat);
  const tileY = Math.floor(yFloat);
  const pixelX = Math.floor((xFloat - tileX) * 256);
  const pixelY = Math.floor((yFloat - tileY) * 256);

  return { tileX, tileY, pixelX, pixelY };
}

function tilePixelToLngLat(tileX, tileY, pixelX, pixelY, zoom) {
  const n = Math.pow(2, zoom);
  const lng = ((tileX + pixelX / 256) / n) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * (tileY + pixelY / 256)) / n)));
  const lat = (latRad * 180) / Math.PI;
  return [lng, lat];
}

function buildStarterFieldPolygon(lat, lng, zoom = 17) {
  const scaleFactor = Math.pow(2, 17 - zoom);
  const dLat = 0.00055 * scaleFactor;
  const dLng = 0.00075 * scaleFactor;

  const poly = turf.polygon([[
    [lng - dLng, lat - dLat],
    [lng + dLng * 0.85, lat - dLat * 0.9],
    [lng + dLng, lat + dLat * 0.3],
    [lng + dLng * 0.65, lat + dLat],
    [lng - dLng * 0.8, lat + dLat * 0.95],
    [lng - dLng, lat - dLat],
  ]]);

  return turf.simplify(poly, { tolerance: 0.000015, highQuality: true });
}

// Vision-based region-growing boundary extractor on Esri World Imagery tiles in Node.js
async function detectVisionBoundary(lat, lng, zoom = 17) {
  const clampedZoom = Math.min(18, Math.max(15, Number(zoom) || 17));
  if (!sharp) {
    return buildStarterFieldPolygon(lat, lng, clampedZoom);
  }

  const { tileX, tileY, pixelX, pixelY } = latLngToTile(lat, lng, clampedZoom);
  const tileUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${clampedZoom}/${tileY}/${tileX}`;

  try {
    const response = await fetch(tileUrl);
    if (!response.ok) {
      return buildStarterFieldPolygon(lat, lng, clampedZoom);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const { data, info } = await sharp(buffer)
      .resize(256, 256)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const width = info.width;
    const height = info.height;
    const startX = Math.min(width - 2, Math.max(1, pixelX));
    const startY = Math.min(height - 2, Math.max(1, pixelY));

    const getRgb = (x, y) => {
      const idx = (y * width + x) * 3;
      return [data[idx], data[idx + 1], data[idx + 2]];
    };

    const seedRgb = getRgb(startX, startY);
    const colorDiff = (a, b) =>
      Math.abs(a[0] - b[0]) * 0.35 +
      Math.abs(a[1] - b[1]) * 0.4 +
      Math.abs(a[2] - b[2]) * 0.25;

    const visited = new Uint8Array(width * height);
    const mask = new Uint8Array(width * height);
    const queue = [[startX, startY]];
    visited[startY * width + startX] = 1;

    const maxRadius = 72;
    const threshold = 34;
    let count = 0;

    while (queue.length > 0 && count < 4500) {
      const [cx, cy] = queue.shift();
      if (Math.abs(cx - startX) > maxRadius || Math.abs(cy - startY) > maxRadius) {
        continue;
      }

      const currentRgb = getRgb(cx, cy);
      if (colorDiff(seedRgb, currentRgb) <= threshold) {
        mask[cy * width + cx] = 1;
        count += 1;

        const neighbors = [
          [cx + 1, cy],
          [cx - 1, cy],
          [cx, cy + 1],
          [cx, cy - 1],
        ];
        for (const [nx, ny] of neighbors) {
          if (nx < 1 || nx >= width - 1 || ny < 1 || ny >= height - 1) continue;
          const nIdx = ny * width + nx;
          if (!visited[nIdx]) {
            visited[nIdx] = 1;
            queue.push([nx, ny]);
          }
        }
      }
    }

    if (count < 120) {
      return buildStarterFieldPolygon(lat, lng, clampedZoom);
    }

    // Collect outer boundary pixels of the segmented field mask
    const boundaryPixels = [];
    for (let y = 1; y < height - 1; y += 2) {
      for (let x = 1; x < width - 1; x += 2) {
        if (!mask[y * width + x]) continue;
        const isEdge =
          !mask[y * width + (x + 1)] ||
          !mask[y * width + (x - 1)] ||
          !mask[(y + 1) * width + x] ||
          !mask[(y - 1) * width + x];
        if (isEdge) {
          boundaryPixels.push([x, y]);
        }
      }
    }

    if (boundaryPixels.length < 6) {
      return buildStarterFieldPolygon(lat, lng, clampedZoom);
    }

    const points = turf.featureCollection(
      boundaryPixels.map(([px, py]) =>
        turf.point(tilePixelToLngLat(tileX, tileY, px, py, clampedZoom))
      )
    );

    const hull = turf.convex(points);
    if (!hull) {
      return buildStarterFieldPolygon(lat, lng, clampedZoom);
    }

    return turf.simplify(hull, { tolerance: 0.000012, highQuality: true });
  } catch {
    return buildStarterFieldPolygon(lat, lng, clampedZoom);
  }
}

module.exports = {
  calculateMetrics,
  buildStarterFieldPolygon,
  detectVisionBoundary,
};