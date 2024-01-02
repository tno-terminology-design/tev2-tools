#!/usr/bin/env node

import { Command, type OptionValues } from "commander"
import { readFileSync } from "fs"
import { resolve } from "path"
import { log, report } from "@tno-terminology-design/utils"
import { initialize } from "./Interpreter.js"

import yaml from "js-yaml"
import chalk from "chalk"
import figlet from "figlet"

const program = new Command()
const name = "mrg-import"
const version = "0.1.9"

program
  .name(name)
  .usage("[ <paramlist> ]\n" + "- <paramlist> (optional) is a list of key-value pairs")
  .description("The CLI for the MRG Import Tool")
  .version(version, "-V, --version", "Output the version number")
  .option("-c, --config <path>", "Path (including the filename) of the tool's (YAML) configuration file")
  .option("-s, --scopedir <path>", "Path of the scope directory from which the tool is called")
  .option("-o, --onNotExist <action>", "The action in case an MRG file unexpectedly does not exist")
  .option("-p, --prune", "Prune MRGs of scopes that are not in administered the SAF")
  .parse(process.argv)

async function main(): Promise<void> {
  // Parse command line parameters
  let options = program.opts()
  if (program.args[0]) {
    options.input = program.args
  }

  console.log(chalk.red(figlet.textSync(name, { horizontalLayout: "full" })))
  console.log(`Version: ${version}\n`)

  if (options.config) {
    try {
      const config = yaml.load(readFileSync(resolve(options.config), "utf8")) as OptionValues

      // Overwrite command line options with config options and mrg-import specific config options
      const { "mrg-import": mrgimport, ...rest } = config
      options = { ...rest, ...mrgimport, ...options }
    } catch (err) {
      throw new Error(`E011 Failed to read or parse the config file '${options.config}':`, { cause: err })
    }
  }

  // Check if required option is missing
  if (!options.scopedir) {
    program.addHelpText(
      "after",
      "\nA required option is missing\n" + "Provide at least the following option: --scopedir <path>"
    )
    program.help()
    process.exit(1)
  }

  report.setOnNotExist(options.onNotExist)

  await initialize({ scopedir: resolve(options.scopedir), prune: options.prune })
  log.info("The MRG Import Tool has finished execution")
}

try {
  main()
  process.exit(0)
} catch (err) {
  if ((err as Error).cause) {
    log.error(err)
  } else {
    log.error("E012 Something unexpected went wrong:", err)
  }
  process.exit(1)
}
