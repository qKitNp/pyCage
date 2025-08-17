const vscode = require('vscode');
const CommandBase = require('../utils/commandBase');
const { showPopularQuickPick, getProjectNameFromQuickPick } = require('../utils/packageSearch');
const { getOrCreateTerminal, setupTerminalEnvironment } = require('../managers/terminalManager');
const { getUvCommand } = require('../managers/uvManager');
const { setupUvAsync } = require('../managers/packageManager');

/**
 * Registers the uv local package installer command (legacy pip-compatible)
 * @param {vscode.ExtensionContext} context - VS Code extension context
 * @param {Array} names - Array of package names
 * @param {Object} osInfo - Operating system information
 */
function registerUvInstaller(context, names, osInfo) {
    let uvInstaller = vscode.commands.registerCommand('py-cage.addPackageLocal',
        async function () {
            if (!CommandBase.checkPackageListAvailable(names)) {
                return;
            }

            const uvAvailable = await CommandBase.checkUvAvailable();
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
                    return await fallbackToPip(names);
                } else {
                    return; // Cancel
                }
            }

            const pick = await showPopularQuickPick(names, 'Search and select a Python package (ranked by downloads + similarity)...');
            if (!pick) {
                console.log('Package selection cancelled by user');
                return;
            }

            const selectedLibrary = getProjectNameFromQuickPick(pick);
            if (selectedLibrary) {
                vscode.window.showInformationMessage(`Installing ${selectedLibrary} with uv...`);
                await CommandBase.executeUvCommand(
                    `pip install ${selectedLibrary}`,
                    null,
                    null
                );
            }
        });

    context.subscriptions.push(uvInstaller);
}

/**
 * Registers the UV project initialization command
 * @param {vscode.ExtensionContext} context - VS Code extension context
 */
function registerUvInitCommand(context) {
    let uvInitCommand = vscode.commands.registerCommand('py-cage.uvInit',
        async function () {
            const workspaceFolder = CommandBase.checkWorkspaceFolder('❌ No workspace folder found. Please open a folder to initialize UV project.');
            if (!workspaceFolder) return;

            if (!(await CommandBase.checkUvAvailable())) return;

            // Check if pyproject.toml already exists
            if (CommandBase.fileExistsInWorkspace(workspaceFolder, 'pyproject.toml')) {
                const shouldContinue = await CommandBase.showConfirmation(
                    'pyproject.toml already exists. Initializing UV may overwrite it. Continue?'
                );
                if (!shouldContinue) return;
            }

            console.log('Initializing UV project...');
            vscode.window.showInformationMessage('🚀 Initializing UV project...');

            await CommandBase.executeUvCommand(
                'init',
                '✅ UV project initialization started. Check terminal for progress.',
                '✓ UV project initialized successfully'
            );
        });

    context.subscriptions.push(uvInitCommand);
}

/**
 * Registers the UV package adder command (native uv add)
 * @param {vscode.ExtensionContext} context - VS Code extension context
 * @param {Array} names - Array of package names
 */
function registerUvAddPackageCommand(context, names) {
    let uvAddPackageCommand = vscode.commands.registerCommand('py-cage.uvAddPackage',
        async function () {
            const workspaceFolder = CommandBase.checkWorkspaceFolder('❌ No workspace folder found. Please open a folder to add packages.');
            if (!workspaceFolder) return;

            if (!CommandBase.checkPackageListAvailable(names)) return;
            if (!(await CommandBase.checkUvAvailable())) return;

            // Check if pyproject.toml exists (UV project)
            if (!CommandBase.fileExistsInWorkspace(workspaceFolder, 'pyproject.toml')) {
                const choice = await vscode.window.showWarningMessage(
                    'No pyproject.toml found. This appears to not be a UV project. Would you like to initialize it first?',
                    'Initialize UV Project',
                    'Continue Anyway',
                    'Cancel'
                );
                
                if (choice === 'Initialize UV Project') {
                    vscode.commands.executeCommand('py-cage.uvInit');
                    return;
                } else if (choice === 'Cancel') {
                    return;
                }
            }

            const pick = await showPopularQuickPick(names, 'Search and select a Python package to add with uv add...');
            if (!pick) {
                console.log('Package selection cancelled by user');
                return;
            }
            
            const selectedLibrary = getProjectNameFromQuickPick(pick);
            if (!selectedLibrary) return;

            const dependencyType = await CommandBase.showDependencyTypeSelection();
            if (!dependencyType) return; // User cancelled

            vscode.window.showInformationMessage(`Adding ${selectedLibrary} with uv add...`);
            
            const devFlag = dependencyType.value;
            const command = `add ${devFlag} ${selectedLibrary}`.trim();
            
            await CommandBase.executeUvCommand(
                command,
                null,
                `✓ ${selectedLibrary} added successfully`
            );
        });

    context.subscriptions.push(uvAddPackageCommand);
}

/**
 * Fallback to pip installation when UV is not available
 */
async function fallbackToPip(names) {
    const pick = await showPopularQuickPick(names, 'Search and select a Python package (ranked by downloads + similarity)...');
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
}

module.exports = {
    registerUvInstaller,
    registerUvInitCommand,
    registerUvAddPackageCommand
};
