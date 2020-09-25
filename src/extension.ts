'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

const TEST_OR_FIXTURE_RE = /(^|;|\s+|\/\/|\/\*)fixture\s*(\(.+?\)|`.+?`)|(^|;|\s+|\/\/|\/\*)test\s*(?:\.[a-zA-Z]+\([^\)]*\))*\s*\(\s*(.+?)\s*('|"|`)\s*,/gm;
const CLEANUP_TEST_OR_FIXTURE_NAME_RE = /(^\(?\s*(\'|"|`))|((\'|"|`)\s*\)?$)/g;
const BROWSER_ALIASES = ['ie', 'firefox', 'chrome', 'chrome-canary', 'chromium', 'opera', 'safari', 'edge'];
const PORTABLE_BROWSERS = ["portableFirefox", "portableChrome"];
const TESTCAFE_PATH = "./node_modules/testcafe/lib/cli/index.js";
const HEADLESS_MODE_POSTFIX = ":headless";

var browserTools = require ('testcafe-browser-tools');
let controller: TestCafeTestController = null;

function registerRunTestsCommands (context:vscode.ExtensionContext){
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestsInIE', () => {
            controller.runTests("ie");
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestsInFirefox', () => {
            controller.runTests("firefox");
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestsInChrome', () => {
            controller.runTests("chrome");
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestsInPortableFirefox', () => {
            controller.runTests("portableFirefox", true);
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestsInPortableChrome', () => {
            controller.runTests("portableChrome", true);
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestsInChromeCanary', () => {
            controller.runTests("chrome-canary");
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestsInChromium', () => {
            controller.runTests("chromium");
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestsInOpera', () => {
            controller.runTests("opera");
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestsInSafari', () => {
            controller.runTests("safari");
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestsInEdge', () => {
            controller.runTests("edge");
        })
    );
}

function registerRunTestFileCommands (context:vscode.ExtensionContext){
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestFileInIE', args => {
            controller.startTestRun({name: "ie"}, args.fsPath, "file");
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestFileInFirefox', args => {
            controller.startTestRun({name: "firefox"}, args.fsPath, "file");
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestFileInChrome', args => {
            controller.startTestRun({name: "chrome"}, args.fsPath, "file");
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestFileInPortableFirefox', args => {
            controller.startTestRun({name: "portableFirefox", isPortable: true}, args.fsPath, "file", undefined);
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestFileInPortableChrome', args => {
            controller.startTestRun({name: "portableChrome", isPortable: true}, args.fsPath, "file", undefined);
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestFileInChromeCanary', args => {
            controller.startTestRun({name: "chrome-canary"}, args.fsPath, "file");
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestFileInChromium', args => {
            controller.startTestRun({name: "chromium"}, args.fsPath, "file");
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestFileInOpera', args => {
            controller.startTestRun({name: "opera"}, args.fsPath, "file");
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestFileInSafari', args => {
            controller.startTestRun({name: "safari"}, args.fsPath, "file");
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestFileInEdge', args => {
            controller.startTestRun({name: "edge"}, args.fsPath, "file");
        })
    );
}

function getBrowserList () {
    return browserTools.getInstallations()
            .then(installations => {
                return Object.keys(installations);
            });
}

function updateInstalledBrowserFlags (){
    return getBrowserList()
        .then(installations => {
            for(var aliase of BROWSER_ALIASES){
                if(installations.indexOf(aliase) !== -1 )
                    vscode.commands.executeCommand('setContext', 'testcaferunner.' + aliase + 'Installed', true);
            }
            for(var aliase of PORTABLE_BROWSERS) {
                if(getPortableBrowserPath(aliase))
                    vscode.commands.executeCommand('setContext', 'testcaferunner.' + aliase + 'Installed', true);
            }
        });
}

function getPortableBrowserPath(browser: string): string {
    switch(browser) {
        case "portableFirefox":
            return vscode.workspace.getConfiguration("testcafeTestRunner").get("portableFirefoxPath");
        case "portableChrome":
            return vscode.workspace.getConfiguration("testcafeTestRunner").get("portableChromePath");
        default:
            throw "Unknown portable browser";
    }
}

export function activate(context:vscode.ExtensionContext) {
    controller = new TestCafeTestController();

    vscode.commands.executeCommand('setContext', 'testcaferunner.canRerun', false);

    updateInstalledBrowserFlags()
        .then(() => {
            registerRunTestsCommands(context);
            registerRunTestFileCommands(context);

            context.subscriptions.push(
                vscode.commands.registerCommand('testcaferunner.updateBrowserList', () => {
                    updateInstalledBrowserFlags();
                })
            );

            context.subscriptions.push(
                vscode.commands.registerCommand('testcaferunner.repeatRun', () => {
                    controller.repeatLastRun();
                })
            );

            context.subscriptions.push(controller);

            vscode.commands.executeCommand('setContext', 'testcaferunner.readyForUX', true);
        });
}

// this method is called when your extension is deactivated
export function deactivate() {
}

class TestCafeTestController {
    lastBrowser: IBrowser;
    lastFile:string;
    lastType:string;
    lastName:string;

