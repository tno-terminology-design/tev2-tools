import { log } from "@tno-terminology-design/utils"

export interface MRGRef {
  hrg: string
  converter: string
  scopetag?: string
  vsntag?: string
}

export class Interpreter {
  private readonly type: string
  private readonly regex: RegExp

  public constructor({ regex }: { regex: string }) {
    const map: Record<string, RegExp> = {
      basic: /{%\s*hrg="(?<hrg>(?:[^"]|\\")*)"\s*(?:converter="(?<converter>(?:[^"]|\\")*)"\s*)?%}/g
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
    log.info(`Using ${this.type} interpreter: '${this.regex}'`)
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
      scopetag: hrg.groups.scopetag,
      vsntag: hrg.groups.vsntag
    }
  }

  getType(): string {
    return this.type
  }
}
