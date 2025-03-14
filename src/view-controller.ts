import * as vscode from 'vscode';
import { CanvasNavigatorProvider } from './providers/canvas-navigator.provider';
import { CanvasNavigatorPanel } from './providers/canvas-navigator.panel';

export function registerViews(context: vscode.ExtensionContext) {
  // 注册画布导航器
  const canvasNavigatorProvider = new CanvasNavigatorProvider();
  context.subscriptions.push(vscode.window.registerTreeDataProvider('nav-canvas-canvas-view', canvasNavigatorProvider));

  // 注册命令
  context.subscriptions.push(
    vscode.commands.registerCommand('nav-canvas.openCanvasNavigator', () => {
      CanvasNavigatorPanel.createOrShow(context.extensionUri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('nav-canvas.refreshCanvas', () => {
      canvasNavigatorProvider.refresh();
    })
  );
}
