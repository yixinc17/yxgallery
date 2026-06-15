/**
 * Pawbie App v0.1 — Companion-first prototype
 */

(function () {
  "use strict";

  const MOOD_VISUALS = {
    sleeping: { emoji: "😴", label: "sleeping" },
    active: { emoji: "✨", label: "active" },
    happy: { emoji: "😊", label: "happy" },
    watching: { emoji: "👁", label: "watching" },
  };

  const PAWBIES = [
    { id: "pawbie", name: "Pawbie", mood: "happy", nearby: true, battery: 82, wifi: true },
    { id: "ono", name: "Ono", mood: "sleeping", nearby: false, battery: 64, wifi: false },
    { id: "bibo", name: "Bibo", mood: "active", nearby: false, battery: 91, wifi: true },
  ];

  const ICON_EDIT = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z"/><path d="M13.5 6.5l3 3"/></svg>`;

  const MOCK = {
    ownerName: "Yixin",
    ownerCallName: "mama",
    volume: 60,
    brightness: 70,
    fwVersion: "v1.2.0",
  };

  const DIARY_ENTRIES = [
    { id: "1", date: "2026-05-29", time: "08:12", emoji: "🌅", emotionTag: "Calm", text: "You woke up slowly today. The room felt gentle.", optionalImage: false },
    { id: "2", date: "2026-05-29", time: "10:24", emoji: "👁", emotionTag: "Observe", text: "Today I saw you sitting near the window.", optionalImage: true },
    { id: "3", date: "2026-05-29", time: "14:02", emoji: "🤔", emotionTag: "Curious", text: "You looked at your phone for a long time. I wondered what you found.", optionalImage: false },
    { id: "4", date: "2026-05-29", time: "19:45", emoji: "😊", emotionTag: "Happy", text: "You laughed at something on the screen. I liked hearing that.", optionalImage: false },
    { id: "5", date: "2026-05-28", time: "09:15", emoji: "🌿", emotionTag: "Calm", text: "The room was quiet this morning. I liked that.", optionalImage: false },
    { id: "6", date: "2026-05-28", time: "17:20", emoji: "👁", emotionTag: "Observe", text: "You moved around the desk a lot. I kept watching.", optionalImage: false },
    { id: "7", date: "2026-05-27", time: "18:40", emoji: "😊", emotionTag: "Happy", text: "You smiled when you came home.", optionalImage: true },
    { id: "8", date: "2026-05-18", time: "11:00", emoji: "👁", emotionTag: "Observe", text: "A bird passed by outside. I watched it with you.", optionalImage: false },
  ];

  const EMOTION_ICONS = { Observe: "👁", Curious: "🤔", Calm: "🌿", Happy: "😊" };
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const MAIN_TABS = new Set(["home", "diary", "settings"]);

  const state = {
    tab: "home",
    screen: "home",
    returnScreen: "home",
    connection: "connected",
    diaryView: "success",
    selectedDate: startOfDay(new Date()),
    weekAnchor: startOfDay(new Date()),
    calendarMonth: new Date(),
    calendarPendingDate: null,
    syncStatus: "latest",
    lastUpdatedMin: 2,
    activePawbieId: "pawbie",
    editNameTarget: null,
    editPawbieId: null,
    pullOffset: 0,
    otaPhase: "idle",
    otaProgress: 0,
    connectTimer: null,
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const els = {
    appMain: $("#app-main"),
    bottomTabBar: $("#bottom-tab-bar"),
    tabHome: $("#tab-home"),
    tabDiary: $("#tab-diary"),
    tabSettings: $("#tab-settings"),
    toast: $("#toast"),
    connectionDebug: $("#connection-debug"),
    diaryStateDebug: $("#diary-state-debug"),
    homeConnected: $("#home-connected"),
    homeEmpty: $("#home-empty"),
    homeTitle: $("#home-title"),
    btnHomeMenu: $("#btn-home-menu"),
    homeMenu: $("#home-menu"),
    homeMenuBackdrop: $("#home-menu-backdrop"),
    menuDeviceUpdates: $("#menu-device-updates"),
    menuChangeOwner: $("#menu-change-owner"),
    menuRemovePawbie: $("#menu-remove-pawbie"),
    heroGreetingText: $("#hero-greeting-text"),
    heroSpeechBubble: $("#hero-speech-bubble"),
    heroBatteryText: $("#hero-battery-text"),
    heroWifi: $("#hero-wifi"),
    switchPawbieOverlay: $("#switch-pawbie-overlay"),
    switchPawbieBackdrop: $("#switch-pawbie-backdrop"),
    switchPawbieClose: $("#switch-pawbie-close"),
    switchPawbieList: $("#switch-pawbie-list"),
    btnAddPawbieSheet: $("#btn-add-pawbie-sheet"),
    heroVisual: $("#hero-visual"),
    heroMoodTag: $("#hero-mood-tag"),
    pawbieHeroInner: $("#pawbie-hero-inner"),
    btnConnectPawbie: $("#btn-connect-pawbie"),
    btnAddPawbieEmpty: $("#btn-add-pawbie-empty"),
    volumeSlider: $("#volume-slider"),
    brightnessSlider: $("#brightness-slider"),
    dateHeader: $("#date-header"),
    dateHeaderText: $("#date-header-text"),
    btnDiaryToday: $("#btn-diary-today"),
    weekDays: $("#week-days"),
    diaryPullHint: $("#diary-pull-hint"),
    pullHintText: $("#pull-hint-text"),
    pullChevron: $("#pull-chevron"),
    diaryScrollBody: $("#diary-scroll-body"),
    diaryLoading: $("#diary-loading"),
    diarySuccess: $("#diary-success"),
    diaryEmpty: $("#diary-empty"),
    diaryFailed: $("#diary-failed"),
    diaryList: $("#diary-list"),
    diaryListCached: $("#diary-list-cached"),
    calendarOverlay: $("#calendar-overlay"),
    calendarBackdrop: $("#calendar-backdrop"),
    calendarClose: $("#calendar-close"),
    calendarToday: $("#calendar-today"),
    calendarConfirm: $("#calendar-confirm"),
    monthGrid: $("#month-grid"),
    monthLabel: $("#month-label"),
    monthPrev: $("#month-prev"),
    monthNext: $("#month-next"),
    btnChangeOwnerClose: $("#btn-change-owner-close"),
    btnChangeOwnerStart: $("#btn-change-owner-start"),
    removePawbieOverlay: $("#remove-pawbie-overlay"),
    removePawbieBackdrop: $("#remove-pawbie-backdrop"),
    removePawbieClose: $("#remove-pawbie-close"),
    removePawbieCancel: $("#remove-pawbie-cancel"),
    removePawbieConfirm: $("#remove-pawbie-confirm"),
    removePawbieMsg: $("#remove-pawbie-msg"),
    editNameOverlay: $("#edit-name-overlay"),
    editNameBackdrop: $("#edit-name-backdrop"),
    editNameClose: $("#edit-name-close"),
    editNameTitle: $("#edit-name-title"),
    editNameInput: $("#edit-name-input"),
    editNameSave: $("#edit-name-save"),
    btnOtaClose: $("#btn-ota-close"),
    btnPlaceholderClose: $("#btn-placeholder-close"),
    btnUpdateNow: $("#btn-update-now"),
    btnOtaDone: $("#btn-ota-done"),
    btnOtaRetry: $("#btn-ota-retry"),
    btnOtaMockStart: $("#btn-ota-mock-start"),
    btnOtaMockFail: $("#btn-ota-mock-fail"),
    otaIdle: $("#ota-idle"),
    otaUpdating: $("#ota-updating"),
    otaSuccess: $("#ota-success"),
    otaFailed: $("#ota-failed"),
    otaProgress: $("#ota-progress"),
    otaProgressText: $("#ota-progress-text"),
    otaPhaseLabel: $("#ota-phase-label"),
    otaCurrent: $("#ota-current"),
    placeholderTitle: $("#placeholder-title"),
    placeholderDesc: $("#placeholder-desc"),
  };

  function startOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  function formatDateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function isSameDay(a, b) {
    return formatDateKey(a) === formatDateKey(b);
  }

  function isToday(d) {
    return isSameDay(d, new Date());
  }

  function formatDateHeader(d) {
    if (isToday(d)) return "Today";
    return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
  }

  function getWeekStart(anchor) {
    const d = startOfDay(anchor);
    d.setDate(d.getDate() - d.getDay());
    return d;
  }

  function showToast(msg, ms = 2200) {
    els.toast.textContent = msg;
    els.toast.classList.remove("hidden");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => els.toast.classList.add("hidden"), ms);
  }

  function datesWithDiary() {
    return new Set(DIARY_ENTRIES.map((e) => e.date));
  }

  function entriesForDate(d) {
    return DIARY_ENTRIES.filter((e) => e.date === formatDateKey(d)).sort((a, b) => b.time.localeCompare(a.time));
  }

  function emojiForEntry(entry) {
    return entry.emoji || EMOTION_ICONS[entry.emotionTag] || "📝";
  }

  function primaryEmotionForDate(d) {
    const entries = entriesForDate(d);
    return entries.length ? emojiForEntry(entries[0]) : "";
  }

  function setConnection(conn) {
    state.connection = conn;
    if (els.connectionDebug) els.connectionDebug.value = conn;
    renderHome();
  }

  function getActivePawbie() {
    return PAWBIES.find((p) => p.id === state.activePawbieId) || PAWBIES[0];
  }

  function renderHome() {
    const connected = state.connection === "connected";
    els.homeConnected.classList.toggle("hidden", !connected);
    els.homeEmpty.classList.toggle("hidden", connected);
    els.volumeSlider.disabled = !connected;
    els.brightnessSlider.disabled = !connected;
    const p = getActivePawbie();
    els.homeTitle.textContent = p.name;
    const connectedOnly = connected;
    els.menuDeviceUpdates.disabled = !connectedOnly;
    els.menuChangeOwner.disabled = !connectedOnly;
    els.menuRemovePawbie.disabled = !connectedOnly;
    if (connected) {
      renderHeroMood();
      renderHeroGreeting();
    }
  }

  function renderHeroGreeting() {
    const call = MOCK.ownerCallName || MOCK.ownerName;
    els.heroGreetingText.textContent = `Hi, ${call}`;
  }

  function pawbieStatusLabel(p) {
    const isActive = p.id === state.activePawbieId;
    if (isActive && state.connection === "connected") return "Connected";
    if (p.nearby) return "Tap to connect";
    return "Not nearby";
  }

  function renderSwitchPawbieSheet() {
    els.switchPawbieList.innerHTML = "";
    PAWBIES.forEach((p) => {
      const isActive = p.id === state.activePawbieId;
      const li = document.createElement("li");
      li.className = "switch-pawbie-item";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "switch-pawbie-row";
      if (isActive) btn.classList.add("is-current");
      const mood = MOOD_VISUALS[p.mood] || MOOD_VISUALS.active;
      btn.innerHTML = `
        <span class="switch-pawbie-emoji" aria-hidden="true">${mood.emoji}</span>
        <span class="switch-pawbie-info">
          <span class="switch-pawbie-name">${p.name}</span>
          <span class="switch-pawbie-status">${pawbieStatusLabel(p)}</span>
        </span>
        ${isActive ? '<span class="switch-pawbie-check" aria-hidden="true">✓</span>' : ""}
      `;
      btn.addEventListener("click", () => selectPawbie(p.id));
      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "switch-pawbie-edit";
      editBtn.setAttribute("aria-label", `Rename ${p.name}`);
      editBtn.innerHTML = ICON_EDIT;
      editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openEditNameOverlay("pawbie", p.id);
      });
      li.appendChild(btn);
      li.appendChild(editBtn);
      els.switchPawbieList.appendChild(li);
    });
  }

  function openSwitchPawbieSheet() {
    renderSwitchPawbieSheet();
    els.switchPawbieOverlay.classList.remove("hidden");
  }

  function closeSwitchPawbieSheet() {
    els.switchPawbieOverlay.classList.add("hidden");
  }

  function renderHeroMood() {
    const p = getActivePawbie();
    const mood = MOOD_VISUALS[p.mood] || MOOD_VISUALS.active;
    els.heroVisual.textContent = mood.emoji;
    els.heroMoodTag.textContent = mood.label;
    els.pawbieHeroInner.dataset.mood = p.mood;
    els.heroBatteryText.textContent = `${p.battery}%`;
    els.heroWifi.classList.toggle("is-offline", !p.wifi);
    els.heroWifi.setAttribute("aria-label", p.wifi ? "WiFi connected" : "WiFi disconnected");
  }

  function selectPawbie(id) {
    if (id === state.activePawbieId) {
      closeSwitchPawbieSheet();
      return;
    }
    const p = PAWBIES.find((x) => x.id === id);
    if (!p) return;
    state.activePawbieId = id;
    closeSwitchPawbieSheet();
    renderHome();
    if (p.nearby) {
      mockSwitchConnect(p.name);
    } else {
      setConnection("disconnected");
      showToast(`${p.name} isn't nearby`);
    }
  }

  function mockSwitchConnect(name) {
    showToast(`Connecting to ${name}…`);
    clearTimeout(state.connectTimer);
    state.connectTimer = setTimeout(() => {
      setConnection("connected");
      showToast(`Connected to ${name}`);
    }, 1200);
  }

  function renderPullHint() {
    const syncing = state.syncStatus === "syncing";
    const failed = state.syncStatus === "failed";
    els.diaryPullHint.classList.toggle("is-syncing", syncing);
    els.diaryPullHint.classList.toggle("is-failed", failed);
    els.diaryPullHint.classList.toggle("is-pulling", state.pullOffset > 8 && !syncing);
    if (syncing) {
      els.pullHintText.textContent = "Updating…";
      els.pullChevron.textContent = "◌";
    } else if (failed) {
      els.pullHintText.textContent = "Sync failed · pull down to retry";
      els.pullChevron.textContent = "↓";
    } else if (state.pullOffset > 36) {
      els.pullHintText.textContent = "Release to refresh";
      els.pullChevron.textContent = "↑";
    } else {
      const mins = state.lastUpdatedMin;
      els.pullHintText.textContent =
        mins === 0 ? "Updated just now · pull down" : `Updated ${mins}m ago · pull down`;
      els.pullChevron.textContent = "↓";
    }
    els.diaryPullHint.style.transform = syncing ? "" : `translateY(${Math.min(state.pullOffset * 0.35, 12)}px)`;
  }

  function renderDiaryView() {
    const v = state.diaryView;
    els.diaryLoading.classList.toggle("hidden", v !== "loading");
    els.diarySuccess.classList.toggle("hidden", v !== "success");
    els.diaryEmpty.classList.toggle("hidden", v !== "empty");
    els.diaryFailed.classList.toggle("hidden", v !== "failed");
    if (els.diaryStateDebug) els.diaryStateDebug.value = v;
  }

  function buildDiaryCard(entry) {
    const li = document.createElement("li");
    li.className = "diary-entry";
    const img = entry.optionalImage
      ? '<div class="diary-entry-photo" aria-hidden="true"></div>'
      : "";
    li.innerHTML = `
      <div class="diary-entry-head">
        <time>${entry.time}</time>
        <span class="diary-entry-emoji" aria-hidden="true">${emojiForEntry(entry)}</span>
      </div>
      <p class="diary-entry-text">${entry.text}</p>
      ${img}
    `;
    return li;
  }

  function renderDiaryList() {
    const entries = entriesForDate(state.selectedDate);
    els.diaryList.innerHTML = "";
    entries.forEach((e) => els.diaryList.appendChild(buildDiaryCard(e)));
    els.diaryListCached.innerHTML = "";
    const cached = entries.length ? entries : DIARY_ENTRIES.slice(0, 2);
    cached.forEach((e) => els.diaryListCached.appendChild(buildDiaryCard(e)));
  }

  function shiftWeek(delta) {
    const anchor = new Date(state.weekAnchor);
    anchor.setDate(anchor.getDate() + delta * 7);
    state.weekAnchor = startOfDay(anchor);
    const sel = new Date(state.selectedDate);
    sel.setDate(sel.getDate() + delta * 7);
    state.selectedDate = startOfDay(sel);
    renderDiaryContent();
  }

  function renderDiaryContent() {
    renderDiaryView();
    renderPullHint();
    els.dateHeaderText.textContent = formatDateHeader(state.selectedDate);
    const onToday = isToday(state.selectedDate);
    els.btnDiaryToday.classList.toggle("is-hidden", onToday);
    els.btnDiaryToday.setAttribute("tabindex", onToday ? "-1" : "0");

    const entries = entriesForDate(state.selectedDate);
    if (state.diaryView === "success") {
      renderDiaryList();
      const showEmpty = !entries.length;
      els.diarySuccess.classList.toggle("hidden", showEmpty);
      els.diaryEmpty.classList.toggle("hidden", !showEmpty);
    } else if (state.diaryView === "failed") {
      renderDiaryList();
    }
    renderWeekCalendar();
  }

  function renderWeekCalendar() {
    const weekStart = getWeekStart(state.weekAnchor);
    const diaryDates = datesWithDiary();
    els.weekDays.innerHTML = "";
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "week-day";
      if (isSameDay(d, state.selectedDate)) btn.classList.add("selected");
      const emotion = diaryDates.has(formatDateKey(d)) ? primaryEmotionForDate(d) : "";
      btn.innerHTML = `
        <span class="day-num">${d.getDate()}</span>
        <span class="day-emoji-slot">${emotion ? `<span class="day-emoji">${emotion}</span>` : ""}</span>
      `;
      btn.addEventListener("click", () => selectDate(d));
      els.weekDays.appendChild(btn);
    }
  }

  function renderMonthCalendar() {
    const y = state.calendarMonth.getFullYear();
    const m = state.calendarMonth.getMonth();
    els.monthLabel.textContent = `${MONTHS[m]} ${y}`;
    const first = new Date(y, m, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const diaryDates = datesWithDiary();
    const pending = state.calendarPendingDate || state.selectedDate;
    els.monthGrid.innerHTML = "";
    DAYS.forEach((d) => {
      const h = document.createElement("div");
      h.className = "dow";
      h.textContent = d.slice(0, 1);
      els.monthGrid.appendChild(h);
    });
    const prevDays = new Date(y, m, 0).getDate();
    for (let i = 0; i < startPad; i++) {
      els.monthGrid.appendChild(makeMonthDay(new Date(y, m - 1, prevDays - startPad + i + 1), pending, diaryDates, true));
    }
    for (let d = 1; d <= daysInMonth; d++) {
      els.monthGrid.appendChild(makeMonthDay(new Date(y, m, d), pending, diaryDates, false));
    }
    const total = startPad + daysInMonth;
    const rem = total % 7 === 0 ? 0 : 7 - (total % 7);
    for (let i = 1; i <= rem; i++) {
      els.monthGrid.appendChild(makeMonthDay(new Date(y, m + 1, i), pending, diaryDates, true));
    }
  }

  function makeMonthDay(date, pending, diaryDates, otherMonth) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "month-day";
    if (otherMonth) btn.classList.add("other-month");
    if (isSameDay(date, pending)) btn.classList.add("selected");
    if (isToday(date)) btn.classList.add("today-ring");
    const emotion = diaryDates.has(formatDateKey(date)) ? primaryEmotionForDate(date) : "";
    btn.innerHTML = `
      <span class="month-day-num">${date.getDate()}</span>
      <span class="day-emoji-slot">${emotion ? `<span class="day-emoji">${emotion}</span>` : ""}</span>
    `;
    btn.addEventListener("click", () => {
      state.calendarPendingDate = startOfDay(date);
      $$(".month-day.selected").forEach((el) => el.classList.remove("selected"));
      btn.classList.add("selected");
    });
    return btn;
  }

  function showScreen(screenId) {
    closeAllOverlays();
    state.screen = screenId;
    $$(".screen").forEach((s) => {
      s.classList.toggle("screen-active", s.dataset.screen === screenId);
    });
    const isMain = MAIN_TABS.has(screenId);
    els.bottomTabBar.classList.toggle("hidden", !isMain);
    if (isMain) {
      state.tab = screenId;
      $$(".tab").forEach((t) => {
        t.classList.toggle("active", t.dataset.tab === screenId);
      });
    }
    if (screenId === "diary") renderDiaryContent();
    if (screenId === "home") renderHome();
    if (screenId === "pawbie-ota") renderOta();
  }

  function navigateTab(tab) {
    showScreen(tab);
  }

  function openSubscreen(screenId, returnTo) {
    state.returnScreen = returnTo;
    showScreen(screenId);
  }

  function closeSubscreen() {
    if (MAIN_TABS.has(state.returnScreen)) {
      navigateTab(state.returnScreen);
    } else {
      navigateTab("home");
    }
  }

  function openCalendarOverlay() {
    state.calendarMonth = new Date(state.selectedDate);
    state.calendarPendingDate = new Date(state.selectedDate);
    renderMonthCalendar();
    els.calendarOverlay.classList.remove("hidden");
  }

  function closeCalendarOverlay() {
    els.calendarOverlay.classList.add("hidden");
  }

  function openHomeMenu() {
    els.homeMenu.classList.remove("hidden");
    els.homeMenuBackdrop.classList.remove("hidden");
    els.btnHomeMenu.setAttribute("aria-expanded", "true");
  }

  function closeHomeMenu() {
    els.homeMenu.classList.add("hidden");
    els.homeMenuBackdrop.classList.add("hidden");
    els.btnHomeMenu.setAttribute("aria-expanded", "false");
  }

  function openRemovePawbieOverlay() {
    const p = getActivePawbie();
    els.removePawbieMsg.textContent = `Remove ${p.name} from this app? You can pair again later.`;
    els.removePawbieOverlay.classList.remove("hidden");
  }

  function closeRemovePawbieOverlay() {
    els.removePawbieOverlay.classList.add("hidden");
  }

  function handleHomeMenuAction(action) {
    closeHomeMenu();
    if (action === "switch-pawbie") {
      openSwitchPawbieSheet();
      return;
    }
    if (action === "device-updates") {
      state.otaPhase = "idle";
      renderOta();
      openSubscreen("pawbie-ota", "home");
      return;
    }
    if (action === "change-owner") {
      openSubscreen("change-owner", "home");
      return;
    }
    if (action === "remove-pawbie") {
      openRemovePawbieOverlay();
    }
  }

  function confirmRemovePawbie() {
    const p = getActivePawbie();
    closeRemovePawbieOverlay();
    setConnection("disconnected");
    showToast(`${p.name} removed (mock)`);
  }

  function openEditNameOverlay(target, pawbieId) {
    state.editNameTarget = target;
    if (target === "owner") {
      state.editPawbieId = null;
      els.editNameTitle.textContent = "Edit what Pawbie calls you";
      els.editNameInput.value = MOCK.ownerCallName;
    } else {
      state.editPawbieId = pawbieId || state.activePawbieId;
      const p = PAWBIES.find((x) => x.id === state.editPawbieId) || getActivePawbie();
      els.editNameTitle.textContent = "Edit Pawbie name";
      els.editNameInput.value = p.name;
    }
    els.editNameOverlay.classList.remove("hidden");
    els.editNameInput.focus();
  }

  function closeEditNameOverlay() {
    els.editNameOverlay.classList.add("hidden");
    state.editNameTarget = null;
    state.editPawbieId = null;
  }

  function saveEditName() {
    const val = els.editNameInput.value.trim();
    if (!val) return;
    if (state.editNameTarget === "owner") {
      MOCK.ownerCallName = val;
      renderHeroGreeting();
      showToast("Greeting updated");
    } else {
      const p = PAWBIES.find((x) => x.id === state.editPawbieId) || getActivePawbie();
      p.name = val;
      if (p.id === state.activePawbieId) {
        els.homeTitle.textContent = val;
      }
      if (!els.switchPawbieOverlay.classList.contains("hidden")) {
        renderSwitchPawbieSheet();
      }
      showToast("Pawbie name updated");
    }
    closeEditNameOverlay();
  }

  function closeAllOverlays() {
    closeHomeMenu();
    closeCalendarOverlay();
    closeSwitchPawbieSheet();
    closeRemovePawbieOverlay();
    closeEditNameOverlay();
  }

  function renderOta() {
    const phase = state.otaPhase;
    els.otaIdle.classList.toggle("hidden", phase !== "idle");
    els.otaUpdating.classList.toggle("hidden", phase !== "updating");
    els.otaSuccess.classList.toggle("hidden", phase !== "success");
    els.otaFailed.classList.toggle("hidden", phase !== "failed");
    if (phase === "updating") {
      els.otaProgress.style.width = `${state.otaProgress}%`;
      els.otaProgressText.textContent = `${state.otaProgress}%`;
    }
  }

  function selectDate(d) {
    state.selectedDate = startOfDay(d);
    state.weekAnchor = state.selectedDate;
    renderDiaryContent();
  }

  function mockRefresh() {
    if (state.syncStatus === "syncing") return;
    state.syncStatus = "syncing";
    state.pullOffset = 0;
    renderPullHint();
    setTimeout(() => {
      if (state.diaryView === "failed") {
        state.syncStatus = "failed";
      } else {
        state.syncStatus = "latest";
        state.lastUpdatedMin = 0;
        setTimeout(() => {
          state.lastUpdatedMin = 1;
          renderPullHint();
        }, 1200);
      }
      renderPullHint();
      if (state.diaryView === "loading") {
        state.diaryView = entriesForDate(state.selectedDate).length ? "success" : "empty";
        renderDiaryContent();
      }
      showToast("Diary refreshed");
    }, 1000);
  }

  function mockConnect() {
    els.btnConnectPawbie.disabled = true;
    els.btnConnectPawbie.textContent = "Connecting…";
    clearTimeout(state.connectTimer);
    state.connectTimer = setTimeout(() => {
      setConnection("connected");
      els.btnConnectPawbie.disabled = false;
      els.btnConnectPawbie.textContent = "Connect Pawbie";
      showToast(`Connected to ${getActivePawbie().name}`);
    }, 1500);
  }

  function startOtaMock() {
    state.otaPhase = "updating";
    state.otaProgress = 0;
    renderOta();
    const steps = [15, 35, 55, 75, 90, 100];
    let i = 0;
    const tick = () => {
      if (state.otaPhase !== "updating") return;
      if (i >= steps.length) {
        state.otaPhase = "success";
        renderOta();
        return;
      }
      state.otaProgress = steps[i++];
      renderOta();
      setTimeout(tick, 450);
    };
    setTimeout(tick, 300);
  }

  function handleAction(action, source) {
    const map = {
      "add-pawbie": ["Add New Pawbie", "Pair a new Pawbie (mock)."],
      "pawbie-ota": null,
      "wifi-settings": ["WiFi Settings", "Configure Pawbie WiFi (mock)."],
      "remove-pawbie": ["Remove Pawbie", "Unbind this Pawbie (mock)."],
      "privacy-policy": ["Privacy", "Privacy policy placeholder."],
      permissions: ["Permissions", "App permissions placeholder."],
      feedback: ["Feedback", "Send feedback (mock)."],
      about: ["About", "Pawbie — your desktop companion."],
      "check-app-updates": ["App Updates", "You are on the latest build."],
    };

    if (action === "pawbie-ota") {
      state.otaPhase = "idle";
      renderOta();
      openSubscreen("pawbie-ota", "home");
      return;
    }
    const ph = map[action];
    if (ph) {
      els.placeholderTitle.textContent = ph[0];
      els.placeholderDesc.textContent = ph[1];
      openSubscreen("placeholder", source || "home");
      showToast(`${ph[0]} (mock)`);
      return;
    }
    showToast(action);
  }

  function bindControlCenterSlider(slider, fillEl, onChange) {
    if (!slider || !fillEl) return;
    const update = () => {
      const v = Number(slider.value);
      fillEl.style.height = `${v}%`;
      onChange(v);
    };
    slider.addEventListener("input", update);
    update();
  }

  function bindEvents() {
    els.tabHome.addEventListener("click", () => navigateTab("home"));
    els.tabDiary.addEventListener("click", () => navigateTab("diary"));
    els.tabSettings.addEventListener("click", () => navigateTab("settings"));

    els.connectionDebug.addEventListener("change", (e) => setConnection(e.target.value));

    els.diaryStateDebug.addEventListener("change", (e) => {
      state.diaryView = e.target.value;
      renderDiaryContent();
    });

    els.btnOtaClose.addEventListener("click", () => navigateTab("home"));
    els.btnPlaceholderClose.addEventListener("click", closeSubscreen);

    els.btnConnectPawbie.addEventListener("click", mockConnect);
    els.btnAddPawbieEmpty.addEventListener("click", () => handleAction("add-pawbie", "home"));
    els.btnHomeMenu.addEventListener("click", (e) => {
      e.stopPropagation();
      if (els.homeMenu.classList.contains("hidden")) openHomeMenu();
      else closeHomeMenu();
    });
    els.homeMenuBackdrop.addEventListener("click", closeHomeMenu);
    $$(".home-menu-item").forEach((item) => {
      item.addEventListener("click", () => {
        if (item.disabled) return;
        handleHomeMenuAction(item.dataset.menu);
      });
    });
    els.switchPawbieBackdrop.addEventListener("click", closeSwitchPawbieSheet);
    els.switchPawbieClose.addEventListener("click", closeSwitchPawbieSheet);
    els.btnAddPawbieSheet.addEventListener("click", () => {
      closeSwitchPawbieSheet();
      handleAction("add-pawbie", "home");
    });
    els.heroSpeechBubble.addEventListener("click", () => openEditNameOverlay("owner"));
    els.editNameBackdrop.addEventListener("click", closeEditNameOverlay);
    els.editNameClose.addEventListener("click", closeEditNameOverlay);
    els.editNameSave.addEventListener("click", saveEditName);
    els.editNameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") saveEditName();
    });

    $$("#screen-settings .inset-row[data-action]").forEach((row) => {
      row.addEventListener("click", () => handleAction(row.dataset.action, "settings-tab"));
    });

    bindControlCenterSlider(els.volumeSlider, $("#volume-fill"), (v) => {
      MOCK.volume = v;
    });
    bindControlCenterSlider(els.brightnessSlider, $("#brightness-fill"), (v) => {
      MOCK.brightness = v;
    });

    els.dateHeader.addEventListener("click", openCalendarOverlay);
    els.calendarBackdrop.addEventListener("click", closeCalendarOverlay);
    els.calendarClose.addEventListener("click", closeCalendarOverlay);
    els.calendarToday.addEventListener("click", () => {
      selectDate(new Date());
      closeCalendarOverlay();
    });
    els.calendarConfirm.addEventListener("click", () => {
      if (state.calendarPendingDate) selectDate(state.calendarPendingDate);
      closeCalendarOverlay();
    });
    els.monthPrev.addEventListener("click", () => {
      state.calendarMonth.setMonth(state.calendarMonth.getMonth() - 1);
      renderMonthCalendar();
    });
    els.monthNext.addEventListener("click", () => {
      state.calendarMonth.setMonth(state.calendarMonth.getMonth() + 1);
      renderMonthCalendar();
    });
    els.btnDiaryToday.addEventListener("click", () => selectDate(new Date()));

    bindDiaryPullRefresh();
    bindDiaryWeekSwipe();

    els.btnChangeOwnerClose.addEventListener("click", closeSubscreen);
    els.btnChangeOwnerStart.addEventListener("click", () => {
      closeSubscreen();
      showToast("Owner recognition started");
    });
    els.removePawbieBackdrop.addEventListener("click", closeRemovePawbieOverlay);
    els.removePawbieClose.addEventListener("click", closeRemovePawbieOverlay);
    els.removePawbieCancel.addEventListener("click", closeRemovePawbieOverlay);
    els.removePawbieConfirm.addEventListener("click", confirmRemovePawbie);

    els.btnUpdateNow.addEventListener("click", startOtaMock);
    els.btnOtaDone.addEventListener("click", () => {
      state.otaPhase = "idle";
      renderOta();
      navigateTab("home");
    });
    els.btnOtaRetry.addEventListener("click", startOtaMock);
    els.btnOtaMockStart.addEventListener("click", () => {
      openSubscreen("pawbie-ota", "home");
      startOtaMock();
    });
    els.btnOtaMockFail.addEventListener("click", () => {
      openSubscreen("pawbie-ota", "home");
      state.otaPhase = "failed";
      renderOta();
    });

    let touchX = 0;
    els.appMain.addEventListener("touchstart", (e) => {
      if (!MAIN_TABS.has(state.screen) || state.screen === "diary") return;
      touchX = e.changedTouches[0].screenX;
    }, { passive: true });
    els.appMain.addEventListener("touchend", (e) => {
      if (!MAIN_TABS.has(state.screen) || state.screen === "diary") return;
      const dx = e.changedTouches[0].screenX - touchX;
      if (Math.abs(dx) < 50) return;
      const tabs = ["home", "diary", "settings"];
      const i = tabs.indexOf(state.tab);
      if (dx < 0 && i < tabs.length - 1) navigateTab(tabs[i + 1]);
      if (dx > 0 && i > 0) navigateTab(tabs[i - 1]);
    }, { passive: true });
  }

  function bindDiaryPullRefresh() {
    let startY = 0;
    let pulling = false;
    const zone = els.diaryScrollBody;
    if (!zone) return;

    const onStart = (y) => {
      if (state.screen !== "diary" || state.syncStatus === "syncing") return;
      const scrollTop = els.appMain.scrollTop;
      if (scrollTop > 4) return;
      startY = y;
      pulling = true;
    };

    const onMove = (y) => {
      if (!pulling) return;
      const dy = y - startY;
      if (dy <= 0) {
        state.pullOffset = 0;
        renderPullHint();
        return;
      }
      state.pullOffset = Math.min(dy, 72);
      renderPullHint();
    };

    const onEnd = () => {
      if (!pulling) return;
      pulling = false;
      if (state.pullOffset > 40) {
        if (state.diaryView === "failed") state.diaryView = "success";
        mockRefresh();
      } else {
        state.pullOffset = 0;
        renderPullHint();
      }
    };

    zone.addEventListener(
      "touchstart",
      (e) => onStart(e.touches[0].clientY),
      { passive: true }
    );
    zone.addEventListener(
      "touchmove",
      (e) => {
        if (!pulling) return;
        onMove(e.touches[0].clientY);
        if (state.pullOffset > 8) e.preventDefault();
      },
      { passive: false }
    );
    zone.addEventListener("touchend", onEnd, { passive: true });

    zone.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      onStart(e.clientY);
      const onMouseMove = (ev) => onMove(ev.clientY);
      const onMouseUp = () => {
        onEnd();
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
  }

  function bindDiaryWeekSwipe() {
    let startX = 0;
    let startY = 0;
    const zone = els.diaryScrollBody;
    if (!zone) return;

    zone.addEventListener(
      "touchstart",
      (e) => {
        if (state.screen !== "diary") return;
        startX = e.touches[0].screenX;
        startY = e.touches[0].screenY;
      },
      { passive: true }
    );

    zone.addEventListener(
      "touchend",
      (e) => {
        if (state.screen !== "diary") return;
        const dx = e.changedTouches[0].screenX - startX;
        const dy = e.changedTouches[0].screenY - startY;
        if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
        if (dx < 0) shiftWeek(1);
        else shiftWeek(-1);
      },
      { passive: true }
    );

    let mouseWeekX = 0;
    zone.addEventListener("mousedown", (e) => {
      if (state.screen !== "diary" || e.button !== 0) return;
      mouseWeekX = e.clientX;
    });
    zone.addEventListener("mouseup", (e) => {
      if (state.screen !== "diary") return;
      const dx = e.clientX - mouseWeekX;
      if (Math.abs(dx) < 56) return;
      if (dx < 0) shiftWeek(1);
      else shiftWeek(-1);
    });
  }

  function init() {
    els.otaCurrent.textContent = MOCK.fwVersion;
    els.volumeSlider.value = MOCK.volume;
    els.brightnessSlider.value = MOCK.brightness;
    bindEvents();
    setConnection("connected");
    renderHome();
    renderDiaryContent();
    showScreen("home");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
