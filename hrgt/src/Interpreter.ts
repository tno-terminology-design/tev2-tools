import { log } from "@tno-terminology-design/utils"
import { type SAF } from "@tno-terminology-design/utils"

export interface MRGRef {
  hrg: string
  converter: string
}

export class Interpreter {
  private readonly type: string
  private readonly regex: RegExp

  public constructor({ regex }: { regex: string }) {
    const map: Record<string, RegExp> = {
      basic: /{%\s*hrg="(?<hrg>(?:[^"]|\\")*)"\s*converter="(?<converter>(?:[^"]|\\")*)"\s*%}/g
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

  interpret(match: RegExpMatchArray, saf: SAF): MRGRef {
    // added as feedback from Michiel, should not happen as it would not be a match if there are no groups
    if (match.groups == undefined) {
      throw new Error("Error in evaluating regex pattern. No groups provided")
    }
    if (match.groups.converter == undefined) {
      // TODO: should we default to the converter as specified in the config?
      throw new Error("Error in evaluating regex pattern. No converter provided in the named capturing group")
    }

    return {
      hrg: match.groups.hrg || `${saf.scope.scopetag}`,
      converter: match.groups.converter
    }
  }

  getType(): string {
    return this.type
  }
}
