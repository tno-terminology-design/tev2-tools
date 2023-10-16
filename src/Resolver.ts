import { interpreter, converter, saf } from './Run.js'
import { report, log } from './Report.js';
import { glob } from 'glob';
import { MRG } from './Glossary.js';
import { Term } from './Interpreter.js';

import matter from 'gray-matter';
import fs = require("fs");
import path = require('path');

/**
 * The Resolver class handles the resolution of term references in files.
 * This resolution happens according to a string that is supplied in `globPattern`.
 * A file is resolved by calling the `resolve` method with the corresponding file path.
 * If the resolution was successful, the resolved file is written to the output path.
 * The `force` parameter is used to overwrite existing files.
 * The `outputPath` parameter is used to specify the output path.
 * The `globPattern` parameter is be used to specify the glob pattern.
 */
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
            // Get the matches of the regex in the file.orig string
            let matches: RegExpMatchArray[] = Array.from(file.orig.toString().matchAll(interpreter!.getRegex()));
            if (file.matter) {
                  // If the file has frontmatter, get the matches of the regex in the frontmatter string
                  // remove count of frontmatter matches from the front of the matches array
                  let frontmatter: RegExpMatchArray[] = Array.from(file.matter.matchAll(interpreter!.getRegex()));
                  matches.splice(0, frontmatter.length);
            }

            let converted = 0;
            let lastIndex = 0;
      
            // Iterate over each match found in the file.orig string
            for (const match of matches) {
                  const term: Term = interpreter!.interpret(match, saf);

                  const mrgFile = term.vsntag
                        ? `mrg.${term.scopetag}.${term.vsntag}.yaml`
                        : `mrg.${term.scopetag}.yaml`;

                  let mrg: MRG | undefined = undefined;

                  // Check if an MRG class instance with the `filename` property of `mrgFile` has already been created
                  for (const instance of MRG.instances) {
                        if (instance.filename === mrgFile) {
                              mrg = instance;
                              break;
                        }
                  }
                  
                  // If no MRG class instance was found, create a new one
                  if (!mrg) {
                        mrg = new MRG({ filename: mrgFile });
                  }

                  if (mrg.entries.length > 0) {
                        let termRef = '';
                        // if the term has an empty vsntag, set it to the vsntag of the MRG
                        if (!term.vsntag) {
                              term.vsntag = mrg.terminology.vsntag;
                              termRef = `${term.id!}@${term.scopetag!}:default' `
                                    + `> '${term.id!}@${term.scopetag!}:${term.vsntag!}`;
                        } else {
                              termRef = `${term.id!}@${term.scopetag!}:${term.vsntag!}`;
                        }

                        // Find the matching entry in mrg.entries based on the term
                        let matchingEntries = mrg.entries.filter(entry =>
                              entry.term === term.id! || 
                              entry.altterms?.includes(term.id!)
                        );

                        let replacement = "";
                        let entry = undefined;
                        if (matchingEntries.length === 1) {
                              entry = matchingEntries[0];
                              term.id = entry.term;
                              // Convert the term using the configured converter
                              replacement = converter!.convert(entry, term);
                              if (replacement === "") {
                                    let message = `Term ref '${match[0]}' > '${termRef}', resulted in an empty string, check the converter`;
                                    report.termHelp(filePath, file.orig.toString().substring(0, match.index).split('\n').length, message);
                              }
                        } else if (matchingEntries.length > 1) {
                              // Multiple matches found, display a warning
                              let message = `Term ref '${match[0]}' > '${termRef}', has multiple matching MRG entries in '${mrgFile}'`;
                              report.termHelp(filePath, file.orig.toString().substring(0, match.index).split('\n').length, message);
                        } else {
                              let message = `Term ref '${match[0]}' > '${termRef}', could not be matched with an MRG entry`
                              report.termHelp(filePath, file.orig.toString().substring(0, match.index).split('\n').length, message);
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
            }
            if (converted > 0) {
                  return file.orig.toString();
            } else {
                  return undefined;
            }
      }

      /**
       * Calles interpretAndConvert() on files based on `this.globPattern`.
       * @returns A Promise that resolves to true if the resolution was successful.
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
