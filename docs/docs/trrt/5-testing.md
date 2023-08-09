# Testing

When cloning the entire [TRRT repository](https://github.com/tno-terminology-design/trrt), you will also get certain files to test the behavior of the tool. These test files are located in the `__tests__` directory, and include a `content` folder and an automated test written for the [mocha](https://mochajs.org/) test framework and [chai](https://www.chaijs.com/) assertion library. This automated test can be executed by running the following command inside the [TRRT repository](https://github.com/tno-terminology-design/trrt) clone: 
```bash
npm test
```
which should execute the `mocha __tests__/**/*.test.js` command and run all available unit tests.
Keep in mind that working with a clone of the [TRRT repository](https://github.com/tno-terminology-design/trrt) instead of the [npm package](https://www.npmjs.com/package/@tno-terminoloy-design/trrt) will result in an uncompiled version of the [TRRT](@) as the built files are not stored in the [TRRT repository](https://github.com/tno-terminology-design/trrt). This uncompiled version will need the dependencies to be compiled, which in addition to compiling/building can be achieved by executing:
```bash
npm install
npm run build
```
after which the tool can be installed using:
```bash
npm install -g
```

If you are planning on modifying any code: a rebuild command is also available, which uninstalls the latest package, removes the build folder, re-builds, and re-installs:
```bash
npm run rebuild
```

The current available test ([\__tests__/trrt.test.js](https://github.com/tno-terminology-design/trrt/blob/main/__tests__/trrt.test.js)), runs the [TRRT](@) on the test files located in the `content` folder and checks if the number of terms that have been converted correspond with the amount of terms found by the external regex matching of the test script.
