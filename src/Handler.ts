import { log } from './Report.js';

import path from 'path';
import fs from 'fs';
import axios from 'axios';
import gitUrlParse from 'git-url-parse';

/**
 * Downloads a file from a Git repository or raw url.
 * @param url - The Git URL or raw url.
 * @param localPath - The local path to save the file to.
 * @returns A promise that resolves when the file has been downloaded.
 */
export async function download(url: URL, localPath: string): Promise<void> {
  const parsedUrl = gitUrlParse(url.href);

  // Determine the raw URL based on the Git hosting platform
  let rawUrl: URL;
  if (parsedUrl.source === 'github.com') {
    if (!parsedUrl.owner || !parsedUrl.name || !parsedUrl.pathname) {
      throw new Error(`  - Please check to make sure the Git URL points to a valid raw file: ${url.href}`);
    }
    rawUrl = new URL(path.join('https://raw.githubusercontent.com', parsedUrl.owner, parsedUrl.name, parsedUrl.ref, parsedUrl.filepath));
  } else if (parsedUrl.source === 'gitlab.com') {
    if (!parsedUrl.owner || !parsedUrl.name || !parsedUrl.pathname) {
      throw new Error(`  - Please check to make sure the Git URL points to a valid raw file: ${url.href}`);
    }
    rawUrl = new URL(path.join('https://gitlab.com', parsedUrl.owner, parsedUrl.name, 'raw', parsedUrl.ref, parsedUrl.filepath));
  } else {
    // assume the URL is a raw URL
    rawUrl = url;
  }

  log.info(`  - Requesting '${rawUrl}'`);
  const response = await axios.get(rawUrl.href, { responseType: 'arraybuffer' });
  writeFile(localPath, response.data);
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
            log.error(`  - E007 Error creating directory '${dirPath}':`, err);
            return; // Stop further execution if directory creation failed
        }
    } else if (!force && fs.existsSync(path.join(dirPath, file))) {
        return; // Stop further execution if force is not enabled and file exists
    }

    try {
        fs.writeFileSync(path.join(dirPath, file), data);
    } catch (err) {
        log.error(`  - E008 Error writing file '${path.join(dirPath, file)}':`, err);
    }
}
