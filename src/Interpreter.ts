// Read the SAF of the scope from which the MRG Importer is called.

import { log, onNotExistError } from './Report.js';

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
async function initialize({ scopedir }: { scopedir: string }) {
    const env = new Interpreter({ scopedir: scopedir })
    const saf = await env.saf;

    // for each scope in the scopes-section of the 'own' SAF
    for (const scope of saf.scopes) {
        // read the SAF of the import scope
        const importEnv = new Interpreter({ scopedir: scope.scopedir });
        const importSaf = await importEnv.saf;

        // for each MRG file (version) in the import scope
        for (const version of importSaf.versions) {
            // get MRG Map {import-scopedir}/{import-glossarydir}/mrg.{import-scopetag}.{import-vsntag}.yaml
            let mrgfile = `mrg.${importSaf.scope.scopetag}.${version.vsntag}.yaml`;
            const mrg = await importEnv.getMrgMap(path.join(importSaf.scope.scopedir, importSaf.scope.glossarydir, mrgfile));

            // write the contents to {my-scopedir}/{my-glossarydir}/mrg.{import-scopetag}.{import-vsntag}.yaml
            writeFile(path.join(saf.scope.scopedir, saf.scope.glossarydir), mrgfile, yaml.dump(mrg), true);

            // create a symbolic link {mrg.{import-scopetag}.{import-altvsntag}.yaml} for every {import-altvsntags}
            for (const altvsntag of version.altvsntags) {
                mrgfile = `mrg.${importSaf.scope.scopetag}.${altvsntag}.yaml`;
                fs.symlinkSync(path.join(importSaf.scope.glossarydir, `mrg.${importSaf.scope.scopetag}.${version.vsntag}.yaml`), path.join(saf.scope.glossarydir, mrgfile));
            }
        }
    }
}

/**
 * Creates directory tree and writes data to a file.
 * @param dirPath - The directory path.
 * @param file - The file name.
 * @param data - The data to write.
 * @param force - Whether to overwrite existing files.
 */
function writeFile(dirPath: string, file: string, data: string, force: boolean = false) {
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

        try {
            // Try to load the SAF map from the scopedir
            saf = yaml.load(fs.readFileSync(safURL, 'utf8')) as SAF;

            // Check for missing required properties in SAF
            type ScopeProperty = keyof Scope;
            const requiredProperties: ScopeProperty[] = ['scopetag', 'scopedir', 'curatedir'];
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

            // Check for missing required properties in MRG
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
            log.error(`E005 An error occurred while attempting to load a MRG at '${mrgURL}':`, err);
            process.exit(1);
        }

        return mrg;
        }

    /**
     * Finds the index of an entry in a MRG file.
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