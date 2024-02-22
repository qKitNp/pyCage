// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const axios = require('axios');
const fs = require('fs');

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed



/**
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	// console.log('Congratulations, your extension "my-first-extension" is now active!');
	const terminal = vscode.window.createTerminal('pyCage');
	const workspaceFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0] : null;
	const venvPath = vscode.Uri.joinPath(workspaceFolder.uri, '.venv');
    const venvExists = fs.existsSync(venvPath.fsPath);

	if (!venvExists) {
        
        terminal.sendText('pip install uv');
        terminal.sendText('uv venv');
        terminal.show();
		
    }
	const res = await axios.get('https://hugovk.github.io/top-pypi-packages/top-pypi-packages-30-days.json');
	const names = res.data.rows;

	// names.forEach(pkg => {
	// 	console.log(pkg.project);
	// });


	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('py-cage.addPackage', 
	async function () {
		// The code you place here will be executed every time your command is executed
		const selectedLibrary = await vscode.window.showQuickPick(names.map(pkg => pkg.project));


		// Display a message box to the user
		vscode.window.showInformationMessage('Installing: ' + selectedLibrary);
		if (selectedLibrary) {
			const terminal2 = vscode.window.createTerminal('pyCage');
            terminal2.sendText(`uv pip install ${selectedLibrary}`);
            terminal2.show();
        }
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
