const path = require(`path`);
const { ipcMain, shell, app } = require(`electron`);
const isDev = require(`electron-is-dev`);
const { initSplashScreen } = require(`@trodi/electron-splashscreen`);
const getWindowState = require(`electron-window-state`);

const POCKET_CASTS_URL = `https://playbeta.pocketcasts.com/web/`;

try {
  isDev && require(`electron-reloader`)(module);
} catch (err) {
  console.error(err);
}

let window;

const createWindow = () => {
  const windowState = getWindowState({
    defaultWidth: 1200,
    defaultHeight: 800,
  });

  // windowState must be serialized to be compatible with
  // @trodi/electron-splashscreen
  const windowStateObj = JSON.parse(JSON.stringify(windowState));

  window = initSplashScreen({
    templateUrl: path.join(__dirname, `splash-screen`, `index.html`),
    splashScreenOpts: windowStateObj,
    windowOpts: Object.assign(
      {
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: path.join(__dirname, `content.js`),
        },
      },
      windowStateObj
    ),
  });
  window.setMenuBarVisibility(false);

  windowState.manage(window);

  isDev && window.webContents.openDevTools();
  window.loadURL(POCKET_CASTS_URL);

  window.webContents.on(`new-window`, (ev, url) => {
    ev.preventDefault();
    shell.openExternal(url);
  });

  window.on(`closed`, () => {
    window = null;
  });
};

app.on(`ready`, createWindow);

app.on(`window-all-closed`, () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== `darwin`) {
    app.quit();
  }
});

app.on(`activate`, () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (window === null) {
    createWindow();
  }
});

ipcMain.once(`playerReady`, () => require(`./mpris`).init(window));
