// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const axios = require('axios');

// Import our modular functions
const { getOperatingSystem } = require('./src/utils/system');
const { setupUvAsync } = require('./src/managers/packageManager');
const { registerAllCommands } = require('./src/commands/index');

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {
	// Detect operating system
	const osInfo = getOperatingSystem();
	console.log(`pyCage activated on ${osInfo.readable}`);

	// Fetch package list from the top PyPI packages JSON (old way)
	let names = [];
	try {
		console.log('Fetching top Python packages list...');
		const res = await axios.get('https://hugovk.github.io/top-pypi-packages/top-pypi-packages-30-days.json');
		names = res.data.rows;
		console.log(`✓ Loaded ${names.length} popular Python packages`);
	} catch (error) {
		console.error('Failed to fetch package list:', error.message);
		vscode.window.showWarningMessage('Failed to load Python packages list. Some features may be limited.');
		names = []; // Empty array as fallback
	}

	// Register all commands immediately (regardless of uv status)
	// This ensures commands are always available even if uv installation fails
	registerAllCommands(context, names, osInfo);

	// Setup uv asynchronously (non-blocking)
	setupUvAsync(osInfo).then(success => {
		if (success) {
			console.log('✓ pyCage setup completed successfully');
		} else {
			console.log('⚠️ pyCage setup completed with warnings');
		}
	}).catch(error => {
		console.error('❌ pyCage setup failed:', error);
	});

	console.log('✓ pyCage extension activated successfully');
}

// This method is called when your extension is deactivated
function deactivate() { }

module.exports = {
	activate,
	deactivate
}
