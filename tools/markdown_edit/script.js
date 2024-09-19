// 要素の取得
const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const filenameInput = document.getElementById('filename');
const downloadBtn = document.getElementById('downloadBtn');
const loadBtn = document.getElementById('loadBtn');

// モーダル関連の要素
const downloadModal = document.getElementById('downloadModal');
const modalFilenameInput = document.getElementById('modal-filename');
const startDownloadBtn = document.getElementById('startDownloadBtn');
const closeModalBtn = document.querySelector('.modal .close');

// フォーマット選択のチェックボックス
const formatMd = document.getElementById('format-md');
const formatPdf = document.getElementById('format-pdf');
const formatDocx = document.getElementById('format-docx');
const formatHtml = document.getElementById('format-html');

// プログレスバーの要素
const progressOverlay = document.getElementById('progressOverlay');
const progressBar = document.querySelector('.progress-bar .progress');
const progressText = document.querySelector('.progress-container p');

// カスタムレンダラーの作成
const renderer = new marked.Renderer();

// コードブロックのレンダリングをカスタマイズ
renderer.code = function(code, language) {
    // シンタックスハイライトを適用
    const validLanguage = hljs.getLanguage(language) ? language : 'plaintext';
    const highlighted = hljs.highlight(validLanguage, code).value;

    // コードブロックのHTMLを返す
    return `<pre><code class="hljs ${validLanguage}">${highlighted}</code></pre>`;
};

// プレビューの更新
function updatePreview() {
    const rawMarkdown = editor.value;
    const htmlContent = marked(rawMarkdown, {
        renderer: renderer,
        breaks: true, // 改行を反映
        gfm: true
    });
    preview.innerHTML = htmlContent;

    // MathJaxで数式をレンダリング
    if (window.MathJax && window.MathJax.typesetPromise) {
        MathJax.typesetPromise([preview]).then(() => {
            // 数式のレンダリングが完了した後の処理が必要ならここに記述
        }).catch((err) => console.error('MathJaxレンダリングエラー:', err));
    }
}

// エディタの入力イベント
editor.addEventListener('input', updatePreview);

// ページ離脱時の警告
window.addEventListener('beforeunload', function (e) {
    e.preventDefault();
    e.returnValue = '';
});

// ダウンロードモーダルの表示
function showDownloadModal() {
    // ファイル名をモーダルの入力欄に設定
    modalFilenameInput.value = filenameInput.value.trim() || 'document';
    downloadModal.style.display = 'block';
}

// モーダルを閉じる
function closeDownloadModal() {
    downloadModal.style.display = 'none';
}

