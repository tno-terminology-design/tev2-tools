import { Interpreter } from './Interpreter.js';
import { Converter } from './Converter.js';
import { StandardInterpreter } from './StandardInterpreter.js';
import { MarkdownConverter } from './MarkdownConverter.js';
import { HTTPConverter } from './HTTPConverter.js';
import { AltInterpreter } from './AltInterpreter.js';
import { ESSIFConverter } from './ESIFFConverter.js'
import { Logger } from 'tslog';
import { tmpdir } from 'os';

import download = require('download');
import fs = require("fs");
import path = require('path');
import yaml = require('js-yaml');

export class Resolver {
      private log = new Logger();
      private output: string;
      // todo switch scope
      private scope: string;
      private mrgWritePath = "./mrg.yaml"    // on download from remote source
      private config?: string;
      private directory: string = ".";
      // todo switch scope based on version 
      private version?: string = "latest";
      private converter?: Converter;
      private interpreter?: Interpreter;
      private baseURL?: string;
      private recursive?: boolean;

      public constructor({ outputPath, scopePath, directoryPath, vsn, configPath, interpreterType, converterType, recursive }: { outputPath: string; scopePath: string; directoryPath?: string; vsn?: string; configPath?: string; interpreterType?: string; converterType?: string; recursive?: boolean }) {
            this.output = outputPath;
            this.scope = scopePath;
            this.recursive = recursive;   // either true or undefined

            // process optional parameters if not set in config 
            if (configPath) {
                  this.config = configPath;
                  this.processConfig();
            } else {
                  this.setOptionalParams(directoryPath!, vsn!, interpreterType!, converterType!);
            }
      }

      private processConfig(): boolean {
            // read config file and set parameters
            this.log.trace(`Config path is set: ${this.config}`);
            const config: Map<string, string> = new Map(Object.entries(yaml.load(fs.readFileSync(this.config!, 'utf8')!)!));
            if (config.get("output") != "" || config.get("output")) {
                  this.log.trace(`Out path is set: ${config.get("output")}`);
                  this.output = config.get("output")!;
            } else if (config.get("scopedir") != "" || config.get("scopedir")) {
                  this.log.trace(`Scope path is set: ${config.get("scopedir")}`);
                  this.scope = config.get("scopedir")!;
            }

            // method	<methodarg>	n	Text, the syntax and semantics of which remain to be specified (see also the Editor's note below). When this parameter is omitted, term refs are replaced with some default renderable ref. --> TODO update documentation
            this.setOptionalParams(config.get("input")!, config.get("version")!, config.get("interpreter")!, config.get("converter")!);
            return true;
      }

      private setOptionalParams(directoryPath: string, vsn: string, interpreterType: string, converterType: string) {
            if (directoryPath) { this.directory = directoryPath; }
            if (vsn) { this.version = vsn; }
            if (interpreterType) {
                  if (interpreterType == "Standard") {
                        this.interpreter = new StandardInterpreter();
                  } else if (interpreterType == "Alt") {
                        this.interpreter = new AltInterpreter();
                  } else {
                        this.log.error(interpreterType + " is not a known interpreter, creating standard interpreter.");
                        this.interpreter = new StandardInterpreter();
                  }
            } else {
                  this.interpreter = new StandardInterpreter();
            }

            if (converterType) {
                  if (converterType == "Markdown") {
                        this.converter = new MarkdownConverter();
                  } else if (converterType == "HTTP") {
                        this.converter = new HTTPConverter();
                  } else if (converterType == "ESIFF") {
                        this.converter = new ESSIFConverter();
                  } else {
                        this.log.error(converterType + " is not a known converter, creating Markdown converter.");
                        this.converter = new MarkdownConverter();
                  }
            } else {
                  this.converter = new MarkdownConverter();
            }
      }

      public getDirectory(): string {
            return this.directory;
      }

      public getInterpreterType(): string {
            return this.interpreter ? this.interpreter.getType() : "";
          }          

      public getConverterType(): string {
            return this.converter ? this.converter.getType() : "";
      }

      private getScopeMap(): Map<string, string> {
            const safDocument: Map<string, string> = new Map(Object.entries(yaml.load(fs.readFileSync(this.scope, 'utf8')!)!));
            // JSON.stringify() used to force object to string casting as javascript does not support typing otherwise
            return new Map(Object.entries(yaml.load(JSON.stringify(safDocument.get("scope"))!)!));
      }

      private getSafKey(key: string): string {
            const scopeMap = this.getScopeMap();
            const value = scopeMap.get(key);
            if (!value) {
              this.log.error(`No ${key} defined in SAF`);
              return "";
            }
            return value;
          }

      private getMrgUrl(): string {
            this.log.trace("Locating MRG from SAF at: " + this.scope);

            const scopeMap = this.getScopeMap();
            this.baseURL = this.getSafKey("website");
            const scopedir = this.getSafKey("scopedir");
            const glossarydir = this.getSafKey("glossarydir");
            const mrgfile = this.getSafKey("mrgfile")

            const mrgURL = path.join(scopedir, glossarydir, mrgfile);
            this.log.trace(`MRG URL is: ${mrgURL}`);
            return mrgURL;
      }


