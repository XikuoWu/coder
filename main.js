const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs").promises;
const { exec } = require("child_process");

// 保存主窗口的引用
let mainWindow;

// 创建主窗口的函数
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadFile("index.html");

  // 开发时打开开发者工具
}

// 当应用准备好时创建窗口
app.whenReady().then(() => {
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });

  // 设置所有的 IPC 处理程序
  setupIpcHandlers();
});

// 退出应用的处理
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// 设置所有的 IPC 处理程序
function setupIpcHandlers() {
  // 打开文件夹对话框
  ipcMain.handle("open-directory-dialog", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory"],
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0]; // 返回选择的文件夹路径
    }
    return null;
  });

  // 读取目录内容
  ipcMain.handle("read-directory", async (event, dirPath) => {
    try {
      const files = await fs.readdir(dirPath, { withFileTypes: true });
      return files.map((file) => ({
        name: file.name,
        path: path.join(dirPath, file.name),
        isDirectory: file.isDirectory(),
      }));
    } catch (error) {
      console.error("Error reading directory:", error);
      throw new Error("Failed to read directory: " + error.message);
    }
  });

  // 读取文件内容
  ipcMain.handle("read-file", async (event, filePath) => {
    try {
      return await fs.readFile(filePath, "utf-8");
    } catch (error) {
      console.error("Error reading file:", error);
      throw new Error("Failed to read file: " + error.message);
    }
  });

  // 写入文件内容
  ipcMain.handle("write-file", async (event, filePath, content) => {
    try {
      await fs.writeFile(filePath, content, "utf-8");
      return true;
    } catch (error) {
      console.error("Error writing file:", error);
      throw new Error("Failed to write file: " + error.message);
    }
  });

  // 保存文件对话框（另存为）
  ipcMain.handle("save-file-as", async (event, content) => {
    try {
      const result = await dialog.showSaveDialog(mainWindow, {
        title: "另存为",
        buttonLabel: "保存",
        properties: ["createDirectory"],
        filters: [
          { name: "All Files", extensions: ["*"] },
          { name: "JavaScript", extensions: ["js"] },
          { name: "HTML", extensions: ["html"] },
          { name: "CSS", extensions: ["css"] },
          { name: "Text", extensions: ["txt"] },
        ],
      });

      if (!result.canceled && result.filePath) {
        await fs.writeFile(result.filePath, content, "utf-8");
        return result.filePath;
      }
      return null;
    } catch (error) {
      console.error("Error saving file:", error);
      throw new Error("Failed to save file: " + error.message);
    }
  });
}

// 错误处理
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  // 可以在这里添加错误报告逻辑
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // 可以在这里添加错误报告逻辑
});
