import loader from '@monaco-editor/loader';

let monacoPromise: Promise<any> | null = null;

export async function loadMonaco() {
  if (!monacoPromise) {
    monacoPromise = loader.init();
    
    // Configure Monaco loader
    loader.config({
      paths: {
        vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs'
      }
    });
  }
  
  return monacoPromise;
}