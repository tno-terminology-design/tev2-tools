This file includes test situations used as a mockup to test the Terminology Design Tools.
During testing, all of the tools are ran and this file is compared to the [expected result](result.md).
All of the tools are ran according to the [terminology-config.yaml](terminology-config.yaml) config file.

The following steps are executed:
1. The MRG-Import Tool is ran to import the MRG's from the [tev2-specifications](https://github.com/tno-terminology-design/tev2-specifications/tree/main/docs) repository.
2. The MRGT is ran to generate the MRG files according to the [SAF](saf.yaml), and updates the published [mrg.tev2-tools.yaml](glossaries/mrg.tev2-tools.yaml) file.
3. The HRGT is given this file as input, generates the glossaries in the [HRGT](#hrgt) section, and outputs the file.
4. The TRRT is given the output file of the HRGT as input, converts the term references into renderable references, and outputs the file.

## TRRT
| Type                 | Original                                       | Resolution                   |
| :------------------- | :--------------------------------------------- | :--------------------------- |
| Syntax:              | `[show text](term:type#trait@scopetag:vsntag)` |                              |
| Differing show text: | `[bodying](body@)`                             | [bodying](body@)             |
| No term specified:   | `[body](@)`                                    | [body](@)                    |
| Using a trait:       | `[body](#summary@)`                            | [body](#summary@)            |
| Different scope:     | `[body](body#summary@termdsn)`                 | [body](body#summary@termdsn) |
| Formphrase test:     | `[bodies](@)`                                  | [bodies](@)                  |
| Show text to term:   | `[b'o(d)i'es](@)`                              | [b'o(d)i'es](@)              |
| Converter[7]         | `[body](@)`                                    | [body](@)                    |      

## HRGT

### Glossary using customs
Values used:
- `hrg=""`
- `converter="| {{glossaryTerm}} | {{glossaryText}} |\n"`
- `sorter="{{glossaryText}}"`

| Term | Description |
| :--- | :---------- |
{% hrg="" converter="| {{glossaryTerm}} | {{glossaryText}} |\n" sorter="{{glossaryText}}"%}

---

### Glossary using defaults

{% hrg="" %}

---
