# Deployment

## MRG Import Example
The [MRG Import Tool](@) is designed to be usable in both a command-line interface and a CI/CD pipeline. Features like the [configuration file](usage#configuration-file), make the execution of the tool easily maintainable, and [error reporting](error-reporting) is available to assist further in importing [MRG](@)s.

The GitHub repository of the [MRG Import Tool](@), located [here](https://github.com/tno-terminology-design/mrg-import), acts as an example of the tool's deployment. Within the `.github/workflows/docs-deploy.yml` GitHub Actions Workflow file are the following lines of code. This code is located and run in the deploy job before the website is built, modifying the input files in runtime before they are used to build the Docusaurus site.

```yml
    # Terminology reference resolution
    - name: Install MRG Import Tool
      run: npm install -g @tno-terminology-design/mrg-import
    - name: Run MRG Import Tool
      run: mrg-import --scopedir __tests__/content --onNotExist warn
```

This execution of the [MRG Import Tool](@) is run from the root of the repository. The tool reads the `saf.yaml` inside the supplied `scopedir` (`__tests__/content`). After which, the `scopes` section of the local [SAF](@) is used to find the `scopedir` of external scopes.

### Executed Steps
The following steps have been executed to reach a working implementation of the tool based on the [example deployment](#example-deployment) above. Multiple approaches are possible, like using `wget` instead of `curl`, or `yarn` instead of `npm`, but these have not been documented.


1. **Make sure the [prerequisites](installation#prerequisites) are met.** <br/>
Please refer to [nvm](https://github.com/nvm-sh/nvm) installation and usage for the latest details about these commands.

  ```bash
  # Download and install nvm
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.4/install.sh | bash
  # Download and install node.js
  nvm install node # "node" is an alias for the latest version
  nvm use node # Use the installed node.js version
  ```

2. **Install the latest version of the [MRG Import Tool](@) and its dependencies globally.** <br/>
This makes the [MRG Import Tool](@) CLI command available all throughout your system and does not initialize the current working directory with [npm](https://www.npmjs.com) files.

  ```bash
  npm install -g @tno-terminology-design/mrg-import
  ```

3. **Configure the [SAF](@) and make sure the necessary [MRG](@)'s are attainable.** <br/>
Our example deployment `saf.yaml` can be viewed [here](https://github.com/tno-terminology-design/mrg-import/blob/main/__tests__/content/saf.yaml) within the `__tests__/content` directory.

4. **Setup the [MRG Import Tool](@) behavior per [configuration file](usage#configuration-file) and/or command-line parameters.** <br/>
See the [example deployment](#example-deployment) above for the yaml configuration file that is used. In this case we will be executing the [MRG Import Tool](@) from the root of our repository and not the root of the [scopedir](@). This means you may have to change working directory before executing step 5.

5. **Execute the [MRG Import Tool](@).** <br/>
We will use the following command to run the tool according to the `__tests__/content/config.yaml` config file. The configured paths are relative to the working directory where the [MRG Import Tool](@) is executed.

  ```bash
  mrg-import --config __tests__/content/config.yaml --force
  ```

6. **Verify execution.** <br/>
The [MRG Import Tool](@) CLI outputs information about its execution to the console according to the [Error Reporting](error-reporting) messages. The output should provide enough information to resolve issues surrounding the execution of the tool and the related terminology design. In this case, obtaining the second [MRG](@) listed in the import [SAF](@) resulted in an error that caused the tool to halt execution as specified by the `onNotExist` option.

  ```n/a title="Sample console output"
  INFO    Found 1 import scope(s) in scopedir './__tests__/content'
  INFO      - Handling import scope 'essiflab'
  INFO      - Requesting 'https://raw.githubusercontent.com/tno-terminology-design/trrt/main/__tests__/content/saf.yaml'
  INFO    Found 2 maintained MRG file(s) in import scope 'essiflab'
  INFO      - Requesting 'https://raw.githubusercontent.com/tno-terminology-design/trrt/main/__tests__/content/terminology/mrg.default.main.yaml'
  INFO        - Storing MRG file 'mrg.essiflab.main.yaml' in '__tests__/content/terminology'
  INFO        - Creating symbolic link for 1 alternative version(s)
  INFO      - Requesting 'https://raw.githubusercontent.com/tno-terminology-design/trrt/main/__tests__/content/terminology/mrg.default.lain.yaml'
  ERROR       - Request failed with status code 404, halting execution as requested by the 'onNotExist' throw option
  ```
