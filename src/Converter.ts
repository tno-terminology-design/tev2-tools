export interface Converter {
      convert(glossary: any, properties: Map<string, string>): string;
      getType() : string;
}