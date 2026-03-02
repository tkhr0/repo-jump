// background.js - Service Worker（GitHub API、データ管理）

async function fetchAllRepos(pat) {
  const repos = [];
  let url = "https://api.github.com/user/repos?per_page=100&type=all&sort=updated";

  while (url) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    for (const repo of data) {
      repos.push({
        fullName: repo.full_name,
        updatedAt: repo.updated_at,
      });
    }

    // Link ヘッダーで次ページを辿る
    const linkHeader = response.headers.get("Link");
    url = parseLinkHeader(linkHeader);
  }

  return repos;
}

function parseLinkHeader(header) {
  if (!header) return null;

  const parts = header.split(",");
  for (const part of parts) {
    const match = part.match(/<([^>]+)>;\s*rel="next"/);
    if (match) {
      return match[1];
    }
  }
  return null;
}

async function refreshRepos() {
  const { pat } = await chrome.storage.local.get("pat");
  if (!pat) {
    throw new Error("PAT が設定されていません");
  }

  const repositories = await fetchAllRepos(pat);
  const lastFetchedAt = Date.now();

  await chrome.storage.local.set({ repositories, lastFetchedAt });

  return { count: repositories.length, lastFetchedAt };
}

// メッセージハンドリング
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "REFRESH_REPOS") {
    refreshRepos()
      .then((result) => sendResponse({ success: true, ...result }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // 非同期レスポンスを示す
  }

  if (message.type === "GET_REPOS") {
    chrome.storage.local
      .get(["repositories", "recentlyOpened"])
      .then((data) => {
        sendResponse({
          repositories: data.repositories || [],
          recentlyOpened: data.recentlyOpened || [],
        });
      });
    return true;
  }

  if (message.type === "SAVE_RECENT") {
    chrome.storage.local.get("recentlyOpened").then((data) => {
      const recent = data.recentlyOpened || [];
      // 既存のエントリを削除して先頭に追加
      const filtered = recent.filter((r) => r.fullName !== message.fullName);
      filtered.unshift({ fullName: message.fullName, openedAt: Date.now() });
      // 最大50件
      const trimmed = filtered.slice(0, 50);
      chrome.storage.local.set({ recentlyOpened: trimmed }).then(() => {
        sendResponse({ success: true });
      });
    });
    return true;
  }
});
