#!/usr/bin/env node

import { Command, type OptionValues } from "commander"
import { Converter } from "./Converter.js"
import { readFileSync } from "fs"
import { resolve } from "path"
import { log, report } from "@tno-terminology-design/utils"
import { Resolver } from "./Resolver.js"

import yaml from "js-yaml"
import figlet from "figlet"

const program = new Command()
const name = "hrgt"
const version = "1.0.4"

program
  .name(name)
  .usage(
    "[ <paramlist> ] [ <globpattern> ]\n" +
      "- <paramlist> (optional) is a list of key-value pairs\n" +
      "- <globpattern> (optional) specifies a set of (input) files that are to be processed\n" +
      "\n" +
      "*Multiple converters may be specified by appending a number to the parameter key, e.g., `converter[1]: <template>` `converter[2]: <template>`, where `n` specifies the order in which converters are applied to every [MRG entry](@). Using `converter`, without a number, is equal to using `converter[1]`\n"
  )
  .description("The CLI for the Human Readable Glossary Generation Tool")
  .version(version, "-V, --version", "Output the version number")
  .option("-c, --config <path>", "Path (including the filename) of the tool's (YAML) configuration file")
  .option("-o, --output <dir>", "(Root) directory for output files to be written")
  .option("-s, --scopedir <path>", "Path of the scope directory where the SAF is located")
  // If interpreters or converters are added/removed, please adjust the documentation at `tno-terminology-design/tev2-specifications/docs/specs`.
  .option(
    "--int, --interpreter <regex> or <predeftype>",
    "Type of interpreter, i.e., a regex, or a predefined type (`default`)"
  )
  .option(
    "--con[n], --converter[n] <template> or <predeftype>*",
    "Type of converter, i.e., a mustache/handlebars template, or a predefined type (`markdown-table-row`, `markdown-section-2`, `markdown-section-3`)"
  )
  .option(
    "--con[error], --converter[error] <template> or <predeftype>",
    "Type of converter, i.e., a mustache/handlebars template, or a predefined type to use in case a HRG entry could not be resolved"
  )
  .option(
    "--sort, --sorter <template> or <predeftype>",
    "Type of sorter, i.e., a mustache/handlebars template, or a predifined type (`default`) by which to sort the glossary items"
  )
  .option("-o, --onNotExist <action>", "The action in case an MRG file unexpectedly does not exist")
  .option("-f, --force", "Allow overwriting of existing files")
  .option("-h, --help", "Display help for command")
  .allowUnknownOption(true)
  .parse(process.argv)

async function main(): Promise<void> {
  let options = program.opts()

  console.log(`\x1b[31m${figlet.textSync(name + "-cli", { horizontalLayout: "full" })}`)
  console.log(`\x1b[0mVersion: ${version}\n`)

  // Process command line converter options
  for (const [key, value] of Object.entries(process.argv.slice(2))) {
    const match = value.match(/^--con(?:verter)?(?:\[(?<n>-?\d+|error)?\])?$/)
    if (match) {
      const template = process.argv[parseInt(key) + 3]
      options[`converter[${match.groups.n}]`] = template
      const i = program.args.indexOf(value)
      if (i !== -1) {
        program.args.splice(i, 2)
      }
    }
  }

  // Use the remaining arguments as the input option
  if (program.args[0]) {
    options.input = program.args
  }

  if (options.config) {
    try {
      const config = yaml.load(readFileSync(resolve(options.config), "utf8")) as OptionValues

      // Overwrite config options and hrgt specific config options with command line options
      const { hrgt, ...rest } = config
      options = { ...rest, ...hrgt, ...options }
    } catch (err) {
      throw new Error(`E011 Failed to read or parse the config file '${options.config}'`, { cause: err })
    }
  }

  // Process converter options
  for (const [key, value] of Object.entries(options)) {
    const match = key.match(/^con(?:verter)?(?:\[(?<n>-?\d+|error)?\])?$/)
    if (match && value != null) {
      const template = value as string
      if (match.groups.n === "error") {
        const n = -1
        new Converter({ template, n })
      } else {
        const n = parseInt(match.groups.n)
        new Converter({ template, n: n >= 1 ? n : 1 })
      }
    }
  }
  Converter.instances.sort((a, b) => a.n - b.n)

  // Check if required options are provided
  if (options.output == null || options.scopedir == null || options.input == null || Converter.instances.length === 0) {
    program.addHelpText(
      "after",
      "\nRequired options are missing\n" +
        "Provide at least the following options: output <path>, scopedir <path> and input <globpattern>, converter[n] <template> or <predeftype>*\n"
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
