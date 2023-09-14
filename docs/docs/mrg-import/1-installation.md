# Installation
## Prerequisites

Before proceeding with the installation, ensure that you have the following prerequisites installed on your system:

1. [Node.js](http://nodejs.org/): The [MRG Import Tool](@) is a Node.js-based tool, so you need to have [Node.js](https://nodejs.org/) installed on your system. You can download Node.js from the official website: [Node.js Download Page](https://nodejs.org/) or use [nvm](https://github.com/nvm-sh/nvm) for managing multiple Node versions on a single machine installed.
2. [npm](https://www.npmjs.com/get-npm): npm (Node Package Manager) is bundled with Node.js and is used to manage dependencies and packages for Node.js applications. Although you could install the [MRG Import Tool](@) using `git clone` and build the package yourself (see [testing](#testing)), obtaining/installing the built package through npm is documented below.

The [MRG Import Tool](@) has been tested on [Node.js](http://nodejs.org/) v18 (LTS) through v20. While the [MRG Import Tool](@) should work with newer versions of [Node.js](http://nodejs.org/), it is essential to be aware of potential compatibility issues with older versions. If you encounter any problems or unexpected behavior while using the [MRG Import Tool](@) with a different [Node.js](http://nodejs.org/) version, consider using any of the versions specified above.

## Quick Installation
Refer to [deployment](deployment) for an example of how the [MRG Import Tool](@) and its prerequisites may be installed and deployed.
    
1. Install the latest version of the [MRG Import Tool](@) globally by running the following [npm](https://www.npmjs.com/package/@tno-terminoloy-design/mrg-import) command.
    
    ```bash
    npm install -g @tno-terminology-design/mrg-import
    ```
        
    This will install the [MRG Import Tool](@) globally on your system, making it available as a command-line tool.
    
2. Verify that the [MRG Import Tool](@) is installed correctly by running the following command.
    
    ```bash
    mrg-import --version
    ```
    This should display the version number of the [MRG Import Tool](@), confirming that the installation was successful.

**For usage and configuration of the tool please refer to the [usage](usage) section next.**
