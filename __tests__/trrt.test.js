import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { expect } from 'chai';

const __filename = new URL(import.meta.url).pathname;
const __dirname = path.dirname(__filename);

describe('Run TRRT on provided test files', () => {
  it('should verify term conversion count of test files', (done) => {
    const trrtPath = path.resolve(__dirname, '../lib/Run.js');
    const contentPath = path.resolve(__dirname, 'content');
    const configFile = path.resolve(contentPath, 'config.yaml');
    const testFile = 'terminology/specification.md';
    const inputFile = path.resolve(contentPath, testFile);
    const outputFile = path.resolve(__dirname, 'output/__tests__/content', testFile);

    const trrtProcess = spawn('node', [trrtPath, '-c', configFile, path.join('__tests__/content', testFile)]);
    let output = '';
    let consoleOutput = '';

    trrtProcess.stdout.on('data', (data) => {
      output += data;
      consoleOutput += data.toString();
    });

    trrtProcess.stderr.on('data', (data) => {
      console.error(data.toString());
    });

    trrtProcess.on('close', (code) => {
      expect(code).to.equal(0);

      const termRegex = /(?:(?<=[^`\\])|^)\[(?=[^@\]]+\]\([#a-z0-9_-]*@[:a-z0-9_-]*\))(?<showtext>[^\n\]@]+)\]\((?:(?<id>[a-z0-9_-]*)?(?:#(?<trait>[a-z0-9_-]+))?)?@(?<scopetag>[a-z0-9_-]*)(?::(?<vsntag>[a-z0-9_-]+))?\)/g;

      fs.readFile(inputFile, 'utf8', (_err, fileContent) => {
        const termMatches = fileContent.match(termRegex);
        const termCount = termMatches ? termMatches.length : 0;
        expect(consoleOutput).to.contain(`Number of terms converted: ${termCount}`);

        fs.readFile(outputFile, 'utf8', (_err, fileContent) => {
          expect(fileContent).to.contain('<a href="placeholder.com/docs/terminology/specification.md" title="todo here the definition of the term specification">specification</a>');
          done();
        });
      });
    });
  });
});
