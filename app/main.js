const { app, BrowserWindow, dialog } = require('electron');
const fs = require('fs');

const windows = new Set();
const fileWatchers = new Map();

const createWindow = exports.createWindow = (file) => {
  let newWindow = new BrowserWindow({ show: false });
  windows.add(newWindow);

  newWindow.loadURL(`file://${__dirname}/index.html`);

  newWindow.once('ready-to-show', () => {
    if (file) {
      openFile(newWindow, file);
    }
    newWindow.show();
  });

  newWindow.on('close', (event) => {
    if (newWindow.isDocumentEdited()) {
      event.preventDefault();
      const result = dialog.showMessageBox(newWindow, {
        type: 'warning',
        title: 'Quit with Unsaved Changes?',
        message: 'Your changes will be lost if you do not save first.',
        buttons: [
          'Quit Anyway',
          'Cancel'
        ],
        defaultId: 0,
        cancelId: 1
      });

      if (result === 0) {
        newWindow.destroy();
      }
    }
  });

  newWindow.on('closed', () => {
    windows.delete(newWindow);
    stopWatching(newWindow);
    newWindow = null;
  });
};

const getFileFromUserSelection = exports.getFileFromUserSelection = (targetWindow) => {
  const files = dialog.showOpenDialog(targetWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Text Files', extensions: ['txt', 'text'] },
      { name: 'Markdown Files', extensions: ['md', 'markdown'] }
    ]
  });

  if (!files) {
    return;
  }

  return files[0];
};

const openFile = exports.openFile = (targetWindow, filePath) => {
  const file = filePath || getFileFromUserSelection(targetWindow);
  const content = fs.readFileSync(file).toString();

  app.addRecentDocument(file);
  startWatching(targetWindow, file);

  targetWindow.webContents.send('file-opened', file, content);
  targetWindow.setRepresentedFilename(file);
};

const saveMarkdown = exports.saveMarkdown = (targetWindow, file, content) => {
  if (!file) {
    file = dialog.showSaveDialog(targetWindow, {
      title: 'Save Markdown',
      defaultPath: app.getPath('documents'),
      filters: [
        { name: 'Markdown Files', extensions: ['md', 'markdown'] }
      ]
    });
  }

  if (!file) {
    return;
  }

  fs.writeFileSync(file, content).toString();
  targetWindow.webContents.send('file-opened', file, content);
};

const startWatching = (targetWindow, file) => {
  stopWatching(targetWindow);

  const watcher = fs.watch(file, (event) => {
    if (event === 'change') {
      const content = fs.readFileSync(file);
      targetWindow.webContents.send('file-changed', file, content);
    }
  });

  fileWatchers.set(targetWindow, watcher);
};

const stopWatching = (targetWindow) => {
  if (fileWatchers.has(targetWindow)) {
    fileWatchers.get(targetWindow).close();
    openFiles.delete(targetWindow);
  }
};

app.on('will-finish-launching', () => {
  app.on('open-file', (event, filePath) => {
    createWindow(filePath);
  });
});

app.on('ready', () => {
  createWindow();
});
