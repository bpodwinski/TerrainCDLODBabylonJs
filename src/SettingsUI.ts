import {
  AdvancedDynamicTexture,
  SelectionPanel,
  CheckboxGroup,
  Control,
  Checkbox,
  SliderGroup,
} from "@babylonjs/gui";

export class SettingsUI {
  public advancedTexture: AdvancedDynamicTexture;
  public panel: SelectionPanel;
  public checkboxGroup: CheckboxGroup;
  public wireframeCheckbox: Checkbox;
  public boundingBoxCheckbox: Checkbox;
  public mixFactorSlider: SliderGroup;

  private _wireframeEnabled: boolean = false;
  private _boundingBoxEnabled: boolean = false;
  private _mixFactor: number = 0.0;

  private _onWireframeToggleCallback: ((enabled: boolean) => void) | null =
    null;
  private _onBoundingBoxToggleCallback: ((enabled: boolean) => void) | null =
    null;
  private _onMixFactorChangeCallback: ((value: number) => void) | null = null;

  constructor() {
    this.advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI");

    this.panel = new SelectionPanel("settingsPanel");
    this.panel.width = "250px";
    this.panel.height = "400px";
    this.panel.headerColor = "#cccccc";
    this.panel.color = "#cccccc";
    this.panel.background = "#333333";
    this.panel.alpha = 0.9;
    this.panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    this.panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    this.advancedTexture.addControl(this.panel);

    this.checkboxGroup = new CheckboxGroup("Settings");

    // Wireframe
    this.wireframeCheckbox = new Checkbox("wireframeCheckbox");
    this.wireframeCheckbox.width = "15px";
    this.wireframeCheckbox.height = "15px";
    this.wireframeCheckbox.isChecked = this._wireframeEnabled;
    this.checkboxGroup.addCheckbox("Wireframe", (isChecked: boolean) => {
      this._wireframeEnabled = isChecked;
      if (this._onWireframeToggleCallback) {
        this._onWireframeToggleCallback(isChecked);
      }
    });

    // Bounding box
    this.boundingBoxCheckbox = new Checkbox("boundingBoxCheckbox");
    this.boundingBoxCheckbox.width = "15px";
    this.boundingBoxCheckbox.height = "15px";
    this.boundingBoxCheckbox.isChecked = this._boundingBoxEnabled;
    this.checkboxGroup.addCheckbox("Bounding box", (isChecked: boolean) => {
      this._boundingBoxEnabled = isChecked;
      if (this._onBoundingBoxToggleCallback) {
        this._onBoundingBoxToggleCallback(isChecked);
      }
    });

    this.panel.addGroup(this.checkboxGroup);

    // Node color
    this.mixFactorSlider = new SliderGroup("Node");
    let displayValue = (value: number) => Math.round(value * 100);

    this.mixFactorSlider.addSlider(
      "Color",
      (value: number) => {
        this._mixFactor = value;
        if (this._onMixFactorChangeCallback) {
          this._onMixFactorChangeCallback(value);
        }
      },
      "%",
      0.0,
      1.0,
      this._mixFactor,
      displayValue
    );

    this.panel.addGroup(this.mixFactorSlider);
  }

  public get wireframeEnabled(): boolean {
    return this._wireframeEnabled;
  }

  public get boundingBoxEnabled(): boolean {
    return this._boundingBoxEnabled;
  }

  public get mixFactor(): number {
    return this._mixFactor;
  }

  public onWireframeToggle(callback: (enabled: boolean) => void): void {
    this._onWireframeToggleCallback = callback;
  }

  public onBoundingBoxToggle(callback: (enabled: boolean) => void): void {
    this._onBoundingBoxToggleCallback = callback;
  }

  public onMixFactorChange(callback: (value: number) => void): void {
    this._onMixFactorChangeCallback = callback;
  }
}
