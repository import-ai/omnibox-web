import html2pdf from 'html2pdf.js';
import { marked } from 'marked';

export function exportMarkdownToPdf(
  markdown: string,
  filename: string = 'document'
): void {
  // 1. 使用 parseSync 确保同步（v4+）
  const html = marked.parse(markdown) as string; // ✅ 更安全

  // 2. 创建容器
  const container = document.createElement('div');
  container.innerHTML = html;

  // 设置基本样式
  container.style.padding = '20px';
  container.style.fontFamily = 'Arial, sans-serif';
  container.style.lineHeight = '1.6';
  container.style.fontSize = '14px';
  container.style.color = '#333';
  container.style.width = '210mm'; // A4 宽度
  container.style.minHeight = '297mm'; // A4 高度
  container.style.boxSizing = 'border-box';
  container.style.visibility = 'hidden'; // 隐藏但可渲染
  container.style.position = 'absolute'; // 绝对定位，不影响布局
  container.style.top = '-9999px'; // 移出可视区域，但保留尺寸
  container.style.left = '0';

  // 添加内联样式
  const style = document.createElement('style');
  style.textContent = `
    h1, h2, h3, h4, h5, h6 {
      color: #2c3e50;
      margin-top: 1.2em;
      margin-bottom: 0.6em;
    }
    pre {
      background: #f4f4f4;
      padding: 12px;
      border-radius: 6px;
      overflow-x: auto;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    code:not([class]) {
      font-family: monospace;
      background: #f9f9f9;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.95em;
    }
    blockquote {
      border-left: 4px solid #ddd;
      padding-left: 16px;
      color: #666;
      margin: 16px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
    }
    th, td {
      border: 1px solid #ccc;
      padding: 8px;
      text-align: left;
    }
    img {
      max-width: 100%;
      height: auto;
      display: block;
    }
    ul, ol {
      padding-left: 20px;
    }
  `;
  container.appendChild(style);

  // 3. 挂载到 body
  document.body.appendChild(container);

  // 5. 导出并清理
  html2pdf()
    .from(container)
    .set({
      margin: [10, 10] as [number, number], // ✅ 显式元组类型
      filename: `${filename}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
      },
    })
    .save()
    .finally(() => {
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    });
}
