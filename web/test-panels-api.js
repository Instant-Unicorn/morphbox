// Test script for panel management API endpoints

const baseUrl = 'http://localhost:8008/api/panels';

async function testAPI() {
  console.log('Testing Panel Management API...\n');

  try {
    // Test 1: Get templates
    console.log('1. Getting panel templates:');
    const templatesRes = await fetch(`${baseUrl}/templates`);
    const templates = await templatesRes.json();
    console.log('Templates:', templates);
    console.log('');

    // Test 2: Create panel from template
    console.log('2. Creating panel from template:');
    const createRes = await fetch(`${baseUrl}/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateId: 1,
        name: 'My Terminal Panel'
      })
    });
    const created = await createRes.json();
    console.log('Created panel:', created);
    console.log('');

    // Test 3: List panels
    console.log('3. Listing all panels:');
    const listRes = await fetch(`${baseUrl}/list`);
    const list = await listRes.json();
    console.log('Panel list:', list);
    console.log('');

    // Test 4: Save panel configuration
    if (created.panel) {
      console.log('4. Saving panel configuration:');
      const saveRes = await fetch(`${baseUrl}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: created.panel.id,
          config: { ...JSON.parse(created.panel.config), fontSize: 16 },
          saveToFile: true
        })
      });
      const saved = await saveRes.json();
      console.log('Saved panel:', saved);
      console.log('');
    }

    // Test 5: Load panel
    if (created.panel) {
      console.log('5. Loading panel by ID:');
      const loadRes = await fetch(`${baseUrl}/load?id=${created.panel.id}`);
      const loaded = await loadRes.json();
      console.log('Loaded panel:', loaded);
      console.log('');
    }

    // Test 6: Update panel using main endpoint
    if (created.panel) {
      console.log('6. Updating panel:');
      const updateRes = await fetch(baseUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: created.panel.id,
          name: 'Updated Terminal Panel'
        })
      });
      const updated = await updateRes.json();
      console.log('Updated panel:', updated);
      console.log('');
    }

    // Test 7: List saved configuration files
    console.log('7. Listing saved configuration files:');
    const filesRes = await fetch(`${baseUrl}/load?listFiles=true`);
    const files = await filesRes.json();
    console.log('Saved files:', files);

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run tests when server is ready
setTimeout(() => {
  testAPI();
}, 1000);