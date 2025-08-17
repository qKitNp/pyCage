const vscode = require('vscode');

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
    const exponentialDownloadScore = Math.pow(downloadScore, 2); // Square for more aggressive scaling
    
    // 0.8 weight for downloads, 0.2 weight for keyword similarity
    return (exponentialDownloadScore * 0.8) + (similarityScore * 0.2);
}

/**
 * Show a searchable quick pick for selecting packages
 * @param {Array} names - Array of package objects
 * @param {string} placeHolder - Placeholder text for the quick pick
 * @returns {Promise} Promise that resolves to the selected item
 */
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

/**
 * Extract the project name from a quick pick item
 * @param {Object} item - The selected quick pick item
 * @returns {string|null} The extracted package name
 */
function getProjectNameFromQuickPick(item) {
    if (!item || !item.label) return null;
    
    // Remove rank numbers (e.g., "01. python-dotenv" -> "python-dotenv")
    const match = item.label.match(/^\d+\.\s*(.+)$/);
    return match ? match[1] : item.label;
}

module.exports = {
    calculateKeywordSimilarity,
    calculateWeightedScore,
    showPopularQuickPick,
    getProjectNameFromQuickPick
};
