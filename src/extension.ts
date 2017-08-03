'use strict';

import * as vscode from 'vscode';
import * as fs from 'fs';

const TEST_OR_FIXTURE_RE = /(^|;|\s+|\/\/|\/\*)fixture\s*(\(.+?\)|`.+?`)|(^|;|\s+|\/\/|\/\*)test\s*\(\s*(.+?)\s*,/gm;
const CLEANUP_TEST_OR_FIXTURE_NAME_RE = /(^\(?\s*(\'|"|`))|((\'|"|`)\s*\)?$)/g;
const BROWSER_ALIASES = ['ie', 'firefox', 'chrome', 'chromium', 'opera', 'safari', 'edge'];
const TESTCAFE_PATH = "/node_modules/testcafe/lib/cli/index.js";

var browserTools = require ('testcafe-browser-tools');
var tc = require ('testcafe');

const COMPUTED_NAME_RE = /\<computed name\>\(line: \d+\)/;

var getTestList = tc.embeddingUtils.getTestList;

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

    private isInsideToken (tokenStructure, cursorPosition){
        return cursorPosition > tokenStructure.start && cursorPosition < tokenStructure.end;
    }

    private findTestOrFixture(fileStructure, cursorPosition):string[] {
        var fixtureStructure = null;
        var testStructure = null;

        for(var i = 0; i < fileStructure.length; i++){
            fixtureStructure = fileStructure[i];
            
            if(this.isInsideToken(fixtureStructure, cursorPosition))
                return ['fixture', fixtureStructure.name];

            for(var j = 0; j < fixtureStructure.tests.length; j++){
                testStructure = fixtureStructure.tests[j];

                if(this.isInsideToken(testStructure, cursorPosition))
                    return ['test', testStructure.name];
            }
        }

        return ['', ''];
    }

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

        getTestList( document.fileName)
            .then(structure => {
                if(structure.length){
                    var cursorPosition = document.getText(new vscode.Range(0, 0, selection.active.line, selection.active.character)).length;
                    var [type, name] = this.findTestOrFixture(structure, cursorPosition);

                    if(COMPUTED_NAME_RE.test(name))
                        vscode.window.showErrorMessage(`The detected ${type} name is a computed string template. This template requires the ${type} to be compiled first. Please specify the ${type} name as a string.`);    
                    else
                        this.startTestRun(browser, document.fileName, type, name);
                }
                else
                    vscode.window.showErrorMessage(`No tests found. Position the cursor inside a test() function or fixture.`);
            });
    }

    public repeatLastRun() {
        if (!this.lastBrowser || !this.lastFile || (this.lastType !== "file" && !this.lastName)) {
            vscode.window.showErrorMessage(`Previous test is not found.`);
            return;
        }

        this.startTestRun(this.lastBrowser, this.lastFile, this.lastType, this.lastName);
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

        var args = [browser, filePath];

        var customArguments = vscode.workspace.getConfiguration("testcafeTestRunner").get("customArguments");
        if(typeof(customArguments) === "string") {
            args = args.concat((<string>customArguments).split(" "));
        }

        if (type !== "file") {
            args.push("--" + type);
            args.push(name);
        }

        var testCafePath = vscode.workspace.rootPath + TESTCAFE_PATH;
        if(!fs.existsSync(testCafePath)) {
            vscode.window.showErrorMessage(`TestCafe package is not found. Checked path: ${testCafePath}. Install the testcafe package to your working directory.`);
            return;
        }

        vscode.commands.executeCommand("vscode.startDebug", {
            "type": "node2",
            "request": "launch",
            "name": "Launch current test(s) with TestCafe",
            "program": "${workspaceRoot}" + TESTCAFE_PATH,
            "args": args,
            "cwd": "${workspaceRoot}"
        });
        vscode.commands.executeCommand('setContext', 'testcaferunner.canRerun', true);
    }

    dispose() {

    }
}