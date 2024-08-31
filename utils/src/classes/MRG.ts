import { log } from "@tno-terminology-design/utils"; // Ensure this import is included
import { regularize } from "../index.js";
import fs = require("fs");
import path = require("path");
import yaml = require("js-yaml");

export interface Type {
  filename?: string;
  terminology: Terminology;
  scopes?: Scopes[];
  entries: Entry[];
}

interface Scopes {
  scopetag: string;
  scopedir: string;
}

export interface Terminology {
  scopetag: string;
  scopedir: string;
  curatedir: string;
  vsntag: string;
  altvsntags: string[];
  [key: string]: unknown;
}

export interface Entry {
  scopetag: string;
  vsntag: string;
  locator: string;
  navurl: string;
  headingids: string[];
  termid: string;
  term: string;
  termType?: string;
  bodyFile?: string;
  glossaryTerm?: string;
  glossaryText?: string;
  synonymOf?: string;
  grouptags?: string[];
  formPhrases: string[];
  lineNumber?: number;  // Add lineNumber to track the line number in the YAML file
  [key: string]: unknown;
}

/**
 * The MrgBuilder class handles the retrieval and processing of an MRG (Machine Readable Glossary).
 * An MRG is retrieved based on the `filename` and processed into an MRG object.
 * The MRG object with its MRG entries can then be used to populate the runtime glossary.
 */
export class Builder {
  static instances: Type[] = [];
  mrg: Type;

  public constructor({ mrgpath }: { mrgpath: string }) {
    this.mrg = this.getMap(mrgpath);
    if (this.mrg !== undefined) {
      this.mrg.filename = path.basename(mrgpath);

      Builder.instances.push(this.mrg);
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
      const mrgfile = fs.readFileSync(mrgpath, "utf8");
      const mrgDocument = yaml.load(mrgfile, { json: true }) as Type;
      this.mrg = mrgDocument;

      // Calculate line numbers for each entry
      const fileLines = mrgfile.split("\n");
      for (const entry of this.mrg.entries) {
        entry.lineNumber = findLineNumberForEntry(entry, fileLines);
      }

      // Check for missing required properties in MRG terminology
      type TerminologyProperty = keyof Terminology;
      const requiredProperties: TerminologyProperty[] = ["scopetag", "scopedir", "curatedir", "vsntag"];
      const terminology = this.mrg.terminology;
      const missingProperties = requiredProperties.filter((prop) => terminology[prop] == null);

      if (missingProperties.length > 0) {
        throw new Error(`Missing required property: '${missingProperties.join("', '")}'`);
      }

      const requiredEntryProperties = ["term", "scopetag", "locator"];

      for (const entry of this.mrg.entries) {
        // Check for missing required properties in MRG entries
        const missingProperties = requiredEntryProperties.filter((prop) => entry[prop] == null);

        if (missingProperties.length > 0) {
          // Create a reference to the problematic entry using the first three property-value pairs
          const reference = Object.keys(entry)
            .slice(0, 3)
            .map((prop) => `${prop}: '${entry[prop]}'`)
            .join(", ");

          throw new Error(
            `Entry missing required property: '${missingProperties.join("', '")}'. 
            Entry starts with values ${reference} (line ${entry.lineNumber})`
          );
        }
      }
    } catch (err: any) {
      // Differentiate error types
      if (err.code === "ENOENT") {
        throw new Error(`E005 MRG file not found at ${mrgpath}. Please ensure the file exists.`, { cause: err });
      } else if (err.name === "YAMLException" || err.message.includes("YAML")) {
        throw new Error(`E005 Failed to parse MRG file at ${mrgpath} due to invalid YAML format.`, { cause: err });
      } else if (err.code === "EACCES" || err.code === "EPERM") {
        throw new Error(`E005 Permission denied while reading MRG file at ${mrgpath}. Check file access permissions.`, { cause: err });
      } else {
        throw new Error(`E005 An unknown error occurred while attempting to load an MRG at ${mrgpath}`, { cause: err });
      }
    }

    return this.mrg;
  }
}

