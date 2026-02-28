/**
 * Strip JSONC comments from text while preserving URLs and strings
 */
export function stripJSONCComments(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  let inString = false;
  
  for (let line of lines) {
    let stripped = '';
    
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      const prev = i > 0 ? line[i - 1] : '';
      
      // Toggle string state on unescaped quotes
      if (c === '"' && prev !== '\\') {
        inString = !inString;
      }
      
      // Check for comment start (only when not in string)
      if (!inString && c === '/' && i + 1 < line.length && line[i + 1] === '/') {
        // Rest of line is comment, skip it
        break;
      }
      
      stripped += c;
    }
    
    result.push(stripped);
  }
  
  return result.join('\n');
}

// Test
if (require.main === module) {
  const test = `{
  "url": "https://github.com/user/repo", // This is a comment
  "value": 123, // Another comment
  "nested": {
    "path": "http://example.com/a/b" // URL with comment
  }
  // Standalone comment
}`;

  console.log('Input:');
  console.log(test);
  console.log();
  console.log('Output:');
  console.log(stripJSONCComments(test));
  console.log();

  try {
    const parsed = JSON.parse(stripJSONCComments(test));
    console.log('✓ Parse succeeded!');
    console.log('url:', parsed.url);
  } catch (e: any) {
    console.log('✗ Parse failed:', e.message);
  }
}
