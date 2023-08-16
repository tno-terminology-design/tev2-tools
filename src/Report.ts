import { Logger } from 'tslog';

interface Item {
      message: string;
      [key: string]: any;
}

interface Output {
      items: Item[];
}    

class Report {
      termErrors: Output = {
            items: []
      };
      Errors: Output = {
            items: []
      };
      converted: Output = {
            items: []
      };

      public termHelp(file: string, line: number, message: string) {
            const helptext = this.formatMessage('TERM HELP', file, line, message)

            this.termErrors.items.push({
                  message: helptext
            });
      }

      public mrgHelp(file: string, line: number, message: string) {
            const helptext = this.formatMessage('MRG HELP', file, line, message)

            this.Errors.items.push({
                  message: helptext
            });
      }

      public termConverted(term: string) {
            this.converted.items.push({
                  message: term
            });
      }

      public print() {
            console.log("\x1b[1;37m");
            console.log(" Resolution Report:");
            console.log("       \x1b[0mNumber of terms converted: " + this.converted.items.length);

            if (this.Errors.items.length > 0) {
                  console.log("   \x1b[1;37mMain Errors:\x1b[0m");
                  for (let item of this.Errors.items) {
                        console.log(item.message);
                  }
            }
            if (this.termErrors.items.length > 0) {
                  console.log("   \x1b[1;37mTerm Errors:\x1b[0m");
                  for (let item of this.termErrors.items) {
                        console.log(item.message);
                  }
            }
      }

      private formatMessage(type: string, file: string, line: number, message: string) {
            let locator = `${file}`;
            if (line > -1) {
                  locator += `:${line}`;
            }

            if (locator.length > 50) {
                  locator = `...${locator.slice(-(50 - 5))}`;
            }
            locator = locator.padEnd(50);

            const formattedMessage = `\x1b[1;31m${type.padEnd(12)} \x1b[1;37m${locator} \x1b[0m${message}`;
            return formattedMessage;
      }
}

export const report = new Report();
export const log = new Logger();