/**
 * Function to find the starting line number of an entry in the YAML file content.
 * This function will identify the start of an entry by combining multiple unique fields.
 * @param entry The entry to find the line number for.
 * @param fileLines The content of the file as an array of lines.
 * @returns The line number where the entry starts.
 */
function findLineNumberForEntry(entry: Entry, fileLines: string[]): number {
  // Create a unique identifier for the entry based on multiple fields
  const entryIdentifier = `${entry.termid ?? ''}${entry.term ?? ''}${entry.scopetag ?? ''}${entry.vsntag ?? ''}`;

  // Find the line that contains all the parts of the identifier
  for (let i = 0; i < fileLines.length; i++) {
    const line = fileLines[i];
    if (
      entryIdentifier &&
      line.includes(entry.termid ?? '') &&
      line.includes(entry.term ?? '') &&
      line.includes(entry.scopetag ?? '') &&
      line.includes(entry.vsntag ?? '')
    ) {
      return i + 1; // Return line number (1-based index)
    }
  }
  return -1; // Return -1 if not found
}

/**
 * Returns an MRG class instance.
 * @returns The MRG class instance.
 */
export function getInstance(scopedir: string, glossarydir: string, filename: string): Type {
  let mrg: Type;

  // Check if an MRG class instance with the `filename` property of `mrgFile` has already been loaded
  for (const instance of Builder.instances) {
    if (instance.filename === filename) {
      mrg = instance;
      break;
    }
  }
  // If no existing MRG class instance was found, build the MRG according to the `mrgpath`
  if (mrg == null) {
    mrg = new Builder({ mrgpath: path.join(scopedir, glossarydir, filename) }).mrg;
  }

  return mrg;
}

export function getEntry(
  entries: Entry[],
  origin: string,
  term: string,
  type?: string, // Make type optional to allow for empty searches
  defaulttype?: string
): Entry {
  // Get all matching entries using the newly defined getAllMatches function
  const matches = getAllMatches(entries, origin, term, type, defaulttype);

  // Return the matching entry or throw appropriate errors
  if (matches.length === 1) {
    return matches[0]; // Return the single match found
  } else if (matches.length === 0) {
    // Handle no matches found case
    const entryWithSynonym = entries.find((entry) => entry.synonymOf && Array.isArray(entry.formPhrases) && entry.formPhrases.includes(term));
    if (entryWithSynonym) {
      console.error(`No match found for term '${term}' with type '${type ?? "empty"}' in '${origin}' (synonymOf entry starts at line ${entryWithSynonym.lineNumber}).`);
      throw new Error(`No match found for term '${term}' with type '${type ?? "empty"}' in '${origin}' (synonymOf entry starts at line ${entryWithSynonym.lineNumber}).`);
    } else {
      console.error(`No match found for term '${term}' with type '${type ?? "empty"}' in '${origin}'.`);
      throw new Error(`No match found for term '${term}' with type '${type ?? "empty"}' in '${origin}'.`);
    }
  } else if (matches.length > 1) {
    // Handle multiple matches found case
    const entryWithSynonym = entries.find((entry) => entry.synonymOf && Array.isArray(entry.formPhrases) && entry.formPhrases.includes(term));
    if (entryWithSynonym) {
      // Log conflicting matches
      const matchingTermIds = matches.map((entry) => entry.termid).join("', '");
      console.error(`Multiple matches found for term '${term}' with type '${type ?? "empty"}' in '${origin}' (synonymOf entry starts at line ${entryWithSynonym.lineNumber}). Matching termids: '${matchingTermIds}'`);
      logMultipleMatches(term, type, origin, entries, matches); // Custom logging function for multiple matches
      throw new Error(`Multiple matching MRG entries found for term '${term}' with type '${type ?? "empty"}' in '${origin}' (synonymOf entry starts at line ${entryWithSynonym.lineNumber}). Matching termids: '${matchingTermIds}'`);
    } else {
      console.error(`Multiple matches found for term '${term}' with type '${type ?? "empty"}' in '${origin}'.`);
      throw new Error(`Multiple matching MRG entries found for term '${term}' with type '${type ?? "empty"}' in '${origin}'.`);
    }
  }
}

