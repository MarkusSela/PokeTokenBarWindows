const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("ptb", {
  snapshot: () => ipcRenderer.invoke("snapshot"),
  action: (type, value) => ipcRenderer.invoke("action", { type, value }),
  openExternal: (url) => ipcRenderer.invoke("action", { type: "open-external", value: url }),
  startPetDrag: (x, y) => ipcRenderer.send("pet-drag-start", { x, y }),
  movePet: (x, y) => ipcRenderer.send("pet-move", { x, y }),
  endPetDrag: (x, y) => ipcRenderer.send("pet-drag-end", { x, y }),
  openMain: () => ipcRenderer.send("pet-open"),
  setPopoverContentHeight: (height) => ipcRenderer.send("popover-content-height", height),
  petContext: () => ipcRenderer.send("pet-context"),
  onPopoverResetHome: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("popover-reset-home", listener);
    return () => ipcRenderer.removeListener("popover-reset-home", listener);
  },
  onPopoverOpened: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("popover-opened", listener);
    return () => ipcRenderer.removeListener("popover-opened", listener);
  },

  onGoldConfig: (callback) => {
    const listener = (_event, config) => callback(config);
    ipcRenderer.on("gold-config", listener);
    return () => ipcRenderer.removeListener("gold-config", listener);
  },
  onPetNotice: (callback) => {
    const listener = (_event, notice) => callback(notice);
    ipcRenderer.on("pet-notice", listener);
    return () => ipcRenderer.removeListener("pet-notice", listener);
  },
  onPetEffect: (callback) => {
    const listener = (_event, effect) => callback(effect);
    ipcRenderer.on("pet-effect", listener);
    return () => ipcRenderer.removeListener("pet-effect", listener);
  },
  onSnapshot: (callback) => {
    const listener = (_event, snapshot) => callback(snapshot);
    ipcRenderer.on("usage-updated", listener);
    ipcRenderer.on("pet-updated", listener);
    return () => {
      ipcRenderer.removeListener("usage-updated", listener);
      ipcRenderer.removeListener("pet-updated", listener);
    };
  },
});
