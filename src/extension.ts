'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

const TEST_OR_FIXTURE_RE = /(^|;|\s+|\/\/|\/\*)fixture\s*(\(.+?\)|`.+?`)|(^|;|\s+|\/\/|\/\*)test\s*(?:\.[a-zA-Z]+\([^\)]*\))*\s*\(\s*(.+?)\s*('|"|`)\s*,/gm;
const CLEANUP_TEST_OR_FIXTURE_NAME_RE = /(^\(?\s*(\'|"|`))|((\'|"|`)\s*\)?$)/g;
const BROWSER_ALIASES = ['ie', 'firefox', 'chrome', 'chrome-canary', 'chromium', 'opera', 'safari', 'edge'];
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
            controller.startTestRun("ie", args.fsPath, "file");
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestFileInFirefox', args => {
            controller.startTestRun("firefox", args.fsPath, "file");
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestFileInChrome', args => {
            controller.startTestRun("chrome", args.fsPath, "file");
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestFileInChromeCanary', args => {
            controller.startTestRun("chrome-canary", args.fsPath, "file");
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestFileInChromium', args => {
            controller.startTestRun("chromium", args.fsPath, "file");
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestFileInOpera', args => {
            controller.startTestRun("opera", args.fsPath, "file");
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestFileInSafari', args => {
            controller.startTestRun("safari", args.fsPath, "file");
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runTestFileInEdge', args => {
            controller.startTestRun("edge", args.fsPath, "file");
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
        });
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
    lastBrowser:string;
    lastFile:string;
    lastType:string;
    lastName:string;

    public runTests(browser:string) {
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

        this.startTestRun(browser, document.fileName, type, name);
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

    public startTestRun(browser:string, filePath:string, type:string, name:string = "") {
        if (!type) {
            vscode.window.showErrorMessage(`No tests found. Position the cursor inside a test() function or fixture.`);
            return;
        }

        this.lastBrowser = browser;
        this.lastFile = filePath;
        this.lastType = type;
        this.lastName = name;
        if(this.isHeadlessMode())
            browser += HEADLESS_MODE_POSTFIX;

        var args = [browser, filePath];

        var customArguments = vscode.workspace.getConfiguration("testcafeTestRunner").get("customArguments");
        if(typeof(customArguments) === "string") {
            args = args.concat((<string>customArguments).split(" "));
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
