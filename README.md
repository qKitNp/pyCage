# 🐍 pyCage

The fastest Python package manager extension for Visual Studio Code, powered by [uv](https://astral.sh/uv) by Astral.

[![Version](https://img.shields.io/badge/version-0.1.1-blue)](https://github.com/qKitNp/pyCage)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

## ✨ Features

### 🚀 **Lightning Fast Package Installation**
- Powered by [uv](https://astral.sh/uv) - the blazingly fast Python package installer and resolver
- Up to 10x faster than traditional pip installations
- Automatic fallback to pip if uv is not available

### 🎯 **Smart Package Management**
- Access to 8,000+ most popular Python packages from PyPI
- Intelligent search with fuzzy matching
- Support for both virtual environment and global installations

### 🔧 **Automatic Environment Setup**
- Automatic virtual environment creation using uv
- Smart detection of existing virtual environments
- Cross-platform support (Windows, macOS, Linux)
- Automatic uv installation if not present

### 🎨 **Developer-Friendly Interface**
- Integrated command palette commands
- Visual feedback and status notifications
- Debug tools for Python interpreter setup
- Terminal integration for package management

## 📦 Available Commands

Access these commands through the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

| Command | Description |
|---------|-------------|
| `pyCage: Add Python Packages to venv (recommended)` | Install packages to virtual environment using uv |
| `pyCage: Add Python Packages to global environment (legacy)` | Install packages globally using pip |
| `pyCage: Debug Python Interpreter Setup` | Debug and troubleshoot Python environment setup |
| `pyCage: Make a requirements.txt` | Generate requirements.txt from current environment |

## 🚀 Quick Start

1. **Open a Python project** in VS Code
2. **Open Command Palette** (`Ctrl+Shift+P` / `Cmd+Shift+P`)
3. **Run** `pyCage: Add Python Packages to venv (recommended)`
4. **Search and select** packages from the list
5. **Let pyCage handle the rest!** 🎉

### First Time Setup

pyCage will automatically:
- Install uv if not already present
- Create a virtual environment (`.venv`) in your project
- Configure the Python interpreter for VS Code

## 🛠️ Requirements

### System Requirements
- **Visual Studio Code** 1.86.0 or higher
- **Python** 3.7+ installed and accessible
- **Internet connection** for package downloads

### Automatic Dependencies
pyCage automatically handles these dependencies:
- **uv** - Installed automatically if not present
- **pip** - Used as fallback when uv is unavailable

### Supported Platforms
- ✅ **Windows** (10/11)
- ✅ **macOS** (Intel & Apple Silicon)
- ✅ **Linux** (Ubuntu, Debian, CentOS, etc.)

## 📖 How It Works

### Package Installation Process

1. **Package Selection**: Choose from 8,000+ popular PyPI packages
2. **Environment Detection**: Automatically detects or creates virtual environment
3. **Fast Installation**: Uses uv for lightning-fast package resolution and installation
4. **VS Code Integration**: Configures Python interpreter automatically

### Virtual Environment Management

- **Automatic Creation**: Creates `.venv` folder in your workspace
- **Smart Detection**: Recognizes existing virtual environments
- **Cross-Platform**: Works consistently across Windows, macOS, and Linux
- **Terminal Integration**: Activates environment in VS Code terminal

## 🎯 Why pyCage?

### Traditional pip vs pyCage (uv)
- **Speed**: Up to 10x faster package installation
- **Reliability**: Better dependency resolution
- **Simplicity**: One-click package management
- **Integration**: Seamless VS Code experience

### Beginner-Friendly Design
- **No Command Line Required**: GUI-based package selection
- **Automatic Setup**: Handles virtual environments automatically
- **Visual Feedback**: Clear notifications and status updates
- **Fallback Support**: Works even without uv installed

## 🔧 Configuration

### Environment Variables
- **Python Path**: Ensure Python is in your system PATH
- **uv Installation**: Automatically handled by the extension

### VS Code Settings
The extension automatically configures:
- `python.defaultInterpreterPath`
- Virtual environment detection
- Terminal environment variables

## 📊 Package Database

- **Source**: [Hugo's Top PyPI Packages](https://hugovk.github.io)
- **Coverage**: 8,000+ most popular packages
- **Update Frequency**: Based on 30-day PyPI download statistics
- **Search**: Fuzzy matching for easy package discovery

## 🐛 Known Issues & Limitations

### Package Limitations
- **Package Count**: Limited to 8,000 most popular packages for optimal UX
- **Custom Packages**: Private/enterprise packages not supported
- **Version Selection**: Uses latest stable version by default

### System Requirements
- **Permissions**: Requires write permissions for virtual environment creation
- **Internet**: Requires internet connection for package downloads
- **Disk Space**: Virtual environments require additional disk space

### Workarounds
- For packages not in the list, use the integrated terminal with uv/pip commands
- For version-specific installations, use terminal commands directly

## 🔄 Release Notes

### Version 0.1.1 (Current)
- ✅ Fixed virtual environment creation persistence
- ✅ Added application icon
- ✅ Improved cross-platform compatibility
- ✅ Enhanced error handling and user feedback

### Version 0.0.2
- ✅ Added extension icon
- ✅ Fixed duplicate virtual environment creation
- ✅ Improved activation logic

### Version 0.0.1 (Alpha)
- 🎉 Initial release
- ✅ Basic package installation functionality
- ✅ uv integration
- ✅ Virtual environment support

## 🤝 Contributing

We welcome contributions! Please see our [GitHub repository](https://github.com/qKitNp/pyCage) for:
- 🐛 Bug reports
- 💡 Feature requests
- 🔧 Pull requests
- 📖 Documentation improvements

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Icon**: [Python icons by Freepik - Flaticon](https://www.flaticon.com/free-icons/python)
- **Package Database**: [Hugo's Top PyPI Packages](https://hugovk.github.io)
- **Core Technology**: [uv by Astral](https://astral.sh/uv)

---

**Made with ❤️ for the Python community**

*Happy coding! 🐍✨*



