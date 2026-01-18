const { contextBridge, ipcRenderer } = require('electron');

// 监听主进程发送的配置信息
ipcRenderer.on('config-data', (event, data) => {
    if (data.port) {
        // 将端口注入到 window 对象，供 config.js 读取
        // 注意：contextBridge 暴露的对象是隔离的，
        // 这里我们暴露一个专门的 API 或者直接设置全局变量（如果 unsafe-eval 允许）
        // 更好的方式是暴露一个 getPort 方法，但 config.js 是同步执行的模块，
        // 所以我们需要在 window 上设置属性。
        // 在 preload 中 window 对象与渲染进程共享 DOM，但 JS 上下文隔离。
        // 使用 contextBridge.exposeInMainWorld 是标准做法。
    }
});

contextBridge.exposeInMainWorld('electronAPI', {
    onPortAvailable: (callback) => ipcRenderer.on('port-available', callback),
});

// 为了兼容我们要修改的 frontend/src/config.js，
// 我们直接在 window 对象上定义 __API_PORT__ 
// 注意：这需要 contextIsolation: false 或者通过 webFrame 注入，
// 但为了安全性，我们推荐使用 contextBridge。
// 鉴于 config.js 是 import 进来的，它在 React 组件渲染前就执行了。
// 理想流程：
// 1. Electron 启动 -> 确定端口 -> 启动后端
// 2. 只有后端启动确认后，加载 index.html，并通过 URL query 或 preload 注入。
// 
// 简单起见，我们通过 contextBridge 暴露，并让 React App 在启动时检查。
// 但 config.js 是静态常量。
// 
// 解决方案：使用 window.__API_PORT__，并在 main.js 中通过 executeJavaScript 注入，
// 或者在 preload 中使用 webFrame (被废弃)??
// 
// 实际可行方案：
// preload 运行在 document 初始加载前。
// 我们可以通过 argument 传递 port，或者通过 IPC 同步获取（不推荐）。
// 
// 最高效方案：在 main.js 加载 URL 时带上 query param ?api_port=1234
// 然后 preload 解析 URL 放到 window.__API_PORT__。

const urlParams = new URLSearchParams(window.location.search);
const port = urlParams.get('api_port');

if (port) {
    contextBridge.exposeInMainWorld('__API_PORT__', port);
}
