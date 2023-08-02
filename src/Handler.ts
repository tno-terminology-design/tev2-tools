import { log } from './Report.js';

import path from 'path';
import fs from 'fs';
import axios from 'axios';
import gitUrlParse from 'git-url-parse';

export async function download(url: URL, localPath: string): Promise<void> {
    try {
      const parsedUrl = gitUrlParse(url.href);
      if (!parsedUrl.owner || !parsedUrl.name || !parsedUrl.filepath) {
        throw new Error('Invalid Git URL');
      }
  
      // Determine the raw URL based on the Git hosting platform
      let rawUrl: string;
      if (parsedUrl.source === 'github.com') {
        rawUrl = path.join('https://raw.githubusercontent.com', parsedUrl.owner, parsedUrl.name, parsedUrl.ref, parsedUrl.filepath);
      } else if (parsedUrl.source === 'gitlab.com') {
        rawUrl = path.join('https://gitlab.com', parsedUrl.owner, parsedUrl.name, 'raw', parsedUrl.ref, parsedUrl.filepath);
      } else {
        throw new Error('Unsupported Git platform');
      }
  
      log.info(`Downloading ${rawUrl}`);
      const response = await axios.get(rawUrl, { responseType: 'arraybuffer' });
      writeFile(localPath, response.data);
      log.info(`File downloaded and saved to ${localPath}`);
    } catch (err) {
      log.error(`Error downloading ${url.href}`);
      throw err;
    }
}


/**
 * Creates directory tree and writes data to a file.
 * @param fullPath - The full file path.
 * @param data - The data to write.
 * @param force - Whether to overwrite existing files.
 */
export function writeFile(fullPath: string, data: string, force: boolean = true) {
    const dirPath = path.dirname(fullPath);
    const file = path.basename(fullPath);
    // Check if the directory path doesn't exist
    if (!fs.existsSync(dirPath)) {
        // Create the directory and any necessary parent directories recursively
        try {
            fs.mkdirSync(dirPath, { recursive: true });
        } catch (err) {
            log.error(`E007 Error creating directory '${dirPath}':`, err);
            return; // Stop further execution if directory creation failed
        }
    } else if (!force && fs.existsSync(path.join(dirPath, file))) {
        // If the file already exists and force is not enabled, don't overwrite
        log.error(`E013 File '${path.join(dirPath, file)}' already exists. Use --force to overwrite`);
        return; // Stop further execution if force is not enabled and file exists
    }

    try {
        log.trace(`Writing: ${path.join(dirPath, file)}`);
        fs.writeFileSync(path.join(dirPath, file), data);
    } catch (err) {
        log.error(`E008 Error writing file '${path.join(dirPath, file)}':`, err);
    }
}
