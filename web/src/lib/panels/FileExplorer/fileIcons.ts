// File icon mappings based on file extensions
const fileIconMap: Record<string, string> = {
  // Programming languages
  '.js': '📜',
  '.jsx': '⚛️',
  '.ts': '📘',
  '.tsx': '⚛️',
  '.py': '🐍',
  '.java': '☕',
  '.c': '📄',
  '.cpp': '📄',
  '.cs': '📄',
  '.php': '🐘',
  '.rb': '💎',
  '.go': '🐹',
  '.rs': '🦀',
  '.swift': '🦉',
  '.kt': '🟣',
  
  // Web files
  '.html': '🌐',
  '.htm': '🌐',
  '.css': '🎨',
  '.scss': '🎨',
  '.sass': '🎨',
  '.less': '🎨',
  
  // Data files
  '.json': '📊',
  '.xml': '📄',
  '.yaml': '📄',
  '.yml': '📄',
  '.toml': '📄',
  '.csv': '📊',
  '.sql': '🗃️',
  
  // Documentation
  '.md': '📝',
  '.txt': '📄',
  '.pdf': '📕',
  '.doc': '📄',
  '.docx': '📄',
  
  // Images
  '.png': '🖼️',
  '.jpg': '🖼️',
  '.jpeg': '🖼️',
  '.gif': '🖼️',
  '.svg': '🖼️',
  '.ico': '🖼️',
  '.webp': '🖼️',
  
  // Media
  '.mp3': '🎵',
  '.mp4': '🎬',
  '.avi': '🎬',
  '.mov': '🎬',
  '.wav': '🎵',
  
  // Archives
  '.zip': '📦',
  '.tar': '📦',
  '.gz': '📦',
  '.rar': '📦',
  '.7z': '📦',
  
  // Config files
  '.env': '⚙️',
  '.gitignore': '🚫',
  '.dockerignore': '🚫',
  '.eslintrc': '📋',
  '.prettierrc': '📋',
  
  // Special files
  'package.json': '📦',
  'tsconfig.json': '⚙️',
  'webpack.config.js': '📦',
  'vite.config.js': '⚡',
  'rollup.config.js': '📦',
  'Dockerfile': '🐳',
  'docker-compose.yml': '🐳',
  'README.md': '📖',
  'LICENSE': '📜',
  'Makefile': '🔧',
};

export function getFileIcon(filename: string, isDirectory: boolean): string {
  if (isDirectory) {
    // Special folder icons
    if (filename === 'node_modules') return '📦';
    if (filename === '.git') return '🔧';
    if (filename === 'src') return '📂';
    if (filename === 'dist' || filename === 'build') return '📤';
    if (filename === 'public' || filename === 'static') return '🌐';
    if (filename === 'test' || filename === 'tests') return '🧪';
    if (filename === 'docs') return '📚';
    
    return '📁';
  }
  
  // Check for exact filename match first
  const exactMatch = fileIconMap[filename];
  if (exactMatch) return exactMatch;
  
  // Check for extension match
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex !== -1) {
    const extension = filename.substring(lastDotIndex);
    const icon = fileIconMap[extension];
    if (icon) return icon;
  }
  
  // Default file icon
  return '📄';
}