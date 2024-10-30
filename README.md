# Share as ZIP

Share as ZIP is an Obsidian plugin that allows you to share notes and their linked notes as a zip folder. This is particularly useful for exporting a note and all its related content for sharing or backup purposes.

## Features

- **Recursive Note Collection**: Automatically collects the current note and all linked notes.
- **ZIP Compression**: Compresses the collected notes into a single zip file.
- **Save As Dialog**: Prompts a save dialog to choose the location for the zip file.

## Installation

1. **Download the Plugin**: Clone or download this repository to your local machine.
   ```bash
   git clone https://github.com/yourusername/share-as-zip.git
   ```

2. **Install Dependencies**: Ensure you have the necessary dependencies installed. You can use npm or yarn to install them.
   ```bash
   npm install
   ```

3. **Load the Plugin in Obsidian**:
   - Open Obsidian and navigate to the settings.
   - Go to the "Community plugins" section and enable "Developer mode".
   - Load the plugin from the directory where you cloned the repository.

## Usage

1. Open a note in Obsidian.
2. Use the command palette (Ctrl/Cmd + P) and search for "Share Note as ZIP".
3. The plugin will collect the note and all linked notes, compress them into a zip file, and prompt you to save it.

## Contributing

Contributions are welcome! If you have suggestions or improvements, feel free to open an issue or submit a pull request.

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Commit your changes.
   ```bash
   git commit -m "Add your feature or fix description"
   ```
4. Push to your branch.
   ```bash
   git push origin feature/your-feature-name
   ```
5. Open a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

