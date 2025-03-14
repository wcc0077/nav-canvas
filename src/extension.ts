import * as vscode from 'vscode';
import { registerViews } from './view-controller';
import { CanvasNavigatorPanel } from './providers/canvas-navigator.panel';

export function activate(context: vscode.ExtensionContext) {
  // 注册视图和命令
  registerViews(context);

  // 确保WebviewPanel在扩展停用时被正确处理
  context.subscriptions.push({
    dispose: () => {
      CanvasNavigatorPanel.dispose();
    },
  });
}

export function deactivate() {
  // 清理资源
  CanvasNavigatorPanel.dispose();
}
