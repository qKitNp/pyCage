// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const axios = require('axios');
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * Detects the operating system and returns platform information
 * @returns {Object} OS information object
 */
function getOperatingSystem() {
	const platform = os.platform();
	return {
		platform: platform,
		isWindows: platform === 'win32',
		isMacOS: platform === 'darwin',
		isLinux: platform === 'linux',
		readable: platform === 'win32' ? 'Windows' :
			platform === 'darwin' ? 'macOS' :
				platform === 'linux' ? 'Linux' : platform
	};
}

/**
 * Checks if uv is already installed by running uv --version
 * @returns {Promise<boolean>} - Promise that resolves to true if uv is installed
 */
async function checkUvInstalled() {
	return new Promise((resolve) => {
		exec('uv --version', (error, stdout, stderr) => {
			if (error) {
				console.log('uv not found, will install it');
				resolve(false);
			} else {
				console.log(`uv is already installed: ${stdout.trim()}`);
				resolve(true);
			}
		});
	});
}

/**
 * Installs uv using the appropriate method for the OS
 * @param {Object} osInfo - Operating system information
 * @returns {Promise<boolean>} - Promise that resolves to true if installation succeeded
 */
async function installUv(osInfo) {
	return new Promise((resolve) => {
		let installCommand;

		if (osInfo.isWindows) {
			// Windows: Use PowerShell to install uv
			installCommand = 'powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"';
		} else if (osInfo.isMacOS || osInfo.isLinux) {
			// macOS/Linux: Use curl to install uv
			installCommand = 'curl -LsSf https://astral.sh/uv/install.sh | sh';
		} else {
			console.error('Unsupported operating system for uv installation');
			resolve(false);
			return;
		}

		console.log(`Executing installation command: ${installCommand}`);

		exec(installCommand, (error, stdout, stderr) => {
			if (error) {
				console.error('uv installation failed:', error);
				console.error('stderr:', stderr);
				vscode.window.showErrorMessage(`Failed to install uv: ${error.message}`);
				resolve(false);
			} else {
				console.log('uv installation completed successfully');
				console.log('stdout:', stdout);
				if (stderr) {
					console.log('stderr:', stderr);
				}
				resolve(true);
			}
		});
	});
}

/**
 * Gets or creates the pyCage terminal
 * @returns {vscode.Terminal} The pyCage terminal
 */
function getOrCreateTerminal() {
	// Find existing pyCage terminal
	const existingTerminal = vscode.window.terminals.find(t => t.name === 'pyCage');
	if (existingTerminal && existingTerminal.exitStatus === undefined) {
		return existingTerminal;
	}
	// Create new terminal if none exists or existing one is disposed
	return vscode.window.createTerminal('pyCage');
}

/**
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated

	// Detect operating system
	const osInfo = getOperatingSystem();
	console.log(`pyCage running on ${osInfo.readable} (${osInfo.platform})`);

	let terminal = getOrCreateTerminal();
	const workspaceFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0] : null;
	const venvPath = vscode.Uri.joinPath(workspaceFolder.uri, '.venv');
	const venvExists = fs.existsSync(venvPath.fsPath);

	// Check if uv is already installed
	const uvInstalled = await checkUvInstalled();

	if (!uvInstalled) {
		console.log('Installing uv...');
		vscode.window.showInformationMessage(`pyCage detected ${osInfo.readable} - installing uv...`);

		// Install uv and wait for actual completion
		const installationSuccess = await installUv(osInfo);

		if (installationSuccess) {
			console.log('uv installation completed, restarting terminal...');

			// Dispose old terminal and create new one to refresh PATH
			terminal.dispose();
			terminal = getOrCreateTerminal();

			// Verify installation worked by checking version again
			const uvNowInstalled = await checkUvInstalled();
			if (uvNowInstalled) {
				vscode.window.showInformationMessage('uv installed successfully! Ready to use.');

				if (!venvExists) {
					terminal.sendText('uv venv');
					terminal.show();
				}
			} else {
				vscode.window.showWarningMessage('uv installation completed but uv command not found. You may need to restart VS Code.');
			}
		} else {
			vscode.window.showErrorMessage('Failed to install uv. Please install manually or check your internet connection.');
			return; // Exit activation if installation failed
		}

	} else {
		console.log('uv is already installed, skipping installation');
		vscode.window.showInformationMessage(`pyCage detected ${osInfo.readable} - uv already installed`);

		if (!venvExists) {
			terminal.sendText('uv venv');
			terminal.show();
		}
	}
	const res = await axios.get('https://hugovk.github.io/top-pypi-packages/top-pypi-packages-30-days.json');
	const names = res.data.rows;

	// names.forEach(pkg => {
	// 	console.log(pkg.project);
	// });


	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let pipInstaller = vscode.commands.registerCommand('py-cage.addPackageGlobal',
		async function () {
			// The code you place here will be executed every time your command is executed
			const selectedLibrary = await vscode.window.showQuickPick(names.map(pkg => pkg.project));


			// Display a message box to the user
			vscode.window.showInformationMessage('Installing: ' + selectedLibrary);
			if (selectedLibrary) {
				const currentTerminal = getOrCreateTerminal();
				currentTerminal.sendText(`pip install ${selectedLibrary}`);
				currentTerminal.show();
			}
		},
	);

	let uvInstaller = vscode.commands.registerCommand('py-cage.addPackageLocal',
		async function () {
			// The code you place here will be executed every time your command is executed
			const selectedLibrary = await vscode.window.showQuickPick(names.map(pkg => pkg.project));


			// Display a message box to the user
			vscode.window.showInformationMessage('Installing: ' + selectedLibrary);
			if (selectedLibrary) {
				const currentTerminal = getOrCreateTerminal();
				currentTerminal.sendText(`uv pip install ${selectedLibrary}`);
				currentTerminal.show();
			}
		});

	context.subscriptions.push(pipInstaller, uvInstaller);
}

// This method is called when your extension is deactivated
function deactivate() { }

module.exports = {
	activate,
	deactivate
}
