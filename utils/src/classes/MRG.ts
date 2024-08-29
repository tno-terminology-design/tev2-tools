import { regularize } from "../index.js"

import fs = require("fs")
import path = require("path")
import yaml = require("js-yaml")

export interface Type {
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
  [key: string]: unknown
}

export interface Entry {
  scopetag: string
  vsntag: string
  locator: string
  navurl: string
  headingids: string[]
  termid: string
  term: string
  termType?: string
  bodyFile?: string
  glossaryTerm?: string
  glossaryText?: string
  synonymOf?: string
  grouptags?: string[]
  formPhrases: string[]
  [key: string]: unknown
}

/**
 * The MrgBuilder class handles the retrieval and processing of an MRG (Machine Readable Glossary).
 * An MRG is retrieved based on the `filename` and processed into an MRG object.
 * The MRG object with its MRG entries can then be used to populate the runtime glossary.
 */
export class Builder {
  static instances: Type[] = []
  mrg: Type

  public constructor({ mrgpath }: { mrgpath: string }) {
    this.mrg = this.getMap(mrgpath)
    if (this.mrg !== undefined) {
      this.mrg.filename = path.basename(mrgpath)

      Builder.instances.push(this.mrg)
    }
  }

  /**
   * Reads the MRG at `mrgpath` and maps it as the this.mrg MRG object.
   * @param mrgpath - The full path of the MRG to be retrieved.
   * @returns - The MRG as an MRG object.
   */
  public getMap(mrgpath: string): Type {
    try {
      // Attempt to read the MRG file
      const mrgfile = fs.readFileSync(mrgpath, "utf8")
      this.mrg = yaml.load(mrgfile) as Type

      // Check for missing required properties in MRG terminology
      type TerminologyProperty = keyof Terminology
      const requiredProperties: TerminologyProperty[] = ["scopetag", "scopedir", "curatedir", "vsntag"]
      const terminology = this.mrg.terminology
      const missingProperties = requiredProperties.filter((prop) => terminology[prop] == null)

      if (missingProperties.length > 0) {
        throw new Error(`Missing required property: '${missingProperties.join("', '")}'`)
      }

      const requiredEntryProperties = ["term", "scopetag", "locator"]

      for (const entry of this.mrg.entries) {
        // Check for missing required properties in MRG entries
        const missingProperties = requiredEntryProperties.filter((prop) => entry[prop] == null)

        if (missingProperties.length > 0) {
          // Create a reference to the problematic entry using the first three property-value pairs
          const reference = Object.keys(entry)
            .slice(0, 3)
            .map((prop) => `${prop}: '${entry[prop]}'`)
            .join(", ")

          throw new Error(
            `Entry missing required property: '${missingProperties.join("', '")}'. 
            Entry starts with values ${reference}`
          )
        }
      }
    } catch (err: any) {
      // Differentiate error types
      if (err.code === 'ENOENT') {
        throw new Error(`E005 MRG file not found at ${mrgpath}. Please ensure the file exists.`, { cause: err });
      } else if (err.name === 'YAMLException' || err.message.includes('YAML')) {
        throw new Error(`E005 Failed to parse MRG file at ${mrgpath} due to invalid YAML format.`, { cause: err });
      } else if (err.code === 'EACCES' || err.code === 'EPERM') {
        throw new Error(`E005 Permission denied while reading MRG file at ${mrgpath}. Check file access permissions.`, { cause: err });
      } else {
        throw new Error(`E005 An unknown error occurred while attempting to load an MRG at ${mrgpath}`, { cause: err });
      }
    }

    return this.mrg
  }
}

/**
 * Returns an MRG class instance.
 * @returns The MRG class instance.
 */
export function getInstance(scopedir: string, glossarydir: string, filename: string): Type {
  let mrg: Type

  // Check if an MRG class instance with the `filename` property of `mrgFile` has already been loaded
  for (const instance of Builder.instances) {
    if (instance.filename === filename) {
      mrg = instance
      break
    }
  }
  // If no existing MRG class instance was found, build the MRG according to the `mrgpath`
  if (mrg == null) {
    mrg = new Builder({ mrgpath: path.join(scopedir, glossarydir, filename) }).mrg
  }

  return mrg
}

export function getEntry(
  entries: Entry[],
  origin: string,
  term: string,
  type: string,
  defaulttype?: string
): Entry {
  // Regularize the term, type, and default type before any processing
  term = regularize(term);
  type = regularize(type);
  if (defaulttype) {
    defaulttype = regularize(defaulttype);
  }

  // Filter the entries by matching termType if type is provided
  let matches = entries;
  if (type != null) {
    matches = matches.filter((entry) => entry.termType === type);
  }

  // Filter the entries by matching formPhrases
  matches = matches.filter((entry) => entry.formPhrases.includes(term));

  // If more than one match is found, try filtering by the default type
  if (matches.length > 1 && defaulttype != null) {
    matches = matches.filter((entry) => entry.termType === defaulttype);
  }

  // Return the matching entry or throw appropriate errors
  if (matches.length === 1) {
    return matches[0];
  } else if (matches.length === 0) {
    throw new Error(`could not be matched with an MRG entry in '${origin}'`);
  } else if (matches.length > 1) {
    const matchingTermIds = matches.map((entry) => entry.termid).join("', '");
    throw new Error(`has multiple matching MRG entries in '${origin}'. Matching termids: '${matchingTermIds}'`);
  }
}
