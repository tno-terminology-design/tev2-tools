import { Logger } from 'tslog';
import { onNotExist } from './Run.js';

export function onNotExistError(error: any) {
    switch (onNotExist) {
        case 'throw':
            // an error is thrown (an exception is raised), and processing will stop
            log.error(`E006 ${error.message}, halting execution as requested by the 'onNotExist' throw option`);
            process.exit(1);
        case 'warn':
            // a message is displayed (and logged) and processing continues
            log.warn(error.message);
            break;
        case 'log':
            // a message is written to a log(file) and processing continues
            log.info(error.message);
            break;
        case 'ignore':
            // processing continues as if nothing happened
            break;
    }
}

export const log = new Logger({
    prettyLogTemplate: "{{hh}}:{{MM}}:{{ss}}:{{ms}}\t{{logLevelName}}\t",
  });