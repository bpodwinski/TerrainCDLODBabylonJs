precision highp float;
varying vec2 vUV;

uniform sampler2D diffuseTexture;
uniform sampler2D detailTexture;

uniform vec4 chunkColor;
uniform float mixFactor;
uniform float detailStrength;
uniform float detailScale;

void main(void) {
  vec4 diffuseColor = texture2D(diffuseTexture, vUV);
  vec4 detailColor = texture2D(detailTexture, vUV * detailScale);

  vec4 colorWithDetail = diffuseColor * mix(vec4(1.0), detailColor, detailStrength);

  gl_FragColor = mix(colorWithDetail, chunkColor, mixFactor);
}
