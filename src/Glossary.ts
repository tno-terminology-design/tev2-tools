import { log, report } from './Report.js';
import { saf } from './Run.js';

import fs = require("fs");
import path = require('path');
import yaml = require('js-yaml');

interface Scope {
      website: string;
      scopetag: string;
      scopedir: string;
      curatedir: string;
      glossarydir: string;
      defaultvsn: string;
      mrgfile: string;
}

interface Scopes {
      scopetags: string[];
      scopedir: string;
}

interface Version {
      vsntag: string;
      mrgfile: string;
      altvsntags: string[];
}

interface Terminology {
      scopetag: string;
      scopedir: string;
      curatedir: string;
      vsntag: string;
      altvsntags: string[];
}

export interface Entry {
      term: string;
      altterms?: string[];
      vsntag: string;
      scopetag: string;
      locator: string;
      formPhrases?: string;
      glossaryText: string;
      navurl?: string;
      headingids?: string[];
      altvsntags?: string[];
      [key: string]: any;
}

/**
 * The MRG class handles the retrieval and processing of an MRG (Machine Readable Glossary).
 * An MRG is retrieved based on the `filename` and processed into an MRG object.
 * The MRG object with its MRG entries can then be used to populate the runtime glossary.
 */
export class MRG {
      public filename: string;
      public terminology: Terminology;
      public scopes: Scopes[];
      public entries: Entry[] = [];

      static instances: MRG[] = [];

      public constructor({ filename }: { filename: string }) {
            const mrg = this.getMrgMap(path.join(saf.scope.scopedir, saf.scope.glossarydir, filename));
            
            this.filename = filename;
            this.terminology = mrg.terminology;
            this.scopes = mrg.scopes;
            if (mrg.entries) {
                  this.entries = this.populate(mrg);
            }
            
            MRG.instances.push(this);
      }

      /**
       * Reads the MRG at `mrgURL` and maps it as an MRG object.
       * @param mrgURL - The full path of the MRG to be retrieved.
       * @returns - The MRG as an MRG object.
       */
      public getMrgMap(mrgURL: string): MRG {
            let mrg = {} as MRG;
      
            try {
                  // try to load the MRG map from the `mrgURL`
                  const mrgfile = fs.readFileSync(mrgURL, 'utf8');
                  mrg = yaml.load(mrgfile) as MRG;

                  // check for missing required properties in MRG terminology
                  type TerminologyProperty = keyof Terminology;
                  const requiredProperties: TerminologyProperty[] = ['scopetag', 'scopedir', 'curatedir', 'vsntag'];
                  const terminology = mrg.terminology;
                  const missingProperties = requiredProperties.filter(prop => !terminology[prop]);

                  if (missingProperties.length > 0) {
                        log.error(`E003 Missing required property in MRG at '${mrgURL}': '${missingProperties.join("', '")}'`);
                        process.exit(1);
                  }

                  const requiredEntryProperties = ['term', 'vsntag', 'scopetag', 'locator', 'glossaryText'];
      
                  for (const entry of mrg.entries) {
                        // add vsntag, scopetag, and altvsntags from MRG to MRG entries
                        entry.vsntag = terminology.vsntag;
                        entry.scopetag = terminology.scopetag;
                        entry.altvsntags = terminology.altvsntags

                        // check for missing required properties in MRG entries
                        const missingProperties = requiredEntryProperties.filter(prop => !entry[prop]);
      
                        if (missingProperties.length > 0) {
                              // create a reference to the problematic entry using the first three property-value pairs
                              const reference = Object.keys(entry).slice(0, 3).map(prop => `${prop}: '${entry[prop]}'`).join(', ');

                              const errorMessage = `MRG entry missing required property: '${missingProperties.join("', '")}'. Entry starts with values ${reference}`;
                              report.mrgHelp(mrgURL, -1, errorMessage);
                        }
                  }
            } catch (err) {
                  const errorMessage = `E005 An error occurred while attempting to load an MRG: ${err}`;
                  report.mrgHelp(mrgURL, -1, errorMessage);
            }
      
            return mrg;
      }

