// 要素の取得
const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const filenameInput = document.getElementById('filename');
const downloadBtn = document.getElementById('downloadBtn');
const loadBtn = document.getElementById('loadBtn');

// カスタムレンダラーの作成
const renderer = new marked.Renderer();

// コードブロックのレンダリングをカスタマイズ
renderer.code = function(code, language) {
    // シンタックスハイライトを適用
    const validLanguage = hljs.getLanguage(language) ? language : 'plaintext';
    const highlighted = hljs.highlight(validLanguage, code).value;

    // 一意のIDを生成
    const codeId = 'code-' + Math.random().toString(36).substr(2, 9);

    // コードブロックのHTMLを返す（コピーボタン付き）
    return `
        <pre><code id="${codeId}" class="hljs ${validLanguage}">${highlighted}</code></pre>
        <button class="copy-button" data-target="${codeId}">コピー</button>
    `;
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

    // コードブロックのコピー機能を追加
    const copyButtons = preview.querySelectorAll('.copy-button');
    copyButtons.forEach(button => {
        button.addEventListener('click', function() {
            const codeId = button.getAttribute('data-target');
            const codeElement = document.getElementById(codeId);
            if (codeElement) {
                const codeText = codeElement.innerText;
                navigator.clipboard.writeText(codeText).then(() => {
                    button.textContent = 'コピーしました';
                    setTimeout(() => {
                        button.textContent = 'コピー';
                    }, 2000);
                }).catch(err => {
                    console.error('コピーに失敗しました: ', err);
                });
            }
        });
    });
}

// エディタの入力イベント
editor.addEventListener('input', updatePreview);

// ページ離脱時の警告
window.addEventListener('beforeunload', function (e) {
    e.preventDefault();
    e.returnValue = '';
});

// ダウンロード機能
function downloadMarkdown() {
    let fileName = filenameInput.value.trim() || 'document';
    // 不適切な文字を除去
    fileName = fileName.replace(/[/\\?%*:|"<>]/g, '');
    // 拡張子を確認
    if (!fileName.endsWith('.md')) {
        fileName += '.md';
    }
    const text = editor.value;
    const blob = new Blob([text], {type: 'text/markdown'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
}

// ダウンロードボタンのイベント
downloadBtn.addEventListener('click', downloadMarkdown);

// Ctrl + S ショートカットキーの設定
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        downloadMarkdown();
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
