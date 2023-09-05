// Read the SAF of the scope from which the MRG Importer is called.

import { log, onNotExistError } from './Report.js';
import { download, writeFile } from './Handler.js';

import { URL } from 'url';
import os from 'os';
import fs = require("fs");
import path = require('path');
import yaml = require('js-yaml');
import { AxiosError } from 'axios';

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
    scopetag: string;
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

interface Entry {
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

// Read SAF from current scopedir
export async function initialize({ scopedir }: { scopedir: string }) {
    const env = new Interpreter({ scopedir: scopedir });
    const saf = await env.saf;

    // for each scope in the scopes-section of the 'own' SAF
    log.info(`Found ${saf.scopes.length} import scope(s) in scopedir '${saf.scope.scopedir}'`);
    for (const scope of saf.scopes) {
        log.info(`  - Handling import scope '${scope.scopetag}'`);
        // read the SAF of the import scope
        const importEnv = new Interpreter({ scopedir: scope.scopedir });
        const importSaf = await importEnv.saf;

        // for each MRG file (version) in the import scope
        log.info(`Found ${importSaf.versions.length} maintained MRG file(s) in import scope '${scope.scopetag}'`);
        for (const version of importSaf.versions) {
            try {
                // get MRG Map {import-scopedir}/{import-glossarydir}/mrg.{import-scopetag}.{import-vsntag}.yaml
                let mrgURL = path.join(scope.scopedir, importSaf.scope.glossarydir, `mrg.${importSaf.scope.scopetag}.${version.vsntag}.yaml`);
                const mrg = await importEnv.getMrgMap(mrgURL);

                // Set import MRG scopedir and scopetag values to the (non-relative) scope's scopedir and scopetag
                mrg.terminology.scopedir = scope.scopedir;
                mrg.terminology.scopetag = scope.scopetag;
                for (const entry of mrg.entries) {
                    entry.scopetag = scope.scopetag;
                }

                // write the contents to {my-scopedir}/{my-glossarydir}/mrg.{import-scopetag}.{import-vsntag}.yaml
                mrgURL = path.join(saf.scope.scopedir, saf.scope.glossarydir, `mrg.${scope.scopetag}.${version.vsntag}.yaml`);
                writeFile(mrgURL, yaml.dump(mrg));
                log.info(`    - Storing MRG file '${path.basename(mrgURL)}' in '${path.dirname(mrgURL)}'`);
                
                // create a symbolic link {mrg.{import-scopetag}.{import-altvsntag}.yaml} for every {import-altvsntags}
                log.info(`    - Creating symbolic link for ${version.altvsntags.length} alternative version(s)`);
                for (const altvsntag of version.altvsntags) {
                    let altmrgURL = path.join(path.dirname(mrgURL), `mrg.${scope.scopetag}.${altvsntag}.yaml`);
                    if (!fs.existsSync(altmrgURL)) {
                        fs.symlinkSync(path.basename(mrgURL), altmrgURL);
                    } else {
                        // overwrite existing symbolic link
                        fs.unlinkSync(altmrgURL);
                        fs.symlinkSync(path.basename(mrgURL), altmrgURL);
                    }
                }
            } catch (err) {
                if (err instanceof AxiosError && err.response) {
                    onNotExistError(err);
                } else {
                    // Handle other errors if needed
                    onNotExistError(err);
                }
            }
        }
    }
}

export class Interpreter {
    public scopedir: string;
    public saf!: Promise<SAF>;

    public constructor({ scopedir }: { scopedir: string }) {
        this.scopedir = scopedir;

        this.saf = this.getSafMap(path.join(this.scopedir, 'saf.yaml'));
    }

    /**
     * Retrieves the SAF (Scope Administration File) map.
     * @returns A promise that resolves to the SAF map.
     */
    private async getSafMap(safURL: string): Promise<SAF> {
        let saf = {} as SAF;
        let safPath = safURL;
    
        try {
            // If the `safURL` is a remote URL, download it to a temporary file
            try {
                const parsedURL = new URL(safURL);
                const tempPath = path.join(os.tmpdir(), `saf.yaml`);
                await download(parsedURL, tempPath);
                safPath = tempPath;
            } catch (err) {
                if (err instanceof TypeError && err.message.includes('Invalid URL')) {
                    // `safURL` is not a valid URL, so assume it's a local path
                } else {
                    // Handle other errors if needed
                    throw err;
                }
            }
    
            // Try to load the SAF map from the `safPath`
            const safContent = await fs.promises.readFile(safPath, 'utf8');
            saf = yaml.load(safContent) as SAF;
    
            // Check for missing required properties in SAF
            type ScopeProperty = keyof Scope;
            const requiredProperties: ScopeProperty[] = ['scopetag', 'scopedir', 'curatedir'];
            const missingProperties = requiredProperties.filter(prop => !saf.scope[prop]);
    
            if (missingProperties.length > 0) {
                log.error(`E002 Missing required property in SAF at '${safURL}': '${missingProperties.join("', '")}'`);
                process.exit(1);
            }
        } catch (err) {
            if (err instanceof AxiosError && err.response) {
                log.error(`E004 SAF request of '${new URL(safURL)}' failed with status code ${err.response.status}`);
                process.exit(1);
            } else if (err instanceof yaml.YAMLException) {
                log.error(`E005 SAF interpretation of '${new URL(safURL)}' failed due to a YAML parsing error: ${err.message}`);
                process.exit(1);
            } else {
                // Handle other errors if needed
                throw err;
            }
        }
    
        return saf;
    }    

