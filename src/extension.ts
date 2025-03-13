import * as vscode from 'vscode';
import * as path from 'path';

class FileNavigatorProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
	private _ignoredPatterns: string[] = [];

	constructor() {
		this._loadGitignorePatterns();
	}

	private async _loadGitignorePatterns() {
		try {
			if (vscode.workspace.workspaceFolders) {
				const gitignorePath = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, '.gitignore');
				const content = await vscode.workspace.fs.readFile(gitignorePath);
				this._ignoredPatterns = Buffer.from(content).toString('utf-8')
					.split('\n')
					.map(line => line.trim())
					.filter(line => line && !line.startsWith('#'));
			}
		} catch (error) {
			console.error('Error loading .gitignore patterns:', error);
			// 使用默认的忽略模式
			this._ignoredPatterns = [
				'out',
				'dist',
				'node_modules',
				'.vscode-test/',
				'*.vsix'
			];
		}
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
		return element;
	}

	async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
		if (!vscode.workspace.workspaceFolders) {
			return [];
		}

		const workspaceRoot = vscode.workspace.workspaceFolders[0].uri;
		if (!element) {
			return this._getFileItems(workspaceRoot);
		}

		if (element.resourceUri) {
			return this._getFileItems(element.resourceUri);
		}

		return [];
	}

	private async _getFileItems(uri: vscode.Uri): Promise<vscode.TreeItem[]> {
		try {
			const entries = await vscode.workspace.fs.readDirectory(uri);
			return entries
				.filter(([name]) => !this._isIgnored(name))
				.map(([name, type]) => {
					const resourceUri = vscode.Uri.joinPath(uri, name);
					const treeItem = new vscode.TreeItem(
						resourceUri,
						type === vscode.FileType.Directory
							? vscode.TreeItemCollapsibleState.Collapsed
							: vscode.TreeItemCollapsibleState.None
					);
					treeItem.command = type === vscode.FileType.File
						? {
							command: 'vscode.open',
							title: 'Open File',
							arguments: [resourceUri]
						}
						: undefined;
					return treeItem;
				});
		} catch (error) {
			console.error('Error reading directory:', error);
			return [];
		}
	}

	private _isIgnored(path: string): boolean {
		return this._ignoredPatterns.some(pattern => {
			if (pattern.endsWith('/')) {
				// 目录匹配
				return path.startsWith(pattern) || path + '/' === pattern;
			} else if (pattern.startsWith('*')) {
				// 通配符匹配
				const suffix = pattern.slice(1);
				return path.endsWith(suffix);
			} else {
				// 精确匹配
				return path === pattern;
			}
		});
	}
}

class FileNavigatorPanel {
	public static currentPanel: FileNavigatorPanel | undefined;
	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
	private _disposables: vscode.Disposable[] = [];
	private _fileSystemWatcher: vscode.FileSystemWatcher | undefined;

	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		this._panel = panel;
		this._extensionUri = extensionUri;

