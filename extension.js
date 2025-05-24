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

// Global state to track venv creation
let venvCreationInProgress = false;

/**
 * Creates virtual environment if needed, with duplicate prevention
 * @param {vscode.Terminal} terminal - Terminal to use for venv creation
 * @param {boolean} venvExists - Whether .venv already exists
 */
async function createVenvIfNeeded(terminal, venvExists) {
	if (venvExists) {
		console.log('.venv already exists, skipping creation');
		return;
	}

	if (venvCreationInProgress) {
		console.log('venv creation already in progress, skipping duplicate call');
		return;
	}

	try {
		venvCreationInProgress = true;
		console.log('Creating virtual environment...');

		// Double-check that .venv doesn't exist (race condition protection)
		const workspaceFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0] : null;
		if (workspaceFolder) {
			const venvPath = vscode.Uri.joinPath(workspaceFolder.uri, '.venv');
			if (fs.existsSync(venvPath.fsPath)) {
				console.log('.venv was created by another process, skipping');
				return;
			}
		}

		terminal.sendText('uv venv');
		terminal.show();

		// Wait a moment for command to execute before allowing another call
		await new Promise(resolve => setTimeout(resolve, 2000));

		console.log('Virtual environment creation completed');

	} catch (error) {
		console.error('Error creating venv:', error);
		// Try with a fresh terminal if the current one has issues
		try {
			const freshTerminal = getOrCreateTerminal();
			freshTerminal.sendText('uv venv');
			freshTerminal.show();
		} catch (fallbackError) {
			console.error('Failed to create venv with fallback terminal:', fallbackError);
		}
	} finally {
		venvCreationInProgress = false;
	}
}

/**
 * Sets up uv installation asynchronously without blocking command registration
 * @param {Object} osInfo - Operating system information
 * @returns {Promise<boolean>} - Promise that resolves to true if setup succeeded
 */
async function setupUvAsync(osInfo) {
	try {
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

				// Safely dispose old terminal and create new one to refresh PATH
				try {
					if (terminal && terminal.exitStatus === undefined) {
						terminal.dispose();
					}
				} catch (disposeError) {
					console.log('Terminal already disposed or invalid:', disposeError.message);
				}

				// Wait a moment for disposal to complete, then create new terminal
				await new Promise(resolve => setTimeout(resolve, 500));
				terminal = getOrCreateTerminal();

				// Verify installation worked by checking version again
				const uvNowInstalled = await checkUvInstalled();
				if (uvNowInstalled) {
					vscode.window.showInformationMessage('uv installed successfully! Ready to use.');

					await createVenvIfNeeded(terminal, venvExists);
					return true;
				} else {
					vscode.window.showWarningMessage('uv installation completed but uv command not found. You may need to restart VS Code.');
					return false;
				}
			} else {
				vscode.window.showErrorMessage('Failed to install uv. Please install manually or check your internet connection.');
				return false;
			}

		} else {
			console.log('uv is already installed, skipping installation');
			vscode.window.showInformationMessage(`pyCage detected ${osInfo.readable} - uv already installed`);

			await createVenvIfNeeded(terminal, venvExists);
			return true;
		}
	} catch (error) {
		console.error('Error during uv setup:', error);
		vscode.window.showErrorMessage(`Error setting up uv: ${error.message}`);
		return false;
	}
}

/**
 * Gets or creates the pyCage terminal
 * @returns {vscode.Terminal} The pyCage terminal
 */
