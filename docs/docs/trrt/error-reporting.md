## Help Messages
When the process of resoluting completes, a resolution report is outputted which displays information about the tool's execution. In certain cases, `TERM HELP` or `MRG HELP` is displayed as well. Below is a list of possible help messages that may be displayed.

- ***TERM HELP Term ref '`match`' resulted in an empty string, check the converter***
The supplied converter would result in a [term ref](@) being replaced by an empty string. For this reason, it will not be replaced.

- ***TERM HELP Term ref '`match`' has multiple matching MRG entries. Located in: `source`***
The combination of `term`, `scopetag`, and `vsntag` resulted in multiple matching [MRG entries](@) located inside `source`.

- ***TERM HELP Match '`match`' could not be matched with a MRG entry. Did you mean to reference '`suggestedTermRef`' instead of '`TermRef`'?***
The combination of `term`, `scopetag`, and `vsntag` resulted in no matching [MRG entry](@) inside the loaded [MRG](@)s. There is an existing entry that seems similar. 

- ***TERM HELP Match '`match`' resulting in '`TermRef`', could not be matched with a MRG entry***
The combination of `term`, `scopetag`, and `vsntag` resulted in no matching [MRG entry](@) inside the loaded [MRG](@)s. No similar [MRG entry] has been found.

- ***MRG HELP Invalid entry in MRG at '`mrgURL`' (line `lineNumber`: Missing required property: '`missingProperties`'***
A [MRG entry](@) inside the specified [MRG](@) is missing certain properties.

## Error Messages

- ***ERROR E001 No MRG files found in the glossary directory '`glossarydir`'***
No file in the [glossarydir](@) is matching the glob pattern '`mrg.*.*.yaml`'.

- ***ERROR E002 Missing required property in SAF at '`safURL`': '`missingProperties`'***
A required property could not be located in the [SAF](@)'s scope section', the error message should state the missing property. Check the specifications to see information about the required [SAF](@) properties.

- ***ERROR E003 Missing required property in MRG at '`mrgURL`': '`missingProperties`'***
A required property could not be located in the [MRG](@)'s terminology section, the error message should state the missing property. Check the specifications to see information about the required [MRG](@) properties.

- ***ERROR E004 An error occurred while attempting to load the SAF at '`safURL`'***
The [TRRT](@) has failed to process the supplied [SAF](@). Some additional information on the cause of this error should be displayed underneath this message and the program should be stopped.

- ***ERROR E005 An error occurred while attempting to load a MRG at '`mrgURL`'***
The [TRRT](@) has failed to process a supplied [MRG](@). Some additional information on the cause of this error should be displayed underneath this message.

- ***ERROR E006 An error occurred while attempting to process the MRG at '`filename`'***
Populating the runtime glossary with the specified [MRG](@) has failed. Some additional information on the cause of this error should be displayed underneath this message.

- ***ERROR E007 Error creating directory '`dirPath`'***
Creating the specified (sub)directory has failed. Some additional information on the cause of this error should be displayed underneath this message.

- ***ERROR E008 Error writing file '`filePath`'***
Writing the specified file has failed. Some additional information on the cause of this error should be displayed underneath this message.

- ***ERROR E009 Could not read file '`filePath`'***
Reading the specified file has failed. Some additional information on the cause of this error should be displayed underneath this message.

- ***ERROR E010 Could not interpret and convert file '`filePath`'***
The interpretation and conversion steps related to the specific file have failed in a way which caused an error. Some additional information on the cause of this error should be displayed underneath this message.

- ***ERROR E011 Failed to read or parse the config file '`configFile`'***
Something went wrong during the interpretation of the config file. Some additional information on the cause of this error should be displayed underneath this message.

- ***ERROR E012 Something unexpected went wrong while resoluting terms***
This error message should only be seen when an error occurs that results in resolution not being able to complete. Some additional information on the cause of this error should be displayed underneath this message.

- ***ERROR E013 File '`filePath`' already exists. Use --force to overwrite***
The --force flag must be used when overwriting is necessary. Meant to prevent accidental overwriting of files that include [term refs](@)