      /**
       * Populates the runtime glossary by processing MRG entries.
       * @param mrg - The MRG (Machine Readable Glossary) map.
       * @param filename - The filename of the MRG being processed.
       * @returns A promise that resolves to the populated runtime glossary.
       */
      public populate(mrg: MRG): Entry[] {
            let entries: Entry[] = [];
            try {
                  const regexMap: { [key: string]: string[] } = {
                        "{ss}": ["", "s"],
                        "{yies}": ["y", "ys", "ies"],
                        "{ying}": ["y", "ier", "ying", "ies", "ied"],
                  };
            
                  for (const entry of mrg.entries) {
                        const alternatives = entry.formPhrases ? entry.formPhrases.split(",").map(t => t.trim()) : [];
            
                        // create a new set of alternatives that includes all possible macro replacements
                        const modifiedAlternatives = new Set<string>();
            
                        for (const alternative of alternatives) {
                              const generatedAlternatives = applyMacroReplacements(alternative, regexMap);
                              for (const generatedAlternative of generatedAlternatives) {
                                    modifiedAlternatives.add(generatedAlternative);
                              }
                        }
            
                        entry.altvsntags = mrg.terminology.altvsntags;
                        entry.altterms = Array.from(modifiedAlternatives);

                        entries.push(entry);
                  }
            } catch (err) {
                  log.error(`E006 An error occurred while attempting to process the MRG at '${mrg.filename}':`, err);
                  throw err;
            } finally {
                  return entries;
            }
      }
}

/**
 * The SAF class handles the retrieval and processing of a SAF (Scope Administration File).
 * A SAF is retrieved based on the `scopedir` and processed into a SAF object.
 */
export class SAF {
      public scope: Scope;
      public scopes: Scopes[];
      public versions: Version[];

      public constructor({ scopedir}: { scopedir: string}) {
            let saf = this.getSafMap(path.join(scopedir, 'saf.yaml'));

            this.scope = saf.scope;
            this.scope.scopedir = scopedir; // override scopedir with the one passed as a parameter
            this.scopes = saf.scopes;
            this.versions = saf.versions;
      }

      /**
       * Reads the SAF at `safURL` and maps it as a SAF object.
       * @param safURL - The full path of the SAF to be retrieved.
       * @returns - The SAF as a SAF object.
       */
      private getSafMap(safURL: string): SAF {
            let saf = {} as SAF;

            try {
                  // try to load the SAF map from the scopedir
                  saf = yaml.load(fs.readFileSync(safURL, 'utf8')) as SAF;

                  // check for missing required properties in SAF
                  type ScopeProperty = keyof Scope;
                  const requiredProperties: ScopeProperty[] = ['scopetag', 'scopedir', 'curatedir', 'defaultvsn'];
                  const missingProperties = requiredProperties.filter(prop => !saf.scope[prop]);

                  if (missingProperties.length > 0) {
                        log.error(`E002 Missing required property in SAF at '${safURL}': '${missingProperties.join("', '")}'`);
                        process.exit(1);
                  }
            } catch (err) {
                  log.error(`E004 An error occurred while attempting to load the SAF at '${safURL}':`, err);
                  process.exit(1);
            }

            return saf;
      }
}


/**
 * Apply macro replacements to the given input using the provided regexMap.
 * @param input - The input string containing macros.
 * @param regexMap - A map of macros and their possible replacements.
 * @returns An array of strings with all possible alternatives after macro replacements.
 */
function applyMacroReplacements(input: string, regexMap: { [key: string]: string[] }): string[] {
      // check if the input contains a macro
      const match = input.match(/\{(\w+)}/);

      // if no macro is found, return the input as is
      if (!match) {
            return [input];
      }

      const macroKey = match[1];
      const replacements = regexMap[`{${macroKey}}`] || [];
  
      // split the input into prefix and suffix at the macro
      const prefix = input.substring(0, match.index);
      const suffix = input.substring(match.index! + match[0].length);
  
      const result: string[] = [];
  
      // recursively apply macro replacements and use recursion to handle multiple macros
      for (const replacement of replacements) {
            const newAlternative = prefix + replacement + suffix;
            result.push(...applyMacroReplacements(newAlternative, regexMap));
      }
  
      return result;
}
