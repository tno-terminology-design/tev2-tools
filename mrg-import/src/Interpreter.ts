import { SAF, MRG } from "@tno-terminology-design/utils"
import { log, report, writeFile } from "@tno-terminology-design/utils"
import { download } from "./Handler.js"

import os from "os"
import { glob } from "glob"
import fs = require("fs")
import path = require("path")
import yaml = require("js-yaml")
import { AxiosError } from "axios"

/**
 * The initialize function is called to start the import process.
 * The `scopedir` parameter is used to specify the scopedir.
 */
export async function initialize({ scopedir }: { scopedir: string }) {
  // read the SAF of the 'own' scope
  const env = new Interpreter({ scopedir: scopedir })
  const saf = await env.saf

  if (!saf.scopes) {
    log.warn(`No import scopes found in SAF at '${path.join(scopedir, "saf.yaml")}'`)
    return
  }

  // for each scope in the scopes-section of the 'own' SAF
  log.info(
    `\x1b[1;37mFound ${saf.scopes.length} import scope${saf.scopes.length > 1 ? "s" : ""} in scopedir '${
      saf.scope.scopedir
    }'\x1b[0m`
  )
  for (const scope of saf.scopes) {
    log.info(`\tHandling import scope '${scope.scopetag}'`)
    // read the SAF of the import scope
    const importEnv = new Interpreter({ scopedir: scope.scopedir })
    const importSaf = await importEnv.saf

    if (!importSaf.versions) {
      log.warn(`No maintained MRG files found in import scope '${scope.scopetag}'`)
      continue
    }

    // for each MRG file (version) in the import scope
    log.info(
      `\x1b[1;37mFound ${importSaf.versions.length} maintained MRG file${
        importSaf.versions.length > 1 ? "s" : ""
      } in import scope '${scope.scopetag}'\x1b[0m`
    )
    for (const version of importSaf.versions) {
      try {
        // get MRG Map {import-scopedir}/{import-glossarydir}/mrg.{import-scopetag}.{import-vsntag}.yaml
        let mrgURL = path.join(
          scope.scopedir,
          importSaf.scope.glossarydir,
          `mrg.${importSaf.scope.scopetag}.${version.vsntag}.yaml`
        )
        const mrg = await importEnv.resolveMRG(mrgURL)

        // Set import MRG scopedir and scopetag values to the (non-relative) scope's scopedir and scopetag
        mrg.terminology.scopedir = scope.scopedir
        mrg.terminology.scopetag = scope.scopetag
        for (const entry of mrg.entries) {
          // // for every property in the entry
          // for (const [property, value] of Object.entries(entry)) {
          //   // if the property is a string
          //   if (typeof value === "string") {
          //     const matches: RegExpMatchArray[] = Array.from(value.matchAll(mrg.terminology.interpreter))
          //   }
          // }
        }

        // Write the contents to {my-scopedir}/{my-glossarydir}/mrg.{import-scopetag}.{import-vsntag}.yaml
        mrgURL = path.join(scopedir, saf.scope.glossarydir, `mrg.${scope.scopetag}.${version.vsntag}.yaml`);
        const mrgdump = yaml.dump(mrg, { forceQuotes: true, quotingType: '"', noRefs: true });
        log.info(`\x1b[1;37m\tStoring MRG file '${path.basename(mrgURL)}' in '${path.dirname(mrgURL)}' (primary version)\x1b[0m`);
        writeFile(mrgURL, mrgdump, true);

        if (version.altvsntags || version.vsntag === importSaf.scope.defaultvsn) {
          log.info(`\tCreating duplicate MRGs for 'altvsntags' and/or 'defaultvsn'.`);
        }

        // If the version is the default version, create a duplicate {mrg.{import-scopetag}.yaml}
        if (version.vsntag === importSaf.scope.defaultvsn || version.altvsntags?.includes(importSaf.scope.defaultvsn)) {
          const defaultmrgURL = path.join(path.dirname(mrgURL), `mrg.${scope.scopetag}.yaml`);
          log.info(`\tStoring MRG file '${path.basename(defaultmrgURL)}' in '${path.dirname(defaultmrgURL)}' (default version)`);
          writeFile(defaultmrgURL, mrgdump, true);
        }

        // Create a duplicate for every altvsntag
        if (typeof version.altvsntags === "string") {
          version.altvsntags = [version.altvsntags];
        }
        version.altvsntags?.forEach((altvsntag) => {
          const altmrgURL = path.join(path.dirname(mrgURL), `mrg.${scope.scopetag}.${altvsntag}.yaml`);
          log.info(`\tStoring MRG file '${path.basename(altmrgURL)}' in '${path.dirname(altmrgURL)}' (alternative version: ${altvsntag})`);
          writeFile(altmrgURL, mrgdump, true);
        });

      } catch (err) {
        report.onNotExistError(err as Error)
      }
    }
  }
}

/**
 * The Interpreter class, which handles the MRG and SAF objects.
 * @param scopedir The scopedir of the scope from which the MRG Importer is called.
 */
export class Interpreter {
  public saf!: Promise<SAF.Type>

  public constructor({ scopedir }: { scopedir: string }) {
    this.saf = this.resolveSAF(path.join(scopedir, "saf.yaml"))
  }

  /**
   * Retrieves the SAF (Scope Administration File) map.
   * @param safURL The URL of the SAF map.
   * @returns A promise that resolves to the SAF map.
   */
  private async resolveSAF(safURL: string): Promise<SAF.Type> {
    const safPath = this.localize(safURL)

    return new SAF.Builder({ scopedir: path.dirname(await safPath) }).saf
  }

  /**
   * Retrieves the MRG (Machine Readable Glossary) map.
   * @param mrgURL The URL of the MRG map.
   * @returns A promise that resolves to the MRG map.
   */
  public async resolveMRG(mrgURL: string): Promise<MRG.Type> {
    const mrgPath = await this.localize(mrgURL)

    return new MRG.Builder({ mrgpath: mrgPath }).mrg
  }

  public async localize(fileURL: string): Promise<string> {
    let filePath = fileURL
    // If the `fileURL` is a remote URL, download it to a temporary file
    try {
      const parsedURL = new URL(fileURL)
      const tempPath = path.join(os.tmpdir(), path.basename(fileURL))
      await download(parsedURL, tempPath)
      filePath = tempPath
    } catch (err) {
      if (err.message.includes("Invalid URL") || err.message.includes("Unsupported protocol")) {
        // `fileURL` is not a valid URL, so assume it's a local path
      } else if (err instanceof AxiosError && err.response) {
        throw new Error(`Request of '${new URL(fileURL)}' failed with status code ${err.response.status}`)
      } else {
        // Handle other errors if needed
        throw err
      }
    }

    return filePath
  }


}
