import React from 'react';
import { ReactFlowProvider, ReactFlow, Background, Controls, MiniMap } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import '@xyflow/react/dist/base.css';
import { nodeTypes } from './components/NodeTypes';
import { useFileTree } from './hooks/useFileTree';

declare global {
  interface Window {
    acquireVsCodeApi: () => {
      postMessage: (message: any) => void;
    };
  }
}

const vscode = window.acquireVsCodeApi();

const App: React.FC = () => {
  const { nodes, edges, onNodesChange } = useFileTree(vscode);

  console.log(
    '节点数据:',
    nodes.map(n => ({ id: n.id, position: n.position }))
  );
  console.log('边数据:', edges);
  console.log(1);

  return (
    <>
      <ReactFlowProvider>
        <div style={{ width: '100%', height: 'calc(100vh - 20px)', border: '1px solid red' }}>
          <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} nodeTypes={nodeTypes} fitView>
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
      </ReactFlowProvider>
    </>
  );
};

export default App;
