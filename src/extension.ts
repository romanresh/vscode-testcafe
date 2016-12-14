'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "testcafe-test-runner" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json

    let finder = new TestFinder();
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runIE', () => {
            finder.runCurrentTest("ie");
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runFirefox', () => {
            finder.runCurrentTest("firefox");
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('testcaferunner.runChrome', () => {
            finder.runCurrentTest("chrome");
        })
    );
    context.subscriptions.push(finder);
}

// this method is called when your extension is deactivated
export function deactivate() {
}

class TestFinder {
    public runCurrentTest(browser: string) {
        let editor = vscode.window.activeTextEditor;
        if(!editor)
            return;
        let doc = editor.document;
        if (doc.languageId !== "javascript")
            return;
        var test = this.findTest(editor.document, editor.selection);
        this.runTest(test, browser);
    }
    private findTest(document: vscode.TextDocument, selection: vscode.Selection): string {
        var text = document.getText(new vscode.Range(0, 0, selection.end.line, selection.end.character));
        var regex = /^[\s]*([\/]{0,2})[\s]*test\((['|"|`][^'"`]+['|"|`])/gm;
        
        var match = regex.exec(text);
        var tests: string[] = []; 

        while(match !== null) {
            if(match[1] !== "//")
                tests.push(match[2]);
            else
                tests.push("");
            match = regex.exec(text);
        }
        
        return tests[tests.length - 1];
    }
    public runTest(name: string, browser: string) {
        if(!name) {
             vscode.window.showErrorMessage(`TestCafe test is not found`);
             return;
        }
        //vscode.window.showInformationMessage(`Running test: ${name}`);
        vscode.commands.executeCommand("vscode.startDebug", {
            "type": "node",
            "request": "launch",
            "name": "Launch current test with TestCafe",
            "program": "${workspaceRoot}/node_modules/testcafe/bin/testcafe.js",
            "args": [
                browser,
                "${file}",
                "--test",
                name.substr(1, name.length - 2)
            ],
            "cwd": "${workspaceRoot}"
        });
    }

    dispose() {
        
    }
}