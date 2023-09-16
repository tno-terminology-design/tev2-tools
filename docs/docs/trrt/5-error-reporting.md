# Error Reporting
During execution the [TRRT](@) outputs information about the state of the tool to the console. After succesful execution, a resulution report is output as well, which attempts to give more insight into the terminology design through [help messages](#help-messages). In addition to the [help](#help-messages) and [error](#error-messages) messages listed in the sections below, the messages include timestamps, information about the type of message, the filename, and linenumber of the object which caused the message. [Error messages](#error-messages) may also supply additional information about the error supplied by [Node.js](http://nodejs.org/) directly.

The list of messages below gives additional information about the messages reported in the console. Most messages include some kind of placeholder to give more specific details. All placeholders are marked in `this` format, and most are also surrounded by apostrophes ('').


## Help Messages
When the process of resoluting completes, a resolution report is outputted which displays information about the tool's execution. In these cases, `TERM HELP` or `MRG HELP` is displayed as well. Below is a list of possible help messages that may be displayed.

- ***TERM HELP Term ref '`match`' > '`termRef`', resulted in an empty string, check the converter***<br/>
The supplied converter would result in a [term ref](@) being replaced by an empty string. Placeholder `match` is the selection of the input file that has been matched by the [interpreter](customization#interpreter) to be a [term ref](@), placeholder `termRef` shows the `term`@`scopetag`:`vsntag` as it is being interpreted by the [TRRT](@).

- ***TERM HELP Term ref '`match`' > '`termRef`', has multiple matching MRG entries in MRG `source`***<br/>
The combination of `term`, `scopetag`, and `vsntag` resulted in multiple matching [MRG entries](@) located inside [MRG(s)](@) listed at the `source` placeholder. Placeholder `match` is the selection of the input file that has been matched by the [interpreter](customization#interpreter) to be a [term ref](@), placeholder `termRef` shows the `term`@`scopetag`:`vsntag` as it is being interpreted by the [TRRT](@).

- ***TERM HELP Term ref '`match`' > '`termRef`', could not be matched with an MRG entry***<br/>
The combination of `term`, `scopetag`, and `vsntag` resulted in no matching [MRG entry](@) inside the loaded [MRG(s)](@). Placeholder `match` is the selection of the input file that has been matched by the [interpreter](customization#interpreter) to be a [term ref](@), placeholder `termRef` shows the `term`@`scopetag`:`vsntag` as it is being interpreted by the [TRRT](@).

- ***MRG HELP MRG entry missing required property: '`missingProperties`'. Entry starts with values `reference`***<br/>
An [MRG entry](@) inside the specified [MRG](@) is missing certain properties. The missing properties are reported as placeholder `missingProperties`. The first three key-value pairs of the entry causing the help message are reported as placeholder `reference`.

## Error Messages

- ***ERROR E002 Missing required property in SAF at '`safURL`': '`missingProperties`'***<br/>
A required property could not be located in the [SAF](@)'s scope section at `safURL`, the error message should state the missing properties at the `missingProperties` placeholder. See the [specifications](specifications) to see information about the required [SAF](@) properties.

- ***ERROR E003 Missing required property in MRG at '`mrgURL`': '`missingProperties`'***<br/>
A required property could not be located in the [MRG](@)'s terminology section at `mrgURL`, the error message should state the missing properties at the `missingProperties` placeholder. Check the [specifications](specifications) to see information about the required [MRG](@) properties.

- ***ERROR E004 An error occurred while attempting to load the SAF at '`safURL`'***<br/>
The [TRRT](@) has failed to process the supplied [SAF](@) at `safURL`. Some additional information on the cause of this error should be displayed underneath this message and the program should be stopped.

- ***ERROR E005 An error occurred while attempting to load an MRG at '`mrgURL`'***<br/>
The [TRRT](@) has failed to process a supplied [MRG](@) at `mrgURL`. Some additional information on the cause of this error should be displayed underneath this message.

- ***ERROR E006 An error occurred while attempting to process the MRG at '`mrgURL`'***<br/>
Populating the runtime glossary with the specified [MRG](@) at `mrgURL` has failed. Some additional information on the cause of this error should be displayed underneath this message.

- ***ERROR E007 Error creating directory '`dirPath`'***<br/>
Creating the specified (sub)directory path `dirPath` has failed. Some additional information on the cause of this error should be displayed underneath this message.

- ***ERROR E008 Error writing file '`filePath`'***<br/>
Writing the specified file `filePath` has failed. Some additional information on the cause of this error should be displayed underneath this message.

- ***ERROR E009 Could not read file '`filePath`'***<br/>
Reading the specified file `filePath` has failed. Some additional information on the cause of this error should be displayed underneath this message.

- ***ERROR E010 Could not interpret and convert file '`filePath`'***<br/>
The interpretation and conversion steps related to the specific file `filePath` have failed in a way which caused an error. Some additional information on the cause of this error should be displayed underneath this message.

- ***ERROR E011 Failed to read or parse the config file '`filePath`'***<br/>
Something went wrong during the interpretation of the config file at `filePath`. Some additional information on the cause of this error should be displayed underneath this message.

- ***ERROR E012 Something unexpected went wrong while resoluting terms***<br/>
This error message should only be seen when an error occurs that results in resolution not being able to complete. Some additional information on the cause of this error should be displayed underneath this message.

- ***ERROR E013 File '`filePath`' already exists. Use --force to overwrite***<br/>
The --force flag must be used when overwriting is necessary, specifically to overwrite file `filePath`. Meant to prevent accidental overwriting of files that include [term refs](@).