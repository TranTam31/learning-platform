export class TweakpaneBuilder {
  private pane: any;
  private config: Record<string, any>;
  private schema: Record<string, any>;
  private onChange: (config: Record<string, any>) => void;
  private controlsMap: Map<string, any> = new Map();

  constructor(
    pane: any,
    config: Record<string, any>,
    schema: Record<string, any>,
    onChange: (config: Record<string, any>) => void,
  ) {
    this.pane = pane;
    this.config = config;
    this.schema = schema;
    this.onChange = onChange;
  }

  build() {
    Object.keys(this.schema).forEach((key) => {
      const field = this.schema[key];
      this.processField(key, field, this.pane, this.config, []);
    });

    this.pane.on("change", async () => {
      this.updateVisibility();
      const serializedConfig = await this.serializeConfig(this.config);
      this.onChange(serializedConfig);
    });

    this.updateVisibility();
  }

  private checkVisibility(visibleIf: any): boolean {
    if (!visibleIf) return true;

    const { param, equals, notEquals, in: inArray } = visibleIf;
    const value = this.getConfigValue(param);

    if (equals !== undefined) {
      return value === equals;
    }

    if (notEquals !== undefined) {
      return value !== notEquals;
    }

    if (inArray !== undefined) {
      return inArray.includes(value);
    }

    return true;
  }

  private getConfigValue(path: string): any {
    const parts = path.split(".");
    let value = this.config;

    for (const part of parts) {
      if (value === undefined || value === null) return undefined;
      value = value[part];
    }

    return value;
  }

  private updateVisibility() {
    this.controlsMap.forEach((control, path) => {
      const field = this.getFieldFromPath(path);
      if (field && field.visibleIf) {
        const visible = this.checkVisibility(field.visibleIf);
        control.hidden = !visible;
      }
    });
  }

  async serializeConfig(
    config: Record<string, any>,
  ): Promise<Record<string, any>> {
    const serialized: Record<string, any> = {};

    for (const key of Object.keys(config)) {
      const value = config[key];

      if (value === null || value === undefined) {
        serialized[key] = value;
      } else if (value instanceof HTMLImageElement) {
        const url = value.src || "";
        if (url.startsWith("blob:")) {
          try {
            serialized[key] = await this.blobUrlToDataUrl(url);
          } catch (err) {
            console.warn("Failed to convert blob URL:", err);
            serialized[key] = "";
          }
        } else {
          serialized[key] = url;
        }
      } else if (typeof value === "object" && !Array.isArray(value)) {
        serialized[key] = await this.serializeConfig(value);
      } else {
        serialized[key] = value;
      }
    }

    return serialized;
  }

  private async blobUrlToDataUrl(blobUrl: string): Promise<string> {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private getFieldFromPath(path: string): any {
    const parts = path.split(".");
    let current = this.schema;

    for (const part of parts) {
      if (!current) return null;

      if (current[part]) {
        current = current[part];
      } else if (current.fields && current.fields[part]) {
        current = current.fields[part];
      } else {
        return null;
      }
    }

    return current;
  }

  private processField(
    key: string,
    field: any,
    parentPane: any,
    parentConfig: Record<string, any>,
    pathPrefix: string[],
  ) {
    if (field.type === "folder") {
      this.buildFolder(key, field, parentPane, parentConfig, pathPrefix);
    } else {
      this.buildControl(key, field, parentPane, parentConfig, pathPrefix);
    }
  }

  private buildFolder(
    key: string,
    folderSchema: any,
    parentPane: any,
    parentConfig: Record<string, any>,
    pathPrefix: string[],
  ) {
    const folder = parentPane.addFolder({
      title: folderSchema.title || key,
      expanded: folderSchema.expanded ?? true,
    });

    const currentPath = [...pathPrefix, key].join(".");
    this.controlsMap.set(currentPath, folder);

    if (!parentConfig[key]) {
      parentConfig[key] = {};
    }

    if (folderSchema.fields) {
      Object.keys(folderSchema.fields).forEach((fieldKey) => {
        const field = folderSchema.fields[fieldKey];
        this.processField(fieldKey, field, folder, parentConfig[key], [
          ...pathPrefix,
          key,
        ]);
      });
    }
  }

  private buildControl(
    key: string,
    field: any,
    parentPane: any,
    parentConfig: Record<string, any>,
    pathPrefix: string[],
  ) {
    const options: any = {
      label: field.label || key,
    };

    if (parentConfig[key] === undefined && field.default !== undefined) {
      parentConfig[key] = field.default;
    }

    let control: any = null;

    switch (field.type) {
      case "string":
        control = parentPane.addBinding(parentConfig, key, options);
        break;

      case "number":
        if (field.min !== undefined) options.min = field.min;
        if (field.max !== undefined) options.max = field.max;
        if (field.step !== undefined) options.step = field.step;
        control = parentPane.addBinding(parentConfig, key, options);
        break;

      case "boolean":
        control = parentPane.addBinding(parentConfig, key, options);
        break;

      case "color":
        control = parentPane.addBinding(parentConfig, key, options);
        break;

      case "image":
        options.view = "input-image";
        if (field.placeholder) {
          options.placeholder = field.placeholder;
        }
        control = parentPane.addBinding(parentConfig, key, options);
        break;

      case "select":
        if (field.options) {
          options.options = field.options.reduce((acc: any, opt: any) => {
            acc[opt] = opt;
            return acc;
          }, {});
        }
        control = parentPane.addBinding(parentConfig, key, options);
        break;

      default:
        console.warn(`Unknown field type: ${field.type} for key: ${key}`);
    }

    if (control) {
      const currentPath = [...pathPrefix, key].join(".");
      this.controlsMap.set(currentPath, control);
    }
  }

  // Thêm vào TweakpaneBuilder class
  public updateConfig(newConfig: Record<string, any>) {
    // Update internal state
    Object.keys(newConfig).forEach((key) => {
      if (this.config.hasOwnProperty(key)) {
        this.config[key] = newConfig[key];
      }
    });

    // Refresh Tweakpane UI
    this.pane.refresh();
  }
}
