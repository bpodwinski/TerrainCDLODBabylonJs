import {
  AbstractMesh,
  Engine,
  Mesh,
  Scene,
  SceneInstrumentation,
} from "@babylonjs/core";
import {
  AdvancedDynamicTexture,
  Control,
  Rectangle,
  TextBlock,
} from "@babylonjs/gui";

export class StatsUI {
  private advancedTexture: AdvancedDynamicTexture;
  private statsText: TextBlock;
  private statsContainer: Rectangle;
  private instrumentation: SceneInstrumentation;

  public statsToDisplay: string[] = [
    "totalVertices",
    "activeIndices",
    "activeFaces",
    "activeMeshes",
    "fps",
    "frameTime",
    "drawCalls",
    "resolution",
  ];

  constructor(private scene: Scene) {
    this.instrumentation = new SceneInstrumentation(scene);
    this.advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI");

    this.statsContainer = new Rectangle();
    this.statsContainer.background = "rgba(0, 0, 0, 0.7)";
    this.statsContainer.width = "200px";
    this.statsContainer.height = "155px";
    this.statsContainer.thickness = 0;
    this.statsContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.statsContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.advancedTexture.addControl(this.statsContainer);

    this.statsText = new TextBlock();
    this.statsText.text = "Stats";
    this.statsText.color = "#ffffff";
    this.statsText.fontSize = 14;
    this.statsText.paddingTop = "10px";
    this.statsText.paddingBottom = "10px";
    this.statsText.paddingLeft = "10px";
    this.statsText.paddingRight = "10px";
    this.statsText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.statsText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.statsContainer.addControl(this.statsText);

    setInterval(() => this.updateStats(), 200);
  }

  private getStats(scene: Scene): Record<string, string> {
    let totalVertices = 0;
    let activeIndices = 0;

    scene.getActiveMeshes().forEach((mesh: AbstractMesh) => {
      if (mesh instanceof Mesh) {
        const posBuffer = mesh.getVertexBuffer("position");
        totalVertices += posBuffer ? posBuffer._maxVerticesCount : 0;
        activeIndices += mesh.getTotalIndices();
      }
    });

    const activeFaces = activeIndices / 3;
    const totalMeshes = scene.meshes.length;
    const activeMeshes = scene.getActiveMeshes().length;

    const engine = scene.getEngine() as Engine;
    const fps = engine.getFps();
    const deltaTime = engine.getDeltaTime();
    const resolution = `${engine.getRenderWidth()} x ${engine.getRenderHeight()}`;
    const drawCalls = this.instrumentation.drawCallsCounter.current;
    const engineInfo = engine.getInfo();
    const rendererInfo = engineInfo.renderer || "N/A";
    const rendererVersion = engineInfo.version || "N/A";

    return {
      totalVertices: `${totalVertices}`,
      activeIndices: `${activeIndices}`,
      activeFaces: `${activeFaces}`,
      totalMeshes: `${totalMeshes}`,
      activeMeshes: `${activeMeshes}`,
      fps: `${fps.toFixed(0)}`,
      frameTime: `${deltaTime.toFixed(2)} ms`,
      drawCalls: `${drawCalls}`,
      renderer: `${rendererInfo}`,
      engine: `${rendererVersion}`,
      resolution: `${resolution}`,
    };
  }

  private updateStats(): void {
    const stats = this.getStats(this.scene);
    let message = "";
    this.statsToDisplay.forEach((key) => {
      message += `${this.formatKey(key)}: ${stats[key] ?? "N/A"}\n`;
    });
    this.statsText.text = message;
  }

  private formatKey(key: string): string {
    switch (key) {
      case "totalVertices":
        return "Total vertices";
      case "activeIndices":
        return "Active indices";
      case "activeFaces":
        return "Active faces";
      case "totalMeshes":
        return "Total meshes";
      case "activeMeshes":
        return "Active meshes";
      case "fps":
        return "FPS";
      case "frameTime":
        return "Frame time";
      case "drawCalls":
        return "Draw calls";
      case "renderer":
        return "Renderer";
      case "engine":
        return "Engine";
      case "resolution":
        return "Resolution";
      default:
        return key;
    }
  }
}
