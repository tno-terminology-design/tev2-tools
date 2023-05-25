export interface Converter {
      convert(entry: any, term: Map<string, string>): string;
      getType() : string;
}