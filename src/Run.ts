#!/usr/bin/env node

import { Resolver } from './Resolver.js'
import { Logger } from 'tslog';
import { Command } from 'commander';
import { readFileSync } from 'fs';
import { resolve } from 'path';

import chalk from 'chalk';
import clear from 'clear';
import figlet from 'figlet';

const program = new Command();

clear();

console.log(
      chalk.red(
            figlet.textSync('trrt-cli', { horizontalLayout: 'full' })
      )
);

program
      .name('trrt')
      .version('0.2.0')
      .usage('[ <paramlist> ] [ <globpattern> ]\n' +
      '- <paramlist> (optional) is a list of key-value pairs\n' +
      '- <globpattern> (optional) specifies a set of (input) files that are to be processed')
      .description("The CLI for the Term Reference Resolution Tool")
      .option('-c, --config <path>', 'Path (including the filename) of the tool\'s (YAML) configuration file')
      .option('-o, --output <dir>', '(Root) directory for output files to be written')
      .option('-s, --scopedir <path>', 'Path of the scope directory where the SAF is located')
      .option('-v, --vsntag <vsntag>', 'Default version to use when no version is set in term ref')
      .option('-int, --interpreter <type>', 'Set interpreter to Alt syntax', 'default')
      .option('-con, --converter <type>', 'Set converter to Markdown, HTTP or ESIFF output', 'default')
      .parse(process.argv);

program.parse()

async function main(): Promise<void> {
      const log = new Logger();

      // Parse command line parameters
      var options = program.opts();
      options.glob = program.args[0] ?? '*'

      if (options.config) {
            try {
                  const config = JSON.parse(readFileSync(resolve(options.config), 'utf8'));

                  // Merge config options with command line options
                  options = { ...config, ...options };
            } catch (err) {
                  log.error('Failed to read or parse the config file:', err);
                  process.exit(1);
            }
      }

      // Check if required options are provided
      if (!options.output || !options.scopedir) {
            program.help();
            log.error('ERROR: Required options are missing.');
            log.error('Please provide the following options: --output <path>, --saf <path>');
            process.exit(1);
      
      } else {
            // Create a resolver with the provided options
            let resolver: Resolver = new Resolver({
                  outputPath: resolve(options.output),
                  scopedir: resolve(options.scopedir),
                  vsntag: options.vsntag,
                  interpreterType: options.interpreter,
                  converterType: options.converter,
                  globPattern: options.glob
            });
            
            // Resolve terms
            if (await resolver.resolve()) {
                  log.info("Resolution complete...");
            } else {
                  log.error("Failed to resolve terms, see logs...");
                  process.exit(1);
            }
      }
}

main();
