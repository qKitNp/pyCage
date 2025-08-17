const vscode = require('vscode');
const fs = require('fs');
const CommandBase = require('../utils/commandBase');
const { getOperatingSystem } = require('../utils/system');

/**
 * Registers the debug interpreter command
 * @param {vscode.ExtensionContext} context - VS Code extension context
 */
function registerDebugCommand(context) {
    let debugCommand = vscode.commands.registerCommand('py-cage.debugInterpreter',
        async function () {
            const workspaceFolder = CommandBase.checkWorkspaceFolder('❌ No workspace folder found');
            if (!workspaceFolder) return;

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

                    const scriptsBinPath = osInfo.isWindows 
                        ? `${venvPath.fsPath}\\Scripts`
                        : `${venvPath.fsPath}/bin`;
                    
                    if (fs.existsSync(scriptsBinPath)) {
                        const contents = fs.readdirSync(scriptsBinPath);
                        const dirName = osInfo.isWindows ? 'Scripts' : 'bin';
                        debugInfo.push(`📂 ${dirName} contents: ${contents.join(', ')}`);
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
            const workspaceFolder = CommandBase.checkWorkspaceFolder('❌ No workspace folder found. Please open a folder to generate requirements.txt');
            if (!workspaceFolder) return;

            if (!(await CommandBase.checkUvAvailable())) return;

            console.log('Generating requirements.txt...');
            vscode.window.showInformationMessage('📝 Generating requirements.txt...');

            await CommandBase.executeUvCommand(
                'pip freeze > requirements.txt',
                '✅ requirements.txt generated! Check your workspace root.',
                '✓ requirements.txt generated'
            );
        });

    context.subscriptions.push(requirementsCommand);
}

/**
 * Registers the requirements.txt installer command
 * @param {vscode.ExtensionContext} context - VS Code extension context
 */
function registerInstallFromRequirementsCommand(context) {
    let installFromRequirementsCommand = vscode.commands.registerCommand('py-cage.installFromRequirements',
        async function () {
            const workspaceFolder = CommandBase.checkWorkspaceFolder('❌ No workspace folder found. Please open a folder to install from requirements.txt');
            if (!workspaceFolder) return;

            // Check if requirements.txt exists
            if (!CommandBase.fileExistsInWorkspace(workspaceFolder, 'requirements.txt')) {
                vscode.window.showWarningMessage('❌ requirements.txt not found in the workspace root. Please create one first.');
                return;
            }

            if (!(await CommandBase.checkUvAvailable())) return;

            console.log('Installing packages from requirements.txt...');
            vscode.window.showInformationMessage('📦 Installing packages from requirements.txt...');

            await CommandBase.executeUvCommand(
                'pip install -r requirements.txt',
                '✅ Installing packages from requirements.txt. Check terminal for progress.',
                '✓ All packages from requirements.txt installed successfully'
            );
        });

    context.subscriptions.push(installFromRequirementsCommand);
}

module.exports = {
    registerDebugCommand,
    registerRequirementsCommand,
    registerInstallFromRequirementsCommand
};
