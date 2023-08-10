import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { expect } from 'chai';

const __filename = new URL(import.meta.url).pathname;
const __dirname = path.dirname(__filename);

describe('Run MRG Import Tool on provided test files', () => {
  it('should verify expected MRG downloads and symlinks', (done) => {
    const toolPath = path.resolve(__dirname, '../lib/Run.js');
    const contentPath = path.resolve(__dirname, 'content');
    const configFile = path.resolve(contentPath, 'config.yaml');
    const glossarydir = path.resolve(contentPath, 'terminology');

    const toolProcess = spawn('node', [toolPath, '-c', configFile]);
    let output = '';
    let consoleOutput = '';

    toolProcess.stdout.on('data', (data) => {
      output += data;
      consoleOutput += data.toString();
    });

    toolProcess.stderr.on('data', (data) => {
      console.error(data.toString());
    });

    toolProcess.on('close', async (code) => {
      expect(code).to.equal(1);
      expect(consoleOutput).to.contain(`Found 2 maintained MRG file(s) in import scope 'essiflab'`);

      try {
        await fs.access(path.join(glossarydir, `mrg.essiflab.latest.yaml`));
        await fs.access(path.join(glossarydir, `mrg.essiflab.main.yaml`));

        done();
      } catch (error) {
        done(error);
      }
    });
  });
});
