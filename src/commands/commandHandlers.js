const vscode = require('vscode');
const fs = require('fs');
const { getOperatingSystem } = require('../utils/system');
const { checkUvInstalled, getUvCommand } = require('../managers/uvManager');
const { getOrCreateTerminal, setupTerminalEnvironment } = require('../managers/terminalManager');
const { setupUvAsync } = require('../managers/packageManager');

/**
 * Calculate keyword similarity score between search term and package name
 * @param {string} searchTerm - The search query
 * @param {string} packageName - The package name to compare
 * @returns {number} Similarity score between 0 and 1
 */
function calculateKeywordSimilarity(searchTerm, packageName) {
    if (!searchTerm || !packageName) return 0;
    
    const search = searchTerm.toLowerCase();
    const name = packageName.toLowerCase();
    
    // Exact match gets highest score
    if (search === name) return 1.0;
    
    // Starts with search term gets good score
    if (name.startsWith(search)) return 0.6;
    
    // Contains search term as whole word gets medium score
    if (name.includes(search)) {
        // Check if it's a word boundary match (more relevant)
        const words = name.split(/[-_]/);
        if (words.includes(search)) {
            return 0.4; // Word boundary match
        }
        return 0.2; // Just contains the term
    }
    
    // For very partial matches, give minimal score
    let matches = 0;
    let searchIndex = 0;
    
    for (let i = 0; i < name.length && searchIndex < search.length; i++) {
        if (name[i] === search[searchIndex]) {
            matches++;
            searchIndex++;
        }
    }
    
    return searchIndex === search.length ? (matches / name.length) * 0.1 : 0;
}

/**
 * Calculate weighted score combining download count and keyword similarity
 * @param {Object} pkg - Package object with download_count and project name
 * @param {string} searchTerm - The search query
 * @param {number} maxDownloads - Maximum download count for normalization
 * @returns {number} Weighted score
 */
function calculateWeightedScore(pkg, searchTerm, maxDownloads) {
    const downloadScore = maxDownloads > 0 ? (pkg.download_count || 0) / maxDownloads : 0;
    const similarityScore = calculateKeywordSimilarity(searchTerm, pkg.project);
    
    // Apply exponential scaling to download score to give more weight to popular packages
    const exponentialDownloadScore = Math.pow(downloadScore, 0.5); // Square root for less aggressive scaling
    
    // 0.8 weight for downloads, 0.2 weight for keyword similarity
    return (exponentialDownloadScore * 0.8) + (similarityScore * 0.2);
}

async function showPopularQuickPick(names, placeHolder) {
    return new Promise(resolve => {
        const qp = vscode.window.createQuickPick();
        qp.placeholder = placeHolder;
        qp.matchOnDescription = false; // Disable VS Code's built-in description matching
        qp.matchOnDetail = false; // Disable VS Code's built-in detail matching
        qp.canSelectMany = false;
        qp.ignoreFocusOut = false;

        const updateItems = (value) => {
            const filter = (value || '').toLowerCase();
            const matches = names.filter(pkg =>
                pkg.project && pkg.project.toLowerCase().includes(filter)
            );
            
            // If no search term, just sort by downloads
            if (!filter) {
                matches.sort((a, b) => (b.download_count || 0) - (a.download_count || 0));
            } else {
                // Sort by downloads first to get top matches, then use top 20 for normalization
                matches.sort((a, b) => (b.download_count || 0) - (a.download_count || 0));
                const topMatches = matches.slice(0, 20);
                const maxMatchDownloads = Math.max(...topMatches.map(pkg => pkg.download_count || 0));
                
                // Calculate weighted scores
                matches.forEach(pkg => {
                    pkg._weightedScore = calculateWeightedScore(pkg, filter, maxMatchDownloads);
                });
                
                // Sort by weighted scores (highest first)
                matches.sort((a, b) => {
                    const scoreA = a._weightedScore || 0;
                    const scoreB = b._weightedScore || 0;
                    return scoreB - scoreA;
                });
            }
            
            const items = matches.slice(0, 200).map((pkg, index) => ({
                label: `${String(index + 1).padStart(2, '0')}. ${pkg.project}`,
                description: pkg.download_count ? `Downloads: ${pkg.download_count.toLocaleString()}` : undefined
            }));
            
            qp.items = items;
        };

        // Don't call updateItems initially - let user start typing first
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
    if (!item || !item.label) return null;
    
    // Remove rank numbers (e.g., "01. python-dotenv" -> "python-dotenv")
    const match = item.label.match(/^\d+\.\s*(.+)$/);
    return match ? match[1] : item.label;
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
                    return;
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