export function getAllMatches(
  entries: Entry[],
  origin: string,
  term: string,
  type?: string, // Make type optional to allow for empty searches
  defaulttype?: string
): Entry[] {
  // Regularize the term and default type before any processing
  term = regularize(term);
  type = type ? regularize(type) : undefined; // Ensure `type` is undefined if it's not provided
  defaulttype = defaulttype ? regularize(defaulttype) : undefined;

  // Initial list of entries
  let matches = entries;
  // log.debug`Initial entries count in '${origin}': ${matches.length}`);

  // Filter the entries by matching termType if type is provided and valid
  if (type != null) { // Skip filtering if type is undefined
    matches = matches.filter((entry) => entry.termType === type);
    // log.debug`Entries after termType filter (${type}) in '${origin}': ${matches.length}`);
  }

  // Enhanced filter: Include entries that either have `term` in `formPhrases` or the entry's `term` field matches
  matches = matches.filter((entry) =>
    (Array.isArray(entry.formPhrases) && entry.formPhrases.includes(term)) || entry.term === term
  );
  // log.debug`Entries after formPhrases or term match filter (${term}) in '${origin}': ${matches.length}`);

  // If more than one match is found, try filtering by the default type
  if (matches.length > 1 && defaulttype != null) {
    matches = matches.filter((entry) => entry.termType === defaulttype);
    // log.debug`Entries after defaulttype filter (${defaulttype}) in '${origin}': ${matches.length}`);
  }

  // Return the list of matches, whether empty, single, or multiple
  return matches;
}

function logMultipleMatches(
  searchTerm: string,
  searchType: string,
  origin: string,
  originalEntries: Entry[],
  matchingEntries: Entry[]
): void {
  const fields = ["id", "term", "termType", "glossaryTerm", "glossaryText", "synonymOf", "alias", "formPhrases"];
  const truncateLength = 32;

  // Log the entry being searched
  const entryToFind = originalEntries.find(
    entry => (Array.isArray(entry.formPhrases) && entry.formPhrases.includes(searchTerm)) || entry.term === searchTerm
  );

  if (entryToFind) {
    const excerptEntryToFind = Object.fromEntries(
      fields.map(field => {
        const value = entryToFind[field];
        return [field, truncate(String(value !== undefined && value !== null ? value : "undefined or empty"), truncateLength)];
      })
    );
    // log.debug`Searching for entry: ${JSON.stringify(excerptEntryToFind)}`);
  } else {
    // log.debug`Entry being searched for: term '${searchTerm}', type '${searchType}' could not be specifically identified.`);
  }

  // Log the multiple matching entries found
  matchingEntries.forEach((match, index) => {
    const excerptMatch = Object.fromEntries(
      fields.map(field => {
        const value = match[field];
        if (field === "formPhrases") {
          // Handle the special case for formPhrases
          const formPhrasesValue = Array.isArray(value) && value.length > 0 ? value.join(", ") : "undefined or empty";
          return [field, truncate(formPhrasesValue, truncateLength)];
        } else {
          return [field, truncate(String(value !== undefined && value !== null ? value : "undefined or empty"), truncateLength)];
        }
      })
    );
    // log.debug`Match ${index + 1}: ${JSON.stringify(excerptMatch)}`);
  });
}

// Function to truncate a string such that it shows the beginning and end parts with '...' in between
function truncate(str: string, length: number = 27): string {
  // Ensure the length is at least 7 to properly format the output as required
  if (length < 7) length = 7;

  // If the string is shorter than or equal to the specified length, return it as is
  if (str.length <= length) return str;

  // Calculate the number of characters to show from the beginning and end
  const n = Math.floor((length - 3) / 2); // Calculate n to accommodate the length including '...'
  const start = str.slice(0, n);          // First n characters
  const end = str.slice(-n);              // Last n characters

  return `${start}...${end}`; // Return the formatted string
}
