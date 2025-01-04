const { ipcRenderer } = require("electron");
const fs = require("fs");
const path = require("path");
const monaco = require("monaco-editor");

// 初始化编辑器
let editor = monaco.editor.create(document.getElementById("editor"), {
  value: "// Welcome to VS Code Clone",
  language: "javascript",
  theme: "vs-dark",
  minimap: { enabled: true },
  automaticLayout: true,
});

// 当前打开的文件路径
let currentFilePath = null;

// 文件树类
class FileTreeView {
  constructor(container) {
    this.container = container;
    this.currentPath = null;
    this.init();
  }

  init() {
    // 添加"打开文件夹"按钮
    const openButton = document.createElement("button");
    openButton.textContent = "打开文件夹";
    openButton.className = "open-folder-btn";
    this.container.appendChild(openButton);

    // 创建文件树容器
    this.treeContainer = document.createElement("div");
    this.treeContainer.className = "file-tree-container";
    this.container.appendChild(this.treeContainer);

    this.bindEvents();
  }

  bindEvents() {
    // 打开文件夹按钮点击事件
    this.container
      .querySelector(".open-folder-btn")
      .addEventListener("click", async () => {
        const dirPath = await ipcRenderer.invoke("open-directory-dialog");
        if (dirPath) {
          this.currentPath = dirPath;
          await this.loadDirectory(dirPath);
        }
      });

    // 文件树点击事件
    this.treeContainer.addEventListener("click", async (e) => {
      const item = e.target.closest(".tree-item");
      if (!item) return;

      const path = item.dataset.path;
      const isDirectory = item.dataset.isDirectory === "true";

      if (isDirectory) {
        // 切换展开/折叠状态
        const childrenContainer = item.querySelector(".tree-children");
        if (childrenContainer) {
          childrenContainer.style.display =
            childrenContainer.style.display === "none" ? "block" : "none";
        } else {
          await this.loadDirectory(path, item);
        }
      }
    });

    // 文件树双击事件
    this.treeContainer.addEventListener("dblclick", async (e) => {
      const item = e.target.closest(".tree-item");
      if (!item) return;

      const path = item.dataset.path;
      const isDirectory = item.dataset.isDirectory === "true";

      if (!isDirectory) {
        await this.openFile(path);
      }
    });
  }

  async loadDirectory(dirPath, parentElement = null) {
    try {
      const items = await ipcRenderer.invoke("read-directory", dirPath);
      const container = parentElement
        ? this.createChildrenContainer(parentElement)
        : this.treeContainer;

      container.innerHTML = "";

      items
        .sort((a, b) => {
          // 文件夹排在前面
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        })
        .forEach((item) => {
          const itemElement = this.createTreeItem(item);
          container.appendChild(itemElement);
        });
    } catch (error) {
      console.error("Error loading directory:", error);
    }
  }

  createTreeItem(item) {
    const div = document.createElement("div");
    div.className = "tree-item";
    div.dataset.path = item.path;
    div.dataset.isDirectory = item.isDirectory;

    const icon = document.createElement("span");
    icon.className = `icon ${item.isDirectory ? "icon-folder" : "icon-file"}`;

    const name = document.createElement("span");
    name.className = "item-name";
    name.textContent = item.name;

    div.appendChild(icon);
    div.appendChild(name);

    return div;
  }

  createChildrenContainer(parentElement) {
    let container = parentElement.querySelector(".tree-children");
    if (!container) {
      container = document.createElement("div");
      container.className = "tree-children";
      parentElement.appendChild(container);
    }
    return container;
  }

  async openFile(filePath) {
    try {
      const content = await ipcRenderer.invoke("read-file", filePath);
      editor.setValue(content);
      currentFilePath = filePath;

      // 更新编辑器语言
      const fileExtension = filePath.split(".").pop().toLowerCase();
      const languageMap = {
        js: "javascript",
        py: "python",
        html: "html",
        css: "css",
        json: "json",
        md: "markdown",
        txt: "plaintext",
      };
      const language = languageMap[fileExtension] || "plaintext";
      monaco.editor.setModelLanguage(editor.getModel(), language);
    } catch (error) {
      console.error("Error opening file:", error);
    }
  }
}

// 初始化文件树
const fileTreeView = new FileTreeView(document.getElementById("file-explorer"));

// 添加样式
const style = document.createElement("style");
style.textContent = `
.open-folder-btn {
    margin: 10px;
    padding: 5px 10px;
    background-color: #0066b8;
    color: white;
    border: none;
    border-radius: 3px;
    cursor: pointer;
}

.open-folder-btn:hover {
    background-color: #005999;
}

.file-tree-container {
    margin-top: 10px;
}

.tree-item {
    padding: 4px 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 5px;
}

.tree-item:hover {
    background-color: #2a2d2e;
}

.tree-children {
    padding-left: 20px;
}

.icon {
    font-size: 14px;
}

.icon-folder:before {
    content: "📁";
}

.icon-file:before {
    content: "📄";
}

.item-name {
    flex: 1;
}
`;

document.head.appendChild(style);

// 获取文件树容器和标题元素
const fileTree = document.getElementById("file-tree");
const viewTitle = document.querySelector(".view-title");
const fileExplorer = document.getElementById("file-explorer");

// 监听打开文件夹事件
const openFolderButton = document.getElementById("open-folder");
openFolderButton.addEventListener("click", () => {
  ipcRenderer.send("open-folder-dialog");
});

// 监听文件夹路径返回事件
ipcRenderer.on("folder-selected", (event, folderPath) => {
  displayFolderContent(folderPath);
  viewTitle.textContent = folderPath;
  fileExplorer.querySelector(".view-title").style.display = "none"; // 隐藏 "文件管理器"
});

// 显示文件夹内容
function displayFolderContent(folderPath) {
  fs.readdir(folderPath, { withFileTypes: true }, (err, files) => {
    if (err) {
      console.error("无法读取文件夹内容:", err);
      return;
    }

    // 清空文件树容器
    fileTree.innerHTML = "";

    // 遍历文件夹内容并生成 HTML 元素
    files.forEach((file) => {
      const fileElement = document.createElement("div");
      fileElement.textContent = file.name;
      fileElement.classList.add("file-item");

      if (file.isDirectory()) {
        // 如果是文件夹，则添加文件夹图标和双击事件
        fileElement.classList.add("folder");
        fileElement.addEventListener("dblclick", () =>
          openSubFolder(path.join(folderPath, file.name))
        );
      }

      fileTree.appendChild(fileElement);
    });
  });
}

// 打开子文件夹并显示其内容
function openSubFolder(subFolderPath) {
  displayFolderContent(subFolderPath);
  viewTitle.textContent = subFolderPath;
}
