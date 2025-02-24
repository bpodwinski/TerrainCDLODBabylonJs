#define NUM_LOD_LEVELS 6

precision highp float;

//--------------------------------
// Mesh attributes
//--------------------------------
attribute vec3 position; // Vertex position (x, y, z)
attribute vec2 uv;

//--------------------------------
// Uniforms
//--------------------------------
uniform mat4 worldViewProjection;
uniform mat4 world;
uniform sampler2D heightMap;

uniform float terrainHeight;
uniform float terrainSize;

uniform vec2 uvOffset;
uniform vec2 uvScale;

// LOD and morphing data
uniform float mesh_dim;                     // Patch subdivisions
uniform float lodLevel;                     // Current LOD level
uniform float lodRangesLUT[NUM_LOD_LEVELS]; // Distance thresholds per LOD
uniform vec3 cameraPosition;

varying vec2 vUV;
varying vec2 vFraction;

float getMorphValue(float dist, float lodLvl) {
  float low = (lodLvl > 0.0) ? lodRangesLUT[int(lodLvl) - 1] : 0.0;
  float high = lodRangesLUT[int(lodLvl)];
  float delta = high - low;

  float factor = (dist - low) / delta;
  return clamp(factor / 0.3 - 1.0, 0.0, 1.0);
}

vec2 morphVertex(vec2 vertexXZ, vec2 uvCoord, float morph) {
  vec2 frac = fract(uvCoord * mesh_dim * 0.5) * 2.0 / mesh_dim;
  return vertexXZ - frac * morph;
}

void main(void) {
  // UV calculation
  vec2 uvFine = uv * uvScale + uvOffset;
  vec2 frac = fract(uv * (mesh_dim * 0.5)) / (mesh_dim * 0.5);
  vec2 uvCoarse = (uv - frac) * uvScale + uvOffset;

  // Sample heightmap for fine and coarse heights
  float fineH = texture2D(heightMap, uvFine).r * terrainHeight;
  float coarseH = texture2D(heightMap, uvCoarse).r * terrainHeight;

  // Compute camera distance
  vec3 localPos = position;
  localPos.y = fineH;
  vec4 worldPos = world * vec4(localPos, 1.0);
  float dist = distance(worldPos.xyz, cameraPosition);

  // Compute morph factor
  float morphValue = getMorphValue(dist, lodLevel);

  // Interpolate height
  float finalHeight = mix(fineH, coarseH, morphValue);
  vec3 displacedPosition = position;
  displacedPosition.y = finalHeight;

  // Apply morphing in XZ
  vec2 newXZ = morphVertex(displacedPosition.xz, uv, morphValue);
  displacedPosition.x = newXZ.x;
  displacedPosition.z = newXZ.y;

  // Adjust UVs for texturing
  vUV = mix(uvFine, uvCoarse, morphValue);
  vFraction = frac; // Debug

  // Final
  gl_Position = worldViewProjection * vec4(displacedPosition, 1.0);
}
