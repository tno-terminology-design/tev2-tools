import { interpreter, converter, glossary } from './Run.js'
import { report, log } from './Report.js';
import { glob } from 'glob';

import stringSimilarity = require("string-similarity");
import fs = require("fs");
import path = require('path');

export class Resolver {
      private outputPath: string;
      private globPattern: string;

      public constructor({
            outputPath,
            globPattern,
      }: {
            outputPath: string;
            globPattern: string;
      }) {
            this.outputPath = outputPath;
            this.globPattern = globPattern;
      }
      
      /**
       * Creates directory tree and writes data to a file.
       * @param dirPath - The directory path.
       * @param file - The file name.
       * @param data - The data to write.
       */
      private writeFile(dirPath: string, file: string, data: string) {
            // Check if the directory path doesn't exist
            if (!fs.existsSync(dirPath)) {
                  // Create the directory and any necessary parent directories recursively
                  try {
                        fs.mkdirSync(dirPath, { recursive: true });
                  } catch (err) {
                        log.error(`Error creating directory '${dirPath}':`, err);
                  }
            };
            try {
                  log.trace(`Writing: ${path.join(dirPath, file)}`);
                  fs.writeFileSync(path.join(dirPath, file), data);
            } catch (err) {
                  log.error(`Error writing file '${path.join(dirPath, file)}':`, err);
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
            if (matches.length < 1) {
                  return undefined;
            }

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

                  // Find the matching entry in the glossary based on the term, scopetag and vsntag
                  let matchingEntries = glossary.runtime.entries.filter(entry =>
                        entry.term === termProperties.get("term")! &&
                        entry.scopetag === termProperties.get("scopetag")! &&
                        (entry.vsntag === termProperties.get("vsntag")! ||
                        entry.altvsntags?.includes(termProperties.get("vsntag")!))
                  );

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
                        } else {
                              report.termHelp(file, data.substring(0, match.index).split('\n').length, `Term ref '${match[0]}' resulted in an empty string, check the converter`);
                        }
                  } else if (matchingEntries.length > 1) {
                        // Multiple matches found, display a warning
                        const source = matchingEntries.map(entry => `${entry.source}`).join(', ');
                        report.termHelp(file, data.substring(0, match.index).split('\n').length, `Term ref '${match[0]}' has multiple matching MRG entries. Located in: ${source}`);
                  } else {
                        const properties = ['term', 'scopetag', 'vsntag'];

                        let overallRating = 0;
                        let bestMatchIndices: { [key: string]: number } = {};

                        properties.forEach(prop => {
                              const propertyValue = termProperties.get(prop) || '';
                              const propertyMatches = stringSimilarity.findBestMatch(propertyValue, glossary.runtime.entries.map(entry => entry[prop] || ''));
                              overallRating += propertyMatches.bestMatch.rating;
                              bestMatchIndices[prop] = propertyMatches.bestMatchIndex;
                        });

                        overallRating /= properties.length;

                        const TermRef = `${termProperties.get("term")!}@${termProperties.get("scopetag")!}:${termProperties.get("vsntag")!}`
                        if (overallRating > 0.5) {
                              const bestMatchEntry = glossary.runtime.entries[bestMatchIndices['term']];
                              const suggestedTermRef = `${bestMatchEntry.term}@${bestMatchEntry.scopetag}:${bestMatchEntry.vsntag}`;
                              const errorMessage = `Match '${match[0]}' could not be matched with a MRG entry. Did you mean to reference '${suggestedTermRef}' instead of '${TermRef}'?`;
                              report.termHelp(file, data.substring(0, match.index).split('\n').length, errorMessage);
                        } else {
                              report.termHelp(file, data.substring(0, match.index).split('\n').length, `Match '${match[0]}', resulting in '${TermRef}', could not be matched with a MRG entry`);
                        }
                  }
            }
            return data;
      }

      /**
       * Resolves and converts files in the specified input path.
       */
      public async resolve(): Promise<boolean> {
            // Initialize the runtime glossary
            await(glossary.initialize());

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
                        console.log(`Could not read file '${filePath}':`, err);
                        continue;
                  }

                  // Interpret and convert the file data
                  let convertedData;
                  try {
                        convertedData = await this.interpretAndConvert(filePath, data);
                  } catch (err) {
                        console.log(`Could not interpret and convert file '${filePath}':`, err);
                        continue;
                  }

                  // Write the converted data to the output file
                  if (convertedData) {
                        this.writeFile(path.join(this.outputPath, path.dirname(filePath)),
                        path.basename(filePath),
                        convertedData
                        );
                  }
            }

            return true;
      }
}