    public runTests(browser:string, isPortable: boolean = false) {
        let editor = vscode.window.activeTextEditor;

        if (!editor)
            return;

        let doc = editor.document;

        if (doc.languageId !== "javascript" && doc.languageId !== "typescript")
            return;

        var document = editor.document;
        var selection = editor.selection;

        if(!selection || !selection.active)
            return;

        var cursorPosition = document.getText(new vscode.Range(0, 0, selection.active.line, selection.active.character)).length;
        var textBeforeSelection = document.getText(new vscode.Range(0, 0, selection.end.line + 1, 0));

        var [type, name] = this.findTestOrFixtureName(textBeforeSelection, cursorPosition);

        this.startTestRun({name: browser, isPortable: isPortable}, document.fileName, type, name);
    }

    public repeatLastRun() {
        if (!this.lastBrowser || !this.lastFile || (this.lastType !== "file" && !this.lastName)) {
            vscode.window.showErrorMessage(`Previous test is not found.`);
            return;
        }

        this.startTestRun(this.lastBrowser, this.lastFile, this.lastType, this.lastName);
    }

    private cropMatchString(matchString){
        matchString = matchString.trim().replace(/;|\/\/|\/\*/, '');
        
        return matchString.trim();
    }

    private isTest(matchString){    
        return this.cropMatchString(matchString).indexOf('test') === 0;
    }

    private findTestOrFixtureName(text, cursorPosition):string[] {
        var match = TEST_OR_FIXTURE_RE.exec(text);
        var matches = [];

        while (match !== null) {
                var test = this.isTest(match[0]);
                var name = test ? match[4] : match[2];
                var realIndex = match.index + match[0].length - this.cropMatchString(match[0]).length;

                matches.push({
                    type: test ? 'test' : 'fixture',
                    name: name.replace(CLEANUP_TEST_OR_FIXTURE_NAME_RE, ''),
                    index: realIndex
                });

            match = TEST_OR_FIXTURE_RE.exec(text);
        }

        var lastOne = null;

        if (matches.length){
            for(var i = matches.length - 1; i >= 0; i--){
                if(cursorPosition >=  matches[i].index){
                    lastOne = matches[i];
                    break;
                }
            }
        }

        if (lastOne)
            return [lastOne.type, lastOne.name];

        return ['', ''];
    }
    
    private getOverriddenWorkspacePath(): string {
        const alternateWorkspacePath = vscode.workspace.getConfiguration('testcafeTestRunner').get('workspaceRoot')
        if (typeof(alternateWorkspacePath) === 'string' && alternateWorkspacePath.length > 0 ){
            return alternateWorkspacePath
        }
        return ''
    }

    private isLiverRunner(): boolean {
        const useLiveRunner = vscode.workspace.getConfiguration('testcafeTestRunner').get('useLiveRunner')
        if (typeof(useLiveRunner) === 'boolean' && useLiveRunner){
            return useLiveRunner;
        }
    }

    private isHeadlessMode(): boolean {
        const useHeadlessMode = vscode.workspace.getConfiguration('testcafeTestRunner').get('useHeadlessMode')
        if (typeof(useHeadlessMode) === 'boolean' && useHeadlessMode){
            return useHeadlessMode;
        }
    }

    public startTestRun(browser: IBrowser, filePath:string, type:string, name:string = "") {
        if (!type) {
            vscode.window.showErrorMessage(`No tests found. Position the cursor inside a test() function or fixture.`);
            return;
        }
        let browserArg = browser.name;
        this.lastBrowser = browser;
        this.lastFile = filePath;
        this.lastType = type;
        this.lastName = name;
        if(browser.isPortable) {
            const path = getPortableBrowserPath(browser.name);
            browserArg = `path:\`${path}\``;
        }
        if(this.isHeadlessMode())
            browserArg += HEADLESS_MODE_POSTFIX;

        var args = [browserArg, filePath];

        var customArguments = vscode.workspace.getConfiguration("testcafeTestRunner").get("customArguments");
        if(typeof(customArguments) === "string") {
            const argPattern = /[^\s"]+|"([^"]*)"/g;
            do {
                const match = argPattern.exec(<string>customArguments);
                if (match !== null) { args.push(match[1] ? match[1] : match[0]); }
            } while (match !== null);
        }

        if (type !== "file") {
            args.push("--" + type);
            args.push(name);
        }

        const workspacePathOverride = this.getOverriddenWorkspacePath()
        if(this.isLiverRunner())
            args.push("--live");
        var testCafePath = path.resolve(vscode.workspace.rootPath, workspacePathOverride, TESTCAFE_PATH);
        if(!fs.existsSync(testCafePath)) {
            vscode.window.showErrorMessage(`TestCafe package is not found at path ${testCafePath}. Install the testcafe package in your working directory or set the "testcafeTestRunner.workspaceRoot" property.`);
            return;
        }
        
        var workingDirectory = path.resolve(vscode.workspace.rootPath, workspacePathOverride);
        var wsFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0] : undefined;
        vscode.debug.startDebugging(wsFolder, {
            name: "Launch current test(s) with TestCafe",
            request: "launch",
            type: "node",
            cwd: workingDirectory,
            program: testCafePath,
            args: args,
            console: "integratedTerminal",
            internalConsoleOptions: "neverOpen",
            runtimeArgs: [
                "--no-deprecation"
            ]
        });
        vscode.commands.executeCommand('setContext', 'testcaferunner.canRerun', true);
    }

    dispose() {

    }
}


interface IBrowser {
    name: string;
    isPortable?: boolean;
}
