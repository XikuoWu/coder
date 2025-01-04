const editorArea = document.querySelector(".logo-container");
const terminal = document.querySelector(".terminal");
const textarea = document.querySelector("textarea");
const runButton = document.getElementById("run");
let currentFileName = "";
let currentDirectoryHandle = null;

// 终端点击事件
terminal.addEventListener("click", function () {
  alert(
    "无法打开终端，请检查有没有安装终端！如果安装了还是无法打开，请尝试手动打开！"
  );
});

// 定义可读取的文件类型
const readableExtensions = [
  ".html",
  ".css",
  ".js",
  ".jsx",
  ".py",
  ".java",
  ".json",
  ".xml",
  ".yaml",
  ".yml",
  ".sh",
  ".php",
  ".c",
  ".cpp",
  ".cs",
  ".ts",
  ".tsx",
  ".rb",
  ".go",
  ".rs",
  ".sql",
  ".txt",
  ".scss",
  ".less",
  ".md",
];

// 运行文件的函数
function runFile() {
  if (!currentFileName) {
    alert("请先打开一个文件");
    return;
  }

  const extension = "." + currentFileName.split(".").pop().toLowerCase();
  if (extension !== ".html") {
    alert("只能运行html文件");
    return;
  }

  const content = textarea.value;
  const blob = new Blob([content], { type: "text/html" });
  const url = URL.createObjectURL(blob);

  const newWindow = window.open(url, "_blank");

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

// 添加运行按钮点击事件
runButton.addEventListener("click", runFile);

// 添加键盘快捷键支持
document.addEventListener("keydown", function (e) {
  if ((e.ctrlKey || e.metaKey) && e.key === "r") {
    e.preventDefault();
    runFile();
  }
});

// 检查文件是否可读
function isFileReadable(filename) {
  const extension = "." + filename.split(".").pop().toLowerCase();
  return readableExtensions.includes(extension);
}

// 读取文件内容
async function readFileContent(fileHandle) {
  try {
    const file = await fileHandle.getFile();
    const content = await file.text();
    return content;
  } catch (error) {
    console.error("读取文件失败:", error);
    throw error;
  }
}

// 处理文件点击事件
async function handleFileClick(fileHandle) {
  try {
    if (!isFileReadable(fileHandle.name)) {
      alert("不支持的文件类型");
      return;
    }

    currentFileName = fileHandle.name;
    const content = await readFileContent(fileHandle);
    textarea.value = content;
    editorArea.style.display = "none";
    textarea.style.display = "block";
  } catch (error) {
    console.error("处理文件失败:", error);
    alert("读取文件失败");
  }
}

// 创建文件夹按钮点击事件
document.getElementById("create-folder").addEventListener("click", async () => {
  if (currentDirectoryHandle) {
    document.getElementById("create-folder-popup").style.display = "block";
  } else {
    alert("没有打开文件夹，请先打开文件夹！");
  }
});

// 创建文件按钮点击事件
document.getElementById("create-file").addEventListener("click", async () => {
  if (currentDirectoryHandle) {
    document.getElementById("create-file-popup").style.display = "block";
  } else {
    alert("没有打开文件夹，请先打开文件夹！");
  }
});

// 确定创建文件夹
document
  .getElementById("create-folder-btn")
  .addEventListener("click", async () => {
    const folderName = document.getElementById("folder-name").value;

    if (!folderName) {
      alert("请输入文件夹名称");
      return;
    }

    try {
      await currentDirectoryHandle.getDirectoryHandle(folderName, {
        create: true,
      });
      document.getElementById("create-folder-popup").style.display = "none";
      document.getElementById("folder-name").value = "";

      const fileTree = document.getElementById("file-tree");
      fileTree.innerHTML = "";
      await renderDirectoryContents(currentDirectoryHandle, fileTree);
    } catch (error) {
      console.error("创建文件夹失败:", error);
      alert("创建文件夹失败");
    }
  });

// 取消创建文件夹
document
  .getElementById("cancel-create-folder")
  .addEventListener("click", () => {
    document.getElementById("create-folder-popup").style.display = "none";
    document.getElementById("folder-name").value = "";
  });

// 确定创建文件
document
  .getElementById("create-file-btn")
  .addEventListener("click", async () => {
    const fileName = document.getElementById("file-name").value;

    if (!fileName) {
      alert("请输入文件名称");
      return;
    }

    try {
      await currentDirectoryHandle.getFileHandle(fileName, { create: true });
      document.getElementById("create-file-popup").style.display = "none";
      document.getElementById("file-name").value = "";

      const fileTree = document.getElementById("file-tree");
      fileTree.innerHTML = "";
      await renderDirectoryContents(currentDirectoryHandle, fileTree);
    } catch (error) {
      console.error("创建文件失败:", error);
      alert("创建文件失败");
    }
  });

// 取消创建文件
document.getElementById("cancel-create-file").addEventListener("click", () => {
  document.getElementById("create-file-popup").style.display = "none";
  document.getElementById("file-name").value = "";
});

document.getElementById("open-folder").addEventListener("click", async () => {
  try {
    currentDirectoryHandle = await window.showDirectoryPicker(); // 打开文件夹
    console.log("Directory opened:", currentDirectoryHandle);

    const folderName = currentDirectoryHandle.name;
    const viewTitle = document.querySelector(".view-title");
    viewTitle.textContent = `文件管理器 - ${folderName}`;

    const fileTree = document.getElementById("file-tree");
    fileTree.innerHTML = ""; // 清空文件树
    await renderDirectoryContents(currentDirectoryHandle, fileTree); // 渲染文件夹内容

    editorArea.style.display = "none";
  } catch (error) {
    console.error("无法打开文件夹:", error);
    editorArea.style.display = "flex";
  }
});

// 修改渲染文件夹内容的函数
async function renderDirectoryContents(directoryHandle, container) {
  // 清空当前容器内容
  container.innerHTML = "";

  for await (const [name, entry] of directoryHandle.entries()) {
    const item = document.createElement("div");
    item.textContent = entry.kind === "file" ? `📄 ${name}` : `📁 ${name}`;
    item.dataset.kind = entry.kind;
    item.dataset.name = name;
    item.style.cursor = "pointer";
    item.style.padding = "5px";
    item.dataset.open = "false"; // 初始状态为关闭

    if (entry.kind === "directory") {
      const subContainer = document.createElement("div");
      subContainer.style.marginLeft = "15px";
      subContainer.style.display = "none"; // 初始隐藏子内容

      // 文件夹双击事件
      item.addEventListener("dblclick", async (event) => {
        event.stopPropagation(); // 阻止事件传播到父元素

        if (item.dataset.open === "false") {
          subContainer.style.display = "block"; // 显示子内容
          item.dataset.open = "true"; // 更新为打开状态
          if (!subContainer.hasChildNodes()) {
            await renderDirectoryContents(entry, subContainer); // 延迟加载子内容
          }
        } else {
          subContainer.style.display = "none"; // 隐藏子内容
          item.dataset.open = "false"; // 更新为关闭状态
        }
      });

      item.appendChild(subContainer); // 将子容器附加到当前项
    } else {
      // 文件双击事件
      item.addEventListener("dblclick", async (event) => {
        event.stopPropagation(); // 阻止事件传播到父元素
        await handleFileClick(entry);
      });
    }

    container.appendChild(item); // 将当前项添加到容器
  }
}

// 关闭文件夹事件
document.getElementById("close-folder").addEventListener("click", () => {
  // 检查是否有打开的文件夹
  if (currentDirectoryHandle) {
    console.log("Closing folder:", currentDirectoryHandle);

    // 清空文件树
    const fileTree = document.getElementById("file-tree");
    fileTree.innerHTML = "";

    // 恢复默认文件管理器标题
    const viewTitle = document.querySelector(".view-title");
    viewTitle.textContent = "文件管理器";

    // 清空状态
    currentDirectoryHandle = null; // 确保重置文件夹状态
    textarea.style.display = "none";
    editorArea.style.display = "flex";
    textarea.value = "";
    currentFileName = "";

    // 清空语言状态
    updateLanguageStatus(null);
  } else {
    // 改善提示文案，明确提示用户没有打开文件夹
    alert("没有打开文件夹，无法关闭！");
  }
});

// 保存文件的快捷键支持
document.addEventListener("keydown", function (e) {
  if ((e.ctrlKey || e.metaKey) && e.key === "s") {
    e.preventDefault();
    if (currentFileName && currentDirectoryHandle) {
      saveCurrentFile();
    }
  }
});

// 保存当前文件的函数
// 保存当前文件的函数
async function saveCurrentFile() {
  if (!currentFileName || !currentDirectoryHandle) {
    alert("没有打开的文件可以保存");
    return;
  }

  const extension = "." + currentFileName.split(".").pop().toLowerCase();

  if (!readableExtensions.includes(extension)) {
    alert(`无法保存文件，不支持的文件类型: ${extension}`);
    return;
  }

  try {
    const fileHandle = await currentDirectoryHandle.getFileHandle(
      currentFileName,
      { create: true } // 确保文件句柄可以被创建
    );
    const writable = await fileHandle.createWritable();
    await writable.write(textarea.value);
    await writable.close();
    alert("文件保存成功");
  } catch (error) {
    console.error("保存文件失败:", error);
    alert("保存文件失败");
  }
}


// 添加保存按钮点击事件
document.getElementById("save").addEventListener("click", saveCurrentFile);

// 获取状态栏语言显示元素
const languageStatus = document.querySelector(".status-item:last-child");

// 更新语言状态
function updateLanguageStatus(fileName) {
  if (!fileName) {
    languageStatus.textContent = ""; // 没有打开文件时清空状态
    return;
  }

  const extension = fileName.split(".").pop().toLowerCase(); // 获取后缀名
  languageStatus.textContent = extension.toUpperCase(); // 显示大写后缀名
}

// 处理文件点击事件
async function handleFileClick(fileHandle) {
  try {
    if (!isFileReadable(fileHandle.name)) {
      alert("不支持的文件类型");
      return;
    }

    currentFileName = fileHandle.name;
    const content = await readFileContent(fileHandle);
    textarea.value = content;
    editorArea.style.display = "none";
    textarea.style.display = "block";

    // 更新状态栏语言显示
    updateLanguageStatus(currentFileName);
  } catch (error) {
    console.error("处理文件失败:", error);
    alert("读取文件失败");
  }
}
