# Change Log
All notable changes to the "testcafe-test-runner" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [1.4.3]
- Supported the custom meta settings (https://github.com/DevExpress/testcafe/issues/2242)

## [1.4.2]
- Added the Chrome Canary support

## [1.4.1]
- Fix the "Cannot read property 'uri' of undefined" error

## [1.4.0]
- Use the new VS Code debug API.

## [1.3.0]
- Added the 'testcafeTestRunner.workspaceRoot' setting.

## [1.2.0]
 - Use the 'inspector' protocol instead of 'legacy'
 - Use the Terminal tab instead of the Output (because of https://github.com/Microsoft/vscode/issues/19750 and https://github.com/romanresh/vscode-testcafe/issues/10)

## [1.1.0]
 - Added TypeScript files support
 - Fixed the error message if testcafe is not found in the working directory

## [1.0.2]
 - Added the 'testcafeTestRunner.customArguments' configuration key. See the whole list of available arguments in the [TestCafe documentation](https://devexpress.github.io/testcafe/documentation/using-testcafe/command-line-interface.html#options).

## [1.0]
 - Updated documentation
 - Stable release

## [0.0.5]
 - Automatic detection of installed browsers
 - Run all tests in a folder

## [0.0.4]
- Fix breakpoints missing in testcafe `^0.12.0-alpha1+`

## [0.0.3]
- Run all tests in a file (via file context menu)
- Run all tests in a fixture
- Fix run test via right click on the 'test' function.

## [0.0.2]
- New command: TestCafe: Repeat Previous Test Run
- Fixed error which occurs when extensions is not activated, but menus're already available

## [0.0.1]
- Initial release
- Base commands: Run in Chrome, IE, Firefox