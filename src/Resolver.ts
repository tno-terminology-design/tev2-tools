import { interpreter, converter, glossary } from './Run.js'
import { report, log } from './Report.js';
import { glob } from 'glob';
import leven from 'leven';

import fs = require("fs");
import path = require('path');

export class Resolver {
      private outputPath: string;
      private globPattern: string;
      private force: boolean;

      public constructor({
            outputPath,
            globPattern,
            force,
      }: {
            outputPath: string;
            globPattern: string;
            force: boolean;
      }) {
            this.outputPath = outputPath;
            this.globPattern = globPattern;
            this.force = force;
      }
      
      /**
       * Creates directory tree and writes data to a file.
       * @param fullPath - The full file path.
       * @param data - The data to write.
       * @param force - Whether to overwrite existing files.
       */
      private writeFile(fullPath: string, data: string, force: boolean = false) {
            const dirPath = path.dirname(fullPath);
            const file = path.basename(fullPath);
            // Check if the directory path doesn't exist
            if (!fs.existsSync(dirPath)) {
                  // Create the directory and any necessary parent directories recursively
                  try {
                        fs.mkdirSync(dirPath, { recursive: true });
                  } catch (err) {
                        log.error(`E007 Error creating directory '${dirPath}':`, err);
                        return; // Stop further execution if directory creation failed
                  }
            } else if (!force && fs.existsSync(path.join(dirPath, file))) {
                  // If the file already exists and force is not enabled, don't overwrite
                  log.error(`E013 File '${path.join(dirPath, file)}' already exists. Use --force to overwrite`);
                  return; // Stop further execution if force is not enabled and file exists
            }

            try {
                  log.trace(`Writing: ${path.join(dirPath, file)}`);
                  fs.writeFileSync(path.join(dirPath, file), data);
            } catch (err) {
                  log.error(`E008 Error writing file '${path.join(dirPath, file)}':`, err);
            }
      }
          

