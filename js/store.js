/* ================================================================
   Cat Care PWA — Alpine.js Global Store
   Replaces App.state from app.js while preserving all data structures.

   Stores are initialized IMMEDIATELY (not in alpine:init) so that
   HTML x-show/x-text directives don't throw "Cannot read undefined"
   during Alpine's pre-init DOM scan.
   ================================================================ */

// ── Create stores synchronously before Alpine evaluates directives ──

Alpine.store('app', {
  bundle: null,
  cat: null,
  age: null,
  taskStatus: { tasks: {}, lastResetDate: '' },
  currentTab: 'home',
  shareKey: null,
  catId: null,
  isNewCat: false,
  loading: true
});

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
   Backward compatibility — expose App.store / App.state globals
   so that data.js and tasks.js continue to work.
   ---------------------------------------------------------------- */
window.App = window.App || {};
window.App.store = Alpine.store('app');
window.App.state = Alpine.store('app');
