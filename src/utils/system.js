const os = require('os');

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

module.exports = {
    getOperatingSystem
};