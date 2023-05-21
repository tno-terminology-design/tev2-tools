import { Interpreter } from './Interpreter.js';
import { Converter } from './Converter.js';
import { Glossary } from './Glossary.js';
import { StandardInterpreter } from './StandardInterpreter.js';
import { MarkdownConverter } from './MarkdownConverter.js';
import { HTTPConverter } from './HTTPConverter.js';
import { AltInterpreter } from './AltInterpreter.js';
import { ESSIFConverter } from './ESIFFConverter.js'
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

      public constructor({ outputPath, safPath, configPath, inputPath, defaultVersion, interpreterType, converterType, recursive }: { outputPath: string; safPath: string; configPath?: string; inputPath?: string; defaultVersion?: string; interpreterType?: string; converterType?: string; recursive?: boolean }) {
            this.outputPath = outputPath;
            this.inputPath = inputPath ?? "./";
            this.safPath = safPath;
            this.recursive = recursive ?? false;

            this.glossary = new Glossary({ safURL: safPath, vsntag: defaultVersion })

            this.interpreter = interpreterType === "Alt" ? new AltInterpreter() : new StandardInterpreter();
            this.converter = converterType === "HTTP" ? new HTTPConverter() :
                  converterType === "ESIFF" ? new ESSIFConverter() : new MarkdownConverter();
      }

      private writeFile(dirPath: string, file: string, data: string) {
            if (!fs.existsSync(dirPath)) {
                  fs.mkdirSync(dirPath, { recursive: true });
            };
            this.log.trace("Writing: " + path.join(dirPath, file));
            fs.writeFileSync(path.join(dirPath, file), data);
      }

      private async interpretAndConvert(data: string): Promise<string> {
            const matches: IterableIterator<RegExpMatchArray> = data.matchAll(
                  this.interpreter!.getTermRegex()
            );
            let lastIndex = 0;
            await this.glossary.main();
      
            for (const match of Array.from(matches)) {
                  const termProperties: Map<string, string> = this.interpreter!.interpret(match);
                  const entries = this.glossary.glossary.entries;
      
                  if (termProperties.get("scopetag") === "") {
                        if (this.defaultVersion) {
                              termProperties.set("scopetag", this.defaultVersion);
                        } else {
                              termProperties.set("scopetag", "default");
                        }
                  }

                  const scopetag = termProperties.get("scopetag");
                  this.log.debug(scopetag);
      
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

                  let replacement = this.converter!.convert(this.glossary.glossary, termProperties);

                  if (match.index !== undefined) {
                        if (replacement == "") {
                              replacement = `[${termProperties.get("showtext")}](unresolved-termref)`;
                        }
                        const startIndex = match.index + lastIndex;
                        const matchLength = match[0].length;
                        const textBeforeMatch = data.substring(0, startIndex);
                        const textAfterMatch = data.substring(startIndex + matchLength);
                        
                        data = `${textBeforeMatch}${replacement}${textAfterMatch}`;
                        lastIndex += replacement.length - matchLength;
                  }
            }

            return data;
      }
      

      private getFilesRecursively(dirPath: string): string[] {
            const files: string[] = [];
            const dirents = fs.readdirSync(dirPath, { withFileTypes: true });
            for (const dirent of dirents) {
                        const fullPath = path.join(dirPath, dirent.name);
                  if (dirent.isDirectory()) {
                        const nestedFiles = this.getFilesRecursively(fullPath);
                        files.push(...nestedFiles);
                  } else if (dirent.isFile()) {
                        files.push(fullPath);
                  }
            }
            return files;
      }

      public async resolve(): Promise<boolean> {
            const files = this.recursive
                  ? this.getFilesRecursively(this.inputPath)
                  : fs.readdirSync(this.inputPath);

            this.log.info(`Reading ${this.recursive ? "files recursively" : "files"} in ${this.inputPath}`);

            for (const filePath of files) {
                  if ([".md", ".html"].includes(path.extname(filePath))) {
                        const data = fs.readFileSync(filePath, "utf8");
                        this.log.trace("Reading: " + filePath);


                        const convertedData = this.interpretAndConvert(data);
                        this.writeFile(path.dirname(path.join(this.outputPath, path.basename(filePath))), path.basename(filePath), await convertedData);
                  }
            }

            return true;
      }
}
