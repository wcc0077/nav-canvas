import * as vscode from 'vscode';
import { FileSystemService } from '../services/filesystem.service';

export class CanvasNavigatorPanel {
  public static currentPanel: CanvasNavigatorPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];
  private _fileSystemService: FileSystemService;

  private constructor(view: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = view;
    this._extensionUri = extensionUri;
    this._fileSystemService = new FileSystemService();

    this._update();
    this._setupMessageHandlers();
    this._setupFileSystemWatcher();
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  private async _setupFileSystemWatcher() {
    const rootUri = await this._fileSystemService.getWorkspaceRoot();
    if (rootUri) {
      this._disposables.push(
        this._fileSystemService.onDidChangeFileSystem(async () => {
          const fileTree = await this._fileSystemService.buildFileTree(rootUri);
          this._panel.webview.postMessage({
            type: 'updateFileTree',
            data: fileTree,
          });
        })
      );

      // 初始化文件树
      // 初始化文件树
      const initialFileTree = await this._fileSystemService.buildFileTree(rootUri);
      this._panel.webview.postMessage({
        type: 'updateFileTree',
        data: initialFileTree,
      });

      this._disposables.push(
        this._fileSystemService.onDidChangeFileSystem(async () => {
          const updatedFileTree = await this._fileSystemService.buildFileTree(rootUri);
          this._panel.webview.postMessage({
            type: 'updateFileTree',
            data: updatedFileTree,
          });
        })
      );
    }
  }

  private _setupMessageHandlers() {
    this._panel.webview.onDidReceiveMessage(
      async message => {
        switch (message.type) {
          case 'nodesChanged':
            // 处理节点位置变化
            break;
        }
      },
      null,
      this._disposables
    );
  }

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

    if (CanvasNavigatorPanel.currentPanel) {
      CanvasNavigatorPanel.currentPanel._panel.reveal();
      return;
    }

    const view = vscode.window.createWebviewPanel('nav-canvas-canvas-view', 'Canvas Navigator', vscode.ViewColumn.One, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'src', 'webview')],
    });

    CanvasNavigatorPanel.currentPanel = new CanvasNavigatorPanel(view, extensionUri);
  }

  private _update() {
    const webview = this._panel.webview;
    webview.html = this._getHtmlForWebview(webview);
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'index.js'));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'styles.css'));

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Canvas Navigator</title>
        <link rel="stylesheet" type="text/css" href="${styleUri}">
      </head>
      <body>
        <div id="root"></div>
        <script type="module" src="${scriptUri}"></script>
      </body>
      </html>
    `;
  }

  public dispose() {
    CanvasNavigatorPanel.currentPanel = undefined;
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  public static dispose() {
    if (CanvasNavigatorPanel.currentPanel) {
      CanvasNavigatorPanel.currentPanel.dispose();
    }
  }
}
