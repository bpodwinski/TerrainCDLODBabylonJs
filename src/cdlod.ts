import {
  Scene,
  Mesh,
  MeshBuilder,
  Vector3,
  BoundingBox,
  FreeCamera,
  Plane,
  Frustum,
  ShaderMaterial,
  Texture,
  Effect,
  Vector2,
  Vector4,
  BoundingInfo,
} from "@babylonjs/core";

import terrainVertexShader from "./shaders/terrainVertexShader.glsl?raw";
import terrainFragmentShader from "./shaders/terrainFragmentShader.glsl?raw";

Effect.ShadersStore["terrainVertexShader"] = terrainVertexShader;
Effect.ShadersStore["terrainFragmentShader"] = terrainFragmentShader;

/**
 * Interface for configuring the CDLOD system
 */
export interface ICDLODOptions {
  /** Total terrain size (side length of the square terrain) */
  terrainSize: number;
  /** Maximum terrain height */
  terrainHeight: number;
  /** Minimum LOD distance (optional) */
  minLodDistance?: number;
  /** Number of LOD levels */
  lodLevels?: number;
  /** Number of subdivisions for the base grid */
  subdivisions?: number;
  /** Whether to show the shunks (wireframe mode) for debugging */
  showChunk?: boolean;
  /** Whether to display the bounding boxes */
  showBoundingBox?: boolean;
}

/**
 * CDLOD (Continuous Distance-Dependent Level-Of-Detail) system for terrain
 *
 * This class creates a quadtree over the terrain and updates chunks
 * based on the camera's position. It uses a shader to morph vertices near LOD transitions
 * in order to remove seams
 */
export class CDLOD {
  public scene: Scene;
  public showChunk: boolean = false;
  public showBoundingBox: boolean = false;

  private root: Chunk;
  private lodRanges: number[] = [];
  private lodLevels: number;
  private terrainSize: number;
  private terrainHeight: number;
  private terrainShader: ShaderMaterial;
  private subdivisions: number;
  private baseGrid: Mesh;

  /**
   * Creates an instance of the CDLOD system.
   *
   * @param scene - The Babylon.js scene
   * @param options - CDLOD configuration options
   */
  constructor(scene: Scene, options: ICDLODOptions) {
    const defaults: Required<ICDLODOptions> = {
      terrainSize: 100,
      terrainHeight: 10,
      minLodDistance: 25,
      lodLevels: 7,
      subdivisions: 32,
      showChunk: false,
      showBoundingBox: false,
    };

    const config: Required<ICDLODOptions> = { ...defaults, ...options };

    this.scene = scene;
    this.terrainSize = config.terrainSize;
    this.terrainHeight = config.terrainHeight;
    this.lodLevels = config.lodLevels;
    this.subdivisions = config.subdivisions;
    this.showChunk = config.showChunk;
    this.showBoundingBox = config.showBoundingBox;

    // If minLodDistance is not provided, default to terrainSize/15
    if (!options.minLodDistance) {
      config.minLodDistance = config.terrainSize / 15;
    }

    // Compute LOD ranges
    for (let i = 0; i < this.lodLevels; i++) {
      this.lodRanges[i] = config.minLodDistance * Math.pow(2, i);
    }

    // Create a bounding box for the entire terrain (centered at 0,0,0)
    const boundingBox = new BoundingBox(
      new Vector3(
        -this.terrainSize * 0.5,
        -this.terrainSize * 0.5,
        -this.terrainSize * 0.5
      ),
      new Vector3(
        this.terrainSize * 0.5,
        this.terrainSize * 0.5,
        this.terrainSize * 0.5
      )
    );

    this.root = this.buildQuadtree(boundingBox, this.lodLevels);

    // Create the terrain shader material
    this.terrainShader = new ShaderMaterial(
      "terrainShader",
      this.scene,
      {
        vertex: "terrain",
        fragment: "terrain",
      },
      {
        attributes: ["position", "uv"],
        uniforms: [
          "worldViewProjection",
          "world",
          "terrainSize",
          "terrainHeight",
          "uvOffset",
          "uvScale",
          "chunkColor",
          "mixFactor",
          "mesh_dim",
          "lodLevel",
          "lodRangesLUT",
          "cameraPosition",
          "detailStrength",
          "detailScale",
        ],
        samplers: ["heightMap", "diffuseTexture", "detailTexture"],
      }
    );

    // Create base grid mesh (1x1) that will be used as the patch for each chunk
    this.baseGrid = MeshBuilder.CreateGround(
      "baseGrid",
      { width: 1, height: 1, subdivisions: this.subdivisions },
      this.scene
    );
    this.baseGrid.setEnabled(false);

    // Height
    this.terrainShader.setTexture(
      "heightMap",
      new Texture("textures/heightmap.ktx2", this.scene)
    );
    this.terrainShader.setFloat("terrainHeight", this.terrainHeight);
    this.terrainShader.setFloat("terrainSize", this.terrainSize);

    // Diffuse
    this.terrainShader.setTexture(
      "diffuseTexture",
      new Texture("textures/diffusemap.ktx2", this.scene)
    );

    // Detailed
    this.terrainShader.setTexture(
      "detailTexture",
      new Texture("textures/detailmap.ktx2", this.scene)
    );
    this.terrainShader.setFloat("detailStrength", 0.5);
    this.terrainShader.setFloat("detailScale", 200.0);
  }

