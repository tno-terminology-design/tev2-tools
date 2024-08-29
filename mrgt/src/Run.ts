#!/usr/bin/env node

import { Command, type OptionValues } from "commander"
import { readFileSync } from "fs"
import { resolve, join, dirname } from "path"
import { SAF } from "@tno-terminology-design/utils"
import { log, report } from "@tno-terminology-design/utils"
import { Generator } from "./Generator.js"
import { fileURLToPath } from "url"

import yaml from "js-yaml"
import figlet from "figlet"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const program = new Command()
const name = "mrgt"
const version = JSON.parse(readFileSync(join(__dirname, "../package.json"), "utf8")).version

program
  .name(name)
  .usage("[ <paramlist> ]\n" + "- <paramlist> (optional) is a list of key-value pairs")
  .description("The CLI for the Machine Readable Glossary (Generation) Tool")
  .version(version, "-V, --version", "Output the version number")
  .option("-c, --config <path>", "Path (including the filename) of the tool's (YAML) configuration file")
  .option("-s, --scopedir <path>", "Path of the scope directory from which the tool is called")
  .option("-v, --vsntag <vsntag>", "Versiontag for which the MRG needs to be (re)generated")
  .option("-e, --onNotExist <action>", "The action in case a `vsntag` was specified, but wasn't found in the SAF")
  .option("-p, --prune", "Prune MRGs of the local scope that are not in the SAF")
  .option("-h, --help", "Display help for command")
  .parse(process.argv)

async function main(): Promise<void> {
  // Parse command line parameters
  let options = program.opts()
  if (program.args[0]) {
    options.input = program.args
  }

  console.log(`\x1b[31m${figlet.textSync(name + "-cli", { horizontalLayout: "full" })}`)
  console.log(`\x1b[0mVersion: ${version}\n`)

  if (options.config) {
    try {
      const config = yaml.load(readFileSync(resolve(options.config), "utf8")) as OptionValues

      // Overwrite config options and mrgt specific config options with command line options
      const { mrgt, ...rest } = config
      options = { ...rest, ...mrgt, ...options }
    } catch (err) {
      throw new Error(`E011 Failed to read or parse the config file '${options.config}':`, { cause: err })
    }
  }

  // Check if required option is missing
  if (!options.scopedir) {
    program.addHelpText(
      "after",
      "\nRequired option is missing\n" + "Provide at least the following option: --scopedir <path>"
    )
    program.help()
    process.exit(1)
  }

  report.setOnNotExist(options.onNotExist)

  // Create a SAF and generator instance
  const saf = new SAF.Builder({ scopedir: resolve(options.scopedir) }).saf
  const generator = new Generator({ vsntag: options.vsntag, saf: saf })

  // Start generation
  generator.initialize()
  log.info("Generation complete")

  if (options.prune) {
    await generator.prune()
  }
}

try {
  await main()
  process.exit(0)
} catch (err) {
  if ((err as Error).cause) {
    log.error(err)
  } else {
    log.error("E012 Something unexpected went wrong during generation:", err)
  }
  process.exit(1)
}
