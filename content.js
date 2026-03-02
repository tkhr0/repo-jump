(() => {
  "use strict";

  // ── 状態管理 ──
  let isOpen = false;
  let stage = 1; // 1: リポジトリ選択, 2: 遷移先選択
  let selectedIndex = 0;
  let filteredItems = [];
  let selectedRepo = null;

  // ── DOM 構築 ──
  const backdrop = document.createElement("div");
  backdrop.className = "rj-backdrop";

  const palette = document.createElement("div");
  palette.className = "rj-palette";

  const inputWrapper = document.createElement("div");
  inputWrapper.className = "rj-input-wrapper";

  const stageLabel = document.createElement("span");
  stageLabel.className = "rj-stage-label";

  const input = document.createElement("input");
  input.className = "rj-input";
  input.type = "text";

  inputWrapper.appendChild(stageLabel);
  inputWrapper.appendChild(input);

  const list = document.createElement("div");
  list.className = "rj-list";

  palette.appendChild(inputWrapper);
  palette.appendChild(list);

  document.body.appendChild(backdrop);
  document.body.appendChild(palette);

  // ── fuzzy search ──
  function fuzzyMatch(query, text) {
    const lowerQuery = query.toLowerCase();
    const lowerText = text.toLowerCase();

    // 部分一致を先にチェック
    if (lowerText.includes(lowerQuery)) {
      return true;
    }

    // 各文字が順番に含まれるかチェック
    let qi = 0;
    for (let ti = 0; ti < lowerText.length && qi < lowerQuery.length; ti++) {
      if (lowerText[ti] === lowerQuery[qi]) {
        qi++;
      }
    }
    return qi === lowerQuery.length;
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

  function updateFilter() {
    const query = input.value.trim();

    if (stage === 1) {
      stageLabel.textContent = "repo >";
      input.placeholder = "リポジトリを検索...";

      const sorted = [...REPOSITORIES].sort(
        (a, b) => b.lastOpened - a.lastOpened
      );

      if (query === "") {
        filteredItems = sorted.map((r) => ({ label: r.name, data: r }));
      } else {
        filteredItems = sorted
          .filter((r) => fuzzyMatch(query, r.name))
          .map((r) => ({ label: r.name, data: r }));
      }
    } else {
      stageLabel.textContent = selectedRepo.name + " >";
      input.placeholder = "遷移先を選択...";

      if (query === "") {
        filteredItems = DESTINATIONS.map((d) => ({
          label: d.label,
          hint: d.path || "/",
          data: d,
        }));
      } else {
        filteredItems = DESTINATIONS.filter((d) =>
          fuzzyMatch(query, d.label)
        ).map((d) => ({
          label: d.label,
          hint: d.path || "/",
          data: d,
        }));
      }
    }

    selectedIndex = Math.min(selectedIndex, Math.max(0, filteredItems.length - 1));
    render();
  }

  // ── 選択処理 ──
  function selectCurrent() {
    if (filteredItems.length === 0) return;

    const item = filteredItems[selectedIndex];

    if (stage === 1) {
      // 第1段階 → 第2段階へ
      selectedRepo = item.data;
      stage = 2;
      selectedIndex = 0;
      input.value = "";
      updateFilter();
    } else {
      // 第2段階 → URL 遷移
      const dest = item.data;
      const url = "https://github.com/" + selectedRepo.name + dest.path;
      closePalette();
      window.location.href = url;
    }
  }

  // ── パレット開閉 ──
  function openPalette() {
    isOpen = true;
    stage = 1;
    selectedIndex = 0;
    selectedRepo = null;
    input.value = "";
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
        if (stage === 2) {
          // 第2段階 → 第1段階に戻る
          stage = 1;
          selectedIndex = 0;
          selectedRepo = null;
          input.value = "";
          updateFilter();
        } else {
          closePalette();
        }
        break;
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
