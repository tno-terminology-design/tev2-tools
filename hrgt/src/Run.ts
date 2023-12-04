#!/usr/bin/env node

import { Command, type OptionValues } from "commander"
import { readFileSync } from "fs"
import { resolve } from "path"
import { log } from "@tno-terminology-design/utils"
import { Resolver } from "./Resolver.js"

import yaml from "js-yaml"
import chalk from "chalk"
import figlet from "figlet"

const program = new Command()

program
  .name("hrgt")
  .version("0.1.2")
  .usage(
    "[ <paramlist> ] [ <globpattern> ]\n" +
      "- <paramlist> (optional) is a list of key-value pairs\n" +
      "- <globpattern> (optional) specifies a set of (input) files that are to be processed"
  )
  .description("The CLI for the Human Readable Glossary Generation Tool")
  .option("-c, --config <path>", "Path (including the filename) of the tool's (YAML) configuration file")
  .option("-o, --output <dir>", "(Root) directory for output files to be written")
  .option("-s, --scopedir <path>", "Path of the scope directory where the SAF is located")
  .option("-int, --interpreter <type> or <regex>", "Type of interpreter, either: a regex, alt, or basic")
  .option("-con, --converter <type> or <mustache>", "Type of converter, either: a mustache template, http, or markdown")
  .option("-f, --force", "Allow overwriting of existing files")
  .parse(process.argv)

program.parse()

async function main(): Promise<void> {
  try {
    // Parse command line parameters
    let options = program.opts()
    if (program.args[0] != null) {
      options.input = program.args[0]
    }

    console.log(chalk.red(figlet.textSync("hrgt-cli", { horizontalLayout: "full" })))

    if (options.config != null) {
      try {
        const config = yaml.load(readFileSync(resolve(options.config), "utf8")) as OptionValues

        // Overwrite command line options with config options and hrgt specific config options
        const { hrgt, ...rest } = config
        options = { ...rest, ...hrgt, ...options }
      } catch (err) {
        throw new Error(`E011 Failed to read or parse the config file '${options.config}':`, { cause: err })
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
    } else {
      // Create a resolver with the provided options
      const resolver = new Resolver({
        outputPath: resolve(options.output),
        globPattern: options.input,
        force: options.force,
        interpreter: options.interpreter ?? "basic",
        converter: options.converter ?? "markdowntable",
        saf: resolve(options.scopedir)
      })

      // Resolve terms
      await resolver.resolve()
      log.info("Execution complete")
      process.exit(0)
    }
  } catch (err) {
    if ((err as Error).cause != null) {
      log.error(err)
      process.exit(1)
    } else {
      log.error("E012 Something unexpected went wrong during execution:", err)
      process.exit(1)
    }
  }
}

await main()
