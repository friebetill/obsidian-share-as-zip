import saveAs from 'file-saver';
import JSZip from 'jszip';
import { App, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';

interface ShareAsZipSettings {
	excludedFrontmatterKeys: string[];
	excludedHeaders: string[];
	excludedFolders: string[];
	excludedFiles: string[];
}

const DEFAULT_SETTINGS: ShareAsZipSettings = {
	excludedFrontmatterKeys: [],
	excludedHeaders: [],
	excludedFolders: [],
	excludedFiles: []
}

export default class ShareAsZipPlugin extends Plugin {
	settings: ShareAsZipSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'share-note-as-zip',
			name: 'Share note as ZIP',
			callback: () => this.shareNoteAsZip(),
		});

		this.addSettingTab(new ShareAsZipSettingTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async shareNoteAsZip() {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice('No active note to share.');
			return;
		}

		const notesToZip = new Set<TFile>();
		await this.collectLinkedNotes(activeFile, notesToZip);

		const zip = new JSZip();
		for (const note of notesToZip) {
			if (this.isBinaryFile(note)) {
				const content = await this.app.vault.readBinary(note);
				zip.file(note.path, content);
			} else {
				const content = await this.app.vault.read(note);
				zip.file(note.path, content);
			}
		}

		const zipBlob = await zip.generateAsync({ type: 'blob' });
		saveAs(zipBlob, `${activeFile.basename}.zip`);

		new Notice(`ZIP created with ${notesToZip.size} files`);
	}

	isBinaryFile(file: TFile): boolean {
		const extension = file.extension.toLowerCase();
		const binaryExtensions = [
			'pdf', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg',
			'mp3', 'wav', 'ogg', 'mp4', 'avi', 'mov', 'mkv', 'webm',
			'zip', 'rar', '7z', 'tar', 'gz',
			'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
			'exe', 'dll', 'so', 'dylib'
		];
		return binaryExtensions.includes(extension);
	}

	async collectLinkedNotes(file: TFile, notesSet: Set<TFile>) {
		if (notesSet.has(file)) return;

		// Check if file should be excluded
		if (await this.shouldExcludeFile(file)) {
			return;
		}

		notesSet.add(file);

		// Only extract links from text files to avoid trying to parse binary files
		if (!this.isBinaryFile(file)) {
			const content = await this.app.vault.read(file);
			const filteredContent = this.filterContentByHeaders(content);
			const linkedFiles = this.extractLinks(filteredContent);

			for (const linkedFile of linkedFiles) {
				await this.collectLinkedNotes(linkedFile, notesSet);
			}
		}
	}

	async shouldExcludeFile(file: TFile): Promise<boolean> {
		// Check folder exclusion
		if (this.isFileInExcludedFolder(file)) {
			return true;
		}

		// Check file name exclusion
		if (this.isFileNameExcluded(file)) {
			return true;
		}

		// Check frontmatter exclusion
		if (await this.isFrontmatterExcluded(file)) {
			return true;
		}

		return false;
	}

	isFileInExcludedFolder(file: TFile): boolean {
		if (this.settings.excludedFolders.length === 0) return false;

		const filePath = file.path.toLowerCase();
		return this.settings.excludedFolders.some(folder => {
			const folderPattern = folder.toLowerCase().trim();
			if (folderPattern === '') return false;

			// Check if file is directly in the folder or in a subfolder
			return filePath.startsWith(folderPattern + '/') ||
				filePath.includes('/' + folderPattern + '/') ||
				filePath === folderPattern;
		});
	}

	isFileNameExcluded(file: TFile): boolean {
		if (this.settings.excludedFiles.length === 0) return false;

		const fileName = file.name.toLowerCase();
		return this.settings.excludedFiles.some(excludedFile => {
			const pattern = excludedFile.toLowerCase().trim();
			if (pattern === '') return false;

			// Support wildcards
			if (pattern.includes('*')) {
				const regexPattern = pattern.replace(/\*/g, '.*');
				const regex = new RegExp('^' + regexPattern + '$');
				return regex.test(fileName);
			}

			return fileName === pattern;
		});
	}

	async isFrontmatterExcluded(file: TFile): Promise<boolean> {
		if (this.settings.excludedFrontmatterKeys.length === 0) return false;

		const fileCache = this.app.metadataCache.getFileCache(file);
		if (!fileCache?.frontmatter) return false;

		// Check if any excluded frontmatter key is set to true
		return this.settings.excludedFrontmatterKeys.some(key => {
			const value = fileCache.frontmatter?.[key];
			// Check if the frontmatter property exists and is truthy
			return value === true || value === 'true' || value === 1 || value === '1';
		});
	}

	filterContentByHeaders(content: string): string {
		if (this.settings.excludedHeaders.length === 0) return content;

		const lines = content.split('\n');
		const filteredLines: string[] = [];
		let skipSection = false;
		let currentHeaderLevel = 0;

		for (const line of lines) {
			const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);

			if (headerMatch) {
				const level = headerMatch[1].length;
				const headerText = headerMatch[2].trim();

				// Check if this header should be excluded
				const shouldExclude = this.settings.excludedHeaders.some(excludedHeader =>
					headerText.toLowerCase().includes(excludedHeader.toLowerCase())
				);

				if (shouldExclude) {
					skipSection = true;
					currentHeaderLevel = level;
					continue; // Skip this header line too
				} else if (skipSection && level <= currentHeaderLevel) {
					// We've reached a header at the same or higher level, stop skipping
					skipSection = false;
				}
			}

			if (!skipSection) {
				filteredLines.push(line);
			}
		}

		return filteredLines.join('\n');
	}

	extractLinks(content: string): TFile[] {
		const linkedFiles: TFile[] = [];
		const linkPattern = /\[\[([^|\]]+)(?:\|[^\]]+)?\]\]/g;
		let match;

		while ((match = linkPattern.exec(content)) !== null) {
			const linkedNoteName = match[1];

			const linkedFile = this.app.metadataCache.getFirstLinkpathDest(linkedNoteName, '');

			if (linkedFile instanceof TFile) {
				linkedFiles.push(linkedFile);
			}
		}

		return linkedFiles;
	}
}