// ダウンロード機能
async function startDownload() {
    let fileName = modalFilenameInput.value.trim() || 'document';
    // 不適切な文字を除去
    fileName = fileName.replace(/[/\\?%*:|"<>]/g, '');

    // 選択された形式を確認
    const formats = [];
    if (formatMd.checked) formats.push('md');
    if (formatPdf.checked) formats.push('pdf');
    if (formatDocx.checked) formats.push('docx');
    if (formatHtml.checked) formats.push('html');

    if (formats.length === 0) {
        alert('少なくとも一つの形式を選択してください。');
        return;
    }

    // モーダルを閉じてプログレスバーを表示
    closeDownloadModal();
    showProgressBar();

    try {
        for (let i = 0; i < formats.length; i++) {
            const format = formats[i];
            updateProgressBar((i / formats.length) * 100, `${format.toUpperCase()}を生成中...`);

            switch (format) {
                case 'md':
                    await downloadAsMarkdown(fileName);
                    break;
                case 'pdf':
                    await downloadAsPDF(fileName);
                    break;
                case 'docx':
                    await downloadAsDocx(fileName);
                    break;
                case 'html':
                    await downloadAsHTML(fileName);
                    break;
                default:
                    break;
            }
        }

        updateProgressBar(100, '完了しました！');
        setTimeout(hideProgressBar, 1000);
    } catch (error) {
        console.error('ダウンロード中にエラーが発生しました:', error);
        hideProgressBar();
        alert('ダウンロード中にエラーが発生しました。');
    }
}

// プログレスバーの表示
function showProgressBar() {
    progressOverlay.style.display = 'flex';
    updateProgressBar(0, '準備中...');
}

// プログレスバーの更新
function updateProgressBar(percentage, text) {
    progressBar.style.width = `${percentage}%`;
    progressText.textContent = text;
}

// プログレスバーの非表示
function hideProgressBar() {
    progressOverlay.style.display = 'none';
    progressBar.style.width = '0%';
    progressText.textContent = '';
}

// ダウンロード関数たち
function downloadAsMarkdown(fileName) {
    return new Promise((resolve) => {
        let mdFileName = fileName;
        if (!mdFileName.endsWith('.md')) {
            mdFileName += '.md';
        }
        const text = editor.value;
        const blob = new Blob([text], {type: 'text/markdown'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = mdFileName;
        a.click();
        setTimeout(resolve, 500);
    });
}

function downloadAsHTML(fileName) {
    return new Promise((resolve) => {
        let htmlFileName = fileName;
        if (!htmlFileName.endsWith('.html')) {
            htmlFileName += '.html';
        }
        const htmlContent = preview.innerHTML;
        // シンプルなHTMLテンプレートを作成
        const fullHTML = `
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>${fileName}</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/github.min.css">
<style>
${getPreviewStyles()}
</style>
</head>
<body>
<div id="content">
${htmlContent}
</div>
</body>
</html>`;
        const blob = new Blob([fullHTML], {type: 'text/html'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = htmlFileName;
        a.click();
        setTimeout(resolve, 500);
    });
}

function downloadAsPDF(fileName) {
    return new Promise((resolve, reject) => {
        let pdfFileName = fileName;
        if (!pdfFileName.endsWith('.pdf')) {
            pdfFileName += '.pdf';
        }
        const element = document.createElement('div');
        element.innerHTML = preview.innerHTML;
        element.style.padding = '20px';
        document.body.appendChild(element);

        const opt = {
            margin:       1,
            filename:     pdfFileName,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).save().then(() => {
            document.body.removeChild(element);
            setTimeout(resolve, 500);
        }).catch((error) => {
            document.body.removeChild(element);
            reject(error);
        });
    });
}

function downloadAsDocx(fileName) {
    return new Promise((resolve, reject) => {
        let docxFileName = fileName;
        if (!docxFileName.endsWith('.docx')) {
            docxFileName += '.docx';
        }

        const htmlContent = preview.innerHTML;
        const fullHTML = `
<html lang="ja">
<head>
<meta charset="UTF-8">
<style>
${getPreviewStyles()}
</style>
</head>
<body>
${htmlContent}
</body>
</html>`;

        mammoth.convertHtml(fullHTML)
            .then(function(result){
                const blob = new Blob([result.value], {type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"});
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = docxFileName;
                a.click();
                setTimeout(resolve, 500);
            })
            .catch(function(error){
                reject(error);
            });
    });
}

// プレビューのスタイルを取得
function getPreviewStyles() {
    // プレビューエリアのスタイルのみを含める
    const styles = `
/* プレビュー内のテキストスタイル */
body {
    font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif;
    margin: 20px;
    padding: 0;
}
#content h1 {
    font-size: 28px;
    margin-top: 20px;
    margin-bottom: 10px;
}
#content h2 {
    font-size: 24px;
    margin-top: 20px;
    margin-bottom: 10px;
}
#content h3 {
    font-size: 20px;
    margin-top: 20px;
    margin-bottom: 10px;
}
#content p {
    font-size: 16px;
    line-height: 1.8;
    margin-bottom: 15px;
}
#content li {
    font-size: 16px;
    line-height: 1.8;
    margin-bottom: 5px;
}
#content blockquote {
    border-left: 4px solid #ddd;
    padding-left: 15px;
    color: #555;
    margin-bottom: 15px;
}
#content pre {
    background-color: #f5f5f5;
    padding: 15px;
    overflow-x: auto;
    margin-bottom: 15px;
}
#content code {
    font-family: monospace;
    background-color: #f5f5f5;
    padding: 2px 4px;
}
#content a {
    color: #3498db;
    text-decoration: none;
}
#content a:hover {
    text-decoration: underline;
}
`;
    return styles;
}

// ダウンロードボタンのイベント
downloadBtn.addEventListener('click', showDownloadModal);

// モーダルのイベント
closeModalBtn.addEventListener('click', closeDownloadModal);
startDownloadBtn.addEventListener('click', startDownload);

// モーダル外クリックで閉じる
window.addEventListener('click', function(event) {
    if (event.target == downloadModal) {
        closeDownloadModal();
    }
});

// Ctrl + S ショートカットキーの設定
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        showDownloadModal();
    }
});

// ファイルの読み込み機能
function loadMarkdown(event) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.md, .markdown, .txt';
    fileInput.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            filenameInput.value = file.name.replace(/\.[^/.]+$/, "");
            const reader = new FileReader();
            reader.onload = function(e) {
                editor.value = e.target.result;
                updatePreview();
            };
            reader.readAsText(file);
        }
    };
    fileInput.click();
}

// ファイルを開くボタンのイベント
loadBtn.addEventListener('click', loadMarkdown);

// 初期プレビューの表示
updatePreview();
