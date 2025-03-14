import React from 'react';

interface NodeData {
  label: string;
}

export const FileNode: React.FC<{ data: NodeData }> = ({ data }) => (
  <div className='file-node'>
    <div className='node-content'>
      <span className='node-icon'>📄</span>
      <span>{data.label}</span>
    </div>
  </div>
);

export const FolderNode: React.FC<{ data: NodeData }> = ({ data }) => (
  <div className='file-node'>
    <div className='node-content'>
      <span className='node-icon'>📁</span>
      <span>{data.label}</span>
    </div>
  </div>
);

export const nodeTypes = {
  file: FileNode,
  folder: FolderNode,
};
