import { Interpreter } from './Interpreter.js';
import { Converter } from './Converter.js';
import { Glossary } from './Glossary.js';
import { StandardInterpreter } from './StandardInterpreter.js';
import { MarkdownConverter } from './MarkdownConverter.js';
import { HTTPConverter } from './HTTPConverter.js';
import { AltInterpreter } from './AltInterpreter.js';
import { ESSIFConverter } from './ESSIFConverter.js'
import { Logger } from 'tslog';
import { glob } from 'glob';

import fs = require("fs");
import path = require('path');

export class Resolver {
      private log = new Logger();
      private outputPath: string;
      private globPattern: string;
      private vsntag: string;
      private interpreter: Interpreter;
      private converter: Converter;
      public glossary: Glossary;

      public constructor({
            outputPath,
            scopedir,
            globPattern,
            vsntag,
            interpreterType,
            converterType,
      }: {
            outputPath: string;
            scopedir: string;
            globPattern: string;
            vsntag: string;
            interpreterType: string;
            converterType: string;
      }) {
            this.outputPath = outputPath;
            this.globPattern = globPattern;
            this.vsntag = vsntag;

            this.glossary = new Glossary({ safURL: path.join(scopedir, "saf.yaml"), vsntag: vsntag })

            // Define the interpreter and converter maps with supported types and corresponding instances
            const interpreterMap: { [key: string]: Interpreter } = {
                  alt: new AltInterpreter(),
                  default: new StandardInterpreter(),
            };

            const converterMap: { [key: string]: Converter } = {
                  http: new HTTPConverter(),
                  essif: new ESSIFConverter(),
                  default: new MarkdownConverter(),
            };

            // Assign the interpreter and converter instance based on the provided interpreter type (or use the default)
            this.interpreter = interpreterMap[interpreterType.toLowerCase()];
            this.converter = converterMap[converterType.toLowerCase()];
                
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
                  fs.mkdirSync(dirPath, { recursive: true });
            };
            this.log.trace("Writing: " + path.join(dirPath, file));
            fs.writeFileSync(path.join(dirPath, file), data);
      }

      /**
       * Interprets and converts terms in the given data string based on the interpreter and converter.
       * @param data The input data string to interpret and convert.
       * @returns A Promise that resolves to the processed data string.
       */
      private async interpretAndConvert(data: string): Promise<string> {
            const matches: IterableIterator<RegExpMatchArray> = data.matchAll(
                  this.interpreter!.getTermRegex()
            );
            let lastIndex = 0;
            await this.glossary.main();
      
            // Iterate over each match found in the data string
            for (const match of Array.from(matches)) {
                  const termProperties: Map<string, string> = this.interpreter!.interpret(match);
                  const entries = this.glossary.glossary.entries;
                  
                  // If the term has an empty scopetag, set it to the scopetag of the SAF
                  if (termProperties.get("scopetag") === "") {
                        termProperties.set("scopetag", (await this.glossary.saf).scope.scopetag);
                  }

                  const scopetag = termProperties.get("scopetag");
      
                  // If the glossary does not contain any entries with the same scopetag, check for a remote SAF and fetch glossary entries from its MRG
                  if (!entries.some(entry => entry.scopetag === scopetag)) {
                        try {
                              const remoteSAF = (
                                    await this.glossary.saf
                              ).scopes.find(scopes => scopes.scopetags.includes(scopetag!))?.scopedir;
      
                              if (remoteSAF) {
                                    const remoteGlossary = new Glossary({ safURL: remoteSAF });
                                    await remoteGlossary.main();
                                    entries.push(...remoteGlossary.glossary.entries);
                              }
                        } catch (err) {
                              this.log.error('Failed to fetch remote glossary entries:', err);
                        }
                  }

                  // Find the matching entry in the glossary based on the term and scopetag
                  let entry = this.glossary.glossary.entries.find(entry =>
                        entry.term === termProperties.get("term") &&
                        entry.scopetag === termProperties.get("scopetag")
                  );

                  if (entry) {
                        // Convert the term using the configured converter
                        let replacement = this.converter!.convert(entry, termProperties);

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
                        } else {
                              this.log.warn(`Glossary item ${termProperties.get("term")} was converted to an empty string`)
                        }
                  } else {
                        this.log.warn(`Glossary item ${termProperties.get("term")} could not be located`)
                  }
            }

            return data;
      }

      /**
       * Resolves and converts files in the specified input path.
       */
      public async resolve(): Promise<boolean> {
            // Log information about the interpreter, converter and the files being read
            this.log.info(`Using interpreter '${this.interpreter.getType()}' and converter '${this.converter.getType()}'`)
            this.log.info(`Reading files using pattern '${this.globPattern}'`);

            // Get the list of files based on the glob pattern
            const files = await glob(this.globPattern);

            // Process each file
            for (let filePath of files) {
                  // Check if the file has a valid extension (.md or .html)
                  if ([".md", ".html"].includes(path.extname(filePath))) {
                        // Read the file content
                        const data = fs.readFileSync(filePath, "utf8");
                        this.log.trace(`Reading '${filePath}'`);

                        // Interpret and convert the file data
                        const convertedData = this.interpretAndConvert(data);

                        // Write the converted data to the output file
                        this.writeFile(path.join(this.outputPath, path.dirname(filePath)), path.basename(filePath), await convertedData);
                  }
            }

            return true;
      }
}
