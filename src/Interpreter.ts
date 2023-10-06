// Read the SAF of the scope from which the MRG Importer is called.

import { log, onNotExistError } from './Report.js';
import { download, writeFile } from './Handler.js';

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

/**
 * Initializes the MRG Importer.
 * @param scopedir The scopedir of the scope from which the MRG Importer is called.
 */
export async function initialize({ scopedir }: { scopedir: string }) {
    // read the SAF of the 'own' scope
    const env = new Interpreter({ scopedir: scopedir });
    const saf = await env.saf;

    if (!saf.scopes) {
        log.warn(`No import scopes found in SAF at '${path.join(scopedir, 'saf.yaml')}'`);
        return;
    }
    // for each scope in the scopes-section of the 'own' SAF
    // if saf.scopes.length > 0 then log.info with import scopes instead of scope
    log.info(`\x1b[1;37mFound ${saf.scopes.length} import scope${saf.scopes.length > 1 ? 's' : ''} in scopedir '${saf.scope.scopedir}'`);
    for (const scope of saf.scopes) {
        log.info(`  - Handling import scope '${scope.scopetag}'`);
        // read the SAF of the import scope
        const importEnv = new Interpreter({ scopedir: scope.scopedir });
        const importSaf = await importEnv.saf;

        if (!importSaf.versions) {
            log.warn(`No maintained MRG files found in import scope '${scope.scopetag}'`);
            continue;
        }

        // for each MRG file (version) in the import scope
        log.info(`\x1b[1;37mFound ${importSaf.versions.length} maintained MRG file${importSaf.versions.length > 1 ? 's' : ''} in import scope '${scope.scopetag}'`);
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
                mrgURL = path.join(scopedir, saf.scope.glossarydir, `mrg.${scope.scopetag}.${version.vsntag}.yaml`);
                writeFile(mrgURL, yaml.dump(mrg, { forceQuotes: true }));
                log.info(`    - Storing MRG file '${path.basename(mrgURL)}' in '${path.dirname(mrgURL)}'`);

                // if the version is the default version, create a symbolic link {mrg.{import-scopetag}.yaml}
                if (version.vsntag === importSaf.scope.defaultvsn) {
                    log.info(`    - Creating symbolic link for default version`);
                    let defaultmrgURL = path.join(path.dirname(mrgURL), `mrg.${scope.scopetag}.yaml`);
                    if (!fs.existsSync(defaultmrgURL)) {
                        fs.symlinkSync(path.basename(mrgURL), defaultmrgURL);
                    } else {
                        // overwrite existing symbolic link
                        fs.unlinkSync(defaultmrgURL);
                        fs.symlinkSync(path.basename(mrgURL), defaultmrgURL);
                    }
                }
                
                if (!version.altvsntags) {
                    continue;
                }

                // create a symbolic link {mrg.{import-scopetag}.{import-altvsntag}.yaml} for every {import-altvsntags}
                // if altvsntags is a string, convert it to an array
                if (typeof(version.altvsntags) === 'string') {
                    version.altvsntags = [version.altvsntags];
                }
                log.info(`    - Creating symbolic link${version.altvsntags.length > 1 ? 's' : ''} for ${version.altvsntags.length} alternative version${version.altvsntags.length > 1 ? 's' : ''}`);
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
                onNotExistError(err);
            }
        }
    }
}

/**
 * The Interpreter class, which handles the MRG and SAF objects.
 * @param scopedir The scopedir of the scope from which the MRG Importer is called.
 */
export class Interpreter {
    public scopedir: string;
    public saf!: Promise<SAF>;

    public constructor({ scopedir }: { scopedir: string }) {
        this.scopedir = scopedir;

        this.saf = this.getSafMap(path.join(this.scopedir, 'saf.yaml'));
    }

    /**
     * Retrieves the SAF (Scope Administration File) map.
     * @param safURL The URL of the SAF map.
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
     * @param mrgURL The URL of the MRG map.
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
        } catch (err) {
            throw err;
        }

    return mrg;
    }
}