      /**
       * Interprets and converts terms in the given data string based on the interpreter and converter.
       * @param file The file path of the file being processed.
       * @param data The input data string to interpret and convert.
       * @returns A Promise that resolves to the processed data string or undefined in case of no matches.
       */
      private async interpretAndConvert(file: string, data: string): Promise<string | undefined> {
            let matches: RegExpMatchArray[] = Array.from(data.matchAll(interpreter!.getRegex()));

            let converted = 0;
            let lastIndex = 0;
      
            // Iterate over each match found in the data string
            for (const match of matches) {
                  const termProperties: Map<string, string> = interpreter!.interpret(match);
                  
                  // If the term has an empty scopetag, set it to the scopetag of the SAF
                  if (!termProperties.get("scopetag")) {
                        termProperties.set("scopetag", (glossary.saf).scope.scopetag);
                  }

                  // If the term has an empty vsntag, set it to the defaultvsn of the SAF
                  if (!termProperties.get("vsntag")) {
                        termProperties.set("vsntag", (glossary.saf).scope.defaultvsn);
                  }

                  // If the term scopetag and vsntag combination has no matching entry in the runtime glossary, try and initialize a new MRG
                  if (glossary.runtime.entries.filter(entry =>
                        entry.scopetag === termProperties.get("scopetag")! &&
                        (entry.vsntag === termProperties.get("vsntag")! ||
                        entry.altvsntags?.includes(termProperties.get("vsntag")!))
                  ).length === 0) {
                        await(glossary.initialize(`mrg.${termProperties.get("scopetag")!}.${termProperties.get("vsntag")!}.yaml`));
                  }

                  // Find the matching entry in the runtime glossary based on the term, scopetag and vsntag
                  let matchingEntries = glossary.runtime.entries.filter(entry =>
                        entry.term === termProperties.get("term")! &&
                        entry.scopetag === termProperties.get("scopetag")! &&
                        (entry.vsntag === termProperties.get("vsntag")! ||
                        entry.altvsntags?.includes(termProperties.get("vsntag")!))
                  );
                  const TermRef = `${termProperties.get("term")!}@${termProperties.get("scopetag")!}:${termProperties.get("vsntag")!}`;

                  if (matchingEntries.length === 1) {
                        const entry = matchingEntries[0];
                        // Convert the term using the configured converter
                        let replacement = converter!.convert(entry, termProperties);

                        // Only execute the replacement steps if the 'replacement' string is not empty
                        if (replacement.length > 0) {
                              const startIndex = match.index! + lastIndex;
                              const matchLength = match[0].length;
                              const textBeforeMatch = data.substring(0, startIndex);
                              const textAfterMatch = data.substring(startIndex + matchLength);
                              
                              // Replace the matched term with the generated replacement in the data string
                              data = `${textBeforeMatch}${replacement}${textAfterMatch}`;
      
                              // Update the lastIndex to account for the length difference between the match and replacement
                              lastIndex += replacement.length - matchLength;

                              // Log the converted term

                              report.termConverted(entry.term!);
                              converted++;
                        } else {
                              report.termHelp(file, data.substring(0, match.index).split('\n').length, `Term ref '${match[0]}' > '${TermRef}', resulted in an empty string, check the converter`);
                        }
                  } else if (matchingEntries.length > 1) {
                        // Multiple matches found, display a warning
                        const source = matchingEntries.map(entry => `${entry.source}`).join(', ');
                        report.termHelp(file, data.substring(0, match.index).split('\n').length, `Term ref '${match[0]}' > '${TermRef}', has multiple matching MRG entries. Located in: ${source}`);
                  } else {
                        const properties = ['term', 'scopetag', 'vsntag'];

                        let overallRating = 0;
                        let bestMatchIndices: { [key: string]: number } = {};

                        properties.forEach(prop => {
                              const propertyValue = termProperties.get(prop) || '';
                              const propertyMatches = glossary.runtime.entries.map(entry => entry[prop] || '');

                              let bestMatchIndex = -1;
                              let bestMatchScore = -1;

                              propertyMatches.forEach((match, index) => {
                              const similarityScore = leven(propertyValue, match);
                              if (similarityScore > bestMatchScore) {
                                    bestMatchScore = similarityScore;
                                    bestMatchIndex = index;
                              }
                              });

                              overallRating += bestMatchScore;
                              bestMatchIndices[prop] = bestMatchIndex;
                        });

                        overallRating /= properties.length;

                        if (overallRating > 0.9) {
                              const bestMatchEntry = glossary.runtime.entries[bestMatchIndices['term']];
                              const suggestedTermRef = `${bestMatchEntry.term}@${bestMatchEntry.scopetag}:${bestMatchEntry.vsntag}`;
                              const errorMessage = `Term ref '${match[0]}' > '${TermRef}', could not be matched with an MRG entry. Did you mean to reference '${suggestedTermRef}'?`;
                              report.termHelp(file, data.substring(0, match.index).split('\n').length, errorMessage);
                        } else {
                              report.termHelp(file, data.substring(0, match.index).split('\n').length, `Term ref '${match[0]}' > '${TermRef}', could not be matched with an MRG entry`);
                        }
                  }
            }
            if (converted > 0) {
                  return data;
            } else {
                  return undefined;
            }
      }

      /**
       * Resolves and converts files in the specified input path.
       */
      public async resolve(): Promise<boolean> {
            // Log information about the interpreter, converter and the files being read
            log.info(`Using interpreter '${interpreter.getType()}' and converter '${converter.getType()}'`)
            log.info(`Reading files using pattern string '${this.globPattern}'`);

            // Get the list of files based on the glob pattern
            const files = await glob(this.globPattern);

            // Process each file
            for (let filePath of files) {
                  // Read the file content
                  let data;
                  try {
                        data = fs.readFileSync(filePath, "utf8");
                  } catch (err) {
                        console.log(`E009 Could not read file '${filePath}':`, err);
                        continue;
                  }

                  // Interpret and convert the file data
                  let convertedData;
                  try {
                        convertedData = await this.interpretAndConvert(filePath, data);
                  } catch (err) {
                        console.log(`E010 Could not interpret and convert file '${filePath}':`, err);
                        continue;
                  }

                  // Write the converted data to the output file
                  if (convertedData) {
                        this.writeFile(
                              path.join(this.outputPath, path.dirname(filePath), path.basename(filePath)),
                              convertedData, this.force
                        );
                  }
            }

            return true;
      }
}
