const marked = require('marked');
const { remote, ipcRenderer, shell } = require('electron');
const mainProcess = remote.require('./main');
const currentWindow = remote.getCurrentWindow();

const markdownView = document.querySelector('#markdown');
const htmlView = document.querySelector('#html');
const newFileButton = document.querySelector('#new-file');
const openFileButton = document.querySelector('#open-file');
const saveMarkdownButton = document.querySelector('#save-markdown');
const revertButton = document.querySelector('#revert');
const saveHtmlButton = document.querySelector('#save-html');
const showFileButton = document.querySelector('#show-file');
const openInDefaultButton = document.querySelector('#open-in-default');

let filePath = null;
let originalContent = '';

const renderMarkdownToHtml = (markdown) => {
  const html = marked(markdown, { sanitize: true });
  htmlView.innerHTML = html;
};

const updateEditedState = (isEdited) => {
  currentWindow.setDocumentEdited(isEdited);

  saveMarkdownButton.disabled = !isEdited;
  revertButton.disabled = !isEdited;

  let title = 'Fire Sale';
  if (filePath) title = `${filePath} - ${title}`;
  if (isEdited) title = `${title} (Edited)`;
  currentWindow.setTitle(title);
};

markdownView.addEventListener('keyup', (event) => {
  const currentContent = event.target.value;

  renderMarkdownToHtml(event.target.value);
  updateEditedState(originalContent !== currentContent);
});

openFileButton.addEventListener('click', (event) => {
  mainProcess.openFile(currentWindow);
});

saveMarkdownButton.addEventListener('click', () => {
  mainProcess.saveMarkdown(currentWindow, filePath, markdownView.value);
});

showFileButton.addEventListener('click', () => {
  shell.showItemInFolder(filePath);
});

openInDefaultButton.addEventListener('click', () => {
  shell.openItem(filePath);
});

ipcRenderer.on('file-opened', (event, file, content) => {
  filePath = file;
  originalContent = content;

  markdownView.value = content;
  renderMarkdownToHtml(content);
  updateEditedState(false);
});

newFileButton.addEventListener('click', (event) => {
  mainProcess.createWindow();
});

ipcRenderer.on('file-changed', (event, file, content) => {
  filePath = file;
  originalContent = content;

  markdownView.value = content;
  renderMarkdownToHtml(content);
  updateEditedState(false);
});