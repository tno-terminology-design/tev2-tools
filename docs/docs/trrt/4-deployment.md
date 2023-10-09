# Deployment

## TRRT Example
The [TRRT](@) is designed to be usable in both a command-line interface and a CI/CD pipeline. Features like the [configuration file](usage#configuration-file), make the execution of the tool easily maintainable, and [error reporting](error-reporting) is available to assist further in the resolution of terms.

The GitHub repository of the [TRRT](@), located [here](https://github.com/tno-terminology-design/trrt) acts as an example of the tool's deployment. Within the `.github/workflows/docs-deploy.yml` GitHub Actions Workflow file are the following lines of code. This code is located in the deploy job before the website is built, modifying the input files in runtime before they are used to build the Docusaurus site.

```yml
  # Terminology reference resolution
- name: Install TRRT
  run: npm install -g @tno-terminology-design/trrt@1.x
- name: Run TRRT
  run: trrt --output . --scopedir __tests__/content '**/*.md' --force
```

This execution of the [TRRT](@) is run from the root of the repository, any input files that contain successfully converted [term refs](@) will be output starting from that location as well. The [scope directory](@) is set to `__tests__/content`, as this is where the SAF resides. Every file that matches the `'**/*.md'` glob pattern string is given to the [TRRT](@), in this case meaning every file in every directory ending with `.md` is seen as input.
As the output directory is the same as the current directory, converted files will overwrite the existing files when we use the `force` flag. This forceful behavior is useful for deployment inside pipelines where the original files are usually not modified, but should be avoided during local use in order to preserve the original documents that include [term refs](@).

## Example Deployment Case
The [TRRT](@) needs one [SAF](@) and one or more [MRG's](@) in order to function and will check to make sure the required properties within these files are set. Not being able to load a [SAF](@) will cause the program to exit. Not being able to load a complete [MRG](@), or finding an invalid entry within an [MRG](@), will not cause the program to be stopped, but will be displayed as a `MRG HELP` item (see [Error Reporting](error-reporting)).

To demonstrate the tool's possibilities, lets imagine the following scenario.
You are part of a community that wishes to curate their terminologies. You have read up on the [TNO Terminology Design](@) specifications and have constructed a [SAF](@) to fit your needs. The [SAF](@) includes information about the scopes you and your colleagues would want to be able to reference. Inside the written texts of your community, the [basic term ref syntax](specifications#interpretation-of-the-term-ref) has been used to reference terms. All of the used terms are located in an [MRG](@), which is located in the `glossarydir` as defined in the [SAF](@).
The standard converters of the [TRRT](@) do not fit the needs of your community. Your colleagues have already set up a website to display the files and have done some work to streamline existing terms using a custom JavaScript element. The custom element they made looks like this while being used inline:

```html
<term-info
	definition="A mishmash is a confused mess of different things."
	img="img/mismash.png"
	more-info="docs/terms/mishmash.html">mishmash
</term-info>
```

Assuming the term 'mishmash' is part of an [MRG](@), and the default scope and version tag have been set, mishmash can be referenced by using the syntax `[mishmash](@)`. Running the [TRRT](@) with the following config example should achieve the wanted results. *Pay special attention to the converter.*

```yaml title="__tests__/content/config.yaml"
# TRRT configuration file (yaml)
output: .
scopedir: .
interpreter: 'basic' # `alt` or `basic` are also valid
# highlight-next-line
converter: '<term-info definition="{{glossaryText}}" img="img/{{term}}.png" more-info="{{navurl}}">{{showtext}}</term-info>' # `http`, `essif` or `markdown` are also valid

# glob pattern strings for files to be processed
input:
  - '**/*.md'
```

As the `output` and `scopedir` arguments are the same, it might be necessary to call the tool with the `force` [flag](specifications#calling-the-tool) in order to overwrite the existing files. While testing, it may be more useful to supply a separate `output` directory and not use the `force` flag.

### Executed Steps
The following steps have been executed to reach a working implementation of the tool based on the [example deployment](#example-deployment) above. Multiple approaches are possible, like using `wget` instead of `curl`, or `yarn` instead of `npm`, but these have not been documented.


1. **Make sure the [prerequisites](installation#prerequisites) are met.** <br/>
Please refer to [nvm's](https://github.com/nvm-sh/nvm) installation and usage for the latest details about these commands. This step will likely not be necessary if you are integrating the [TRRT](@) inside a pipeline.

  ```bash
  # Download and install nvm
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.4/install.sh | bash
  # Download and install node.js
  nvm install node # "node" is an alias for the latest version
  nvm use node # Use the installed node.js version
  ```

2. **Install the latest version of the [TRRT](@) and its dependencies globally.** <br/>
This makes the [TRRT](@) CLI command available all throughout your system and does not initialize the current working directory with [npm](https://www.npmjs.com) files.

  ```bash
  npm install -g @tno-terminology-design/trrt
  ```

3. **Configure the [SAF](@) and make sure the necessary [MRG](@)'s are present.** <br/>
Our example deployment `saf.yaml` can be viewed [here](https://github.com/tno-terminology-design/trrt/blob/main/__tests__/content/saf.yaml) within the `__tests__/content` directory, with the [MRG's](@) located in the [glossarydir](https://github.com/tno-terminology-design/trrt/tree/main/__tests__/content/terminology) at `__tests__/content/terminology`.

4. **Setup the [TRRT](@) behavior per [configuration file](usage#configuration-file) and/or command-line parameters.** <br/>
See the [example deployment](#example-deployment) above for the yaml configuration file that is used. In this case we will be executing the [TRRT](@) from the root of our repository and not the root of the [scopedir](@). Make sure to confirm your working directory and adjust any of the path related parameters before continuing to step 5.

5. **Execute the [TRRT](@).** <br/>
We will use the following command to run the tool according to the `__tests__/content/config.yaml` config file. As the [example deployment](#example-deployment) is executed within a CI/CD pipeline we will be using the `force` flag to overwrite the input files with their renderable counterparts. The configured paths are relative to the working directory where the [TRRT](@) is executed.

  ```bash
  trrt --config __tests__/content/config.yaml --force
  ```

6. **Verify successful execution.** <br/>
The [TRRT](@) CLI outputs information about its execution to the console according to the [Error Reporting](error-reporting) messages. The output should provide enough information to resolve issues surrounding the execution of the tool and the related terminology design.

  ```n/a title="Sample console output"
  INFO    Converter.js    Using essif template: '<a href="{{navurl}}{{#trait}}#{{/trait}}{{trait}}" title="{{capFirst term}}: {{noRefs glossaryText type="markdown"}}">{{showtext}}</a>'
  INFO    Interpreter.js  Using basic interpreter: '/(?:(?<=[^`\\])|^)\[(?=[^@\]]+\]\([#a-z0-9_-]*@[:a-z0-9_-]*\))(?<showtext>[^\n\]@]+)\]\((?:(?<id>[a-z0-9_-]*)?(?:#(?<trait>[a-z0-9_-]+))?)?@(?<scopetag>[a-z0-9_-]*)(?::(?<vsntag>[a-z0-9_-]+))?\)/g'
  INFO    Resolver.js     Reading files using pattern string '**/*.md'
  INFO    Resolver.js     Found 111 files
  INFO    Run.js          Resolution complete...

  Resolution Report:
        Number of files modified: 110
        Number of terms converted: 3224
    Term Errors:
  TERM HELP    Term ref '[frontmatter](@)' > 'frontmatter@tev2:terms', could not be matched with an MRG entry:
   docs/terms/term-identifier.md:8
  TERM HELP    Term ref '[owner](@)' > 'owner@tev2:terms', could not be matched with an MRG entry:
   docs/terms/scope.md:7:7
   docs/terms/knowledge-artifact.md:29
  ```
