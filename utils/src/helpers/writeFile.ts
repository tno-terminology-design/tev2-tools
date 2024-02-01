import fs = require("fs")
import path = require("path")

/**
 * Creates directory tree and writes data to a file.
 * @param fullPath - The full file path.
 * @param data - The data to write.
 * @param force - Whether to overwrite existing files.
 */
export function writeFile(fullPath: string, data: string, force: boolean = false): void {
  const dirPath = path.dirname(fullPath)
  const file = path.basename(fullPath)
  // Check if the directory path doesn't exist
  if (!fs.existsSync(dirPath)) {
    // Create the directory and any necessary parent directories recursively
    try {
      fs.mkdirSync(dirPath, { recursive: true })
    } catch (err) {
      throw new Error(`E007 Error creating directory '${dirPath}'`, { cause: err })
    }
  } else if (!force && fs.existsSync(path.join(dirPath, file))) {
    // If the file already exists and force is not enabled, don't overwrite
    throw new Error(`E013 File '${path.join(dirPath, file)}' already exists. Use --force to overwrite`)
  }

  const filepath = path.join(dirPath, file)
  try {
    fs.writeFileSync(filepath, data)
  } catch (err) {
    throw new Error(`E008 Error writing file '${filepath}'`, { cause: err })
  }
}
