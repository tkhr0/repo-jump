// popup.js - 設定画面ロジック

const patInput = document.getElementById("pat-input");
const savePatBtn = document.getElementById("save-pat");
const refreshBtn = document.getElementById("refresh-btn");
const statusEl = document.getElementById("status");
const repoCountEl = document.getElementById("repo-count");
const lastFetchedEl = document.getElementById("last-fetched");

// 初期表示: 保存済みの PAT と統計情報を読み込む
async function init() {
  const data = await chrome.storage.local.get(["pat", "repositories", "lastFetchedAt"]);

  if (data.pat) {
    patInput.value = data.pat;
  }

  updateStats(data.repositories, data.lastFetchedAt);
}

function updateStats(repositories, lastFetchedAt) {
  const repos = repositories || [];
  repoCountEl.textContent = repos.length > 0 ? `${repos.length} リポジトリ` : "";

  if (lastFetchedAt) {
    const date = new Date(lastFetchedAt);
    lastFetchedEl.textContent = `最終更新: ${date.toLocaleString("ja-JP")}`;
  } else {
    lastFetchedEl.textContent = "";
  }
}

function showStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = `popup-status popup-status-${type}`;
}

// PAT 保存
savePatBtn.addEventListener("click", async () => {
  const pat = patInput.value.trim();
  if (!pat) {
    showStatus("PAT を入力してください", "error");
    return;
  }

  await chrome.storage.local.set({ pat });
  showStatus("PAT を保存しました", "success");
});

// リポジトリ更新
refreshBtn.addEventListener("click", async () => {
  const pat = patInput.value.trim();
  if (!pat) {
    showStatus("先に PAT を保存してください", "error");
    return;
  }

  refreshBtn.disabled = true;
  showStatus("取得中...", "loading");

  try {
    const response = await chrome.runtime.sendMessage({ type: "REFRESH_REPOS" });

    if (response.success) {
      showStatus(`${response.count} リポジトリを取得しました`, "success");
      updateStats(
        new Array(response.count),
        response.lastFetchedAt
      );
      // 正確なリポジトリ数を表示するために再取得
      const data = await chrome.storage.local.get(["repositories", "lastFetchedAt"]);
      updateStats(data.repositories, data.lastFetchedAt);
    } else {
      showStatus(`エラー: ${response.error}`, "error");
    }
  } catch (error) {
    showStatus(`エラー: ${error.message}`, "error");
  } finally {
    refreshBtn.disabled = false;
  }
});

init();
