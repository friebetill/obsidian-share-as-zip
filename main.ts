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
			const content = await this.app.vault.read(note);
			zip.file(note.path, content);
		}

		const zipBlob = await zip.generateAsync({ type: 'blob' });
		saveAs(zipBlob, `${activeFile.basename}.zip`);
	}

	async collectLinkedNotes(file: TFile, notesSet: Set<TFile>) {
		if (notesSet.has(file)) return;
		notesSet.add(file);

		const content = await this.app.vault.read(file);
		const linkedFiles = this.extractLinks(content);

		for (const linkedFile of linkedFiles) {
			await this.collectLinkedNotes(linkedFile, notesSet);
		}
	}

	extractLinks(content: string): TFile[] {
		const linkedFiles: TFile[] = [];
		const linkPattern = /\[\[([^\|\]]+)(?:\|[^\]]+)?\]\]/g;
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
