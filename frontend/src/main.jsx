import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// 创建 React 根节点
const root = ReactDOM.createRoot(document.getElementById('root'));

// 渲染应用
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);

// 应用就绪后移除加载遮罩
window.addEventListener('DOMContentLoaded', () => {
    // 等待 React 首次渲染完成
    setTimeout(() => {
        const loader = document.getElementById('app-loader');
        if (loader) {
            // 添加淡出类
            loader.classList.add('fade-out');

            // 动画完成后移除 DOM 元素
            setTimeout(() => {
                loader.remove();
            }, 600); // 与 CSS transition 时长一致
        }
    }, 100); // 短暂延迟确保 React 完成首次渲染
});
