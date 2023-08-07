# Deployment

## TRRT Example
The [TRRT](@) is designed to be usable in both a command-line interface and a CI/CD pipeline. Features like the [configuration file](configuration#Configuration%20File), make the execution of the tool easily maintainable, and [error reporting](error%20reporting) is available to assist further in the resolution of terms.

The GitHub repository of the [TRRT](@), located [here](https://github.com/tno-terminology-design/trrt) acts as an example of the tool's deployment. Within the `.github/workflows/docs-deploy.yml` GitHub Actions Workflow file are the following lines of code. This code is located in the deploy job before the website is built, modifying the input files in runtime before they are used to build the Docusaurus site.

```yml
  # Terminology reference resolution
- name: Install TRRT
  run: npm install -g @tno-terminology-design/trrt@1.x
- name: Run TRRT
  run: trrt --output . --scopedir __tests__/content '**/**.md' --force
```

This execution of the [TRRT](@) is run from the root of the repository, any input files that contain successfully converted [term refs](@) will be outputted starting from that location as well. The [scope directory](@) is set to `__tests__/content`, as this is where the SAF resides. Every file that matches the `'**/**.md'` glob pattern string is given to the [TRRT](@), in this case meaning every file in every directory ending with `.md` is seen as input.
As the output directory is the same as the current directory, converted files will overwrite the existing files when we use the `force` flag. This behavior is useful for deployment inside pipelines where the original files are usually not modified, but should be avoided during local use in order to preserve the original documents that include [term refs](@).

## Example Deployment
The [TRRT](@) needs one [SAF](@) and one or more [MRG](@)s in order to function and it will check to make sure the required properties within these files are set. Not being able to load a [SAF](@) or [MRG](@) will cause the program to exit. An invalid entry within a [MRG](@) will not cause the program to be stopped, but will be displayed as a `MRG HELP` item. 

To demonstrate the tool's possibilities, lets imagine the following scenario.
You are part of a community that wishes to curate their terminologies. You have read up on the [TNO Terminology Design](@) specifications and have constructed a [SAF](@) to fit your needs. The [SAF](@) includes information about the scopes you and your colleagues would want to be able to reference. Inside the written texts of your community, the basic [term ref](@) syntax has been used to reference terms. All of the used terms are located in a [MRG](@), which is located in the `glossarydir` as defined in the [SAF](@).
The standard converters of the [TRRT](@) do not fit the needs of your community. Your colleagues have already set up a website to display the files and have done some work to streamline existing terms using a custom JavaScript element. The custom element they made looks like this while being used inline:

```html
<term-info
	definition="A mishmash is a confused mess of different things."
	img="img/mismash.png"
	more-info="docs/terms/mishmash.html">mishmash</term-info>
```

Assuming the term 'mishmash' is part of a [MRG](@), and the default scope tag and version tag have been set, mishmash can be referenced by using the syntax `[mishmash](@)`. Running the [TRRT](@) with the following config example should achieve the wanted results. *Pay special attention to the converter.*

```yaml
# TRRT configuration file (yaml)
output: .
scopedir: .
interpreter: basic # `alt` or `basic` are also valid
converter: <term-info definition="{{glossaryText}}" img="img/{{term}}.png" more-info="{{navurl}}">{{showtext}}</term-info> # `http`, `essif` or `markdown` are also valid

# glob pattern strings for files to be processed
input:
  - **/*.md
```

As the `output` and `scopedir` arguments are the same, it might be necessary to call the tool with the `force` [flag](error%20reporting) in order to overwrite the existing files. While testing, it may be more useful to supply a separate `output` directory and not use the `force` flag.