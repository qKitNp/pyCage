const vscode = require('vscode');
const CommandBase = require('../utils/commandBase');
const { showPopularQuickPick, getProjectNameFromQuickPick } = require('../utils/packageSearch');
const { getOrCreateTerminal } = require('../managers/terminalManager');

/**
 * Registers the pip global package installer command
 * @param {vscode.ExtensionContext} context - VS Code extension context
 * @param {Array} names - Array of package names
 */
function registerPipInstaller(context, names) {
    let pipInstaller = vscode.commands.registerCommand('py-cage.addPackageGlobal',
        async function () {
            if (!CommandBase.checkPackageListAvailable(names)) {
                return;
            }

            const pick = await showPopularQuickPick(names, 'Search and select a Python package (ranked by downloads + similarity)...');
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

module.exports = {
    registerPipInstaller
};
