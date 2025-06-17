# Share as ZIP

Share as ZIP is an Obsidian plugin that allows you to share notes and their linked notes as a zip folder. This is particularly useful for exporting a note and all its related content for sharing or backup purposes.

## Features

- **Recursive Note Collection**: Automatically collects the current note and all linked notes
- **Binary File Support**: Properly handles PDFs, images, and other binary files
- **Smart Exclusion System**: Configure what to exclude from your exports:
  - **Frontmatter-based**: Exclude notes with `private: true` etc.
  - **Header-based**: Skip content under specific headers when scanning for links
  - **Folder-based**: Exclude entire directories and subdirectories
  - **File-based**: Exclude specific files with wildcard support (e.g., `*.tmp`)
- **ZIP Compression**: Compresses the collected notes into a single zip file
- **Save As Dialog**: Prompts a save dialog to choose the location for the zip file

## Installation

### From Obsidian Community Plugins (Recommended)

1. Open Obsidian Settings
2. Go to Community Plugins and disable Safe Mode
3. Click Browse and search for "Share as ZIP"
4. Install the plugin and enable it

### Manual Installation

1. Download the latest release from the GitHub releases page
2. Extract the files to your vault's `.obsidian/plugins/share-as-zip/` folder
3. Reload Obsidian and enable the plugin in Community Plugins settings

## Usage

1. Open a note in Obsidian
2. Use the command palette (Ctrl/Cmd + P) and search for "Share note as ZIP"
3. The plugin will collect the note and all linked notes, compress them into a zip file, and prompt you to save it

## Configuration

Go to **Settings → Share as ZIP** to configure exclusion rules:

- **Excluded Frontmatter Keys**: Notes with these properties set to `true` will be skipped (e.g., `private, draft, secure`)
- **Excluded Headers**: Content under headers containing these texts won't be scanned for links (e.g., `Task Management, Daily Review`)
- **Excluded Folders**: Entire directories to exclude (e.g., `Templates, Archive, .trash`)
- **Excluded Files**: Specific files to exclude with wildcard support (e.g., `*.tmp, passwords.md`)

### Example Exclusions

**Frontmatter exclusion:**
```yaml
---
private: true
draft: true
---
```

**Header exclusion:** Content under `## Task Management` will be ignored when scanning for links.

**File patterns:** `*.tmp`, `*private*`, `passwords.md`

## Contributing

Contributions are welcome! If you have suggestions or improvements, feel free to open an issue or submit a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

