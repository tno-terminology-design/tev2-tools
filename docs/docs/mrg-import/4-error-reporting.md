# Error Reporting
During execution the [MRG Import Tool](@) outputs information about the state of the tool to the console. All console messages listed in the section below include timestamps, information about the type of message, and the object which caused the message. [Error messages](#error-messages) may also supply additional information about the error supplied by [Node.js](http://nodejs.org/) directly.

The list of messages below gives additional information about the messages reported in the console. Most messages include some kind of placeholder to give more specific details. All placeholders are marked in `this` format, and most are also surrounded by apostrophes ('').

## Error Messages
- ***ERROR E002 Missing required property in SAF at '`safURL`': '`missingProperties`'***<br/>
A required property could not be located in the [SAF](@)'s scope section at `safURL`, the error message should state the missing properties at the `missingProperties` placeholder. See the [specifications](specifications) to see information about the required [SAF](@) properties.

- ***ERROR E003 Missing required property in MRG at '`mrgURL`': '`missingProperties`'***<br/>
A required property could not be located in the [MRG](@)'s terminology section at `mrgURL`, the error message should state the missing properties at the `missingProperties` placeholder. Check the [specifications](specifications) to see information about the required [MRG](@) properties.

- ***ERROR E004 SAF request of '`safURL`' failed with status code `status`***<br/>
The requested `safURL` could not be downloaded and the server returned [HTTP status code](https://en.wikipedia.org/wiki/List_of_HTTP_status_codes) `status`. Check if the raw file URL in the request listed above this error points to the correct file.

- ***ERROR E005 SAF interpretation of '`safURL`' failed due to a YAML parsing error***<br/>
The downloaded [SAF](@) from `safURL` could not be interpreted by the YAML parser. Some additional information on the cause of this error should be displayed underneath this message.

- ***ERROR E006 `error`, halting execution as requested by the 'onNotExist' throw option***<br/>
Something with cause `error` went wrong while handling an [MRG](@). The `onNotExist` parameter value was set to `throw`, so the tool execution was halted.

- ***ERROR E007 Error creating directory '`dirPath`'***<br/>
Creating the specified (sub)directory path `dirPath` has failed. Some additional information on the cause of this error should be displayed underneath this message.

- ***ERROR E008 Error writing file '`filePath`'***<br/>
Writing the specified file `filePath` has failed. Some additional information on the cause of this error should be displayed underneath this message.

- ***ERROR E009 Unsupported Git platform `platform`***<br/>
The `platform` of the parsed URL is unknown as a source by tool and can not be converted into a raw URL for getting data. View URL handling information in [usage](usage#url-handling) for more information.

- ***ERROR E011 Failed to read or parse the config file '`filePath`'***<br/>
Something went wrong during the interpretation of the config file at `filePath`. Some additional information on the cause of this error should be displayed underneath this message.

- ***ERROR E012 Something unexpected went wrong***<br/>
This error message should only be seen when an error occurs that results in the [MRG](@) import process is not able to complete normally. Some additional information on the cause of this error should be displayed underneath this message.
