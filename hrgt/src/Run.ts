#!/usr/bin/env node

import { Command, type OptionValues } from "commander"
import { readFileSync } from "fs"
import { resolve } from "path"
import { log, report } from "@tno-terminology-design/utils"
import { Resolver } from "./Resolver.js"

import yaml from "js-yaml"
import chalk from "chalk"
import figlet from "figlet"

const program = new Command()
const name = "hrgt"
const version = "0.1.5"

program
  .name(name)
  .usage(
    "[ <paramlist> ] [ <globpattern> ]\n" +
      "- <paramlist> (optional) is a list of key-value pairs\n" +
      "- <globpattern> (optional) specifies a set of (input) files that are to be processed"
  )
  .description("The CLI for the Human Readable Glossary Generation Tool")
  .version(version, "-V, --version", "Output the version number")
  .option("-c, --config <path>", "Path (including the filename) of the tool's (YAML) configuration file")
  .option("-o, --output <dir>", "(Root) directory for output files to be written")
  .option("-s, --scopedir <path>", "Path of the scope directory where the SAF is located")
  // If interpreters or converters are added/removed, please adjust the documentation in the repo-file `tno-terminology-design/tev2-specifications/docs/spec-files/90-configuration-file.md`.
  .option(
    "--int, --interpreter <regex> or <predeftype>",
    "Type of interpreter, i.e., a regex, or a predefined type (`default`)"
  )
  .option(
    "--con, --converter <template> or <predeftype>",
    "Type of converter, i.e., a mustache/handlebars template, or a predefined type (`markdown-table-row`, `markdown-section-2`, `markdown-section-3`)"
  )
  .option(
    "--sort, --sorter <template> or <predeftype>",
    "Type of sorter, i.e., a mustache/handlebars template, or a predifined type (`default`) by which to sort the glossary items"
  )
  .option("-o, --onNotExist <action>", "The action in case an MRG file unexpectedly does not exist")
  .option("-f, --force", "Allow overwriting of existing files")
  .option("-h, --help", "Display help for command")
  .parse(process.argv)

async function main(): Promise<void> {
  // Parse command line parameters
  let options = program.opts()
  if (program.args[0]) {
    options.input = program.args
  }

  console.log(chalk.red(figlet.textSync(name + "-cli", { horizontalLayout: "full" })))
  console.log(`Version: ${version}\n`)

  if (options.config) {
    try {
      const config = yaml.load(readFileSync(resolve(options.config), "utf8")) as OptionValues

      // Overwrite command line options with config options and hrgt specific config options
      const { hrgt, ...rest } = config
      options = { ...rest, ...hrgt, ...options }
    } catch (err) {
      throw new Error(`E011 Failed to read or parse the config file '${options.config}'`, { cause: err })
    }
  }

  // Check if required options are provided
  if (options.output == null || options.scopedir == null || options.input == null) {
    program.addHelpText(
      "after",
      "\nRequired options are missing\n" +
        "Provide at least the following options: output <path>, scopedir <path> and input <globpattern>\n"
    )
    program.help()
    process.exit(1)
  }

  // Create a resolver with the provided options
  const resolver = new Resolver({
    outputPath: resolve(options.output),
    globPattern: options.input,
    force: options.force,
    sorter: options.sorter ?? "default",
    interpreter: options.interpreter ?? "default",
    converter: options.converter ?? "markdown-table-row",
    saf: resolve(options.scopedir)
  })

  report.setOnNotExist(options.onNotExist)

  // Resolve terms
  await resolver.resolve()
  log.info("Execution complete")
}

try {
  await main()
  process.exit(0)
} catch (err) {
  if ((err as Error).cause) {
    log.error(err)
  } else {
    log.error("E012 Something unexpected went wrong during execution:", err)
  }
  process.exit(1)
}
