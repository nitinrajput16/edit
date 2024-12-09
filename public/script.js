
let lastValue = "";

const socket = io(); 
let roomId = localStorage.getItem('roomId') || prompt('Enter a room ID to join or create:');
if (!roomId) {
  roomId = 'default-room'; 
}
localStorage.setItem('roomId', roomId); 

socket.emit('join-room', roomId);

let editor;
require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor/min/vs' } });
require(['vs/editor/editor.main'], function () {
  editor = monaco.editor.create(document.getElementById('editor'), {
    value: '// Write your code here...',
    language: 'c++',
    theme: 'vs-dark',
  });
  
  function checkAndUpdateCode() {
    const content = editor.getValue();
    if(content == lastValue){
      return;
    }
    
    socket.emit('code-update', { roomId, content });
    lastValue = content;
  }
  setInterval(checkAndUpdateCode, 500);
});


socket.on('code-update', (content) => {
  const currentContent = editor.getValue();


  if (currentContent !== content) {
    lastValue = content;
    const selection = editor.getSelection(); 
    editor.setValue(content);
    editor.setSelection(selection); 
  }
});

document.getElementById('saveButton').addEventListener('click', async () => {
  const code = editor.getValue();
  const filename = prompt('Enter a filename to save the code:', 'code.txt');

  if (!filename) return alert('Filename is required.');

  try {
    const response = await fetch('/save-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, filename }),
    });

    const result = await response.json();
    alert(result.message || 'Code saved successfully!');
  } catch (error) {
    console.error('Error saving code:', error);
    alert('Failed to save code.');
  }
});

document.getElementById('loadButton').addEventListener('click', async () => {
  const filename = prompt('Enter the filename to load:', 'code.txt');

  if (!filename) return alert('Filename is required.');

  try {
    const response = await fetch(`/load-code?filename=${encodeURIComponent(filename)}`);
    const result = await response.json();

    if (result.code) {
      editor.setValue(result.code);
      alert('Code loaded successfully!');
    } else {
      alert('Failed to load the code.');
    }
  } catch (error) {
    console.error('Error loading code:', error);
    alert('Failed to load code.');
  }
});

document.getElementById('listButton').addEventListener('click', async () =>  {
  try {
    const response = await fetch('/list-data');

    const result = response.json();
    console.log('Parsed JSON:', result); // Debugging

    if (response.ok) {
      const fileList = result.files;

      const fileListContainer = document.getElementById('fileList');
      fileListContainer.innerHTML = ''; // Clear previous list

      fileList.forEach(filename => {
        const listItem = document.createElement('li');
        listItem.textContent = filename;
        fileListContainer.appendChild(listItem);
      });
    }
  }
  catch (error) {
    console.error('Error loading file list:', error);
  }
});

async function runCode() {
  const editorContent = monaco.editor.getModels()[0].getValue(); 
  const languageId = document.getElementById('language').value; 


  const payload = {
    source_code: editorContent,
    language_id: languageId,
  };

  try {
    const response = await fetch('/editor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    const output = result.stdout || result.stderr || result.message;
    document.getElementById('output').textContent = output;
  } catch (error) {
    console.error('Error compiling code:', error);
    document.getElementById('output').textContent = 'Error compiling code. Please try again.';
  }
}
document.getElementById('runButton').addEventListener('click', runCode);

