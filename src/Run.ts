#!/usr/bin/env node

import { Resolver } from './Resolver.js';
import { Logger } from 'tslog';
import chalk from 'chalk';
import clear from 'clear';
import figlet from 'figlet';
import { Command } from 'commander';
const program = new Command();

clear();

console.log(
      chalk.red(
            figlet.textSync('trrt-cli', { horizontalLayout: 'full' })
      )
);

program
      .version('0.0.0')
      .description("A CLI for the Term Reference Resolution Toolkit")
      .option('-o, --output <path>', 'Path to output converted files to (required)')
      .option('-s, --saf <path>', 'Path to read SAF file from (required)')
      .option('-c, --config <path>', 'Path to configuration .yaml file')
      .option('-d, --directory <path>', 'Path to directory where input files are located')
      .option('-V, --defaultversion <vsn>', 'Default version to use when no version is set in term')
      .option('-I, --interpreter <type>', 'Set interpreter to Standard or Alt syntax')
      .option('-C, --converter <type>', 'Set converter to Markdown HTTP or ESIFF output')
      .parse(process.argv);

async function main(): Promise<void> {
      const log = new Logger();
      const options = program.opts();
      if (!options.output || !options.saf) {
            program.outputHelp();
      } else {
            let resolver: Resolver = new Resolver({ outputPath: options.output, scopePath: options.saf, directoryPath: options.directory, vsn: options.defaultversion, configPath: options.config, interpreterType: options.interpreter, converterType: options.converter});
            if (await resolver.resolve()) {
                  log.info("Resolution complete...");
            } else {
                  log.error("Failed to resolve terms, see logs....");
            }
      }

}

main();