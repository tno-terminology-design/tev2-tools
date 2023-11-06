import { log } from "./Report.js"
import { generator } from "./Run.js"
import { type Scopes } from "./SAF.js"

import fs = require("fs")
import path = require("path")
import yaml = require("js-yaml")

export interface MRG {
  filename?: string
  terminology: Terminology
  scopes?: Scopes[]
  entries: Entry[]
}

export interface Terminology {
  scopetag: string
  scopedir: string
  curatedir: string
  vsntag: string
  altvsntags: string[]
}

export interface Entry {
  term: string
  vsntag: string
  scopetag: string
  locator: string
  bodyFile?: string
  synonymOf?: string
  formPhrases?: string
  glossaryText: string
  navurl?: string
  headingids?: string[]
  altvsntags?: string[]
  grouptags?: string[]
  [key: string]: unknown
}

export class MrgBuilder {
  static instances: MRG[] = []
  mrg: MRG

  public constructor({ filename }: { filename: string }) {
    this.mrg = this.getMrgMap(path.join(generator.saf.scope.localscopedir, generator.saf.scope.glossarydir, filename))

    MrgBuilder.instances.push(this.mrg)
  }

  /**
   * Retrieves the MRG (Machine Readable Glossary) map.
   * @returns A promise that resolves to the MRG map.
   */
  private getMrgMap(mrgURL: string): MRG {
    try {
      // Try to load the MRG map from the `mrgURL`
      const mrgfile = fs.readFileSync(mrgURL, "utf8")
      this.mrg = yaml.load(mrgfile) as MRG

      // Check for missing required properties in MRG terminology
      type TerminologyProperty = keyof Terminology
      const requiredProperties: TerminologyProperty[] = ["scopetag", "scopedir", "curatedir", "vsntag"]
      const terminology = this.mrg.terminology
      const missingProperties = requiredProperties.filter((prop) => !terminology[prop])

      if (missingProperties.length > 0) {
        log.error(`\tE003 Missing required property in MRG at '${mrgURL}': '${missingProperties.join("', '")}'`)
        process.exit(1)
      }
    } catch (err) {
      if (err instanceof Error) {
        err.message = `E005 An error occurred while attempting to load the MRG at '${mrgURL}': ${err}`
      }
      throw err
    }

    return this.mrg
  }
}
