import {
  Scene,
  Vector3,
  FreeCamera,
  Engine,
  PointLight,
  MeshBuilder,
  StandardMaterial,
  CubeTexture,
  Texture,
} from "@babylonjs/core";
import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";

import { CDLOD } from "./cdlod";
import { SettingsUI } from "./SettingsUI";
import { StatsUI } from "./StatsUI";

class CDLODScene {
  public engine!: Engine;
  public scene!: Scene;
  private camera!: FreeCamera;
  private cdlodTerrain!: CDLOD;

  constructor(private canvas: HTMLCanvasElement) {}

  public async init(): Promise<void> {
    this.engine = new Engine(this.canvas, true);
    this.scene = new Scene(this.engine);
    this.scene.collisionsEnabled = true;
    this.scene.clearColor.set(0.1, 0.1, 0.14, 1);
    //this.scene.debugLayer.show({ overlay: true });

    // Camera
    this.camera = new FreeCamera(
      "freeCamera",
      new Vector3(0, 50, 0),
      this.scene
    );
    this.camera.setTarget(new Vector3(75, 50, 35));
    this.camera.attachControl(this.canvas, true);
    this.camera.checkCollisions = true;
    this.camera.ellipsoid = new Vector3(0.1, 0.1, 0.1);
    this.camera.minZ = 0.1;
    this.camera.maxZ = 8000;
    this.camera.speed = 2;

    // Skybox
    const skybox = MeshBuilder.CreateBox("skyBox", { size: 8000 }, this.scene);
    const skyboxMaterial = new StandardMaterial("skyBox", this.scene);
    skyboxMaterial.backFaceCulling = false;
    skyboxMaterial.disableLighting = true;
    skybox.material = skyboxMaterial;
    skybox.infiniteDistance = true;
    skyboxMaterial.reflectionTexture = new CubeTexture(
      "textures/skybox",
      this.scene
    );
    skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;

    // Light
    const sunLight = new PointLight("sun", new Vector3(0, 0, 0), this.scene);
    sunLight.intensity = 1;

    // Terrain
    this.cdlodTerrain = new CDLOD(this.scene, {
      terrainSize: 2000,
      terrainHeight: 200,
      subdivisions: 16,
    });

    // UI
    new StatsUI(this.scene);
    const settingsGUI = new SettingsUI();

    settingsGUI.onMixFactorChange((value: number) => {
      this.cdlodTerrain.setMixFactor(value);
    });

    settingsGUI.onWireframeToggle((enabled: boolean) => {
      this.cdlodTerrain.setWireframe(enabled);
    });

    settingsGUI.onBoundingBoxToggle((enabled: boolean) => {
      this.cdlodTerrain.setBoundingBox(enabled);
    });
  }

  public run(): void {
    this.engine.runRenderLoop(() => {
      this.cdlodTerrain.update(this.camera);
      this.scene.render();
    });
    window.addEventListener("resize", () => this.engine.resize());
  }
}

const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
if (!canvas) throw new Error("Canvas not found!");

const scene = new CDLODScene(canvas);
await scene.init();
scene.run();
