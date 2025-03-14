import React, { useState } from 'react';

interface NodeData {
  label: string;
}

export const FileNode: React.FC<{ data: NodeData }> = ({ data }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data.label);
  const [showToolbar, setShowToolbar] = useState(false);

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    window.acquireVsCodeApi().postMessage({ type: 'renameNode', newName: label });
  };

  return (
    <div
      className='file-node'
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setShowToolbar(true)}
      onMouseLeave={() => setShowToolbar(false)}
    >
      {isEditing ? (
        <input
          type='text'
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={handleBlur}
          autoFocus
        />
      ) : (
        <div className='node-content'>
          <span className='node-icon'>📄</span>
          <span>{label}</span>
        </div>
      )}
      {showToolbar && (
        <div className='node-toolbar'>
          <button onClick={() => window.acquireVsCodeApi().postMessage({ type: 'addNode' })}>Add</button>
          <button onClick={() => window.acquireVsCodeApi().postMessage({ type: 'deleteNode' })}>Delete</button>
          <button onClick={() => window.acquireVsCodeApi().postMessage({ type: 'copyNode' })}>Copy</button>
          <button onClick={() => window.acquireVsCodeApi().postMessage({ type: 'pasteNode' })}>Paste</button>
        </div>
      )}
    </div>
  );
};

export const FolderNode: React.FC<{ data: NodeData }> = ({ data }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data.label);
  const [showToolbar, setShowToolbar] = useState(false);

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    window.acquireVsCodeApi().postMessage({ type: 'renameNode', newName: label });
  };

  return (
    <div
      className='file-node'
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setShowToolbar(true)}
      onMouseLeave={() => setShowToolbar(false)}
    >
      {isEditing ? (
        <input
          type='text'
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={handleBlur}
          autoFocus
        />
      ) : (
        <div className='node-content'>
          <span className='node-icon'>📁</span>
          <span>{label}</span>
        </div>
      )}
      {showToolbar && (
        <div className='node-toolbar'>
          <button onClick={() => window.acquireVsCodeApi().postMessage({ type: 'addNode' })}>Add</button>
          <button onClick={() => window.acquireVsCodeApi().postMessage({ type: 'deleteNode' })}>Delete</button>
          <button onClick={() => window.acquireVsCodeApi().postMessage({ type: 'copyNode' })}>Copy</button>
          <button onClick={() => window.acquireVsCodeApi().postMessage({ type: 'pasteNode' })}>Paste</button>
        </div>
      )}
    </div>
  );
};

export const nodeTypes = {
  file: FileNode,
  folder: FolderNode,
};