class ShareAsZipSettingTab extends PluginSettingTab {
	plugin: ShareAsZipPlugin;

	constructor(app: App, plugin: ShareAsZipPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		// Main title
		const titleEl = containerEl.createEl('h1', {text: 'Share as ZIP Settings'});
		titleEl.style.marginBottom = '2rem';
		titleEl.style.color = 'var(--text-accent)';
		titleEl.style.borderBottom = '2px solid var(--background-modifier-border)';
		titleEl.style.paddingBottom = '0.5rem';

		// Introduction
		const introEl = containerEl.createDiv();
		introEl.style.marginBottom = '2rem';
		introEl.style.padding = '1rem';
		introEl.style.backgroundColor = 'var(--background-secondary)';
		introEl.style.borderRadius = '8px';
		introEl.style.border = '1px solid var(--background-modifier-border)';
		introEl.innerHTML = `
			<p style="margin: 0; color: var(--text-muted);">
				<strong>🎯 Control what gets included in your ZIP exports</strong><br>
				Configure exclusion rules to keep unwanted files, folders, and content out of your shared archives.
			</p>
		`;

		// Content Exclusion Section
		this.createSection(containerEl, '📄 Content Exclusion', 'Exclude specific content within notes');

		new Setting(containerEl)
			.setName('🏷️ Excluded Frontmatter Keys')
			.setDesc('Notes with these frontmatter properties set to true will be completely excluded from the ZIP.')
			.addTextArea(text => {
				text.inputEl.style.minHeight = '60px';
				text.inputEl.style.fontSize = '14px';
				return text
					.setPlaceholder('private, password, secure, draft')
					.setValue(this.plugin.settings.excludedFrontmatterKeys.join(', '))
					.onChange(async (value) => {
						this.plugin.settings.excludedFrontmatterKeys = this.parseCommaSeparated(value);
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('📋 Excluded Headers')
			.setDesc('Content under headers containing these texts will be ignored when scanning for links.')
			.addTextArea(text => {
				text.inputEl.style.minHeight = '60px';
				text.inputEl.style.fontSize = '14px';
				return text
					.setPlaceholder('Aufgabenmanagement, Task Management, Daily Review')
					.setValue(this.plugin.settings.excludedHeaders.join(', '))
					.onChange(async (value) => {
						this.plugin.settings.excludedHeaders = this.parseCommaSeparated(value);
						await this.plugin.saveSettings();
					});
			});

		// File & Folder Exclusion Section
		this.createSection(containerEl, '📁 File & Folder Exclusion', 'Exclude entire files and folders');

		new Setting(containerEl)
			.setName('📂 Excluded Folders')
			.setDesc('Files in these folders (and subfolders) will be excluded. Use folder names or paths.')
			.addTextArea(text => {
				text.inputEl.style.minHeight = '60px';
				text.inputEl.style.fontSize = '14px';
				return text
					.setPlaceholder('Templates, Archive, .trash, Private/Passwords')
					.setValue(this.plugin.settings.excludedFolders.join(', '))
					.onChange(async (value) => {
						this.plugin.settings.excludedFolders = this.parseCommaSeparated(value);
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('🗂️ Excluded Files')
			.setDesc('Specific files to exclude. Supports wildcards (*). Example: *.tmp, secrets.md')
			.addTextArea(text => {
				text.inputEl.style.minHeight = '60px';
				text.inputEl.style.fontSize = '14px';
				return text
					.setPlaceholder('passwords.md, secrets.md, *.tmp, *private*')
					.setValue(this.plugin.settings.excludedFiles.join(', '))
					.onChange(async (value) => {
						this.plugin.settings.excludedFiles = this.parseCommaSeparated(value);
						await this.plugin.saveSettings();
					});
			});

		// Examples Section
		this.createExamplesSection(containerEl);

		// Reset Section
		this.createResetSection(containerEl);
	}

	private createSection(containerEl: HTMLElement, title: string, description: string): void {
		const sectionEl = containerEl.createDiv();
		sectionEl.style.marginTop = '2rem';
		sectionEl.style.marginBottom = '1rem';

		const titleEl = sectionEl.createEl('h2', {text: title});
		titleEl.style.color = 'var(--text-accent)';
		titleEl.style.marginBottom = '0.5rem';
		titleEl.style.fontSize = '1.2em';

		const descEl = sectionEl.createEl('p', {text: description});
		descEl.style.color = 'var(--text-muted)';
		descEl.style.marginTop = '0';
		descEl.style.marginBottom = '1rem';
		descEl.style.fontStyle = 'italic';
	}

	private createExamplesSection(containerEl: HTMLElement): void {
		const examplesEl = containerEl.createDiv();
		examplesEl.style.marginTop = '2.5rem';
		examplesEl.style.padding = '1.5rem';
		examplesEl.style.backgroundColor = 'var(--background-secondary)';
		examplesEl.style.borderRadius = '8px';
		examplesEl.style.border = '1px solid var(--background-modifier-border)';

		const titleEl = examplesEl.createEl('h3', {text: '💡 How It Works'});
		titleEl.style.color = 'var(--text-accent)';
		titleEl.style.marginTop = '0';

		examplesEl.innerHTML += `
			<div style="display: grid; gap: 1rem; margin-top: 1rem;">
				<div style="padding: 1rem; background: var(--background-primary); border-radius: 6px; border-left: 4px solid var(--text-accent);">
					<strong>🏷️ Frontmatter:</strong> Any note with excluded frontmatter properties set to true is completely skipped<br>
					<code style="background: var(--background-modifier-border); padding: 2px 6px; border-radius: 4px;">private: true</code> → entire note excluded
				</div>
				<div style="padding: 1rem; background: var(--background-primary); border-radius: 6px; border-left: 4px solid var(--text-accent);">
					<strong>📋 Headers:</strong> Content under matching headers is ignored during link scanning<br>
					<code style="background: var(--background-modifier-border); padding: 2px 6px; border-radius: 4px;">## Aufgabenmanagement</code> → section content ignored
				</div>
				<div style="padding: 1rem; background: var(--background-primary); border-radius: 6px; border-left: 4px solid var(--text-accent);">
					<strong>📂 Folders:</strong> Exclude entire directories and their contents<br>
					<code style="background: var(--background-modifier-border); padding: 2px 6px; border-radius: 4px;">Templates</code> → Templates/* excluded
				</div>
				<div style="padding: 1rem; background: var(--background-primary); border-radius: 6px; border-left: 4px solid var(--text-accent);">
					<strong>🗂️ Files:</strong> Exclude specific files with wildcard support<br>
					<code style="background: var(--background-modifier-border); padding: 2px 6px; border-radius: 4px;">*.tmp</code> → all .tmp files excluded
				</div>
			</div>
		`;
	}

	private createResetSection(containerEl: HTMLElement): void {
		const resetEl = containerEl.createDiv();
		resetEl.style.marginTop = '2rem';
		resetEl.style.padding = '1rem';
		resetEl.style.borderTop = '1px solid var(--background-modifier-border)';

		new Setting(resetEl)
			.setName('🔄 Reset to Defaults')
			.setDesc('Restore all exclusion settings to their default values')
			.addButton(button => button
				.setButtonText('Reset Settings')
				.setClass('mod-warning')
				.onClick(async () => {
					this.plugin.settings = Object.assign({}, DEFAULT_SETTINGS);
					await this.plugin.saveSettings();
					this.display(); // Refresh the settings display
					new Notice('Settings reset to defaults');
				}));
	}

	private parseCommaSeparated(value: string): string[] {
		return value
			.split(',')
			.map(item => item.trim())
			.filter(item => item.length > 0);
	}
}
