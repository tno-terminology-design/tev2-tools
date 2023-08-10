# Testing

When cloning the entire [MRG Import Tool repository](https://github.com/tno-terminology-design/mrg-import), you will also get certain files to test the behavior of the tool. These test files are located in the `__tests__` directory, and include a `content` folder and an automated test written for the [mocha](https://mochajs.org/) test framework and [chai](https://www.chaijs.com/) assertion library. This automated test can be executed by running the following command inside the [MRG Import Tool repository](https://github.com/tno-terminology-design/mrg-import) clone: 
```bash
npm test
```
which should execute the `mocha __tests__/**/*.test.js` command and run all available unit tests.
Keep in mind that working with a clone of the [MRG Import Tool repository](https://github.com/tno-terminology-design/mrg-import) instead of the [npm package](https://www.npmjs.com/package/@tno-terminoloy-design/mrg-import) will result in an uncompiled version of the [MRG Import Tool](@) as the built files are not stored in the [MRG Import Tool repository](https://github.com/tno-terminology-design/mrg-import). This uncompiled version will need the dependencies to be compiled, which in addition to compiling/building can be achieved by executing:
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

The current available test ([\__tests__/mrg-import.test.js](https://github.com/tno-terminology-design/mrg-import/blob/main/__tests__/mrg-import.test.js)), runs the [MRG Import Tool](@) on the test files located in the `content` folder and checks if the number of terms that have been converted correspond with the amount of terms found by the external regex matching of the test script.
