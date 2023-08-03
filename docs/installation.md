## Prerequisites

Before proceeding with the installation, ensure that you have the following prerequisites installed on your system:

1. [Node.js](http://nodejs.org/): the [MRG Import Tool](@) is a Node.js-based tool, so you need to have [Node.js](https://nodejs.org/) installed on your system. You can download Node.js from the official website: [Node.js Download Page](https://nodejs.org/).
2. [npm](https://www.npmjs.com/get-npm): npm (Node Package Manager) is bundled with Node.js and is used to manage dependencies and packages for Node.js applications. Although you could install the [MRG Import Tool](@) using `git clone` and build the package yourself, obtaining/installing the built package through npm is documented below.

The [MRG Import Tool](@) has been tested on [Node.js](http://nodejs.org/) v18 (LTS) through v20. While the [MRG Import Tool](@) should work with newer versions of [Node.js](http://nodejs.org/), it is essential to be aware of potential compatibility issues with older versions. If you encounter any problems or unexpected behavior while using the [MRG Import Tool](@) with a different [Node.js](http://nodejs.org/) version, consider using any of the versions specified above.

## Installation Steps

1. Open a terminal or command prompt on your system.
    
2. Install MRG Import Tool globally by running the following [npm](https://www.npmjs.com/package/@tno-terminoloy-design/mrg-import) command:
    
    ```bash
    npm install -g @tno-terminology-design/mrg-import
    ```
        
    This will install the [MRG Import Tool](@) globally on your system, making it available as a command-line tool.
    
3. Verify that the [MRG Import Tool](@) is installed correctly by running the following command:
    
    ```bash
    mrg-import --version
    ```
    This should display the version number of the [MRG Import Tool](@), confirming that the installation was successful.

## Usage

The behavior of the [MRG Import Tool](@) can be configured per call e.g. by a configuration file and/or command-line parameters. The command-line syntax is as follows:

```bash
mrg-import [ <paramlist> ]
```

where:
- `<paramlist>` (optional) is a list of key-value pairs

**For configuration of the tool and available parameters please refer to the [configuration](Configuration.md) section next.**
