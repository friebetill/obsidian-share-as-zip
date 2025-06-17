import saveAs from 'file-saver';
import JSZip from 'jszip';
import { Notice, Plugin, TFile } from 'obsidian';

export default class ShareAsZipPlugin extends Plugin {
	async onload() {
		this.addCommand({
			id: 'share-note-as-zip',
			name: 'Share note as ZIP',
			callback: () => this.shareNoteAsZip(),
		});
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
		notesSet.add(file);

		// Only extract links from text files to avoid trying to parse binary files
		if (!this.isBinaryFile(file)) {
			const content = await this.app.vault.read(file);
			const linkedFiles = this.extractLinks(content);

			for (const linkedFile of linkedFiles) {
				await this.collectLinkedNotes(linkedFile, notesSet);
			}
		}
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
