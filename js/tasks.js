/* ================================================================
   Cat Care PWA — Smart Task Engine
   Three task types: daily_reset, schedule_trigger, periodic
   ================================================================ */

/**
 * Reset daily_reset task completion states when the calendar date
 * has changed.  Non-daily tasks (schedule_trigger / periodic) are
 * left untouched — they use ISO timestamps (>10 chars), so we
 * can tell them apart from daily dates ("YYYY-MM-DD" = 10 chars).
 *
 * @param {object} taskStatus  {lastResetDate, tasks}
 * @returns {object}  The same taskStatus object (mutated in place)
 */
function resetDailyTasksIfNewDay(taskStatus) {
  var today = getTodayStr();

  if (taskStatus.lastResetDate !== today) {
    // Only clear tasks whose completed_at is a plain date string
    // (10 chars, "YYYY-MM-DD").  Schedule / periodic tasks store
    // full ISO timestamps which are longer, so they survive.
    var tasks = taskStatus.tasks;
    for (var taskId in tasks) {
      if (!tasks.hasOwnProperty(taskId)) continue;
      var completed = tasks[taskId].completed_at;
      if (typeof completed === 'string' && completed.length === 10) {
        tasks[taskId].completed_at = null;
      }
    }

    taskStatus.lastResetDate = today;
    // Supabase 异步重置（不阻塞渲染）
    if (App.state && App.state.catId) {
      resetDailyTasks(App.state.catId, today).catch(function () {});
    }
  }

  return taskStatus;
}

/**
 * Build the list of tasks that should appear on today's home tab.
 *
 * Filtering rules per type:
 *   daily_reset      — always included when cat is inside the age window;
 *                       status is 'done' when completed_at === today.
 *   schedule_trigger — appears at trigger_age_weeks and persists until
 *                       the user completes it (one-time).
 *   periodic         — period_days after last completion the task reappears;
 *                       if the due date is more than 1.5× period in the past
 *                       the status becomes 'overdue'.
 *
 * @param {object} cat           Cat profile {birthday, …}
 * @param {object} bundle        Parsed knowledge bundle
 * @param {object} taskStatus    {lastResetDate, tasks}
 * @param {string} [todayOverride]  "YYYY-MM-DD" for testing
 * @returns {Array<{id, name, icon, type, category, time_of_day,
 *                  importance, description, reminder_text,
 *                  status:'pending'|'done'|'overdue'}>}
 */
function generateDailyTasks(cat, bundle, taskStatus, todayOverride) {
  var today = todayOverride || getTodayStr();
  var age = calculateAge(cat.birthday, todayOverride);
  var catAgeWeeks = age.weeks;
  var result = [];

  var allTasks = bundle.tasks.tasks;

  for (var i = 0; i < allTasks.length; i++) {
    var task = allTasks[i];

    // --- Age window (min) ---
    if (task.age_weeks_min !== undefined &&
        task.age_weeks_min !== null &&
        catAgeWeeks < task.age_weeks_min) {
      continue;
    }

    // --- Age window (max) ---
    if (task.age_weeks_max !== undefined &&
        task.age_weeks_max !== null &&
        catAgeWeeks > task.age_weeks_max) {
      continue;
    }

    // ================================================================
    //  Type: daily_reset
    // ================================================================
    if (task.type === 'daily_reset') {
      var drEntry = taskStatus.tasks[task.id];
      var drCompletedToday = drEntry && drEntry.completed_at === today;

      result.push({
        id: task.id,
        name: task.name,
        icon: task.icon || '',
        type: task.type,
        category: task.category || '',
        time_of_day: task.time_of_day || '',
        importance: task.importance || '',
        description: task.description || '',
        reminder_text: task.reminder_text || '',
        status: drCompletedToday ? 'done' : 'pending'
      });
      continue;
    }

    // ================================================================
    //  Type: schedule_trigger
    // ================================================================
    if (task.type === 'schedule_trigger') {
      // Not old enough for this trigger yet
      if (catAgeWeeks < task.trigger_age_weeks) {
        continue;
      }

      var stEntry = taskStatus.tasks[task.id];
      var stDone = stEntry && stEntry.completed_at !== null && stEntry.completed_at !== undefined;

      result.push({
        id: task.id,
        name: task.name,
        icon: task.icon || '',
        type: task.type,
        category: task.category || '',
        time_of_day: '',
        importance: task.importance || '',
        description: task.description || '',
        reminder_text: task.reminder_text || '',
        status: stDone ? 'done' : 'pending'
      });
      continue;
    }

    // ================================================================
    //  Type: periodic
    // ================================================================
    if (task.type === 'periodic') {
      var pEntry = taskStatus.tasks[task.id];
      if (!pEntry) {
        pEntry = { completed_at: null, period_next: null };
        taskStatus.tasks[task.id] = pEntry;
      }

      var periodDays = task.period_days || 30;

      // Never completed — always due
      if (pEntry.completed_at === null || pEntry.completed_at === undefined) {
        result.push({
          id: task.id,
          name: task.name,
          icon: task.icon || '',
          type: task.type,
          category: task.category || '',
          time_of_day: '',
          importance: task.importance || '',
          description: task.description || '',
          reminder_text: task.reminder_text || '',
          status: 'pending'
        });
        continue;
      }

      // Has been completed — figure out when it's due next
      var periodNext = pEntry.period_next;
      if (!periodNext) {
        // Compute from last completion date
        var completedDate = new Date(pEntry.completed_at);
        periodNext = new Date(completedDate.getTime() + periodDays * 86400000).toISOString();
        pEntry.period_next = periodNext;
      }

      var periodNextDate = new Date(periodNext);
      var todayDateObj = new Date(today + 'T00:00:00');

      // Not due yet
      if (periodNextDate > todayDateObj) {
        continue;
      }

      // Due — check for overdue
      var overdueDays = Math.floor((todayDateObj - periodNextDate) / 86400000);
      var overdueThreshold = Math.floor(periodDays * 1.5);
      var pStatus = overdueDays > overdueThreshold ? 'overdue' : 'pending';

      result.push({
        id: task.id,
        name: task.name,
        icon: task.icon || '',
        type: task.type,
        category: task.category || '',
        time_of_day: '',
        importance: task.importance || '',
        description: task.description || '',
        reminder_text: task.reminder_text || '',
        status: pStatus
      });
      continue;
    }
  }

  // ==================================================================
  //  Sort: pending / overdue first, then done.
  //  Within active group: daily_reset → schedule_trigger → periodic
  //  Within done group: daily_reset → periodic → schedule_trigger
  //  (done one-time tasks sink to the very bottom)
  // ==================================================================
  var typeOrder = {
    'daily_reset': 0,
    'schedule_trigger': 1,
    'periodic': 2
  };

  result.sort(function (a, b) {
    // Active (pending / overdue) before completed (done)
    var aActive = (a.status === 'pending' || a.status === 'overdue') ? 0 : 1;
    var bActive = (b.status === 'pending' || b.status === 'overdue') ? 0 : 1;
    if (aActive !== bActive) return aActive - bActive;

    // Both done: one-time tasks (schedule_trigger) sink to very bottom
    if (aActive === 1 && bActive === 1) {
      var aOneTime = a.type === 'schedule_trigger' ? 1 : 0;
      var bOneTime = b.type === 'schedule_trigger' ? 1 : 0;
      if (aOneTime !== bOneTime) return aOneTime - bOneTime;
    }

    // Same activity group — order by task type
    var aType = typeOrder[a.type] !== undefined ? typeOrder[a.type] : 99;
    var bType = typeOrder[b.type] !== undefined ? typeOrder[b.type] : 99;
    return aType - bType;
  });

  return result;
}

