import * as vscode from 'vscode';

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

export class FileSystemService {
  private _onDidChangeFileSystem: vscode.EventEmitter<void>;
  private _fileSystemWatcher: vscode.FileSystemWatcher | undefined;

  constructor() {
    this._onDidChangeFileSystem = new vscode.EventEmitter<void>();
    this.setupFileSystemWatcher();
  }

  private async setupFileSystemWatcher() {
    if (this._fileSystemWatcher) {
      this._fileSystemWatcher.dispose();
    }

    const workspaceRoot = await this.getWorkspaceRoot();
    if (workspaceRoot) {
      this._fileSystemWatcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(workspaceRoot, '**/*')
      );

      this._fileSystemWatcher.onDidCreate(() => this._onDidChangeFileSystem.fire());
      this._fileSystemWatcher.onDidChange(() => this._onDidChangeFileSystem.fire());
      this._fileSystemWatcher.onDidDelete(() => this._onDidChangeFileSystem.fire());
    }
  }

  async readDirectory(uri: vscode.Uri) {
    return vscode.workspace.fs.readDirectory(uri);
  }

  async getWorkspaceRoot(): Promise<vscode.Uri | undefined> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    return workspaceFolder?.uri;
  }

  async buildFileTree(rootUri: vscode.Uri): Promise<FileNode> {
    const entries = await this.readDirectory(rootUri);
    const children: FileNode[] = [];

    for (const [name, type] of entries) {
      const childUri = vscode.Uri.joinPath(rootUri, name);
      if (type === vscode.FileType.Directory) {
        const childNode = await this.buildFileTree(childUri);
        children.push(childNode);
      } else if (type === vscode.FileType.File) {
        children.push({
          name,
          type: 'file',
        });
      }
    }

    return {
      name: rootUri.path.split('/').pop() || '',
      type: 'folder',
      children,
    };
  }

  get onDidChangeFileSystem(): vscode.Event<void> {
    return this._onDidChangeFileSystem.event;
  }

  dispose() {
    this._fileSystemWatcher?.dispose();
    this._onDidChangeFileSystem.dispose();
  }
}
