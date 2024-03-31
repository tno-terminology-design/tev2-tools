import { mappings, Converter as BaseConverter } from "@tno-terminology-design/utils"

export class Converter extends BaseConverter {
  public constructor({ template, n }: { template: string; n?: number }) {
    super({
      template,
      name: `converter${n === -1 ? "[error]" : n > 1 ? `[${n}]` : ""}`,
      mapping: mappings.hrgt_converter_map,
      n
    })
  }
}
