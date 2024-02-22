// If you add/remove mappings, please also edit the corresponding `.option` statement in `Run.ts`, and the documentation at `tno-terminology-design/tev2-specifications/docs/specs`.

export const formphrase_macro_map: Record<string, string[]> = {
  "{ss}": ["", "s", "'s", "(s)"], // "act{ss}" --> "act", "acts", "act's", "act(s)"
  "{ess}": ["", "es", "'s", "(es)"], // "regex{es}" --> "regex", "regexes", "regex's", "regex(es"
  "{yies}": ["y", "y's", "ies"], // "part{yies}" --> "party", "party's", "parties"
  "{ying}": ["y", "ying", "ies", "ied"], // "identif{ying}" --> "identify", "identifying", "identifies", "identified"
  "{es}": ["e", "es", "ed", "ing"], // "mangag{es}" --> "manage", "manages", "managed", "managing"
  "{able}": ["able", "ability"] // "cap{able}" --> "capable", "capability"
}

export const trrt_converter_map: Record<string, string> = {
  "markdown-link": "[{{ref.showtext}}]({{entry.navurl}}{{#if ref.trait}}#{{ref.trait}}{{/if}})",
  "html-link": '<a href="{{entry.navurl}}{{#if ref.trait}}#{{ref.trait}}{{/if}}">{{ref.showtext}}</a>',
  "html-hovertext-link":
    '<a href="{{localize entry.navurl}}{{#if ref.trait}}#{{ref.trait}}{{/if}}" title="{{#if entry.hoverText}}{{entry.hoverText}}{{else}}{{#if entry.glossaryTerm}}{{entry.glossaryTerm}}{{else}}{{capFirst entry.term}}{{/if}}: {{noRefs entry.glossaryText type="markdown"}}{{/if}}">{{ref.showtext}}</a>',
  "html-glossarytext-link":
    '<a href="{{localize entry.navurl}}{{#if ref.trait}}#{{ref.trait}}{{/if}}" title="{{capFirst entry.term}}: {{noRefs entry.glossaryText type="markdown"}}">{{ref.showtext}}</a>'
}

export const trrt_interpreter_map: Record<string, RegExp> = {
  default:
    /(?:(?<=[^`\\])|^)\[(?=[^@\n\]]+\]\([^@)]*@[:a-z0-9_-]*\))(?<showtext>[^@\n\]]+)\]\((?:(?:(?<type>[a-z0-9_-]*):)?)(?:(?<term>[^@\n:#)]*?)?(?:#(?<trait>[^@\n:#)]*))?)?@(?<scopetag>[a-z0-9_-]*)(?::(?<vsntag>[a-z0-9_-]*))?\)/g,
  alt: /(?:(?<=[^`\\])|^)\[(?=[^@\n\]]+?@[:a-z0-9_-]*\](?:\([#:a-z0-9_-]+\))?)(?<showtext>[^@\n\]]+?)@(?<scopetag>[a-z0-9_-]*)(?::(?<vsntag>[a-z0-9_-]*?))?\](?:\((?:(?:(?<type>[a-z0-9_-]+):)?)(?<term>[^@\n:#)]*?)(?:#(?<trait>[^@\n:#)]+?))?\))?/g
}

export const hrgt_converter_map: Record<string, string> = {
  "markdown-table-row":
    "| [{{#if glossaryTerm}}{{noRefs glossaryTerm}}{{else}}{{capFirst term}}{{/if}}]({{localize navurl}}) | {{#if glossaryText}}{{glossaryText}}{{else}}no `glossaryText` was specified for this entry.{{/if}} |\n",
  "markdown-abbr-table-row":
    "{{#if glossaryAbbr}}| [{{glossaryAbbr}}]({{localize navurl}}) | See: [{{#if glossaryTerm}}{{glossaryTerm}}{{else}}{{capFirst term}}{{/if}}]({{termid}}@) |\n{{/if}}",
  "markdown-section-2":
    "## [{{#if glossaryTerm}}{{noRefs glossaryTerm}}{{else}}{{capFirst term}}{{/if}}]({{localize navurl}})\n\n{{#if glossaryText}}{{glossaryText}}{{else}}no `glossaryText` was specified for this entry.{{/if}}\n\n",
  "markdown-abbr-section-2":
    "{{#if glossaryAbbr}}## [{{glossaryAbbr}}]({{localize navurl}})\n\nSee: [{{#if glossaryTerm}}{{glossaryTerm}}{{else}}{{capFirst term}}{{/if}}]({{termid}}@)\n\n{{/if}}",
  "markdown-section-3":
    "### [{{#if glossaryTerm}}{{noRefs glossaryTerm}}{{else}}{{capFirst term}}{{/if}}]({{localize navurl}})\n\n{{#if glossaryText}}{{glossaryText}}{{else}}no `glossaryText` was specified for this entry.{{/if}}\n\n",
  "markdown-abbr-section-3":
    "{{#if glossaryAbbr}}### [{{glossaryAbbr}}]({{localize navurl}})\n\nSee: [{{#if glossaryTerm}}{{glossaryTerm}}{{else}}{{capFirst term}}{{/if}}]({{termid}}@)\n\n{{/if}}"
}

export const hrgt_sorter_map: Record<string, string> = {
  default: "{{term}}{{termType}}",
  glossaryterm: "{{noRefs glossaryTerm}}{{term}}{{termType}}"
}

export const hrgt_interpreter_map: Record<string, RegExp> = {
  default:
    /(?:(?<=[^`\\])|^){%\s*hrg="(?<hrg>[^"]*)"\s*(?:converter="(?<converter>[^"]*)"\s*)?(?:sorter="(?<sorter>[^"]*)"\s*)?%}/g
}
