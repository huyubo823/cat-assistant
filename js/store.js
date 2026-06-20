/* ================================================================
   Cat Care PWA — Alpine.js Global Store
   Replaces App.state from app.js while preserving all data structures.

   IMPORTANT: store.js runs BEFORE Alpine CDN in the script order.
   All Alpine.store() calls MUST be inside alpine:init listener,
   which fires before Alpine evaluates DOM directives.
   ================================================================ */

document.addEventListener('alpine:init', function () {

  /* ----------------------------------------------------------------
     $store.app — Global application state (mirrors old App.state)
     ---------------------------------------------------------------- */
  Alpine.store('app', {
    bundle: {},
    cat: {},
    age: null,
    taskStatus: { tasks: {}, lastResetDate: '' },
    currentTab: 'home',
    shareKey: null,
    catId: null,
    isNewCat: false,
    loading: true
  });

  /* ----------------------------------------------------------------
     $store.tasks — Computed task lists
     ---------------------------------------------------------------- */
  Alpine.store('tasks', {
    daily: [],
    schedule: [],
    periodic: [],
    doneItems: [],

    refresh: function () {
      var app = Alpine.store('app');
      if (!app.cat || !app.bundle) {
        this.daily = [];
        this.schedule = [];
        this.periodic = [];
        this.doneItems = [];
        return;
      }
      resetDailyTasksIfNewDay(app.taskStatus);
      var allTasks = generateDailyTasks(app.cat, app.bundle, app.taskStatus);
      var daily = [], schedule = [], periodic = [], doneItems = [];
      for (var i = 0; i < allTasks.length; i++) {
        var t = allTasks[i];
        if (t.type === 'daily_reset') daily.push(t);
        else if (t.type === 'schedule_trigger') {
          if (t.status === 'done') doneItems.push(t);
          else schedule.push(t);
        } else if (t.type === 'periodic') periodic.push(t);
      }
      this.daily = daily;
      this.schedule = schedule;
      this.periodic = periodic;
      this.doneItems = doneItems;
    }
  });

  /* ----------------------------------------------------------------
     $store.ui — UI state (alerts, modals, chat, collapsibles)
     ---------------------------------------------------------------- */
  Alpine.store('ui', {
    pageTransition: false,
    showWelcome: false,
    notFound: null,
    loading: false,
    chatMessages: [],
    chatInput: '',
    chatLoading: false,
    chatApiKey: null,
    collapsibleState: {}
  });

  /* ----------------------------------------------------------------
     Backward compatibility
     ---------------------------------------------------------------- */
  window.App = window.App || {};
  window.App.store = Alpine.store('app');
  window.App.state = Alpine.store('app');

  // Defer init until all defer scripts have loaded
  setTimeout(function () {
    if (window.Actions && window.Actions.init) Actions.init();
  }, 50);
});
