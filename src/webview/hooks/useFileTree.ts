import { useState, useEffect, useCallback } from 'react';
import { applyNodeChanges } from '@xyflow/react';
import type { NodeChange, Edge } from '@xyflow/react';

interface Node {
  id: string;
  type: 'file' | 'folder';
  data: { label: string };
  position: { x: number; y: number };
}

interface FileTreeNode {
  name: string;
  type: 'file' | 'folder';
  children?: FileTreeNode[];
}

export const useFileTree = (vscode: { postMessage: (message: any) => void }) => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  const buildTreeStructure = useCallback((fileTree: FileTreeNode) => {
    const nodeMap = new Map<string, Node>();
    const edges: Edge[] = [];
    let nodeId = 0;

    const traverse = (node: FileTreeNode, parentId?: string, x = 0, y = 0) => {
      const currentId = `node-${nodeId++}`;

      nodeMap.set(currentId, {
        id: currentId,
        type: node.type,
        data: { label: node.name },
        position: nodeMap.get(currentId)?.position || { x, y },
      });

      if (parentId) {
        edges.push({
          id: `edge-${parentId}-${currentId}`,
          source: parentId,
          target: currentId,
          type: 'smoothstep',
        });
      }

      node.children?.forEach((child, index) => {
        const spacing = 150;
        traverse(child, currentId, x + 200, y + index * spacing - ((node.children!.length - 1) * spacing) / 2);
      });
    };

    traverse(fileTree);
    return { nodes: Array.from(nodeMap.values()), edges };
  }, []);

  useEffect(() => {
    vscode.postMessage({ type: 'requestFileTree' });

    const handleMessage = ({ data: message }: MessageEvent) => {
      if (message.type === 'updateFileTree') {
        const { nodes, edges } = buildTreeStructure(message.data);
        setNodes(nodes);
        setEdges(edges);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [buildTreeStructure, vscode]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes(nds => {
        const newNodes = applyNodeChanges(changes, nds) as Node[];
        vscode.postMessage({
          type: 'nodesChanged',
          nodes: newNodes,
        });
        return newNodes;
      });
    },
    [vscode]
  );

  return { nodes, edges, onNodesChange };
};
