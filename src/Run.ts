#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { log } from './Report.js';
import { initialize } from './Interpreter.js';

import yaml from 'js-yaml';
import chalk from 'chalk';
import figlet from 'figlet';
const program = new Command();

export let onNotExist: string = 'throw';

program
    .name('mrg-import')
    .version('0.1.1')
    .usage('[ <paramlist> ]\n' +
    '- <paramlist> (optional) is a list of key-value pairs')
    .description("The CLI for the MRG Import Tool")
    .option('-c, --config <path>', 'Path (including the filename) of the tool\'s (YAML) configuration file')
    .option('-s, --scopedir <path>', 'Path of the scope directory from which the tool is called')
    .option('-o, --onNotExist <action>', 'The action in case an MRG file unexpectedly does not exist')
    .parse(process.argv);

program.parse();

async function main(): Promise<void> {
    // Parse command line parameters
    var options = program.opts();
    if (program.args[0]) {
        options.input = program.args[0]
    }

    console.log(
        chalk.red(
            figlet.textSync('mrg-import', { horizontalLayout: 'full' })
        )
    );

    if (options.config) {
        try {
            const config = yaml.load(readFileSync(resolve(options.config), 'utf8')) as yaml.Schema;

            // Merge config options with command line options
            options = { ...config, ...options };
        } catch (err) {
            log.error(`E011 Failed to read or parse the config file '${options.config}':`, err);
            process.exit(1);
        }
    }

    // Check if required option is missing
    if (!options.scopedir) {
        program.addHelpText('after', '\nA required option is missing\n' +
            'Provide at least the following option: --scopedir <path>');
        program.help();
        process.exit(1);
    }

    // When `onNotExist` is set, make sure it is set to a correct value
    if (options.onNotExist) {
        if (['throw', 'warn', 'log', 'ignore'].includes(options.onNotExist.toLowerCase())) {
            onNotExist = options.onNotExist.toLowerCase();
        } else {
            program.addHelpText('after', `\nOption 'onNotExist' is not set properly\n` +
                `Provide one of the following values: 'throw', 'warn', 'log', 'ignore'`
            );
            program.help();
            process.exit(1);
        }
    }

    try {
        // Execute the interpreter
        await initialize({scopedir: options.scopedir});
        log.info("The MRG Import Tool has finished execution");
        process.exit(0);
    } catch (err) {
        log.error("E012 Something unexpected went wrong:", err);
        process.exit(1);
    }
}

main();
