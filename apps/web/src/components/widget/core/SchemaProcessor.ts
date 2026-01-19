export class SchemaProcessor {
  static extractDefaultsFromSchema(
    schema: Record<string, any>,
  ): Record<string, any> {
    const config: Record<string, any> = {};

    Object.keys(schema).forEach((key) => {
      const field = schema[key];

      if (field.type === "folder") {
        if (field.fields) {
          config[key] = this.extractDefaultsFromSchema(field.fields);
        }
      } else {
        if (field.default !== undefined) {
          config[key] = field.default;
        }
      }
    });

    return config;
  }
}
