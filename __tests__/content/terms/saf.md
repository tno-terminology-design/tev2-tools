---
# Docusaurus header
id: saf
# TEv2 Curated Text Header
term: saf
termType: concept
isa:
glossaryTerm: Scope Administration File (SAF)
glossaryText: "a YAML file that contains essential data about a particular [scope](@) (e.g., specifying where its [curated texts](@), [glossaries](@) etc. live), the relationships this [scope](@) has with other [scopes](@), and the specifications of the different [terminologies](@) that are [curated](@) within that [scope](@)."
hoverText: "SAF: {(noRef {glossaryText})}"
synonymOf:
grouptags: terminology-management
formPhrases: saf{ss}, scope-administration-file{ss}, scope-administration-file{ss}-saf{ss}, saf{ss}-scope-administration-file{ss}
# Curation status
status: proposed
created: 2023-07-31
updated: 2023-07-31
# Origins/Acknowledgements
contributors: RieksJ
attribution: "[TNO Terminology Design](https://tno-terminology-design.github.io/tev2-specifications/docs)"
originalLicense: "[CC BY-SA 4.0](http://creativecommons.org/licenses/by-sa/4.0/?ref=chooser-v1)"
---

# SAF (Scope Administration File)

The **Scope Administration File (SAF)** is a YAML file that contains essential data about a particular [scope](@) (e.g., specifying where its [curated texts](@), [glossaries](@) etc. live), the relationships this [scope](@) has with other [scopes](@), and the specifications of the different [terminologies](@) that are [curated](@) within that [scope](@).

The SAF specifies the location and details of [machine-readable glossaries (MRGs)](@), [human-readable glossaries (HRGs)](@), [machine-readable dictionaries (MRDs)](@), [human-readable dictionaries (HRDs)](@), [curated texts](@), and other related resources within a specific [scope](@). It provides a centralized record of the resources available in that [scope](@), facilitating their access by various tools involved in terminology management.

Additionally, the SAF outlines the criteria and meta-data that define the contents of each resource, ensuring clarity and consistency in the curation and management of terminological assets.

The SAF itself lives in (the root of) the [curatedir](@).
## Specifications and Examples

1. The structure of the SAF is specified [here](/docs/spec-files/saf), which also provides an example. 
2. The repository that hosts this documentation has a [real-life example](https://github.com/tno-terminology-design/tev2-specifications/blob/main/docs/saf.yaml)

## Notes

- The SAF acts as a comprehensive index and reference for all terminological resources within a scope.
- Properly defining and maintaining the SAF is essential for ensuring seamless collaboration and efficient terminology management.
