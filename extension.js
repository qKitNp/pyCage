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

		// Activate the existing virtual environment in terminal
		const workspaceFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0] : null;
		if (workspaceFolder) {
			console.log('Activating existing virtual environment in terminal...');
			const osInfo = getOperatingSystem();
			let activationCommand;

			if (osInfo.isWindows) {
				activationCommand = '.venv\\Scripts\\activate';
			} else {
				// Linux or macOS
				activationCommand = 'source .venv/bin/activate';
			}

			console.log(`Executing activation command: ${activationCommand}`);
			terminal.sendText(`${activationCommand} && echo "✓ Virtual environment activated"`);
			console.log('✓ Existing virtual environment activated in terminal');

			vscode.window.showInformationMessage('🐍 Virtual environment activated!');
		}
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
		if (!workspaceFolder) {
			console.log('❌ No workspace folder found, cannot create virtual environment');
			vscode.window.showErrorMessage('❌ No workspace folder found. Please open a folder to create a virtual environment.');
			return;
		}

		const venvPath = vscode.Uri.joinPath(workspaceFolder.uri, '.venv');
		if (fs.existsSync(venvPath.fsPath)) {
			console.log('.venv was created by another process, skipping');
			return;
		}

		terminal.sendText('uv venv');
		terminal.show();

		// Wait for virtual environment to be created and Python executable to be available
		console.log('Waiting for virtual environment creation...');

		let venvCreated = false;
		let pythonExists = false;
		const maxAttempts = 15; // 15 seconds total wait time

		for (let attempt = 0; attempt < maxAttempts; attempt++) {
			await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

			if (workspaceFolder) {
				const venvPath = vscode.Uri.joinPath(workspaceFolder.uri, '.venv');
				venvCreated = fs.existsSync(venvPath.fsPath);

				if (venvCreated) {
					// Check if Python executable exists
					const osInfo = getOperatingSystem();
					const pythonPath = osInfo.isWindows
						? `${venvPath.fsPath}\\Scripts\\python.exe`
						: `${venvPath.fsPath}/bin/python`;
					pythonExists = fs.existsSync(pythonPath);

					if (pythonExists) {
						console.log(`✓ Virtual environment ready after ${attempt + 1} seconds`);
						break;
					} else {
						console.log(`Virtual environment directory exists but Python executable not ready yet (attempt ${attempt + 1}/${maxAttempts})`);
					}
				} else {
					console.log(`Waiting for .venv directory to be created (attempt ${attempt + 1}/${maxAttempts})`);
				}
			}
		}

		if (venvCreated && pythonExists) {
			console.log('✓ Virtual environment creation completed successfully');

			// Activate the virtual environment in the terminal
			if (workspaceFolder) {
				console.log('Activating virtual environment in terminal...');
				const osInfo = getOperatingSystem();
				let activationCommand;

				if (osInfo.isWindows) {
					activationCommand = '.venv\\Scripts\\activate';
				} else {
					// Linux or macOS
					activationCommand = 'source .venv/bin/activate';
				}

				console.log(`Executing activation command: ${activationCommand}`);
				terminal.sendText(`${activationCommand} && echo "✓ Virtual environment activated"`);
				console.log('✓ Virtual environment activated in terminal');

				vscode.window.showInformationMessage('🐍 Virtual environment created and activated!');
			}
		} else if (venvCreated && !pythonExists) {
			console.log('⚠️ Virtual environment directory created but Python executable not found');
			vscode.window.showWarningMessage('⚠️ Virtual environment created but Python executable not found. Please check if uv venv completed successfully.');
		} else {
			console.log('❌ Virtual environment creation may have failed - directory not found after waiting');
			vscode.window.showErrorMessage('❌ Virtual environment creation failed. Please check the terminal for errors.');
		}

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
				// Install package using terminal
				vscode.window.showInformationMessage(`Installing ${selectedLibrary} with pip...`);
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
						// Install package using terminal with pip fallback
						vscode.window.showInformationMessage(`Installing ${selectedLibrary} with pip (fallback)...`);
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
				// Install package using terminal with uv
				vscode.window.showInformationMessage(`Installing ${selectedLibrary} with uv...`);
				const currentTerminal = getOrCreateTerminal();
				currentTerminal.sendText(`uv pip install ${selectedLibrary}`);
				currentTerminal.show();
			} else {
				console.log('Package selection cancelled by user');
			}
		});

	// Debug command to check Python interpreter status
	let debugCommand = vscode.commands.registerCommand('py-cage.debugInterpreter',
		async function () {
			const workspaceFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0] : null;
			if (!workspaceFolder) {
				vscode.window.showInformationMessage('❌ No workspace folder found');
				return;
			}

			const venvPath = vscode.Uri.joinPath(workspaceFolder.uri, '.venv');
			const osInfo = getOperatingSystem();
			const pythonPath = osInfo.isWindows
				? `${venvPath.fsPath}\\Scripts\\python.exe`
				: `${venvPath.fsPath}/bin/python`;

			// Current configuration
			const config = vscode.workspace.getConfiguration('python');
			const currentInterpreter = config.get('defaultInterpreterPath');
			const currentPythonPath = config.get('pythonPath');

			const debugInfo = [
				`📁 Workspace: ${workspaceFolder.uri.fsPath}`,
				`🐍 OS: ${osInfo.readable} (${osInfo.platform})`,
				`📂 .venv exists: ${fs.existsSync(venvPath.fsPath)}`,
				`🐍 Python executable exists: ${fs.existsSync(pythonPath)}`,
				`📍 Expected Python path: ${pythonPath}`,
				`⚙️ Current defaultInterpreterPath: ${currentInterpreter || 'not set'}`,
				`⚙️ Current pythonPath: ${currentPythonPath || 'not set'}`,
			];

			if (fs.existsSync(venvPath.fsPath)) {
				try {
					const venvContents = fs.readdirSync(venvPath.fsPath);
					debugInfo.push(`📂 .venv contents: ${venvContents.join(', ')}`);

					if (osInfo.isWindows) {
						const scriptsPath = `${venvPath.fsPath}\\Scripts`;
						if (fs.existsSync(scriptsPath)) {
							const scriptsContents = fs.readdirSync(scriptsPath);
							debugInfo.push(`📂 Scripts contents: ${scriptsContents.join(', ')}`);
						}
					} else {
						const binPath = `${venvPath.fsPath}/bin`;
						if (fs.existsSync(binPath)) {
							const binContents = fs.readdirSync(binPath);
							debugInfo.push(`📂 bin contents: ${binContents.join(', ')}`);
						}
					}
				} catch (error) {
					debugInfo.push(`❌ Error reading .venv contents: ${error.message}`);
				}
			}

			console.log('=== PYTHON INTERPRETER DEBUG INFO ===');
			debugInfo.forEach(info => console.log(info));

			// Show status if .venv exists
			if (fs.existsSync(venvPath.fsPath) && fs.existsSync(pythonPath)) {
				debugInfo.push('✅ Virtual environment is ready to use');
			}

			vscode.window.showInformationMessage('Debug info logged to console. Check VS Code Developer Tools → Console tab.');
		});

	// Requirements.txt generator command
	let requirementsCommand = vscode.commands.registerCommand('py-cage.makeRequirements',
		async function () {
			const workspaceFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0] : null;
			if (!workspaceFolder) {
				vscode.window.showErrorMessage('❌ No workspace folder found. Please open a folder to generate requirements.txt');
				return;
			}

			// Check if uv is available
			const uvAvailable = await checkUvInstalled();
			if (!uvAvailable) {
				vscode.window.showErrorMessage('❌ uv is not installed. Please install uv first using the other pyCage commands.');
				return;
			}

			try {
				console.log('Generating requirements.txt...');
				vscode.window.showInformationMessage('📝 Generating requirements.txt...');

				const terminal = getOrCreateTerminal();
				terminal.sendText('uv pip freeze > requirements.txt && echo "✓ requirements.txt generated"');
				terminal.show();

				console.log('✓ requirements.txt generation command sent to terminal');
				vscode.window.showInformationMessage('✅ requirements.txt generated! Check your workspace root.');

			} catch (error) {
				console.error('❌ Error generating requirements.txt:', error);
				vscode.window.showErrorMessage(`❌ Failed to generate requirements.txt: ${error.message}`);
			}
		});

	context.subscriptions.push(pipInstaller, uvInstaller, debugCommand, requirementsCommand);
}

// This method is called when your extension is deactivated
function deactivate() { }

module.exports = {
	activate,
	deactivate
}
