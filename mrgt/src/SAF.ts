import { log } from "./Report.js"

import fs = require("fs")
import path = require("path")
import yaml = require("js-yaml")

export interface SAF {
  scope: Scope
  scopes: Scopes[]
  versions: Version[]
}

interface Scope {
  website: string
  navpath: string
  scopetag: string
  scopedir: string
  curatedir: string
  glossarydir: string
  defaultvsn: string
  localscopedir: string
  bodyFileID?: string
}

export interface Scopes {
  scopetag: string
  scopedir: string
}

export interface Version {
  vsntag: string
  altvsntags: string[]
  termselection: string[]
}

export class SafBuilder {
  saf: SAF

  public constructor({ scopedir }: { scopedir: string }) {
    this.saf = this.getSafMap(path.join(scopedir, "saf.yaml"))

    this.saf.scope.localscopedir = scopedir
  }

  /**
   * Retrieves the SAF (Scope Administration File) map.
   * @returns A promise that resolves to the SAF map.
   */
  private getSafMap(safURL: string): SAF {
    let saf = {} as SAF

    try {
      // Try to load the SAF map from the scopedir
      saf = yaml.load(fs.readFileSync(safURL, "utf8")) as SAF

      // Check for missing required properties in SAF
      type ScopeProperty = keyof Scope
      const requiredProperties: ScopeProperty[] = ["scopetag", "scopedir", "curatedir", "defaultvsn"]
      const missingProperties = requiredProperties.filter((prop) => !saf.scope[prop])

      if (missingProperties.length > 0) {
        log.error(`E002 Missing required property in SAF at '${safURL}': '${missingProperties.join("', '")}'`)
        process.exit(1)
      }

      // Set default values for optional properties in SAF
      if (saf.scope.website == undefined) {
        log.warn(`No 'website' property found in SAF. Using '/' as default value.`)
        saf.scope.website = "/"
      }
      if (saf.scope.navpath == undefined) {
        log.warn(`No 'navpath' property found in SAF. Using '/' as default value.`)
        saf.scope.navpath = "/"
      }

      // Check if there are existing versions
      if (!saf.versions || saf.versions.length === 0) {
        log.error(`E003 No versions found in SAF at '${safURL}'`)
        process.exit(1)
      }
    } catch (err) {
      log.error(`E004 An error occurred while attempting to load the SAF at '${safURL}':`, err)
      process.exit(1)
    }

    return saf
  }
}
