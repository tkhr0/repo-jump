// content.js - パレット UI + 1段階 fuzzy finder

(() => {
  "use strict";

  // ── 遷移先定義 ──
  const DESTINATIONS = [
    { label: "Code", path: "" },
    { label: "Issues", path: "/issues" },
    { label: "Pull Requests", path: "/pulls" },
    { label: "Actions", path: "/actions" },
  ];

  // ── 状態管理 ──
  let isOpen = false;
  let selectedIndex = 0;
  let filteredItems = [];
  let repositories = [];
  let recentlyOpened = [];

  // ── Shadow DOM でパレットを構築 ──
  const host = document.createElement("div");
  host.id = "repo-jump-host";
  const shadow = host.attachShadow({ mode: "closed" });

  // スタイルを Shadow DOM 内に注入
  const styleLink = document.createElement("link");
  styleLink.rel = "stylesheet";
  styleLink.href = chrome.runtime.getURL("style.css");
  shadow.appendChild(styleLink);

  // DOM 構築
  const backdrop = document.createElement("div");
  backdrop.className = "rj-backdrop";

  const palette = document.createElement("div");
  palette.className = "rj-palette";

  const inputWrapper = document.createElement("div");
  inputWrapper.className = "rj-input-wrapper";

  const searchIcon = document.createElement("span");
  searchIcon.className = "rj-search-icon";
  searchIcon.textContent = "\u{1F50D}";

  const input = document.createElement("input");
  input.className = "rj-input";
  input.type = "text";
  input.placeholder = "リポジトリを検索...";

  inputWrapper.appendChild(searchIcon);
  inputWrapper.appendChild(input);

  const list = document.createElement("div");
  list.className = "rj-list";

  palette.appendChild(inputWrapper);
  palette.appendChild(list);

  shadow.appendChild(backdrop);
  shadow.appendChild(palette);
  document.body.appendChild(host);

  // ── 入力パース ──
  function parseInput(value) {
    const spaceIndex = value.indexOf(" ");
    if (spaceIndex === -1) {
      return { repoQuery: value, destQuery: null };
    }
    return {
      repoQuery: value.substring(0, spaceIndex),
      destQuery: value.substring(spaceIndex + 1),
    };
  }

  // ── 最近開いた履歴のボーナススコア ──
  function getRecentBonus(fullName) {
    const entry = recentlyOpened.find((r) => r.fullName === fullName);
    if (!entry) return 0;
    // 新しいほど高いボーナス（最大200）
    const index = recentlyOpened.indexOf(entry);
    return Math.max(0, 200 - index * 4);
  }

  // ── 表示更新 ──
  function render() {
    list.innerHTML = "";

    if (filteredItems.length === 0) {
      const empty = document.createElement("div");
      empty.className = "rj-empty";
      empty.textContent = "一致する項目がありません";
      list.appendChild(empty);
      return;
    }

    filteredItems.forEach((item, i) => {
      const row = document.createElement("div");
      row.className = "rj-item" + (i === selectedIndex ? " rj-selected" : "");
      row.addEventListener("click", () => {
        selectedIndex = i;
        selectCurrent();
      });

      const nameSpan = document.createElement("span");
      nameSpan.className = "rj-item-name";
      nameSpan.textContent = item.label;
      row.appendChild(nameSpan);

      if (item.hint) {
        const hintSpan = document.createElement("span");
        hintSpan.className = "rj-item-hint";
        hintSpan.textContent = item.hint;
        row.appendChild(hintSpan);
      }

      list.appendChild(row);
    });

    // 選択行が見える位置にスクロール
    const selectedEl = list.querySelector(".rj-selected");
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: "nearest" });
    }
  }

  // ── フィルタ更新 ──
  function updateFilter() {
    const value = input.value;
    const { repoQuery, destQuery } = parseInput(value);

    if (destQuery === null) {
      // リポジトリ検索モード
      input.placeholder = "リポジトリを検索...";

      if (!repoQuery) {
        // クエリ空: 最近開いた順にソート
        filteredItems = repositories
          .map((repo) => ({
            label: repo.fullName,
            data: { type: "repo", fullName: repo.fullName },
            score: getRecentBonus(repo.fullName),
          }))
          .sort((a, b) => b.score - a.score);
      } else {
        // fuzzy 検索
        const results = FuzzySearch.fuzzyFilter(
          repoQuery,
          repositories,
          (r) => r.fullName
        );
        filteredItems = results.map((r) => ({
          label: r.item.fullName,
          data: { type: "repo", fullName: r.item.fullName },
          score: r.score + getRecentBonus(r.item.fullName),
        }));
        // スコア再ソート（fuzzy + 最近開いたボーナス）
        filteredItems.sort((a, b) => b.score - a.score);
      }
    } else {
      // 遷移先選択モード: 1位リポジトリの遷移先を表示
      const repoResults = FuzzySearch.fuzzyFilter(
        repoQuery,
        repositories,
        (r) => r.fullName
      );

      if (repoResults.length === 0) {
        filteredItems = [];
      } else {
        const topRepo = repoResults[0].item.fullName;

        if (!destQuery) {
          // 遷移先を全件表示
          filteredItems = DESTINATIONS.map((d) => ({
            label: `${topRepo} \u00B7 ${d.label}`,
            hint: d.path || "/",
            data: { type: "dest", fullName: topRepo, path: d.path },
          }));
        } else {
          // 遷移先を fuzzy 絞り込み
          const destResults = FuzzySearch.fuzzyFilter(
            destQuery,
            DESTINATIONS,
            (d) => d.label
          );
          filteredItems = destResults.map((r) => ({
            label: `${topRepo} \u00B7 ${r.item.label}`,
            hint: r.item.path || "/",
            data: { type: "dest", fullName: topRepo, path: r.item.path },
          }));
        }
      }
    }

    selectedIndex = Math.min(
      selectedIndex,
      Math.max(0, filteredItems.length - 1)
    );
    render();
  }

  // ── 選択処理 ──
  function selectCurrent() {
    if (filteredItems.length === 0) return;

    const item = filteredItems[selectedIndex];

    if (item.data.type === "repo") {
      // リポジトリ選択 → Code ページに遷移
      const fullName = item.data.fullName;
      saveRecent(fullName);
      closePalette();
      window.location.href = `https://github.com/${fullName}`;
    } else if (item.data.type === "dest") {
      // 遷移先選択 → 該当ページに遷移
      const fullName = item.data.fullName;
      const path = item.data.path;
      saveRecent(fullName);
      closePalette();
      window.location.href = `https://github.com/${fullName}${path}`;
    }
  }

  // ── 最近開いた履歴を保存 ──
  function saveRecent(fullName) {
    chrome.runtime.sendMessage({
      type: "SAVE_RECENT",
      fullName: fullName,
    });
  }

  // ── リポジトリデータを取得 ──
  async function loadRepos() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "GET_REPOS" }, (response) => {
        if (response) {
          repositories = response.repositories || [];
          recentlyOpened = response.recentlyOpened || [];
        }
        resolve();
      });
    });
  }

  // ── パレット開閉 ──
  async function openPalette() {
    isOpen = true;
    selectedIndex = 0;
    input.value = "";
    await loadRepos();
    backdrop.classList.add("rj-visible");
    palette.classList.add("rj-visible");
    updateFilter();
    input.focus();
  }

  function closePalette() {
    isOpen = false;
    backdrop.classList.remove("rj-visible");
    palette.classList.remove("rj-visible");
    input.value = "";
  }

  // ── イベントハンドラ ──
  document.addEventListener("keydown", (e) => {
    // Cmd+K (Mac) / Ctrl+K (Windows) でトグル
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      e.stopPropagation();
      if (isOpen) {
        closePalette();
      } else {
        openPalette();
      }
      return;
    }

    if (!isOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (filteredItems.length > 0) {
          selectedIndex = (selectedIndex + 1) % filteredItems.length;
          render();
        }
        break;

      case "ArrowUp":
        e.preventDefault();
        if (filteredItems.length > 0) {
          selectedIndex =
            (selectedIndex - 1 + filteredItems.length) % filteredItems.length;
          render();
        }
        break;

      case "Enter":
        e.preventDefault();
        selectCurrent();
        break;

      case "Escape":
        e.preventDefault();
        closePalette();
        break;

      case "Backspace": {
        // スペース後が空の時 → リポジトリ検索モードに戻る
        const { destQuery } = parseInput(input.value);
        if (destQuery === "") {
          e.preventDefault();
          // スペースを削除してリポジトリ検索モードに戻す
          const spaceIndex = input.value.indexOf(" ");
          if (spaceIndex !== -1) {
            input.value = input.value.substring(0, spaceIndex);
            selectedIndex = 0;
            updateFilter();
          }
        }
        break;
      }
    }
  });

  input.addEventListener("input", () => {
    selectedIndex = 0;
    updateFilter();
  });

  backdrop.addEventListener("click", () => {
    closePalette();
  });
})();