      private async readGlossary(): Promise<Map<string, string>> {
            const glossary: Map<string, string> = new Map();
            const mrgURL: string = this.getMrgUrl();
            let mrgDocument: any;
            
            try {
                  // Try reading MRG file using fs
                  mrgDocument = yaml.load(fs.readFileSync(mrgURL, 'utf8'));
            } catch (err) {
                  try {
                        // If file does not exist locally, download it to tmpdir
                        const filePath = path.join(tmpdir(), mrgURL)
                        const writeStream = fs.createWriteStream(filePath);

                        this.log.trace("Trying to download MRG: " + mrgURL);
                        writeStream.write(await download(mrgURL))
                        writeStream.close();

                        mrgDocument = yaml.load(fs.readFileSync(filePath, 'utf8'));
                  } catch (err) {
                        this.log.error("Failed to download or read MRG, glossary empty")
                        return glossary;
                  }
            }

            this.populateGlossary(mrgDocument, glossary);
            this.log.info(`Populated glossary of ${this.scope}:${this.version}`)
            return glossary
      }


      private populateGlossary(mrgDocument: Object, glossary: Map<string, string>): Map<string, string> {
            const mrg: Map<string, string> = new Map(Object.entries(mrgDocument));
            for (const [key, value] of Object.entries(mrg.get("entries")!)) {
                  var alternatives: string[];
                  const innerValues: Map<string, string> = new Map(Object.entries(yaml.load(JSON.stringify(value)!)!));

                  if (innerValues.get("formPhrases")) {
                        alternatives = innerValues.get("formPhrases")!.split(",");
                        alternatives.forEach(t => t.trim());
                        // todo double check the white spaces in this glossary
                        // (?<text>\w+){(?<formPhrase>ss|yies|ying)}
                        for (var alternative of alternatives) {
                              if (alternative.includes("{")) {
                                    if (alternative.includes("{ss}")) {
                                          alternatives.push(alternative.replace("{ss}", "s"));
                                          if (alternative.replace("{ss}", "")! in alternatives) {
                                                alternatives.push(alternative.replace("{ss}", ""));
                                          }
                                    } else if (alternative.includes("{yies}")) {
                                          alternatives.push(alternative.replace("{yies}", "ies"));
                                          if (alternative.replace("{yies}", "y")! in alternatives) {
                                                alternatives.push(alternative.replace("{yies}", "y"));
                                          }
                                    } else if (alternative.includes("{ying}")) {
                                          alternatives.push(alternative.replace("{ying}", "ing"));
                                          if (alternative.replace("{ying}", "y")! in alternatives) {
                                                alternatives.push(alternative.replace("{ying}", "y"));
                                          }
                                    }

                              }
                        }


                        glossary.set(innerValues.get("term")!, `${this.baseURL}/${innerValues.get("navurl")}`);
                        for (var alternative of alternatives.filter(s => !s.includes("{"))) {
                              glossary.set(alternative, `${this.baseURL}/${innerValues.get("navurl")}`);
                        }

                  }
            }
            return glossary;
      }

      private writeFile(dirPath: string, file: string, data: string) {
            if (!fs.existsSync(dirPath)) {
                  fs.mkdirSync(dirPath, { recursive: true });
            };
            this.log.trace("Writing: " + path.join(dirPath, file));
            fs.writeFileSync(path.join(dirPath, file), data);
      }

      private interpretAndConvert(data: string, glossary: Map<string, string>): string {
            const matches: IterableIterator<RegExpMatchArray> = data.matchAll(this.interpreter!.getGlobalTermRegex());
            for (const match of Array.from(matches)) {
                  var termProperties: Map<string, string> = this.interpreter!.interpret(match);
                  var replacement = this.converter!.convert(glossary, termProperties);
                  if (replacement != "") {
                        data = data.replace(this.interpreter!.getLocalTermRegex(), replacement);
                  }
            }

            return data;
      }

      public getFilesRecursively(dirPath: string): string[] {
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
                  ? this.getFilesRecursively(this.directory)
                  : fs.readdirSync(this.directory);

            this.log.info(`Reading ${this.recursive ? "files recursively" : "files"} in ${this.directory}`);

            for (const file of files) {
                  const filePath = this.recursive ? file : path.join(this.directory, file);

                  if ([".md", ".html"].includes(path.extname(filePath))) {
                        const data = fs.readFileSync(filePath, "utf8");
                        this.log.trace("Reading: " + filePath);
                        const convertedData = this.interpretAndConvert(data, await this.readGlossary());
                        this.writeFile(path.dirname(path.join(this.output, filePath)), path.basename(filePath), convertedData);
                  }
            }

            return true;
      }



}