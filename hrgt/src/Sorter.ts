import { mappings, Converter as BaseConverter } from "@tno-terminology-design/utils"

export class Sorter extends BaseConverter {
  public constructor({ template }: { template: string }) {
    super({ template, name: "sorter", mapping: mappings.hrgt_sorter_map })
  }
}
