import * as yaml from "js-yaml"

interface CuratedTextOptions {
  term: string
  termType: string
  isa?: string
  glossaryTerm?: string
  glossaryText?: string
  synonymOf?: string
  groupTags?: string[]
  formPhrases?: string[]
  status?: string
  created?: string
  updated?: string
  contributors?: string
  attribution?: string
  originalLicense?: string
}

export class CuratedTextParser {
  private markdownText: string
  private options: CuratedTextOptions

  constructor(markdownText: string, options: CuratedTextOptions) {
    this.markdownText = markdownText
    this.options = options

    // Extract "Definition" section and set as glossaryText
    const definitionMatch = this.markdownText.match(/#{1,2} Definition\n([\s\S]*?)(?=\n#{1,2}|$)/)
    if (definitionMatch && definitionMatch[1]) {
      this.options.glossaryText = definitionMatch[1].trim()
    }
  }

  toYAML(): string {
    const frontmatter = yaml.dump(this.options)
    return `---\n${frontmatter}---\n${this.markdownText}`
  }
}
