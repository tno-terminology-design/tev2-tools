import { interpreter, converter, glossary } from './Run.js'
import { report, log } from './Report.js';
import { glob } from 'glob';

import matter from 'gray-matter';
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

            let filepath = path.join(dirPath, file);
            try {
                  
                  fs.writeFileSync(filepath, data);
                  report.fileWritten(filepath);
            } catch (err) {
                  log.error(`E008 Error writing file '${filepath}':`, err);
            }
      }
          

      /**
       * Interprets and converts terms in the given data string based on the interpreter and converter.
       * @param file The file object of the file being processed.
       * @param filePath The path of the file being processed.
       * @returns A Promise that resolves to the processed data string or undefined in case of no matches.
       */
      private async interpretAndConvert(file: matter.GrayMatterFile<string>, filePath: string): Promise<string | undefined> {
            let matches: RegExpMatchArray[] = Array.from(file.orig.toString().matchAll(interpreter!.getRegex()));
            if (file.matter) {
                  // remove count of frontmatter matches from the front of the matches array
                  let frontmatter: RegExpMatchArray[] = Array.from(file.matter.matchAll(interpreter!.getRegex()));
                  matches.splice(0, frontmatter.length);
            }
            

            let converted = 0;
            let lastIndex = 0;
      
            // Iterate over each match found in the file.orig string
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

                  let replacement = "";
                  let entry = undefined;
                  if (matchingEntries.length === 1) {
                        entry = matchingEntries[0];
                        // Convert the term using the configured converter
                        replacement = converter!.convert(entry, termProperties);
                        entry.fallback = false;
                        if (replacement === "") {
                              report.termHelp(filePath, file.orig.toString().substring(0, match.index).split('\n').length, `Term ref '${match[0]}' > '${TermRef}', resulted in an empty string, check the converter`);
                        }
                  } else if (matchingEntries.length > 1) {
                        // Multiple matches found, display a warning
                        const uniqueSources = new Set();
                        const source = matchingEntries
                              .filter(entry => !uniqueSources.has(entry.source) && uniqueSources.add(entry.source))
                              .map(entry => entry.source)
                              .join(', ');
                        report.termHelp(filePath, file.orig.toString().substring(0, match.index).split('\n').length, `Term ref '${match[0]}' > '${TermRef}', has multiple matching MRG entries in MRG '${path.basename(source)}'`);
                  } else {
                        report.termHelp(filePath, file.orig.toString().substring(0, match.index).split('\n').length, `Term ref '${match[0]}' > '${TermRef}', could not be matched with an MRG entry`);
                  }

                  
                  if (replacement === "") {
                        // No replacement was generated, use the @ term ref as a fallback if it exists in the scope and version
                        entry = glossary.runtime.entries.find(entry =>
                              entry.term === `@` &&
                              entry.scopetag === termProperties.get("scopetag")! &&
                              (entry.vsntag === termProperties.get("vsntag")! ||
                              entry.altvsntags?.includes(termProperties.get("vsntag")!))
                        );
                        if (entry) {
                              replacement = converter!.convert(entry, termProperties);
                              entry.fallback = true;
                        }
                  }

                  // Only execute the replacement steps if the 'replacement' string is not empty
                  if (replacement.length > 0) {
                        const startIndex = match.index! + lastIndex;
                        const matchLength = match[0].length;
                        const textBeforeMatch = file.orig.toString().substring(0, startIndex);
                        const textAfterMatch = file.orig.toString().substring(startIndex + matchLength);
                        
                        // Replace the matched term with the generated replacement in the data string
                        file.orig = `${textBeforeMatch}${replacement}${textAfterMatch}`;

                        // Update the lastIndex to account for the length difference between the match and replacement
                        lastIndex += replacement.length - matchLength;

                        // Log the converted term
                        report.termConverted(entry);
                        converted++;
                  }
            }
            if (converted > 0) {
                  return file.orig.toString();
            } else {
                  return undefined;
            }
      }

      /**
       * Resolves and converts files in the specified input path.
       */
      public async resolve(): Promise<boolean> {
            // Log information about the interpreter, converter and the files being read
            log.info(`Reading files using pattern string '${this.globPattern}'`);

            // Get the list of files based on the glob pattern
            const files = await glob(this.globPattern);

            log.info(`Found ${files.length} files`);

            // Process each file
            for (let filePath of files) {
                  // Read the file content
                  let file;
                  try {
                        file = matter(fs.readFileSync(filePath, "utf8"));
                  } catch (err) {
                        console.log(`E009 Could not read file '${filePath}':`, err);
                        continue;
                  }

                  // Interpret and convert the file data
                  let convertedData;
                  try {
                        convertedData = await this.interpretAndConvert(file, filePath);
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
