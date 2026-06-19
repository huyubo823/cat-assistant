/* ================================================================
   Cat Care PWA — Application Controller (Supabase)
   ================================================================ */

var App = {

  state: {
    bundle: null,
    cat: null,
    age: null,
    taskStatus: {},
    currentTab: 'home',
    shareKey: null,    // 当前猫咪的分享密钥
    catId: null,       // 当前猫咪的 Supabase UUID
    isNewCat: false    // 是否刚创建
  },

  /* ----------------------------------------------------------------
     Bootstrap
     ---------------------------------------------------------------- */

  init: async function () {
    var loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.classList.remove('hidden');

    // 加载知识库
    try {
      App.state.bundle = await loadKnowledgeBundle();
    } catch (_e) {
      return; // 错误已在 loadKnowledgeBundle 中显示
    }

    // 解析 URL 中的 ?cat= 参数
    var params = new URLSearchParams(window.location.search);
    var shareKey = params.get('cat');

    if (shareKey) {
      // ── 已有分享链接 → 从云端加载 ──
      var cat = await fetchCat(shareKey);
      if (!cat) {
        loadingOverlay.classList.add('hidden');
        showNotFound(shareKey);
        return;
      }
      App.state.cat = cat;
      App.state.shareKey = shareKey;
      App.state.catId = cat.id;
      App.state.age = calculateAge(cat.birthday);
      App.state.taskStatus = await fetchTaskStatus(cat.id);
      loadingOverlay.classList.add('hidden');
      renderCurrentTab();

      // 订阅实时变更
      subscribeTaskChanges(cat.id, function () {
        fetchTaskStatus(cat.id).then(function (ts) {
          App.state.taskStatus = ts;
          // 跳过 toggle 后 2 秒内的 Realtime 渲染，等待 Supabase 副本同步
          var recentlyToggled = App._lastToggleTime && (Date.now() - App._lastToggleTime < 2000);
          if (!recentlyToggled && App.state.currentTab === 'home') {
            renderHomeTab(App.state);
          }
        });
      });

    } else {
      // ── 无分享链接 → 显示欢迎表单 ──
      loadingOverlay.classList.add('hidden');
      showWelcomeForm();
    }
  },

  /* ----------------------------------------------------------------
     Actions
     ---------------------------------------------------------------- */

  /**
   * 创建新猫后调用 — 跳转到带 share_key 的 URL
   */
  onCatCreated: function (cat) {
    var newUrl = window.location.pathname + '?cat=' + cat.share_key;
    window.location.href = newUrl;
  },

  /**
   * 任务打卡
   */
  toggleTask: async function (taskId) {
    // 记录点击时间，阻止 Realtime 在 2 秒内渲染（等待副本同步）
    App._lastToggleTime = Date.now();

    var ts = App.state.taskStatus;
    var taskEntry = ts.tasks[taskId];
    var today = getTodayStr();
    var catId = App.state.catId;

    // 从 bundle 中找任务定义
    var taskDef = null;
    var tasks = App.state.bundle && App.state.bundle.tasks ? App.state.bundle.tasks.tasks : [];
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i].id === taskId) { taskDef = tasks[i]; break; }
    }
    if (!taskDef) return;

    if (!taskEntry) {
      taskEntry = { completed_at: null, type: taskDef.type };
      ts.tasks[taskId] = taskEntry;
    }

    var type = taskDef.type;
    var periodDays = taskDef.period_days || 30;
    var newCompleted = null;
    var newPeriodNext = null;

    // 切换完成状态
    if (type === 'daily_reset') {
      // 每日任务：切换今日完成
      if (taskEntry.completed_at === today) {
        newCompleted = null; // 取消
      } else {
        newCompleted = today;
      }
    } else if (type === 'schedule_trigger') {
      if (taskEntry.completed_at) {
        newCompleted = null; // 取消
      } else {
        newCompleted = new Date().toISOString();
      }
    } else {
      // periodic
      if (taskEntry.completed_at && !taskEntry.period_next) {
        newCompleted = null; // 取消
      } else if (taskEntry.completed_at) {
        newCompleted = null; // 取消
      } else {
        newCompleted = new Date().toISOString();
        newPeriodNext = new Date(Date.now() + periodDays * 86400000).toISOString();
      }
    }

    // 写入 Supabase（try/finally 防止网络失败导致 _togglingTask 卡死）
    try {
      await upsertTaskStatus(catId, taskId, type, newCompleted, newPeriodNext, type === 'daily_reset' ? today : null);

      // 更新本地状态
      if (!ts.tasks) ts.tasks = {};
      ts.tasks[taskId] = {
        completed_at: newCompleted,
        period_next: newPeriodNext,
        type: type
      };

      // 合并到当前状态对象，避免 await 期间 Realtime 替换了引用
      if (!App.state.taskStatus.tasks) App.state.taskStatus.tasks = {};
      App.state.taskStatus.tasks[taskId] = ts.tasks[taskId];
      if (App.state.currentTab === 'home') renderHomeTab(App.state);
    } finally {
      // _lastToggleTime 会在 2 秒后自动过期，无需手动清除
    }
  },

  /* ----------------------------------------------------------------
     Tab navigation
     ---------------------------------------------------------------- */

  switchTab: function (tabName) {
    App.state.currentTab = tabName;
    renderCurrentTab();

    var buttons = document.querySelectorAll('.tab-bar .tab-btn');
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      if (btn.getAttribute('data-tab') === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    }
  }
};

