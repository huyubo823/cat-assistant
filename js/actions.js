/* ================================================================
   Cat Care PWA — User Action Handlers (Alpine.js)
   Replaces App.toggleTask, App.switchTab, App.init from app.js
   Data layer (data.js, tasks.js, ai.js, utils.js) is UNCHANGED.

   Expects Alpine stores defined by js/store.js:
     $store.app    — cat, taskStatus, bundle, currentTab, shareKey, catId, age
     $store.tasks  — computed task lists with refresh() method
     $store.ui     — loading, showWelcome, notFound
   ================================================================ */

window.Actions = {

  /* ----------------------------------------------------------------
     Bootstrap — replaces App.init
     ---------------------------------------------------------------- */

  init: async function () {
    var appStore = Alpine.store('app');
    var tasksStore = Alpine.store('tasks');
    var uiStore = Alpine.store('ui');

    uiStore.loading = true;
    appStore.loading = true;

    // Restore persisted chat API key
    Actions.initChatKey();

    // Load knowledge bundle
    try {
      appStore.bundle = await loadKnowledgeBundle();
    } catch (_e) {
      uiStore.loading = false;
      appStore.loading = false;
      return; // error already displayed by loadKnowledgeBundle
    }

    // Parse ?cat= from URL
    var params = new URLSearchParams(window.location.search);
    var shareKey = params.get('cat');

    if (shareKey) {
      // ── Existing share link → load from cloud ──
      var cat = await fetchCat(shareKey);
      if (!cat) {
        uiStore.loading = false;
        appStore.loading = false;
        uiStore.notFound = shareKey;
        return;
      }
      appStore.cat = cat;
      appStore.shareKey = shareKey;
      appStore.catId = cat.id;
      appStore.age = calculateAge(cat.birthday);
      appStore.taskStatus = await fetchTaskStatus(cat.id);
      uiStore.loading = false;
      appStore.loading = false;

      tasksStore.refresh();

      // Subscribe to realtime changes (merge strategy: preserve local
      // tasks that the server hasn't seen yet)
      subscribeTaskChanges(cat.id, function () {
        fetchTaskStatus(cat.id).then(function (serverTs) {
          var local = appStore.taskStatus;
          if (serverTs.tasks && local && local.tasks) {
            // Preserve local lastResetDate (prevent stale server data
            // from clearing daily tasks)
            if (local.lastResetDate && !serverTs.lastResetDate) {
              serverTs.lastResetDate = local.lastResetDate;
            }
            // Preserve local tasks that server doesn't have yet
            for (var tid in local.tasks) {
              if (local.tasks.hasOwnProperty(tid) && !serverTs.tasks[tid]) {
                serverTs.tasks[tid] = local.tasks[tid];
              }
            }
          }
          appStore.taskStatus = serverTs;
          // Guard: skip re-render if a local toggle just happened
          // (within 2 seconds), letting the realtime stream settle
          if (!(appStore._lastToggleTime && Date.now() - appStore._lastToggleTime < 2000)) {
            if (appStore.currentTab === 'home') {
              tasksStore.refresh();
            }
          }
        }).catch(function (err) {
          console.error('[CatCare] Realtime fetch 失败:', err);
        });
      });

    } else {
      // ── No share link → show welcome form ──
      uiStore.loading = false;
      appStore.loading = false;
      uiStore.showWelcome = true;
    }
  },

  /* ----------------------------------------------------------------
     Task Toggle — EXACT logic from app.js:101-178 (App.toggleTask)
     ---------------------------------------------------------------- */

  toggleTask: async function (taskId) {
    var appStore = Alpine.store('app');
    var tasksStore = Alpine.store('tasks');

    appStore._lastToggleTime = Date.now();

    var ts = appStore.taskStatus;
    var taskEntry = ts.tasks[taskId];
    var today = getTodayStr();
    var catId = appStore.catId;

    // Find task definition from bundle
    var taskDef = null;
    var tasks = appStore.bundle && appStore.bundle.tasks ? appStore.bundle.tasks.tasks : [];
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

    // Toggle completion state
    if (type === 'daily_reset') {
      if (taskEntry.completed_at === today) {
        newCompleted = null;
      } else {
        newCompleted = today;
      }
    } else if (type === 'schedule_trigger') {
      if (taskEntry.completed_at) {
        newCompleted = null;
      } else {
        newCompleted = new Date().toISOString();
      }
    } else {
      // periodic
      if (taskEntry.completed_at && !taskEntry.period_next) {
        newCompleted = null;
      } else if (taskEntry.completed_at) {
        newCompleted = null;
      } else {
        newCompleted = new Date().toISOString();
        newPeriodNext = new Date(Date.now() + periodDays * 86400000).toISOString();
      }
    }

    // Save old values for rollback
    var oldCompleted = taskEntry.completed_at;
    var oldPeriodNext = taskEntry.period_next;

    // ── Optimistic update: write to local state immediately ──
    if (!ts.tasks) ts.tasks = {};
    ts.tasks[taskId] = {
      completed_at: newCompleted,
      period_next: newPeriodNext,
      type: type
    };
    if (appStore.currentTab === 'home') tasksStore.refresh();

    // ── Async write to Supabase ──
    try {
      await upsertTaskStatus(catId, taskId, type, newCompleted, newPeriodNext, type === 'daily_reset' ? today : null);
    } catch (_e) {
      // Write failed → rollback to old values
      console.error('[CatCare] upsert 失败，回滚:', taskId, _e);
      ts.tasks[taskId] = {
        completed_at: oldCompleted,
        period_next: oldPeriodNext,
        type: type
      };
      if (appStore.currentTab === 'home') tasksStore.refresh();
    }
  },

  /* ----------------------------------------------------------------
     Tab Navigation — replaces App.switchTab
     ---------------------------------------------------------------- */

  switchTab: function (tabName) {
    var appStore = Alpine.store('app');
    var tasksStore = Alpine.store('tasks');

    appStore.currentTab = tabName;

    // Recalculate age on every tab switch (feeding/health/growth
    // tabs all depend on current age)
    if (appStore.cat && appStore.cat.birthday) {
      appStore.age = calculateAge(appStore.cat.birthday);
    }

    // Refresh task list when switching to home tab
    if (tabName === 'home') {
      tasksStore.refresh();
    }
  },

  /* ----------------------------------------------------------------
     Cat CRUD
     ---------------------------------------------------------------- */

  /**
   * Create a new cat and redirect to the share URL.
   * @param {object} formData  {name, birthday, breed, gender, weight_history}
   */
  createCat: async function (formData) {
    var cat = await createCat(formData);
    var newUrl = window.location.pathname + '?cat=' + cat.share_key;
    window.location.href = newUrl;
  },

  /**
   * Update existing cat profile and sync to local store.
   * @param {object} updates  Key-value pairs to update on the cat record
   */
  updateCat: async function (updates) {
    var appStore = Alpine.store('app');
    var shareKey = appStore.shareKey;
    await updateCat(shareKey, updates);
    // Apply changes to local reactive store
    for (var key in updates) {
      if (updates.hasOwnProperty(key)) {
        appStore.cat[key] = updates[key];
      }
    }
  },

  /* ----------------------------------------------------------------
     Collapsible Toggle
     ---------------------------------------------------------------- */

  /**
   * Toggle a collapsible section identified by key.
   * @param {string} key  Unique key for the collapsible section
   */
  toggleCollapsible: function (key) {
    var uiStore = Alpine.store('ui');
    if (!uiStore.collapsibleState) uiStore.collapsibleState = {};
    uiStore.collapsibleState[key] = !uiStore.collapsibleState[key];
  },

  /* ----------------------------------------------------------------
     AI Chat
     ---------------------------------------------------------------- */

  /**
   * Initialize the chat API key from localStorage.
   */
  initChatKey: function () {
    var uiStore = Alpine.store('ui');
    uiStore.chatApiKey = localStorage.getItem('deepseek_api_key') || '';
  },

  /**
   * Save the chat API key and persist to localStorage.
   * @param {string} key
   */
  setChatApiKey: function (key) {
    AI.setApiKey(key);
    Alpine.store('ui').chatApiKey = key;
  },

  /**
   * Send a message in the AI chat. Manages the chatMessages array
   * and loading state on $store.ui.
   * @param {string} question
   */
  sendChatMessage: function (question) {
    var uiStore = Alpine.store('ui');
    var appStore = Alpine.store('app');

    if (!question || uiStore.chatLoading) return;

    uiStore.chatMessages.push({ id: Date.now(), role: 'user', content: question });
    uiStore.chatInput = '';
    uiStore.chatLoading = true;

    AI.ask(question, appStore.cat, appStore.bundle).then(function (ans) {
      uiStore.chatMessages.push({ id: Date.now() + 1, role: 'assistant', content: ans });
      uiStore.chatLoading = false;
    }).catch(function (err) {
      uiStore.chatMessages.push({ id: Date.now() + 1, role: 'assistant', content: '❌ ' + err.message });
      uiStore.chatLoading = false;
    });
  },

  /* ----------------------------------------------------------------
     Weight Management
     ---------------------------------------------------------------- */

  /**
   * Add a weight record and persist to Supabase.
   * @param {number} weightG  Weight in grams
   */
  saveWeight: async function (weightG) {
    var appStore = Alpine.store('app');
    var cat = appStore.cat;

    if (!cat.weight_history) cat.weight_history = [];
    cat.weight_history.push({ date: getTodayStr(), weight_g: weightG });
    cat.weight_history.sort(function (a, b) { return a.date.localeCompare(b.date); });

    await updateCat(appStore.shareKey, { weight_history: cat.weight_history });
  },

  /* ----------------------------------------------------------------
     UI Helpers — callable from Alpine HTML templates
     ---------------------------------------------------------------- */

  stageAlertText: function (age, bundle) {
    if (!bundle || !bundle.milestones || !bundle.milestones.milestones) return '';
    var ms = bundle.milestones.milestones;
    for (var i = 0; i < ms.length; i++) {
      if (age && age.weeks >= ms[i].age_weeks[0] && age.weeks <= ms[i].age_weeks[1]) {
        return ms[i].stage_name + ': ' + (ms[i].care_note || '');
      }
    }
    return '';
  },

  milestoneName: function (age, bundle) {
    if (!bundle || !bundle.milestones || !bundle.milestones.milestones) return '成长阶段';
    var ms = bundle.milestones.milestones;
    for (var i = 0; i < ms.length; i++) {
      if (age && age.weeks >= ms[i].age_weeks[0] && age.weeks <= ms[i].age_weeks[1]) {
        return ms[i].stage_name;
      }
    }
    return '成长阶段';
  },

  addWeightRecord: function (el) {
    var w = parseInt(el.querySelector('input').value);
    if (w > 0) Actions.saveWeight(w);
  },

  submitSettingsForm: function (el) {
    var fd = new FormData(el);
    var updates = {};
    var n = fd.get('name'); if (n) updates.name = n;
    var b = fd.get('birthday'); if (b) updates.birthday = b;
    var br = fd.get('breed'); if (br) updates.breed = br;
    var g = fd.get('gender'); if (g) updates.gender = g;
    Actions.updateCat(updates);
  },

  copyShareLink: function (el) {
    var input = document.getElementById('share-link-input');
    if (!input) return;
    input.select();
    document.execCommand('copy');
    var orig = el.textContent;
    el.textContent = '已复制!';
    setTimeout(function () { el.textContent = orig; }, 2000);
  },

  sendChatFromUI: function () {
    var q = Alpine.store('ui').chatInput;
    if (q && q.trim()) Actions.sendChatMessage(q.trim());
    document.getElementById('chat-input-field').focus();
  },

  chatEnterHandler: function (event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      Actions.sendChatFromUI();
    }
  },

  collapsibleOpen: function (key) {
    var uiStore = Alpine.store('ui');
    return uiStore.collapsibleState && uiStore.collapsibleState[key];
  }
};
