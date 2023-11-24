import fs = require("fs")
import path = require("path")
import yaml = require("js-yaml")
import { type SAF } from "./SAF.js"

export interface MRG {
  filename?: string
  terminology: Terminology
  scopes?: Scopes[]
  entries: Entry[]
}

interface Scopes {
  scopetag: string
  scopedir: string
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
  termType?: string
  termid: string
  altterms?: string[]
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

/**
 * The MrgBuilder class handles the retrieval and processing of an MRG (Machine Readable Glossary).
 * An MRG is retrieved based on the `filename` and processed into an MRG object.
 * The MRG object with its MRG entries can then be used to populate the runtime glossary.
 */
export class MrgBuilder {
  static instances: MRG[] = []
  populate: boolean
  mrg: MRG

  public constructor({ filename, saf, populate }: { filename: string; saf: SAF; populate: boolean }) {
    this.mrg = this.getMrgMap(path.join(saf.scope.localscopedir, saf.scope.glossarydir, filename))
    this.populate = populate
    if (this.mrg !== undefined) {
      this.mrg.filename = filename

      if (this.mrg.entries.length > 0 && populate) {
        this.mrg.entries = this.populateEntries(this.mrg)
      }

      MrgBuilder.instances.push(this.mrg)
    }
  }

  /**
   * Reads the MRG at `mrgURL` and maps it as the this.mrg MRG object.
   * @param mrgURL - The full path of the MRG to be retrieved.
   * @returns - The MRG as an MRG object.
   */
  public getMrgMap(mrgURL: string): MRG {
    try {
      // try to load the MRG map from the `mrgURL`
      const mrgfile = fs.readFileSync(mrgURL, "utf8")
      this.mrg = yaml.load(mrgfile) as MRG

      // check for missing required properties in MRG terminology
      type TerminologyProperty = keyof Terminology
      const requiredProperties: TerminologyProperty[] = ["scopetag", "scopedir", "curatedir", "vsntag"]
      const terminology = this.mrg.terminology
      const missingProperties = requiredProperties.filter((prop) => terminology[prop] == null)

      if (missingProperties.length > 0) {
        throw new Error(`Missing required property in MRG at '${mrgURL}': '${missingProperties.join("', '")}'`)
      }

      const requiredEntryProperties = ["term", "scopetag", "locator"]

      for (const entry of this.mrg.entries) {
        if (this.populate) {
          // add vsntag, scopetag, and altvsntags from MRG to MRG entries
          entry.vsntag = terminology.vsntag
          entry.scopetag = terminology.scopetag
          entry.altvsntags = terminology.altvsntags
        }

        // check for missing required properties in MRG entries
        const missingProperties = requiredEntryProperties.filter((prop) => entry[prop] == null)

        if (missingProperties.length > 0) {
          // create a reference to the problematic entry using the first three property-value pairs
          const reference = Object.keys(entry)
            .slice(0, 3)
            .map((prop) => `${prop}: '${entry[prop]}'`)
            .join(", ")

          throw new Error(
            `MRG entry missing required property: '${missingProperties.join("', '")}'. 
            Entry starts with values ${reference}`
          )
        }
      }
    } catch (err) {
      throw new Error(`E005 An error occurred while attempting to load an MRG: ${err}`)
    }

    return this.mrg
  }

  /**
   * Populates the runtime glossary by processing MRG entries.
   * @param mrg - The MRG (Machine Readable Glossary) map.
   * @returns A promise that resolves to the populated runtime glossary.
   */
  public populateEntries(mrg: MRG): Entry[] {
    const entries: Entry[] = []
    try {
      const regexMap: Record<string, string[]> = {
        "{ss}": ["", "s", "'s", "(s)"],
        "{yies}": ["y", "y's", "ies"],
        "{ying}": ["y", "ier", "ying", "ies", "ied"]
      }

      for (const entry of mrg.entries) {
        const alternatives = entry.formPhrases != null ? entry.formPhrases.split(",").map((t) => t.trim()) : []

        // create a new set of alternatives that includes all possible macro replacements
        const modifiedAlternatives = new Set<string>()

        for (const alternative of alternatives) {
          const generatedAlternatives = applyMacroReplacements(alternative, regexMap)
          for (const generatedAlternative of generatedAlternatives) {
            modifiedAlternatives.add(generatedAlternative)
          }
        }

        entry.altvsntags = mrg.terminology.altvsntags
        entry.altterms = Array.from(modifiedAlternatives)

        entries.push(entry)
      }
    } catch (err) {
      throw new Error(`E006 An error occurred while attempting to process the MRG at '${mrg.filename}':`, {
        cause: err
      })
    }
    return entries
  }
}

/**
 * Apply macro replacements to the given input using the provided regexMap.
 * @param input - The input string containing macros.
 * @param regexMap - A map of macros and their possible replacements.
 * @returns An array of strings with all possible alternatives after macro replacements.
 */
function applyMacroReplacements(input: string, regexMap: Record<string, string[]>): string[] {
  // check if the input contains a macro
  const match = input.match(/\{(\w+)}/)

  // if no macro is found, return the input as is
  if (match == null) {
    return [input]
  }

  const macroKey = match[1]
  const replacements = regexMap[`{${macroKey}}`] ?? []

  // split the input into prefix and suffix at the macro
  const prefix = input.substring(0, match.index)
  const suffix = input.substring(match.index != null ? match.index + match[0].length : match[0].length)

  const result: string[] = []

  // recursively apply macro replacements and use recursion to handle multiple macros
  for (const replacement of replacements) {
    const newAlternative = prefix + replacement + suffix
    result.push(...applyMacroReplacements(newAlternative, regexMap))
  }

  return result
}
