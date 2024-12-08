
const lastValue = "";

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

  // Detect changes in the editor
  // editor.onDidChangeModelContent(() => {
    
  //   const content = editor.getValue();
    
  //   socket.emit('code-update', { roomId, content }); // Emit the updated content to the room
  // });
  
  function checkAndUpdateCode() {
    const content = editor.getValue();
    if(content == lastValue){
      return;
    }
    
    socket.emit('code-update', { roomId, content }); // Emit the updated content to the room
  }
  setInterval(checkAndUpdateCode, 500);
});


// Listen for code updates from the server
socket.on('code-update', (content) => {
  const currentContent = editor.getValue();

  // Update editor content only if it's different
  if (currentContent !== content) {
    const selection = editor.getSelection(); // Save cursor position
    editor.setValue(content);
    editor.setSelection(selection); // Restore cursor position
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