    /**
     * Retrieves the MRG (Machine Readable Glossary) map.
     * @returns A promise that resolves to the MRG map.
     */
    public async getMrgMap(mrgURL: string): Promise<MRG> {
        let mrg = {} as Promise<MRG>;
        let mrgPath = mrgURL;

        try {
            // If the `mrgURL` is a remote URL, download it to a temporary file
            try {
                const parsedURL = new URL(mrgURL);
                const tempPath = path.join(os.tmpdir(), path.basename(mrgURL));
                await download(parsedURL, tempPath);
                mrgPath = tempPath;
            } catch (err) {
                if (err instanceof TypeError && err.message.includes('Invalid URL')) {
                    // `mrgURL` is not a valid URL, so assume it's a local path
                } else {
                    // Handle other errors if needed
                    throw err;
                }
            }

            // Try to load the MRG map from the `mrgPath`
            const mrgfile = fs.readFileSync(mrgPath, 'utf8');
            mrg = yaml.load(mrgfile) as Promise<MRG>;

            // Check for missing required properties in MRG
            type TerminologyProperty = keyof Terminology;
            const requiredProperties: TerminologyProperty[] = ['scopetag', 'scopedir', 'curatedir', 'vsntag'];
            const terminology = (await mrg).terminology;
            const missingProperties = requiredProperties.filter(prop => !terminology[prop]);

            if (missingProperties.length > 0) {
                throw new Error(`Missing required property in MRG at '${mrgURL}': '${missingProperties.join("', '")}'`);
            }

            const requiredEntryProperties = ['term', 'vsntag', 'scopetag', 'locator', 'glossaryText'];

            for (const entry of (await mrg).entries) {
                const missingProperties = requiredEntryProperties.filter(prop => !entry[prop]);

                if (missingProperties.length > 0) {
                    const lineNumber = await this.findmrgindex(mrgfile.split('\n'), entry);
                    const errorMessage = `Invalid entry in MRG at '${mrgURL}' (line ${lineNumber + 1}): missing required property: '${missingProperties.join("', '")}'`;
                    log.warn(errorMessage);

                    // Remove the invalid entry from the MRG entries
                    (await mrg).entries.splice((await mrg).entries.indexOf(entry), 1);
                }
            }
        } catch (err) {
            throw err;
        }

        return mrg;
        }

    /**
     * Finds the index of an entry in an MRG file.
     * @returns A promise that resolves to the index of the entry in the MRG file.
     * @param lines The lines of the MRG file.
     * @param entry The entry to find the index of.
     * @param i The current line number.
     * @param index The possible index of the entry.
     */
    public async findmrgindex(lines: string[], entry: Entry, i: number = 0, index: number = -1): Promise<number> {
        // end of file
        if (i >= lines.length) {
            return -1;
        }
        
        const line = lines[i];

        // marks the start or end of an entry
        if (line.startsWith('-')) {
            // if index is not -1, then we have found the end of the entry
            if (index !== -1) {
                return index;
            }
            // if index is -1, then we have found the start of the entry
            index = i;
            return this.findmrgindex(lines, entry, i + 1, index);
        }

        const obj = yaml.load(line) as { [key: string]: any };

        // line matches properties of entry
        if (obj) {
            const [key] = Object.keys(obj);
            const value = obj[key];

            // if the value of the property is undefined or matches the value of the property in the entry
            if (entry[key] !== undefined && entry[key] === value) {
                return this.findmrgindex(lines, entry, i + 1, index);
            }
            // if the value of the property is an array and the value of the property in the entry is included in the array
            if (Array.isArray(entry[key])) {
                try {
                    const len = entry[key].length;
                    if (len > 1) {
                        for (let j = 0; j < len; j++) {
                            i++;

                            const line = lines[i];
                            const obj = yaml.load(line) as { [key: string]: any };
                            const [key2] = Object.keys(obj);
                            const value = obj[key2];

                            if (entry[key].includes(value)) {
                                continue;
                            } else {
                                break;
                            }
                        }
                        return this.findmrgindex(lines, entry, i + 1, index);
                    }
                } catch (_err) {
                    null;
                }
            }
        }

        // continue searching for next entry
        return this.findmrgindex(lines, entry, i + 1);
    }
}
