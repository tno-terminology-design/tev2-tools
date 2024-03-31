import { Handlebars, mappings, Converter as BaseConverter, Profile } from "@tno-terminology-design/utils"

export class Converter extends BaseConverter {
  public constructor({ template, n }: { template: string; n?: number }) {
    super({
      template,
      name: `converter${n === -1 ? "[error]" : n > 1 ? `[${n}]` : ""}`,
      mapping: mappings.trrt_converter_map,
      n
    })
  }

  convert(profile: Profile): string {
    if (profile.entry) {
      // Evaluate the string properties inside the entry object
      for (const [key, value] of Object.entries(profile.entry)) {
        if (typeof value === "string") {
          const template = Handlebars.compile(value, { noEscape: true, compat: true })
          profile.entry[key as keyof typeof profile.entry] = template({ ...profile.entry, ...profile })
        }
      }
    }
    return super.convert(profile)
  }
}