  /**
   * Recursively builds a quadtree based on the bounding box
   *
   * @param boundingBox - The bounding box for the current chunk
   * @param level - The current LOD level
   * @return A Chunk representing this portion of the terrain
   */
  private buildQuadtree(boundingBox: BoundingBox, level: number): Chunk {
    if (level < 0) {
      return new Chunk(boundingBox, 0, 0, this.terrainHeight);
    }

    const min = boundingBox.minimum;
    const max = boundingBox.maximum;
    const mid = Vector3.Center(min, max);

    const boxes = [
      new BoundingBox(
        new Vector3(min.x, 0, min.z),
        new Vector3(mid.x, this.terrainHeight, mid.z)
      ),
      new BoundingBox(
        new Vector3(mid.x, 0, min.z),
        new Vector3(max.x, this.terrainHeight, mid.z)
      ),
      new BoundingBox(
        new Vector3(min.x, 0, mid.z),
        new Vector3(mid.x, this.terrainHeight, max.z)
      ),
      new BoundingBox(
        new Vector3(mid.x, 0, mid.z),
        new Vector3(max.x, this.terrainHeight, max.z)
      ),
    ];

    const chunk = new Chunk(boundingBox, level, 0, this.terrainHeight);
    for (const box of boxes) {
      chunk.children.push(this.buildQuadtree(box, level - 1));
    }

    return chunk;
  }

  /**
   * Selects the chunks to render based on the camera position
   *
   * @param camera - The FreeCamera instance
   * @return An array of Chunks that should be rendered
   */
  public selectLods(camera: FreeCamera): Chunk[] {
    const drawList: Chunk[] = [];
    this.traverseAndSelect(this.root, this.lodLevels - 1, camera, drawList);
    return drawList;
  }

  private isChunkWithinLodRange(
    chunk: Chunk,
    camera: FreeCamera,
    lodLevel: number
  ): boolean {
    const center = chunk.boundingBox.center;
    const cameraPos = camera.position;
    const distance3D = Vector3.Distance(center, cameraPos);

    return distance3D < this.lodRanges[lodLevel];
  }

  private traverseAndSelect(
    chunk: Chunk,
    lodLevel: number,
    camera: FreeCamera,
    drawList: Chunk[]
  ): void {
    const planes = Frustum.GetPlanes(camera.getTransformationMatrix());
    if (!chunk.frustumIntersect(planes)) return;

    if (!this.isChunkWithinLodRange(chunk, camera, lodLevel)) {
      drawList.push(chunk);
    } else {
      for (const child of chunk.children) {
        this.traverseAndSelect(child, lodLevel - 1, camera, drawList);
      }
    }
  }

