import { Interpreter } from './Interpreter.js';
import { Converter } from './Converter.js';
import { Glossary } from './Glossary.js';
import { StandardInterpreter } from './StandardInterpreter.js';
import { MarkdownConverter } from './MarkdownConverter.js';
import { HTTPConverter } from './HTTPConverter.js';
import { AltInterpreter } from './AltInterpreter.js';
import { ESSIFConverter } from './ESSIFConverter.js'
import { Logger } from 'tslog';

import fs = require("fs");
import path = require('path');
import yaml = require('js-yaml');

export class Resolver {
      private log = new Logger();
      private outputPath: string;
      private safPath: string;
      // private configPath?: string;
      private inputPath: string;
      private defaultVersion?: string;
      private interpreter: Interpreter;
      private converter: Converter;
      private recursive: boolean;
      public glossary: Glossary;

      public constructor({
            outputPath,
            safPath,
            configPath,
            inputPath,
            defaultVersion,
            interpreterType,
            converterType,
            recursive
      }: {
            outputPath: string;
            safPath: string;
            configPath?: string;
            inputPath?: string;
            defaultVersion?: string;
            interpreterType?: string;
            converterType?: string;
            recursive?: boolean;
      }) {
            this.outputPath = outputPath;
            this.inputPath = inputPath ?? "./";
            this.safPath = safPath;
            this.recursive = recursive ?? false;

            this.glossary = new Glossary({ safURL: safPath, vsntag: defaultVersion })

            // Define the interpreter and converter maps with supported types and corresponding instances
            const interpreterMap: { [key: string]: Interpreter } = {
                  ALT: new AltInterpreter(),
                  default: new StandardInterpreter(),
            };

            const converterMap: { [key: string]: Converter } = {
                  HTTP: new HTTPConverter(),
                  ESSIF: new ESSIFConverter(),
                  default: new MarkdownConverter(),
            };

            // Assign the interpreter and converter instance based on the provided interpreter type (or use the default)
            this.interpreter = interpreterMap[interpreterType?.toUpperCase() || 'default'];
            this.converter = converterMap[converterType?.toUpperCase() || 'default'];
                
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
                  
                  // If the term has an empty scopetag, set it to the defaultVersion or 'default' if defaultVersion is not specified
                  if (termProperties.get("scopetag") === "") {
                        if (this.defaultVersion) {
                              termProperties.set("scopetag", this.defaultVersion);
                        } else {
                              termProperties.set("scopetag", "default");
                        }
                  }

                  const scopetag = termProperties.get("scopetag");
      
                  // If the glossary does not contain any entries with the same scopetag, check for a remote SAF and fetch glossary entries from it
                  if (!entries.some(entry => entry.scopetag === scopetag)) {
                        if (scopetag) {
                              const remoteSAF = (
                                    await this.glossary.saf
                              ).scopes.find(scopes => scopes.scopetags.includes(scopetag))?.scopedir;
      
                              if (remoteSAF) {
                                    const remoteGlossary = new Glossary({ safURL: remoteSAF });
                                    await remoteGlossary.main();
                                    entries.push(...remoteGlossary.glossary.entries);
                              }
                        }
                  }

                  // Convert the term using the configured converter
                  let replacement = this.converter!.convert(this.glossary.glossary, termProperties);

                  if (match.index !== undefined) {
                        // If the replacement is empty, use the original matched text as the replacement
                        if (replacement === "") {
                              replacement = match[0];
                        }

                        const startIndex = match.index + lastIndex;
                        const matchLength = match[0].length;
                        const textBeforeMatch = data.substring(0, startIndex);
                        const textAfterMatch = data.substring(startIndex + matchLength);
                        
                        // Replace the matched term with the generated replacement in the data string
                        data = `${textBeforeMatch}${replacement}${textAfterMatch}`;

                        // Update the lastIndex to account for the length difference between the match and replacement
                        lastIndex += replacement.length - matchLength;
                  }
            }

            return data;
      }
      
      /**
       * Recursively retrieves all files in the specified directory path.
       * @param dirPath The directory path to retrieve files from.
       * @returns An array of file paths.
       */
      private getFilesRecursively(dirPath: string): string[] {
            const files: string[] = [];

            // Get the directory entries (files and subdirectories) of the specified directory
            const dirents = fs.readdirSync(dirPath, { withFileTypes: true });
            for (const dirent of dirents) {
                        const fullPath = path.join(dirPath, dirent.name);
                  
                  // If the entry is a directory, recursively retrieve files from it and add them to the 'files' array
                  if (dirent.isDirectory()) {
                        const nestedFiles = this.getFilesRecursively(fullPath);
                        files.push(...nestedFiles);
                  // If the entry is a file, add its full path to the 'files' array
                  } else if (dirent.isFile()) {
                        files.push(fullPath);
                  }
            }
            return files;
      }

      /**
       * Resolves and converts files in the specified input path.
       */
      public async resolve(): Promise<boolean> {
            // Get the list of files in the input path, either recursively or non-recursively based on the 'recursive' flag
            const files = this.recursive
                  ? this.getFilesRecursively(this.inputPath)
                  : fs.readdirSync(this.inputPath);

            // Log information about the interpreter, converter and the files being read
            this.log.info(`Using interpreter '${this.interpreter.getType()}' and converter '${this.converter.getType()}'`)
            this.log.info(`Reading ${this.recursive ? "files recursively" : "files"} in '${this.inputPath}'`);

            // Process each file
            for (let filePath of files) {
                  if (!this.recursive) {
                        filePath = path.join(this.inputPath, filePath);
                  }
                  // Check if the file has a valid extension (.md or .html)
                  if ([".md", ".html"].includes(path.extname(filePath))) {
                        // Read the file content
                        const data = fs.readFileSync(filePath, "utf8");
                        this.log.trace(`Reading '${filePath}'`);

                        // Interpret and convert the file data
                        const convertedData = this.interpretAndConvert(data);

                        // Write the converted data to the output file
                        this.writeFile(path.dirname(path.join(this.outputPath, path.basename(filePath))), path.basename(filePath), await convertedData);
                  }
            }

            return true;
      }
}
