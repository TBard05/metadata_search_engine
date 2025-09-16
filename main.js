async function search() {
  const term = document.getElementById('term').value;
  const resultsDiv = document.querySelector('.results');
  if (!term.trim()) {
    resultsDiv.innerHTML = '<p>Enter a search term</p>';
    return;
  }

  const res = await fetch('/api/files/' + term);
  const files = await res.json();

  let html = `<p>Found ${files.length} results for "${term}"</p>`;
  for (const f of files) {
    // Try to parse metadata if it's a JSON string
    let metadata = f.metadata;
    try {
      if (typeof metadata === "string") {
        metadata = JSON.parse(metadata);
      }
    } catch (e) {
      metadata = f.metadata;
    }

    html += `
      <section>
        <h2>${f.filename} (${f.filetype})</h2>
        <h3>Metadata:</h3>
        <pre>${JSON.stringify(metadata, null, 2)}</pre>
      </section>
    `;
  }
  resultsDiv.innerHTML = html;
}