  /**
   * Updates a chunk’s mesh by cloning the base grid, scaling and positioning it,
   * and setting the shader uniforms.
   *
   * @param chunk - The chunk to update
   * @param camera - The current camera
   */
  public updateChunkMesh(chunk: Chunk, camera: FreeCamera): void {
    if (!chunk.mesh && this.baseGrid) {
      chunk.mesh = this.baseGrid.clone(`chunk_${chunk.lodLevel}`) as Mesh;
      chunk.mesh.setEnabled(true);
      chunk.mesh.checkCollisions = true;

      const bb = chunk.boundingBox;
      const width = bb.maximum.x - bb.minimum.x;
      const height = bb.maximum.z - bb.minimum.z;
      const centerX = (bb.maximum.x + bb.minimum.x) * 0.5;
      const centerZ = (bb.maximum.z + bb.minimum.z) * 0.5;

      // Scale and position the chunk patch relative to the full terrain size
      chunk.mesh.scaling.x = width;
      chunk.mesh.scaling.z = height;
      chunk.mesh.position.set(centerX, 0, centerZ);

      // Clone the shader material
      const chunkMat = this.terrainShader.clone(
        `terrainShader_${chunk.lodLevel}`
      );
      chunk.mesh.material = chunkMat;

      if (this.showChunk) {
        chunkMat.wireframe = true;
      }

      if (this.showBoundingBox) {
        chunk.mesh.showBoundingBox = true;
      }

      // Compute UV offsets and scale based on the chunk's bounding box
      const uvOffset = new Vector2(
        (bb.minimum.x + this.terrainSize * 0.5) / this.terrainSize,
        (bb.minimum.z + this.terrainSize * 0.5) / this.terrainSize
      );

      const uvScale = new Vector2(
        width / this.terrainSize,
        height / this.terrainSize
      );

      (chunk.mesh.material as ShaderMaterial).setVector2("uvOffset", uvOffset);
      (chunk.mesh.material as ShaderMaterial).setVector2("uvScale", uvScale);

      // Set a debugging chunk color based on LOD level
      const lodColors = [
        new Vector4(1, 0, 0, 1),
        new Vector4(1, 0.5, 0, 1),
        new Vector4(1, 1, 0, 1),
        new Vector4(0, 1, 0, 1),
        new Vector4(0, 1, 1, 1),
        new Vector4(0, 0, 1, 1),
        new Vector4(0.5, 0, 1, 1),
        new Vector4(1, 0, 1, 1),
      ];
      const color = lodColors[chunk.lodLevel % lodColors.length];
      (chunk.mesh.material as ShaderMaterial).setVector4("chunkColor", color);

      // Update shader uniforms for morphing
      (chunk.mesh.material as ShaderMaterial).setFloat(
        "mesh_dim",
        this.subdivisions
      );
      (chunk.mesh.material as ShaderMaterial).setFloat(
        "lodLevel",
        chunk.lodLevel
      );
      (chunk.mesh.material as ShaderMaterial).setFloats(
        "lodRangesLUT",
        this.lodRanges
      );
      (chunk.mesh.material as ShaderMaterial).setVector3(
        "cameraPosition",
        camera.position
      );

      const currentBI = chunk.mesh.getBoundingInfo();
      const currentMin = currentBI.boundingBox.minimum;
      const currentMax = currentBI.boundingBox.maximum;
      currentMin.y = 0;
      currentMax.y = this.terrainHeight;
      chunk.mesh.setBoundingInfo(new BoundingInfo(currentMin, currentMax));
    }
  }

  /**
   * Updates the CDLOD system by selecting the appropriate chunks and updating their meshes
   *
   * @param camera - The current FreeCamera
   */
  public update(camera: FreeCamera): void {
    const chunksToRender = this.selectLods(camera);
    const renderSet = new Set(chunksToRender);
    for (const chunk of chunksToRender) {
      this.updateChunkMesh(chunk, camera);
    }
    this.disposeUnusedMeshes(this.root, renderSet);
  }

  private disposeUnusedMeshes(chunk: Chunk, renderSet: Set<Chunk>): void {
    if (!renderSet.has(chunk)) {
      if (chunk.mesh) {
        chunk.mesh.dispose();
        chunk.mesh = null;
      }
    }
    for (const child of chunk.children) {
      this.disposeUnusedMeshes(child, renderSet);
    }
  }

  public setMixFactor(factor: number): void {
    const applyMixFactor = (chunk: Chunk) => {
      if (chunk.mesh?.material) {
        (chunk.mesh.material as ShaderMaterial).setFloat("mixFactor", factor);
      }
      chunk.children.forEach(applyMixFactor);
    };

    applyMixFactor(this.root);
  }

  public setWireframe(enabled: boolean): void {
    this.showChunk = enabled;

    const applyWireframe = (chunk: Chunk) => {
      if (chunk.mesh?.material) {
        (chunk.mesh.material as ShaderMaterial).wireframe = enabled;
      }
      chunk.children.forEach(applyWireframe);
    };

    applyWireframe(this.root);
  }

  public setBoundingBox(enabled: boolean): void {
    this.showBoundingBox = enabled;

    const applyBoundingBox = (chunk: Chunk) => {
      if (chunk.mesh) {
        chunk.mesh.showBoundingBox = enabled;
      }
      chunk.children.forEach(applyBoundingBox);
    };

    applyBoundingBox(this.root);
  }
}

/**
 * Represents a chunk in quadtree
 */
export class Chunk {
  public children: Chunk[] = [];
  public mesh: Mesh | null = null;
  public minHeight: number;
  public maxHeight: number;

  /**
   * Creates new Chunk
   *
   * @param boundingBox - The bounding box for this chunk
   * @param lodLevel - The LOD level of this chunk
   * @param minHeight - The minimum height value
   * @param maxHeight - The maximum height value
   */
  constructor(
    public boundingBox: BoundingBox,
    public lodLevel: number,
    minHeight: number,
    maxHeight: number
  ) {
    this.minHeight = minHeight;
    this.maxHeight = maxHeight;
  }

  public sphereIntersect(distance: number, cameraPos: Vector3): boolean {
    const center = this.boundingBox.center;
    return Vector3.Distance(center, cameraPos) < distance;
  }

  public frustumIntersect(planes: Plane[]): boolean {
    return this.boundingBox.isInFrustum(planes);
  }
}
