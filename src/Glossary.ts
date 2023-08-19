import { log, report } from './Report.js';
import { glob } from 'glob';

import fs = require("fs");
import path = require('path');
import yaml = require('js-yaml');

interface SAF {
      scope: Scope;
      scopes: Scopes[];
      versions: Version[];
}

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

interface MRG {
      terminology: Terminology;
      scopes: Scopes[];
      entries: Entry[];
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

export interface Output {
      entries: Entry[];
}

export class Glossary {
      public scopedir: string;
      public saf!: SAF;
      public runtime: Output = {
            entries: []
      };

      public constructor({ scopedir}: { scopedir: string}) {
            this.scopedir = scopedir;

            this.saf = this.getSafMap(path.join(this.scopedir, 'saf.yaml'));
      }

      /**
       * Initializes the glossary by populating the runtime glossary.
       * @returns A promise that resolves to the populated runtime glossary.
       */
      public async initialize(mrgFileName: string): Promise<Output> {
            let glossarydir = path.join(this.scopedir, this.saf.scope.glossarydir);
            let mrgfile = path.join(glossarydir, mrgFileName);

            // Get the MRG map of the MRG file
                  const mrg = await this.getMrgMap(mrgfile);
                  // Populate the runtime glossary with the MRG entries
                  await this.populateRuntime(mrg, mrgfile);
            
            return this.runtime;
      }

      /**
       * Retrieves the SAF (Scope Administration File) map.
       * @returns A promise that resolves to the SAF map.
       */
      private getSafMap(safURL: string): SAF {
            let saf = {} as SAF;

            try {
                  // Try to load the SAF map from the scopedir
                  saf = yaml.load(fs.readFileSync(safURL, 'utf8')) as SAF;

                  // Check for missing required properties in SAF
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

      /**
       * Retrieves the MRG (Machine Readable Glossary) map.
       * @returns A promise that resolves to the MRG map.
       */
      public async getMrgMap(mrgURL: string): Promise<MRG> {
            let mrg = {} as Promise<MRG>;
      
            try {
                  // Try to load the MRG map from the `mrgURL`
                  const mrgfile = fs.readFileSync(mrgURL, 'utf8');
                  mrg = yaml.load(mrgfile) as Promise<MRG>;

                  // Check for missing required properties in MRG terminology
                  type TerminologyProperty = keyof Terminology;
                  const requiredProperties: TerminologyProperty[] = ['scopetag', 'scopedir', 'curatedir', 'vsntag'];
                  const terminology = (await mrg).terminology;
                  const missingProperties = requiredProperties.filter(prop => !terminology[prop]);

                  if (missingProperties.length > 0) {
                        log.error(`E003 Missing required property in MRG at '${mrgURL}': '${missingProperties.join("', '")}'`);
                        process.exit(1);
                  }

                  const requiredEntryProperties = ['term', 'vsntag', 'scopetag', 'locator', 'glossaryText'];
      
                  for (const entry of (await mrg).entries) {
                        // add vsntag, scopetag, and altvsntags from MRG to MRG entries
                        entry.vsntag = terminology.vsntag;
                        entry.scopetag = terminology.scopetag;
                        entry.altvsntags = terminology.altvsntags

                        // Check for missing required properties in MRG entries
                        const missingProperties = requiredEntryProperties.filter(prop => !entry[prop]);
      
                        if (missingProperties.length > 0) {
                              // Create a reference to the problematic entry using the first three property-value pairs
                              const reference = Object.keys(entry).slice(0, 3).map(prop => `${prop}: ${entry[prop]}`).join(', ');

                              const errorMessage = `MRG entry missing required property: '${missingProperties.join("', '")}'. Entry starts with values ${reference}`;
                              report.mrgHelp(mrgURL, -1, errorMessage);
                        }
                  }
            } catch (err) {
                  log.error(`E005 An error occurred while attempting to load an MRG at '${mrgURL}':`, err);
                  // process.exit(1);
            }
      
            return mrg;
      }

      /**
       * Populates the runtime glossary by processing MRG entries.
       * @param mrg - The MRG (Machine Readable Glossary) map.
       * @param filename - The filename of the MRG being processed.
       * @returns A promise that resolves to the populated runtime glossary.
       */
      public async populateRuntime(mrg: MRG, filename: string): Promise<Output> {
            try {
                  const mrgEntries = mrg.entries;
            
                  const regexMap: { [key: string]: string[] } = {
                        "{ss}": ["", "s"],
                        "{yies}": ["ys", "ies"],
                        "{ying}": ["ier", "ying", "ies", "ied"],
                  };
            
                  for (const entry of mrgEntries) {
                        const alternatives = entry.formPhrases ? entry.formPhrases.split(",").map(t => t.trim()) : [];
            
                        const modifiedAlternatives = [];
            
                        for (const alternative of alternatives) {
                              const generatedAlternatives = applyMacroReplacements(alternative, regexMap);
                              modifiedAlternatives.push(...generatedAlternatives);
                        }
            
                        const glossaryEntry: Entry = {
                              ...entry,
                              altvsntags: mrg.terminology.altvsntags,
                              source: filename,
                        };
            
                        this.runtime.entries.push(glossaryEntry);

                        console.log(modifiedAlternatives)
            
                        for (const alternative of modifiedAlternatives.filter(s => !s.includes("{"))) {
                              const altEntry: Entry = { ...glossaryEntry, term: alternative };
                              this.runtime.entries.push(altEntry);
                        }
                  }
            } catch (err) {
                  log.error(`E006 An error occurred while attempting to process the MRG at '${filename}':`, err);
            } finally {
                  return this.runtime;
            }
      }
}

/**
 * Apply macro replacements to the given input using the provided regexMap.
 * @param input - The input string containing macros.
 * @param regexMap - A map of macros and their possible replacements.
 * @returns An array of strings with all possible alternatives after macro replacements.
 */
function applyMacroReplacements(input: string, regexMap: { [key: string]: string[] }): string[] {
      const match = input.match(/\{(\w+)}/);
  
      if (!match) {
            return [input];
      }
  
      const macroKey = match[1];
      const replacements = regexMap[`{${macroKey}}`] || [];
  
      const prefix = input.substring(0, match.index);
      const suffix = input.substring(match.index! + match[0].length);
  
      const result: string[] = [];
  
      for (const replacement of replacements) {
            const newAlternative = prefix + replacement + suffix;
            result.push(...applyMacroReplacements(newAlternative, regexMap));
      }
  
      return result;
}
  
  
  