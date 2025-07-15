import { error } from '@sveltejs/kit';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { PageServerLoad } from './$types';

// Simple markdown to HTML converter (we'll enhance this later)
function markdownToHtml(markdown: string): string {
  let html = markdown;
  
  // Headers
  html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
  html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  html = html.replace(/^#### (.*$)/gm, '<h4>$1</h4>');
  
  // Bold and italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Code blocks
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');
  html = html.replace(/`(.*?)`/g, '<code>$1</code>');
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  
  // Lists
  html = html.replace(/^[\s]*\*[\s]+(.*$)/gm, '<li>$1</li>');
  html = html.replace(/^[\s]*\-[\s]+(.*$)/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
  
  // Paragraphs
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';
  
  // Clean up empty paragraphs and fix nested lists
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p>(<h[1-6]>)/g, '$1');
  html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
  html = html.replace(/<p>(<ul>)/g, '$1');
  html = html.replace(/(<\/ul>)<\/p>/g, '$1');
  html = html.replace(/<p>(<pre>)/g, '$1');
  html = html.replace(/(<\/pre>)<\/p>/g, '$1');
  
  return html;
}

// Extract frontmatter from markdown
function extractFrontmatter(content: string): { metadata: any; content: string } {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);
  
  if (match) {
    const yamlData = match[1];
    const markdownContent = match[2];
    
    // Simple YAML parser for basic key-value pairs
    const metadata: any = {};
    yamlData.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        const value = valueParts.join(':').trim().replace(/^["']|["']$/g, '');
        metadata[key.trim()] = value;
      }
    });
    
    return { metadata, content: markdownContent };
  }
  
  return { metadata: {}, content };
}

// Generate table of contents from markdown
function generateTableOfContents(markdown: string): Array<{ title: string; id: string; level: number }> {
  const headers = [];
  const headerRegex = /^(#{1,6})\s+(.*)$/gm;
  let match;
  
  while ((match = headerRegex.exec(markdown)) !== null) {
    const level = match[1].length;
    const title = match[2];
    const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    
    headers.push({ title, id, level });
  }
  
  return headers;
}

export const load: PageServerLoad = async ({ params }) => {
  const slug = params.slug;
  const contentDir = join(process.cwd(), 'src', 'content', 'docs');
  
  // Map slug to file path
  let filePath: string;
  
  if (!slug) {
    // This shouldn't happen as we have a separate +page.svelte for the root
    throw error(404, 'Page not found');
  }
  
  // Try to find the markdown file
  const possiblePaths = [
    join(contentDir, `${slug}.md`),
    join(contentDir, slug, 'index.md'),
    join(contentDir, slug, 'README.md')
  ];
  
  let markdownPath: string | null = null;
  for (const path of possiblePaths) {
    if (existsSync(path)) {
      markdownPath = path;
      break;
    }
  }
  
  if (!markdownPath) {
    // Return a placeholder for now - we'll create content later
    const placeholderContent = `# ${slug.split('/').pop()?.replace(/-/g, ' ') || 'Documentation'}

This documentation page is coming soon. We're working on comprehensive documentation for all MorphBox features.

## What you can do now:

- [Return to documentation home](/docs)
- [Check out the installation guide](/docs/getting-started/installation)
- [Learn about authentication](/docs/user-guide/authentication)

## Contributing

Help us improve this documentation by contributing to the project:
- [Development Setup](/docs/contributing/development)
- [GitHub Repository](https://github.com/morphbox/morphbox)

Thank you for your patience as we build out the complete documentation!`;

    const html = markdownToHtml(placeholderContent);
    const toc = generateTableOfContents(placeholderContent);
    
    return {
      title: slug.split('/').pop()?.replace(/-/g, ' ') || 'Documentation',
      description: `Documentation for ${slug}`,
      content: html,
      tableOfContents: toc,
      slug,
      lastModified: new Date().toISOString(),
      isPlaceholder: true
    };
  }
  
  try {
    const fileContent = readFileSync(markdownPath, 'utf-8');
    const { metadata, content } = extractFrontmatter(fileContent);
    const html = markdownToHtml(content);
    const toc = generateTableOfContents(content);
    
    return {
      title: metadata.title || slug.split('/').pop()?.replace(/-/g, ' ') || 'Documentation',
      description: metadata.description || `Documentation for ${slug}`,
      content: html,
      tableOfContents: toc,
      slug,
      lastModified: metadata.lastModified || new Date().toISOString(),
      isPlaceholder: false,
      metadata
    };
  } catch (err) {
    console.error('Error reading documentation file:', err);
    throw error(500, 'Failed to load documentation');
  }
};