# Installation

## Prerequisites

Before proceeding with the installation, ensure that you have the following prerequisites installed on your system:

1. [Node.js](http://nodejs.org/): The [TRRT](@) is a Node.js-based tool, so you need to have [Node.js](https://nodejs.org/) installed on your system. You can download Node.js from the official website: [Node.js Download Page](https://nodejs.org/).
2. [npm](https://www.npmjs.com/get-npm): npm (Node Package Manager) is bundled with Node.js and is used to manage dependencies and packages for Node.js applications. Although you could install the [TRRT](@) using `git clone` and build the package yourself, obtaining/installing the built package through npm is documented below.

The [TRRT](@) has been tested on [Node.js](http://nodejs.org/) v18 (LTS) through v20. While the [TRRT](@) should work with newer versions of [Node.js](http://nodejs.org/), it is essential to be aware of potential compatibility issues with older versions. If you encounter any problems or unexpected behavior while using the [TRRT](@) with a different [Node.js](http://nodejs.org/) version, consider using any of the versions specified above.

## Installation Steps

1. Open a terminal or command prompt on your system.
    
2. Install TRRT globally by running the following [npm](https://www.npmjs.com/package/@tno-terminoloy-design/trrt) command:
    
    ```bash
    npm install -g @tno-terminology-design/trrt
    ```
        
    This will install the [TRRT](@) globally on your system, making it available as a command-line tool.
    
3. Verify that the [TRRT](@) is installed correctly by running the following command:
    
    ```bash
    trrt --version
    ```
    This should display the version number of the [TRRT](@), confirming that the installation was successful.

## Usage

The behavior of the [TRRT](@) can be configured per call e.g. by a configuration file and/or command-line parameters. The command-line syntax is as follows:

```bash
trrt [ <paramlist> ] [ <globpattern> ]
```

where:
- `<paramlist>` (optional) is a list of key-value pairs
- `<globpattern>` (optional) specifies a set of (input) files that are to be processed

**For configuration of the tool and available parameters please refer to the [configuration](Configuration.md) section next.**