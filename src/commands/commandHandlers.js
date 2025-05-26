const vscode = require('vscode');
const fs = require('fs');
const { getOperatingSystem } = require('../utils/system');
const { checkUvInstalled, getUvCommand } = require('../managers/uvManager');
const { getOrCreateTerminal, setupTerminalEnvironment } = require('../managers/terminalManager');
const { setupUvAsync } = require('../managers/packageManager');

async function showPopularQuickPick(names, placeHolder) {
    return new Promise(resolve => {
        const qp = vscode.window.createQuickPick();
        qp.placeholder = placeHolder;
        qp.matchOnDescription = true;
        qp.matchOnDetail = true;

        const updateItems = (value) => {
            const filter = (value || '').toLowerCase();
            const matches = names.filter(pkg =>
                pkg.project && pkg.project.toLowerCase().includes(filter)
            );
            matches.sort((a, b) => (b.download_count || 0) - (a.download_count || 0));
            qp.items = matches.slice(0, 200).map(pkg => ({
                label: pkg.project,
                description: pkg.download_count ? `Downloads: ${pkg.download_count.toLocaleString()}` : undefined
            }));
        };

        updateItems('');
        qp.onDidChangeValue(updateItems);
        qp.onDidAccept(() => {
            const sel = qp.selectedItems[0];
            qp.hide();
            resolve(sel);
        });
        qp.onDidHide(() => {
            resolve(undefined);
        });
        qp.show();
    });
}

function getProjectNameFromQuickPick(item) {
    return item && item.label;
}

/**
 * Registers the pip global package installer command
 * @param {vscode.ExtensionContext} context - VS Code extension context
 * @param {Array} names - Array of package names
 */
function registerPipInstaller(context, names) {
    let pipInstaller = vscode.commands.registerCommand('py-cage.addPackageGlobal',
        async function () {
            if (!names || names.length === 0) {
                vscode.window.showErrorMessage('Package list not available. Please check your internet connection and try again.');
                return;
            }
            const pick = await showPopularQuickPick(names, 'Search and select a Python package (sorted by popularity)...');
            if (!pick) {
                console.log('Package selection cancelled by user');
                return;
            }
            const selectedLibrary = getProjectNameFromQuickPick(pick);
            if (selectedLibrary) {
                vscode.window.showInformationMessage(`Installing ${selectedLibrary} with pip...`);
                const currentTerminal = getOrCreateTerminal();
                currentTerminal.sendText(`pip install ${selectedLibrary}`);
                currentTerminal.show();
            }
        }
    );

    context.subscriptions.push(pipInstaller);
}

/**
 * Registers the uv local package installer command
 * @param {vscode.ExtensionContext} context - VS Code extension context
 * @param {Array} names - Array of package names
 * @param {Object} osInfo - Operating system information
 */
function registerUvInstaller(context, names, osInfo) {
    let uvInstaller = vscode.commands.registerCommand('py-cage.addPackageLocal',
        async function () {
            if (!names || names.length === 0) {
                vscode.window.showErrorMessage('Package list not available. Please check your internet connection and try again.');
                return;
            }
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
                    const pick = await showPopularQuickPick(names, 'Search and select a Python package (sorted by popularity)...');
                    if (!pick) {
                        console.log('Package selection cancelled by user (pip fallback)');
                        return;
                    }
                    const selectedLibrary = getProjectNameFromQuickPick(pick);
                    if (selectedLibrary) {
                        vscode.window.showInformationMessage(`Installing ${selectedLibrary} with pip (fallback)...`);
                        const currentTerminal = getOrCreateTerminal();
                        currentTerminal.sendText(`pip install ${selectedLibrary}`);
                        currentTerminal.show();
                    }
                    return;
                } else {
                    return; // Cancel
                }
            }
            const pick = await showPopularQuickPick(names, 'Search and select a Python package (sorted by popularity)...');
            if (!pick) {
                console.log('Package selection cancelled by user');
                return;
            }
            const selectedLibrary = getProjectNameFromQuickPick(pick);
            if (selectedLibrary) {
                vscode.window.showInformationMessage(`Installing ${selectedLibrary} with uv...`);
                const currentTerminal = getOrCreateTerminal();
                const uvCommand = await getUvCommand();
                setupTerminalEnvironment(currentTerminal, uvCommand);
                currentTerminal.sendText(`${uvCommand} pip install ${selectedLibrary}`);
                currentTerminal.show();
            }
        });

    context.subscriptions.push(uvInstaller);
}

/**
 * Registers the debug interpreter command
 * @param {vscode.ExtensionContext} context - VS Code extension context
 */
function registerDebugCommand(context) {
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

    context.subscriptions.push(debugCommand);
}

/**
 * Registers the requirements.txt generator command
 * @param {vscode.ExtensionContext} context - VS Code extension context
 */
function registerRequirementsCommand(context) {
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
                const uvCommand = await getUvCommand();
                setupTerminalEnvironment(terminal, uvCommand);
                terminal.sendText(`${uvCommand} pip freeze > requirements.txt && echo "✓ requirements.txt generated"`);
                terminal.show();

                console.log('✓ requirements.txt generation command sent to terminal');
                vscode.window.showInformationMessage('✅ requirements.txt generated! Check your workspace root.');

            } catch (error) {
                console.error('❌ Error generating requirements.txt:', error);
                vscode.window.showErrorMessage(`❌ Failed to generate requirements.txt: ${error.message}`);
            }
        });

    context.subscriptions.push(requirementsCommand);
}

module.exports = {
    registerPipInstaller,
    registerUvInstaller,
    registerDebugCommand,
    registerRequirementsCommand
};