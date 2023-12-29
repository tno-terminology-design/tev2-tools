import { log, writeFile } from "@tno-terminology-design/utils"

import path from "path"
import axios from "axios"
import gitUrlParse from "git-url-parse"

/**
 * Downloads a file from a Git repository or raw url.
 * @param url - The Git URL or raw url.
 * @param localPath - The local path to save the file to.
 * @returns A promise that resolves when the file has been downloaded.
 */
export async function download(url: URL, localPath: string): Promise<void> {
  const parsedUrl = gitUrlParse(url.href)

  // Determine the raw URL based on the Git hosting platform
  let rawUrl: URL
  if (parsedUrl.source === "github.com") {
    if (!parsedUrl.owner || !parsedUrl.name || !parsedUrl.pathname) {
      throw new Error(`\tPlease check to make sure the Git URL points to a valid raw file: ${url.href}`)
    }
    rawUrl = new URL(
      path.join("https://raw.githubusercontent.com", parsedUrl.owner, parsedUrl.name, parsedUrl.ref, parsedUrl.filepath)
    )
  } else if (parsedUrl.source === "gitlab.com") {
    if (!parsedUrl.owner || !parsedUrl.name || !parsedUrl.pathname) {
      throw new Error(`\tPlease check to make sure the Git URL points to a valid raw file: ${url.href}`)
    }
    rawUrl = new URL(
      path.join("https://gitlab.com", parsedUrl.owner, parsedUrl.name, "raw", parsedUrl.ref, parsedUrl.filepath)
    )
  } else {
    // assume the URL is a raw URL
    rawUrl = url
  }

  log.trace(`\tRequesting '${rawUrl}'`)
  const response = await axios.get(rawUrl.href, { responseType: "arraybuffer" })
  writeFile(localPath, response.data)
}
