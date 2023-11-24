import fs = require("fs")
import path = require("path")
import yaml = require("js-yaml")

export interface SAF {
  scope: Scope
  scopes: Scopes[]
  versions: Version[]
}

export interface Scope {
  scopetag: string
  scopedir: string
  curatedir: string
  glossarydir: string
  defaultvsn: string
  defaulttype: string
  website: string
  navpath: string
  bodyFileID?: string
  license?: string
  statuses?: string[]
  localscopedir: string
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

/**
 * The SafBuilder class handles the retrieval and processing of a SAF (Scope Administration File).
 * A SAF is retrieved based on the `scopedir` and processed into a SAF object.
 */
export class SafBuilder {
  saf: SAF

  public constructor({ scopedir }: { scopedir: string }) {
    this.saf = this.setSafMap(path.join(scopedir, "saf.yaml"))

    this.saf.scope.localscopedir = scopedir
  }

  /**
   * Reads the SAF at `safURL` and maps it as the this.saf SAF object.
   * @param safURL - The full path of the SAF to be retrieved.
   * @returns - The SAF as a SAF object.
   */
  private setSafMap(safURL: string): SAF {
    try {
      // try to load the SAF map from the scopedir
      this.saf = yaml.load(fs.readFileSync(safURL, "utf8")) as SAF

      // check for missing required properties in SAF
      type ScopeProperty = keyof Scope
      const requiredProperties: ScopeProperty[] = ["scopetag", "scopedir", "curatedir", "defaultvsn"]
      const missingProperties = requiredProperties.filter((prop) => this.saf.scope[prop] == null)

      if (missingProperties.length > 0) {
        throw new Error(`Missing required property in SAF at '${safURL}': '${missingProperties.join("', '")}'`)
      }

      // Set default values for optional properties in SAF
      if (this.saf.scope.website == undefined) {
        // log.warn(`No 'website' property found in SAF. Using '/' as default value.`)
        this.saf.scope.website = "/"
      }
      if (this.saf.scope.navpath == undefined) {
        // log.warn(`No 'navpath' property found in SAF. Using '/' as default value.`)
        this.saf.scope.navpath = "/"
      }
      if (this.saf.scope.defaulttype == undefined) {
        // log.warn(`No 'defaulttype' property found in SAF. Using 'term' as default value.`)
        this.saf.scope.defaulttype = "concept"
      }

      // Check if there are existing versions
      if (!this.saf.versions || this.saf.versions.length === 0) {
        // log.error(`E003 No versions found in SAF at '${safURL}'`)
        throw new Error(`No versions found in SAF at '${safURL}'`)
      }
    } catch (err) {
      throw new Error(`E004 An error occurred while attempting to load the SAF at '${safURL}':`, { cause: err })
    }

    return this.saf
  }
}
