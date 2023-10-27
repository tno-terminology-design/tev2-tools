# MRG Import Tool

The [MRG](@) Import Tool ([MRG importer](@)) ensures that the [scope](@) within which it is run, obtains a local copy of all [MRG](@)s that are available in the [scopes](@) that are mentioned in the [scopes section](https://tno-terminology-design.github.io/tev2-specifications/docs/tev2/spec-files/saf#scopes) of its [SAF](@). This makes life easy for various tools, e.g., the [MRGT](@) and the [TRRT](@), that can now assume that all [MRG](@)s that they may need to consult in order to do their job, are readily available.

This documentation consists of the following items.

- [Installation](mrg-import/installation): [prerequisites](mrg-import/installation#prerequisites), [quick installation](mrg-import/installation#quick-installation)
- [Usage](mrg-import/usage): [parameters and options](mrg-import/usage#parameters-and-options), [(URL) Handling](mrg-import/usage#url-handling), [configuration file](mrg-import/usage#configuration-file)
- [Deployment](mrg-import/deployment): [examples](mrg-import/deployment#mrg-import-example), [deployment steps](mrg-import/deployment#executed-steps) 
- [Error Reporting](mrg-import/error-reporting): [error messages](mrg-import/error-reporting#error-messages)
- [Testing](mrg-import/testing): [cloning](mrg-import/testing), [compiling](mrg-import/testing)

The specifications of the tool are located [here](https://tno-terminology-design.github.io/tev2-specifications/docs/spec-tools/mrg-importer).