/**
 * Toggle a task's completion state (or un-complete it).
 *
 * Behaviour per type:
 *   daily_reset      — completed_at  = today's date string / null
 *   schedule_trigger — completed_at  = ISO timestamp    / null
 *   periodic         — completed_at  = ISO timestamp    / null
 *                       period_next   = completed + period_days / null (on undo)
 *
 * @param {string} taskId      Task identifier from the bundle
 * @param {object} taskStatus  {lastResetDate, tasks} — mutated in place
 */
function toggleTask(taskId, taskStatus) {
  // Find task definition in the bundle
  var allTasks = App.state.bundle.tasks.tasks;
  var task = null;
  for (var i = 0; i < allTasks.length; i++) {
    if (allTasks[i].id === taskId) {
      task = allTasks[i];
      break;
    }
  }
  if (!task) return;

  // Ensure a status entry exists
  if (!taskStatus.tasks[taskId]) {
    taskStatus.tasks[taskId] = { completed_at: null, period_next: null };
  }
  var entry = taskStatus.tasks[taskId];

  if (task.type === 'daily_reset') {
    // Toggle: if already completed today → unmark; otherwise → mark done
    if (entry.completed_at === getTodayStr()) {
      entry.completed_at = null;
    } else {
      entry.completed_at = getTodayStr();
    }
  } else if (task.type === 'schedule_trigger') {
    // Toggle: one-time completion (can be undone)
    if (entry.completed_at) {
      entry.completed_at = null;
    } else {
      entry.completed_at = new Date().toISOString();
    }
  } else if (task.type === 'periodic') {
    // Toggle: complete → set next due date; undo → clear everything
    if (entry.completed_at) {
      entry.completed_at = null;
      entry.period_next = null;
    } else {
      entry.completed_at = new Date().toISOString();
      var periodDays = task.period_days || 30;
      entry.period_next = new Date(Date.now() + periodDays * 86400000).toISOString();
    }
  }

  // toggle 由 App.toggleTask (app.js) 直接处理 Supabase 写入
}

/**
 * Find the current milestone (development stage) matching the cat's age.
 *
 * @param {{weeks: number, days: number}} age    From calculateAge()
 * @param {object} bundle                         Parsed knowledge bundle
 * @returns {{stage_name: string, care_note: string,
 *            watch_out: string[]}|null}          Matching stage, or null
 */
function getStageAlert(age, bundle) {
  if (!bundle || !bundle.milestones || !bundle.milestones.milestones) {
    return null;
  }

  var milestones = bundle.milestones.milestones;

  for (var i = 0; i < milestones.length; i++) {
    var m = milestones[i];
    // age_weeks is [minWeek, maxWeek] inclusive
    if (age.weeks >= m.age_weeks[0] && age.weeks <= m.age_weeks[1]) {
      return {
        stage_name: m.stage_name,
        care_note: m.care_note || '',
        watch_out: m.watch_out || []
      };
    }
  }

  return null;
}