function getOrCreateTerminal() {
	try {
		// Find existing pyCage terminal
		const existingTerminal = vscode.window.terminals.find(t => t.name === 'pyCage');
		if (existingTerminal && existingTerminal.exitStatus === undefined) {
			// Double-check that the terminal is actually usable
			try {
				// Test if terminal is still valid by checking its state
				if (existingTerminal.state) {
					return existingTerminal;
				}
			} catch (testError) {
				console.log('Existing terminal is not usable, creating new one:', testError.message);
			}
		}

		// Create new terminal if none exists or existing one is disposed
		console.log('Creating new pyCage terminal');
		return vscode.window.createTerminal('pyCage');
	} catch (error) {
		console.error('Error in getOrCreateTerminal:', error);
		// Fallback: try to create a terminal with a unique name
		return vscode.window.createTerminal(`pyCage-${Date.now()}`);
	}
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

	// Download package list first (this should always work)
	let res, names;
	try {
		res = await axios.get('https://hugovk.github.io/top-pypi-packages/top-pypi-packages-30-days.json');
		names = res.data.rows;
		console.log(`Loaded ${names.length} popular Python packages`);
	} catch (error) {
		console.error('Failed to load package list:', error);
		vscode.window.showErrorMessage('Failed to load Python package list. Please check your internet connection.');
		names = []; // Empty array as fallback
	}

	// Setup uv installation (but don't block command registration)
	let uvSetupComplete = false;
	setupUvAsync(osInfo).then((success) => {
		uvSetupComplete = success;
		if (success) {
			console.log('uv setup completed successfully');
		} else {
			console.log('uv setup failed, but extension commands are still available');
		}
	});

	// Register commands immediately (regardless of uv status)
	// This ensures commands are always available even if uv installation fails

	// names.forEach(pkg => {
	// 	console.log(pkg.project);
	// });


	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let pipInstaller = vscode.commands.registerCommand('py-cage.addPackageGlobal',
		async function () {
			// Check if we have package names available
			if (!names || names.length === 0) {
				vscode.window.showErrorMessage('Package list not available. Please check your internet connection and try again.');
				return;
			}

			// The code you place here will be executed every time your command is executed
			const selectedLibrary = await vscode.window.showQuickPick(
				names.map(pkg => pkg.project),
				{
					placeHolder: 'Search and select a Python package to install globally with pip...',
					matchOnDescription: true,
					matchOnDetail: true,
					ignoreFocusOut: false
				}
			);

			// Check if user selected a package or cancelled
			if (selectedLibrary) {
				// Display a message box to the user
				vscode.window.showInformationMessage('Installing: ' + selectedLibrary);
				const currentTerminal = getOrCreateTerminal();
				currentTerminal.sendText(`pip install ${selectedLibrary}`);
				currentTerminal.show();
			} else {
				console.log('Package selection cancelled by user');
			}
		},
	);

	let uvInstaller = vscode.commands.registerCommand('py-cage.addPackageLocal',
		async function () {
			// Check if we have package names available
			if (!names || names.length === 0) {
				vscode.window.showErrorMessage('Package list not available. Please check your internet connection and try again.');
				return;
			}

			// Check if uv is available
			const uvAvailable = await checkUvInstalled();
			if (!uvAvailable) {
				const choice = await vscode.window.showWarningMessage(
					'uv is not installed. Would you like to install it first?',
					'Install uv',
					'Use pip instead',
					'Cancel'
				);

				if (choice === 'Install uv') {
					vscode.window.showInformationMessage('Installing uv... Please wait and try again after installation completes.');
					await setupUvAsync(osInfo);
					return;
				} else if (choice === 'Use pip instead') {
					// Fall back to pip installation
					const selectedLibrary = await vscode.window.showQuickPick(
						names.map(pkg => pkg.project),
						{
							placeHolder: 'Search and select a Python package to install with pip (fallback)...',
							matchOnDescription: true,
							matchOnDetail: true,
							ignoreFocusOut: false
						}
					);
					if (selectedLibrary) {
						vscode.window.showInformationMessage('Installing with pip: ' + selectedLibrary);
						const currentTerminal = getOrCreateTerminal();
						currentTerminal.sendText(`pip install ${selectedLibrary}`);
						currentTerminal.show();
					} else {
						console.log('Package selection cancelled by user (pip fallback)');
					}
					return;
				} else {
					return; // Cancel
				}
			}

			// The code you place here will be executed every time your command is executed
			const selectedLibrary = await vscode.window.showQuickPick(
				names.map(pkg => pkg.project),
				{
					placeHolder: 'Search and select a Python package to install in virtual environment with uv...',
					matchOnDescription: true,
					matchOnDetail: true,
					ignoreFocusOut: false
				}
			);

			// Check if user selected a package or cancelled
			if (selectedLibrary) {
				// Display a message box to the user
				vscode.window.showInformationMessage('Installing: ' + selectedLibrary);
				const currentTerminal = getOrCreateTerminal();
				currentTerminal.sendText(`uv pip install ${selectedLibrary}`);
				currentTerminal.show();
			} else {
				console.log('Package selection cancelled by user');
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