/* ==================================================================
   Internal helpers
   ================================================================== */

function renderCurrentTab() {
  var currentTab = App.state.currentTab;
  var state = App.state;

  // 每次切换 Tab 时重新计算年龄，确保喂养/健康等页面使用最新年龄
  if (state.cat && state.cat.birthday) {
    App.state.age = calculateAge(state.cat.birthday);
    state = App.state;
  }

  var sections = document.querySelectorAll('.tab-content');
  for (var i = 0; i < sections.length; i++) {
    sections[i].style.display = 'none';
    sections[i].classList.remove('active');
  }

  var target = document.getElementById('tab-' + currentTab);
  if (target) {
    target.style.display = 'block';
    target.classList.add('active');
  }

  switch (currentTab) {
    case 'home':
      if (typeof renderHomeTab === 'function') renderHomeTab(state);
      break;
    case 'feeding':
      if (typeof renderFeedingTab === 'function') renderFeedingTab(state);
      break;
    case 'health':
      if (typeof renderHealthTab === 'function') renderHealthTab(state);
      break;
    case 'growth':
      if (typeof renderGrowthTab === 'function') renderGrowthTab(state);
      break;
    case 'settings':
      if (typeof renderSettingsTab === 'function') renderSettingsTab(state);
      break;
    case 'emergency':
      if (typeof renderEmergency === 'function') renderEmergency();
      break;
  }
}

/* ==================================================================
   Event wiring
   ================================================================== */

window.addEventListener('DOMContentLoaded', function () {
  App.init();
});

document.addEventListener('click', function (e) {
  // Tab-bar button
  var tabBtn = e.target.closest('.tab-btn');
  if (tabBtn) {
    var tabName = tabBtn.getAttribute('data-tab');
    if (tabName) App.switchTab(tabName);
    return;
  }

  // Emergency header bar
  if (e.target.closest('.emergency-header')) {
    e.preventDefault();
    openEmergencyModal();
    return;
  }

  // Emergency modal close
  if (e.target.closest('#emergency-modal-close') || e.target.id === 'emergency-modal') {
    closeEmergencyModal();
    return;
  }
});

/* Emergency modal */
function openEmergencyModal() {
  var modal = document.getElementById('emergency-modal');
  if (modal) {
    modal.style.display = 'block';
    modal.setAttribute('aria-hidden', 'false');
    if (typeof renderEmergency === 'function') renderEmergency();
  }
}

function closeEmergencyModal() {
  var modal = document.getElementById('emergency-modal');
  if (modal) {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
  }
}
