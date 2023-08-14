---
term: term-identifier
termType: concept
isa: identifier
glossaryTerm: Term Identifier
glossaryText: "a [text](identifier@) that [identifies](@) a [knowledge artifact](@) within a particular [scope](@), and hence also the [curated text](@) that describes it, which includes its [definition](@)."
synonymOf:
grouptags:
formPhrases: term-identifier{ss}
# Curation status
status: proposed
created: 2022-11-24
updated: 2022-11-24
# Origins/Acknowledgements
contributors: RieksJ
attribution: "[eSSIF-Lab](https://essif-lab.github.io/framework)"
originalLicense: "[CC BY-SA 4.0](http://creativecommons.org/licenses/by-sa/4.0/?ref=chooser-v1)"
---

# Term Identifier

A **Term Identifier** is a [text](identifier@) that [identifies](@) a [knowledge artifact](@) within a particular [scope](@), and hence also the [curated text](@) that describes it, which includes its [definition](@). 

Its value is typically the value of the `glossaryTerm` field that is found in said [curated text](@), where all characters are made lower-case, any text between parentheses is discarded, and any (sequences of) spaces (or other special characters) are replaced with a `-`character.

Term identifiers are typically used to [identify](@) the [scoped term](@) to which a [TermRef](@) refers. Thus, the [`term`-field](/docs/spec-syntax/term-ref-syntax#term) of any [TermRef](@) that refers to (the [curated text](@) of) this [knowledge artifact](@) must match the value of the `term`-field in the [frontmatter](@) of the [curated text](@) that describes th [knowledge artifact](@).

A term-identifier value must match the regex `[a-z0-9_-]+`.
