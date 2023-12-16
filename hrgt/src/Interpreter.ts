export interface MRGRef {
  hrg: string
  converter: string
  sort: string
  scopetag?: string
  vsntag?: string
}

export class Interpreter {
  public type: string
  public regex: RegExp

  public constructor({ regex }: { regex: string }) {
    // If you add/remove mappings, please also edit the corresponding `.option` statement in `Run.ts`, and in the repo-file `tno-terminology-design/tev2-specifications/docs/spec-files/90-configuration-file.md`.
    const map: Record<string, RegExp> = {
      default: /{%\s*hrg="(?<hrg>[^"]*)"\s*(?:converter="(?<converter>[^"]*)"\s*)?(?:sort="(?<sort>[^"]*)"\s*)?%}/g
    }

    const key = regex.toString().toLowerCase()
    const exist = Object.prototype.hasOwnProperty.call(map, key)
    // Check if the regex parameter is a key in the defaults map
    if (exist) {
      this.type = key
      this.regex = map[key]
    } else {
      this.type = "custom"
      // Remove leading and trailing slashes, and flags
      this.regex = new RegExp(regex.replace(/^\/|\/[a-z]*$/g, ""), "g")
    }
  }

  getRegex(): RegExp {
    return this.regex
  }

  interpret(match: RegExpMatchArray): MRGRef {
    // added as feedback from Michiel, should not happen as it would not be a match if there are no groups
    if (match.groups == undefined) {
      throw new Error("Error in evaluating regex pattern. No groups provided")
    }

    const hrg: RegExpMatchArray = match.groups.hrg.match(/(?:@)?(?<scopetag>[a-z0-9_-]*)(?::(?<vsntag>[a-z0-9_-]*))?/)

    return {
      hrg: match.groups.hrg,
      converter: match.groups.converter,
      sort: match.groups.sort,
      scopetag: hrg.groups.scopetag,
      vsntag: hrg.groups.vsntag
    }
  }

  getType(): string {
    return this.type
  }
}
