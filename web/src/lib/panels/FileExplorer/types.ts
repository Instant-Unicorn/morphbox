export interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  parent?: string;
  children?: FileItem[];
  expanded?: boolean;
}

export type ContextMenuAction = 'create-file' | 'create-folder' | 'rename' | 'delete';

export interface FileSystemResponse {
  success: boolean;
  data?: any;
  error?: string;
}