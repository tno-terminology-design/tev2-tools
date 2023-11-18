import { log } from "@tno-terminology-design/utils"

import path = require("path")
import fs = require("fs")

/**
 * Creates directory tree and writes data to a file.
 * @param fullPath - The full file path.
 * @param data - The data to write.
 * @param force - Whether to overwrite existing files.
 */
export function writeFile(fullPath: string, data: string, force: boolean = true) {
  const dirPath = path.dirname(fullPath)
  const file = path.basename(fullPath)
  // Check if the directory path doesn't exist
  if (!fs.existsSync(dirPath)) {
    // Create the directory and any necessary parent directories recursively
    try {
      fs.mkdirSync(dirPath, { recursive: true })
    } catch (err) {
      log.error(`\tE007 Error creating directory '${dirPath}':`, err)
      return // Stop further execution if directory creation failed
    }
  } else if (!force && fs.existsSync(path.join(dirPath, file))) {
    return // Stop further execution if force is not enabled and file exists
  }

  try {
    fs.writeFileSync(path.join(dirPath, file), data)
  } catch (err) {
    log.error(`\tE008 Error writing file '${path.join(dirPath, file)}':`, err)
  }
}