		this._update();
		this._setupFileSystemWatcher();
		this._setupMessageHandler();

		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
	}

	private _setupMessageHandler() {
		this._panel.webview.onDidReceiveMessage(
			async (message) => {
				switch (message.type) {
					case 'openFile':
						const uri = vscode.Uri.file(message.path);
						const doc = await vscode.workspace.openTextDocument(uri);
						await vscode.window.showTextDocument(doc);
						break;
				}
			},
			null,
			this._disposables
		);
	}

	public static createOrShow(extensionUri: vscode.Uri) {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		if (FileNavigatorPanel.currentPanel) {
			FileNavigatorPanel.currentPanel._panel.reveal(column);
			return;
		}

		const panel = vscode.window.createWebviewPanel(
			'fileNavigator',
			'File Navigator',
			column || vscode.ViewColumn.One,
			{
				enableScripts: true,
				localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'src', 'webview')]
			}
		);

		FileNavigatorPanel.currentPanel = new FileNavigatorPanel(panel, extensionUri);
	}

	private async _update() {
		this._panel.webview.html = await this._getHtmlForWebview();
		this._updateFileTree();
	}

	private _setupFileSystemWatcher() {
		if (vscode.workspace.workspaceFolders) {
			this._fileSystemWatcher = vscode.workspace.createFileSystemWatcher('**/*');
			this._fileSystemWatcher.onDidCreate(() => this._updateFileTree());
			this._fileSystemWatcher.onDidDelete(() => this._updateFileTree());
			this._fileSystemWatcher.onDidChange(() => this._updateFileTree());
			this._disposables.push(this._fileSystemWatcher);
		}
	}

	private async _updateFileTree() {
		if (!vscode.workspace.workspaceFolders) {
			return;
		}

		try {
			const workspaceRoot = vscode.workspace.workspaceFolders[0].uri;
			const fileTree = await this._getFileTree(workspaceRoot);
			
			// 确保WebView已准备好
			if (this._panel && this._panel.webview) {
				this._panel.webview.postMessage({
					type: 'updateFileTree',
					data: fileTree
				});
			}
		} catch (error) {
			console.error('Error updating file tree:', error);
			vscode.window.showErrorMessage('更新文件树时发生错误');
		}
	}

	private async _getFileTree(root: vscode.Uri): Promise<any[]> {
		const result: any[] = [];
		const files = await vscode.workspace.fs.readDirectory(root);

		for (const [name, type] of files) {
			// 检查是否匹配.gitignore规则
			if (this._isIgnored(name)) {
				continue;
			}

			const uri = vscode.Uri.joinPath(root, name);
			const isDirectory = type === vscode.FileType.Directory;

			const node = {
				id: uri.fsPath,
				name,
				type: isDirectory ? 'folder' : 'file',
				parent: root.fsPath === vscode.workspace.workspaceFolders![0].uri.fsPath ? null : root.fsPath,
				x: isDirectory ? Math.random() * 600 + 100 : Math.random() * 400 + 200,
				y: isDirectory ? Math.random() * 400 + 100 : Math.random() * 300 + 150,
				width: name.length * 10 + 60,
				height: 40
			};

			result.push(node);

			if (isDirectory && !this._isIgnored(name + '/')) {
				const children = await this._getFileTree(uri);
				result.push(...children);
			}
		}

		return result;
	}

	private _isIgnored(path: string): boolean {
		// 基于.gitignore的规则
		const ignoredPatterns = [
			'out',
			'dist',
			'node_modules',
			'.vscode-test/',
			'*.vsix'
		];

		return ignoredPatterns.some(pattern => {
			if (pattern.endsWith('/')) {
				// 目录匹配
				return path.startsWith(pattern) || path + '/' === pattern;
			} else if (pattern.startsWith('*')) {
				// 通配符匹配
				const suffix = pattern.slice(1);
				return path.endsWith(suffix);
			} else {
				// 精确匹配
				return path === pattern;
			}
		});
	}

	private async _getHtmlForWebview(): Promise<string> {
		const webviewUri = this._panel.webview.asWebviewUri(
			vscode.Uri.joinPath(this._extensionUri, 'src', 'webview', 'index.html')
		);

		const response = await vscode.workspace.fs.readFile(
			vscode.Uri.joinPath(this._extensionUri, 'src', 'webview', 'index.html')
		);

		let html = Buffer.from(response).toString('utf-8');

		// 替换资源URI
		html = html.replace(/(<script[^>]*>)/g, `$1
			const vscode = acquireVsCodeApi();
		`);

		// 添加CSP
		html = html.replace('</head>', `
			<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${this._panel.webview.cspSource} https:; script-src ${this._panel.webview.cspSource} 'unsafe-inline'; style-src ${this._panel.webview.cspSource} 'unsafe-inline';">
		</head>`);

		return html;
	}

	public dispose() {
		FileNavigatorPanel.currentPanel = undefined;
		this._panel.dispose();
		while (this._disposables.length) {
			const disposable = this._disposables.pop();
			if (disposable) {
				disposable.dispose();
			}
		}
	}
}

export function activate(context: vscode.ExtensionContext) {
	const fileNavigatorProvider = new FileNavigatorProvider();
	context.subscriptions.push(
		vscode.window.registerTreeDataProvider('nav-canvas-explorer', fileNavigatorProvider)
	);

	let disposable = vscode.commands.registerCommand('nav-canvas.openNavigator', () => {
		FileNavigatorPanel.createOrShow(context.extensionUri);
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {
  if (FileNavigatorPanel.currentPanel) {
    FileNavigatorPanel.currentPanel.dispose();
  }
}
