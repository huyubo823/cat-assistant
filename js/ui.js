/* ================================================================
   Cat Care PWA — UI Rendering
   Welcome / onboarding form, tab content renderers
   ================================================================ */

/* ------------------------------------------------------------------
   Welcome / Onboarding
   ------------------------------------------------------------------ */

/**
 * Display the first-time onboarding form.
 * Creates a full-screen overlay with cat-info fields.
 * On successful submit the cat is created via Supabase and
 * App.onCatCreated() handles the redirect.
 */
function showWelcomeForm() {
  // Remove any stale welcome overlay
  var existing = document.querySelector('.welcome-overlay');
  if (existing) existing.remove();

  // Default birthday: 4 weeks before today
  var fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  var defaultBirthday = fourWeeksAgo.toLocaleDateString('en-CA');

  var overlay = document.createElement('div');
  overlay.className = 'welcome-overlay';

  overlay.innerHTML =
    '<div class="welcome-card">' +

    // Title
    '<h1 class="welcome-title">🐱 欢迎使用小猫成长助手！</h1>' +
    '<p class="welcome-subtitle">请告诉我你家小猫的信息，我会帮你制定专属养护计划</p>' +

    // Name
    '<div class="form-group">' +
    '<label class="form-label" for="welcome-name">猫咪名字</label>' +
    '<input class="form-input" id="welcome-name" type="text" placeholder="给猫咪取个名字吧" autocomplete="off">' +
    '</div>' +

    // Birthday
    '<div class="form-group">' +
    '<label class="form-label" for="welcome-birthday">出生日期</label>' +
    '<input class="form-input" id="welcome-birthday" type="date" value="' + defaultBirthday + '">' +
    '</div>' +

    // Breed
    '<div class="form-group">' +
    '<label class="form-label" for="welcome-breed">品种</label>' +
    '<select class="form-select" id="welcome-breed">' +
    '<option value="中华田园猫">中华田园猫</option>' +
    '<option value="橘猫">橘猫</option>' +
    '<option value="英短">英短</option>' +
    '<option value="美短">美短</option>' +
    '<option value="布偶">布偶</option>' +
    '<option value="缅因">缅因</option>' +
    '<option value="其他">其他</option>' +
    '</select>' +
    '</div>' +

    // Gender
    '<div class="form-group">' +
    '<label class="form-label">性别</label>' +
    '<div class="flex-row" style="gap: 24px;">' +
    '<label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">' +
    '<input type="radio" name="welcome-gender" value="公猫" checked>' +
    '公猫' +
    '</label>' +
    '<label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">' +
    '<input type="radio" name="welcome-gender" value="母猫">' +
    '母猫' +
    '</label>' +
    '</div>' +
    '</div>' +

    // Weight
    '<div class="form-group">' +
    '<label class="form-label" for="welcome-weight">当前体重</label>' +
    '<div style="display: flex; align-items: center; gap: 8px;">' +
    '<input class="form-input" id="welcome-weight" type="number" placeholder="克(g)" min="1" step="1" style="flex: 1;">' +
    '<span style="color: var(--color-text-light); font-size: 14px;">g</span>' +
    '</div>' +
    '</div>' +

    // Submit
    '<button class="btn btn-primary" id="welcome-submit" style="margin-top: 8px;">开始养猫之旅 →</button>' +

    '</div>';

  document.body.appendChild(overlay);

  // Wire up the submit button
  document.getElementById('welcome-submit').addEventListener('click', function () {
    var nameEl = document.getElementById('welcome-name');
    var birthdayEl = document.getElementById('welcome-birthday');
    var breedEl = document.getElementById('welcome-breed');
    var weightEl = document.getElementById('welcome-weight');

    var name = nameEl ? nameEl.value.trim() : '';
    var birthday = birthdayEl ? birthdayEl.value : '';
    var breed = breedEl ? breedEl.value : '';
    var weightRaw = weightEl ? weightEl.value.trim() : '';

    // Gender radio
    var genderRadio = document.querySelector('input[name="welcome-gender"]:checked');
    var gender = genderRadio ? genderRadio.value : '公猫';

    // --- Validation ---
    if (!name) {
      alert('请输入猫咪的名字');
      return;
    }
    if (!birthday) {
      alert('请选择猫咪的出生日期');
      return;
    }
    if (!breed) {
      alert('请选择猫咪的品种');
      return;
    }
    var weightNum = parseInt(weightRaw, 10);
    if (!weightRaw || isNaN(weightNum) || weightNum <= 0) {
      alert('请输入猫咪的当前体重（克）');
      return;
    }

    // --- Build cat object ---
    var catData = {
      name: name,
      birthday: birthday,
      breed: breed,
      gender: gender,
      weight_history: [
        {
          date: getTodayStr(),
          weight_g: weightNum
        }
      ]
    };

    var btn = document.getElementById('welcome-submit');
    btn.disabled = true;
    btn.textContent = '创建中...';
    createCat(catData).then(function (cat) {
      overlay.remove();
      App.onCatCreated(cat);
    }).catch(function (err) {
      btn.disabled = false;
      btn.textContent = '开始养猫之旅 →';
      alert('创建失败: ' + (err.message || '请检查网络连接'));
    });
  });
}

/**
 * Show a "cat not found" error state when a share key doesn't
 * resolve to a valid cat in the database.
 *
 * @param {string} shareKey
 */
function showNotFound(shareKey) {
  var main = document.getElementById('main-content');
  if (!main) return;
  main.innerHTML =
    '<div class="error-state" style="padding: 60px 20px;">' +
    '<p style="font-size: 48px; margin-bottom: 16px;">🐱</p>' +
    '<p style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">猫咪不存在</p>' +
    '<p style="color: #888; font-size: 14px;">分享链接无效，或猫咪已被删除</p>' +
    '<a href="/" class="btn btn-primary" style="margin-top: 24px; text-decoration: none;">创建我的猫咪</a>' +
    '</div>';
}

/* ------------------------------------------------------------------
   Tab Renderers
   ------------------------------------------------------------------ */

/**
 * Home tab — cat card, stage alert, and today's task checklist.
 * @param {object} state  App.state
 */
function renderHomeTab(state) {
  var section = document.getElementById('tab-home');
  if (!section) return;

  if (!state.cat) {
    section.innerHTML =
      '<div class="home-welcome">' +
      '<h1>🐱 小猫养育助手</h1>' +
      '<p class="home-subtitle">科学喂养，健康长大</p>' +
      '<div class="empty-state">暂无猫咪信息</div>' +
      '</div>';
    return;
  }

  // --- Ensure daily tasks are reset if we crossed midnight ---
  resetDailyTasksIfNewDay(state.taskStatus);

  // --- Generate today's task list ---
  var tasks = generateDailyTasks(state.cat, state.bundle, state.taskStatus);

  var cat = state.cat;
  var age = state.age;
  var latestWeight = cat.weight_history &&
    cat.weight_history.length > 0
    ? cat.weight_history[cat.weight_history.length - 1].weight_g
    : '?';
  var genderSymbol = cat.gender === '公猫' ? '♂' : '♀'; // ♂ / ♀

  var ageBadgeText = '';
  if (age) {
    if (age.weeks > 0) {
      ageBadgeText = age.weeks + '周' + age.days + '天大';
    } else {
      ageBadgeText = age.days + '天大';
    }
  }

  // --- Build HTML ---
  var html = '';

  // ===== Section 1: Cat Card =====
  html +=
    '<div class="card cat-card">' +
    '<div class="cat-avatar">🐱</div>' +                           // 🐱
    '<div class="cat-name">' + escapeHtml(cat.name) + '</div>' +
    '<div class="cat-meta">' +
      escapeHtml(cat.breed) + ' · ' + genderSymbol + ' · ' +      // · ♂/♀ · weight
      latestWeight + 'g' +
    '</div>' +
    '<div class="cat-age-badge">' + ageBadgeText + '</div>' +
    '</div>';

  // ===== Section 2: Stage Alert (if applicable) =====
  var stageAlert = getStageAlert(age, state.bundle);
  if (stageAlert) {
    html +=
      '<div class="card stage-alert">💡 ' +                         // 💡
      escapeHtml(stageAlert.care_note) +
      '</div>';
  }

  // ===== Section 3: Today's Tasks =====
  html += '<div class="card">';

  if (tasks.length === 0) {
    // Empty state
    html += '<div class="empty-state">今天没有待办任务 🎉</div>';   // 🎉
  } else {
    // Group tasks by type
    var dailyTasks = [];
    var scheduleTasks = [];
    var periodicTasks = [];

    for (var i = 0; i < tasks.length; i++) {
      var t = tasks[i];
      if (t.type === 'daily_reset') {
        dailyTasks.push(t);
      } else if (t.type === 'schedule_trigger') {
        scheduleTasks.push(t);
      } else if (t.type === 'periodic') {
        periodicTasks.push(t);
      }
    }

    // Helper: render a group of tasks
    function renderTaskGroup(groupTitle, groupTasks) {
      var groupHtml = '';
      if (groupTasks.length === 0) return groupHtml;

      groupHtml += '<div class="task-section-title">' + groupTitle + '</div>';

      for (var j = 0; j < groupTasks.length; j++) {
        var task = groupTasks[j];

        // CSS classes
        var typeClass = task.type === 'daily_reset' ? 'daily' : task.type === 'schedule_trigger' ? 'schedule' : 'periodic';
        var itemClasses = 'task-item ' + typeClass;
        if (task.status === 'done') itemClasses += ' done';
        if (task.status === 'overdue') itemClasses += ' overdue';

        // Checkbox
        var checkboxClass = 'task-checkbox';
        if (task.status === 'done') checkboxClass += ' checked';

        groupHtml +=
          '<div class="' + itemClasses + '" data-task-id="' + task.id + '">' +
          '<div class="' + checkboxClass + '" onclick="App.toggleTask(\'' + task.id + '\')"></div>' +
          '<span class="task-icon">' + escapeHtml(task.icon) + '</span>' +
          '<span class="task-name">' + escapeHtml(task.name) + '</span>' +
          (task.time_of_day
            ? '<span class="task-time">' + escapeHtml(task.time_of_day) + '</span>'
            : '') +
          (task.status === 'overdue'
            ? '<span class="overdue-badge">逾期</span>'               // 逾期
            : '') +
          '</div>';
      }

      return groupHtml;
    }

    html += renderTaskGroup('🔄 每日必做', dailyTasks);          // 🔄 每日必做
    html += renderTaskGroup('📅 待完成事项', scheduleTasks); // 📅 待完成事项
    html += renderTaskGroup('🔁 定期任务', periodicTasks);       // 🔁 定期任务
  }

  html += '</div>'; // close .card

  section.innerHTML = html;
}

/* ==================================================================
   Feeding Tab
   ================================================================== */

/**
 * Render the feeding tab with age-appropriate food guidance.
 * @param {object} state  App.state
 */
function renderFeedingTab(state) {
  var section = document.getElementById('tab-feeding');
  if (!section) return;

  if (!state.cat || !state.bundle) {
    section.innerHTML = '<h2>🍼 喂养</h2><div class="empty-state">暂无数据</div>';
    return;
  }

  var cat = state.cat;
  var age = state.age;
  var bundle = state.bundle;
  var html = '<h2>🍼 喂养指南</h2>';

  // Find matching feeding stage
  var currentStage = null;
  var stages = bundle.feeding && bundle.feeding.stages ? bundle.feeding.stages : [];
  for (var i = 0; i < stages.length; i++) {
    var s = stages[i];
    if (age.weeks >= s.age_weeks[0] && age.weeks <= s.age_weeks[1]) {
      currentStage = s;
      break;
    }
  }

  // --- Card 1: Current Feeding Plan ---
  if (currentStage) {
    html += '<div class="card">';
    html += '<div class="card-header">🍼 当前喂食方案 — ' + escapeHtml(currentStage.stage) + '</div>';
    html += '<p style="margin-bottom:8px;"><strong>食物类型：</strong>' + escapeHtml(currentStage.food) + '</p>';

    if (currentStage.food_types && currentStage.food_types.length > 0) {
      html += '<p style="margin-bottom:8px;"><strong>推荐品牌：</strong>' + escapeHtml(currentStage.food_types.join('、')) + '</p>';
    }

    html += '<p style="margin-bottom:8px;"><strong>每日餐次：</strong>' + currentStage.meals_per_day + '顿</p>';

    if (currentStage.amount_per_meal_g) {
      html += '<p style="margin-bottom:8px;"><strong>每餐分量：</strong>' + escapeHtml(currentStage.amount_per_meal_g) + '</p>';
    }
    if (currentStage.amount_per_meal_ml) {
      html += '<p style="margin-bottom:8px;"><strong>每餐分量：</strong>' + escapeHtml(currentStage.amount_per_meal_ml) + '</p>';
    }

    html += '<p style="margin-bottom:8px;"><strong>每日总量：</strong>' + escapeHtml(currentStage.amount_daily) + '</p>';
    html += '<p style="margin-bottom:8px;"><strong>每日热量：</strong>' + currentStage.calories_daily + ' kcal</p>';

    if (currentStage.notes) {
      html += '<div class="divider"></div>';
      html += '<p style="font-size:14px;line-height:1.7;color:var(--color-text-light);">' + escapeHtml(currentStage.notes) + '</p>';
    }

    html += '</div>';
  } else {
    html += '<div class="card"><div class="empty-state">暂无匹配当前年龄的喂养方案</div></div>';
  }

  // --- Weaning Guide (if age 3-8 weeks) ---
  if (age.weeks >= 3 && age.weeks <= 8 && bundle.feeding && bundle.feeding.weaning_guide) {
    var wg = bundle.feeding.weaning_guide;
    html += '<div class="card">';
    html += '<div class="card-header">🍽️ ' + escapeHtml(wg.title) + '</div>';

    var steps = wg.steps || [];
    for (var si = 0; si < steps.length; si++) {
      var stepText = steps[si];
      // Determine if this is the current step
      var stepWeekStart = 0;
      if (si === 0) stepWeekStart = 3;
      else if (si === 1) stepWeekStart = 4;
      else if (si === 2) stepWeekStart = 5;
      else if (si === 3) stepWeekStart = 6;
      else if (si === 4) stepWeekStart = 7;

      var isCurrent = (age.weeks === stepWeekStart);
      var stepStyle = isCurrent
        ? 'background:var(--color-orange-light);border-left:3px solid var(--color-orange);padding:10px 12px;border-radius:8px;margin-bottom:8px;'
        : 'padding:10px 12px;margin-bottom:8px;border-left:3px solid var(--color-border);';

      html += '<div style="' + stepStyle + '">';
      html += '<span style="font-weight:700;color:var(--color-orange-dark);">第' + (si + 1) + '步</span>';
      if (isCurrent) {
        html += ' <span class="badge badge-info">当前阶段</span>';
      }
      html += '<p style="font-size:14px;margin-top:4px;line-height:1.6;">' + escapeHtml(stepText) + '</p>';
      html += '</div>';
    }

    if (wg.tips && wg.tips.length > 0) {
      html += '<div class="divider"></div>';
      html += '<p style="font-weight:600;margin-bottom:6px;">💡 断奶小贴士</p>';
      html += '<ul style="padding-left:20px;line-height:1.8;font-size:14px;">';
      for (var ti = 0; ti < wg.tips.length; ti++) {
        html += '<li>' + escapeHtml(wg.tips[ti]) + '</li>';
      }
      html += '</ul>';
    }

    html += '</div>';
  }

  // --- Collapsible: 7-Day Food Transition ---
  if (bundle.feeding && bundle.feeding.food_transition) {
    var ft = bundle.feeding.food_transition;
    html += '<div class="collapsible" id="collapsible-food-transition">';
    html += '<div class="collapsible-header" onclick="document.getElementById(\'collapsible-food-transition\').classList.toggle(\'open\')">📋 ' + escapeHtml(ft.title) + '</div>';
    html += '<div class="collapsible-body">';

    if (ft.warning) {
      html += '<p style="color:var(--color-danger);font-weight:600;margin-bottom:12px;">⚠️ ' + escapeHtml(ft.warning) + '</p>';
    }

    var ftSteps = ft.steps || [];
    for (var fsi = 0; fsi < ftSteps.length; fsi++) {
      var fts = ftSteps[fsi];
      html += '<div class="timeline-item">';
      html += '<div style="flex:1;">';
      html += '<p style="font-weight:600;">Day ' + fts.day + ' — 旧粮' + fts.old_food_percent + '% / 新粮' + fts.new_food_percent + '%</p>';
      html += '<p style="font-size:13px;color:var(--color-text-light);">' + escapeHtml(fts.note) + '</p>';
      html += '</div></div>';
    }

    html += '</div></div>';
  }

  // --- Collapsible: Forbidden Foods ---
  if (bundle.feeding && bundle.feeding.forbidden_foods) {
    var ff = bundle.feeding.forbidden_foods;
    html += '<div class="collapsible" id="collapsible-forbidden">';
    html += '<div class="collapsible-header" onclick="document.getElementById(\'collapsible-forbidden\').classList.toggle(\'open\')">🚫 猫咪禁食清单</div>';
    html += '<div class="collapsible-body">';

    for (var ffi = 0; ffi < ff.length; ffi++) {
      var food = ff[ffi];
      var severityBadge = '';
      if (food.severity && food.severity.indexOf('致命') !== -1) {
        severityBadge = '<span class="badge badge-danger">' + escapeHtml(food.severity) + '</span>';
      } else if (food.severity && food.severity.indexOf('严重') !== -1) {
        severityBadge = '<span class="badge badge-warning">' + escapeHtml(food.severity) + '</span>';
      } else {
        severityBadge = '<span class="badge badge-info">' + escapeHtml(food.severity || '中等') + '</span>';
      }

      html += '<div style="padding:10px 0;border-bottom:1px solid var(--color-border);">';
      html += '<p style="font-weight:600;margin-bottom:4px;">⚠️ ' + escapeHtml(food.food) + ' ' + severityBadge + '</p>';
      html += '<p style="font-size:13px;color:var(--color-text-light);">原因：' + escapeHtml(food.reason) + '</p>';
      if (food.action) {
        html += '<p style="font-size:13px;color:var(--color-danger);font-weight:600;">处理：' + escapeHtml(food.action) + '</p>';
      }
      html += '</div>';
    }

    html += '</div></div>';
  }

  // --- Card: Water Guide ---
  if (bundle.feeding && bundle.feeding.water_guide) {
    var water = bundle.feeding.water_guide;
    html += '<div class="card">';
    html += '<div class="card-header">💧 饮水指南</div>';
    html += '<p style="margin-bottom:8px;"><strong>每日建议饮水量：</strong>' + water.daily_water_ml_per_kg + 'ml/kg</p>';

    if (water.tips && water.tips.length > 0) {
      html += '<ul style="padding-left:20px;line-height:1.8;font-size:14px;">';
      for (var wi = 0; wi < water.tips.length; wi++) {
        html += '<li>' + escapeHtml(water.tips[wi]) + '</li>';
      }
      html += '</ul>';
    }

    html += '</div>';
  }

  section.innerHTML = html;
}

/* ==================================================================
   Health Tab
   ================================================================== */

/**
 * Render the health tab with weight tracking, vaccination/deworming
 * timelines, common diseases, bathing guide, and eye care.
 * @param {object} state  App.state
 */
function renderHealthTab(state) {
  var section = document.getElementById('tab-health');
  if (!section) return;

  if (!state.cat || !state.bundle) {
    section.innerHTML = '<h2>🏥 健康</h2><div class="empty-state">暂无数据</div>';
    return;
  }

  var cat = state.cat;
  var age = state.age;
  var bundle = state.bundle;
  var html = '<h2>🏥 健康管理</h2>';

  // --- Card 1: Weight Records ---
  var weightHistory = cat.weight_history || [];
  var latestWeight = weightHistory.length > 0 ? weightHistory[weightHistory.length - 1].weight_g : null;

  // Find standard weight for current age
  var weightStandard = null;
  var wsList = bundle.health && bundle.health.weight_standards ? bundle.health.weight_standards : [];
  for (var wsi = 0; wsi < wsList.length; wsi++) {
    if (wsList[wsi].age_weeks === age.weeks) {
      weightStandard = wsList[wsi];
      break;
    }
  }
  // Find nearest standard
  if (!weightStandard && wsList.length > 0) {
    for (var wsi2 = 0; wsi2 < wsList.length; wsi2++) {
      if (wsList[wsi2].age_weeks <= age.weeks) {
        weightStandard = wsList[wsi2];
      } else {
        break;
      }
    }
  }

  html += '<div class="card">';
  html += '<div class="card-header">⚖️ 体重记录</div>';

  if (latestWeight !== null) {
    var weightStatus = '';
    if (weightStandard) {
      var avg = weightStandard.avg_weight_g;
      var diff = latestWeight - avg;
      if (diff > 100) weightStatus = ' <span style="color:var(--color-warning);">（偏重）</span>';
      else if (diff < -100) weightStatus = ' <span style="color:var(--color-warning);">（偏轻）</span>';
      else weightStatus = ' <span style="color:var(--color-success);">（正常）</span>';

      html += '<p style="font-size:24px;font-weight:700;color:var(--color-orange-dark);">' + latestWeight + 'g' + weightStatus + '</p>';
      html += '<p style="font-size:13px;color:var(--color-text-light);margin-bottom:12px;">' + age.weeks + '周龄标准体重：' + weightStandard.min_weight_g + '–' + weightStandard.max_weight_g + 'g（平均' + weightStandard.avg_weight_g + 'g）</p>';
      if (weightStandard.note) {
        html += '<p style="font-size:13px;color:var(--color-text-light);margin-bottom:8px;">' + escapeHtml(weightStandard.note) + '</p>';
      }
    } else {
      html += '<p style="font-size:24px;font-weight:700;color:var(--color-orange-dark);">' + latestWeight + 'g</p>';
    }
  } else {
    html += '<p style="color:var(--color-text-light);">暂无体重记录</p>';
  }

  // Weight history list
  if (weightHistory.length > 1) {
    html += '<div class="divider"></div>';
    html += '<p style="font-weight:600;font-size:14px;margin-bottom:8px;">📋 历史记录</p>';
    for (var whi = weightHistory.length - 1; whi >= 0; whi--) {
      var entry = weightHistory[whi];
      var isLatest = (whi === weightHistory.length - 1);
      var entryStyle = isLatest ? 'font-weight:700;color:var(--color-orange-dark);' : '';
      html += '<p style="font-size:14px;' + entryStyle + 'padding:4px 0;">' +
        escapeHtml(entry.date) + ' — ' + entry.weight_g + 'g' +
        (isLatest ? '（最新）' : '') +
        '</p>';
    }
  }

  // Add weight form
  html += '<div class="divider"></div>';
  html += '<p style="font-weight:600;font-size:14px;margin-bottom:8px;">➕ 添加体重记录</p>';
  html += '<div class="flex-row" style="gap:8px;">' +
    '<input class="form-input" id="weight-date-input" type="date" value="' + getTodayStr() + '" style="flex:1;padding:8px 12px;font-size:14px;">' +
    '<input class="form-input" id="weight-grams-input" type="number" placeholder="克(g)" min="1" step="1" style="flex:1;padding:8px 12px;font-size:14px;">' +
    '<button class="btn btn-primary" id="add-weight-btn" style="width:auto;padding:8px 16px;font-size:14px;">记录</button>' +
    '</div>';

  html += '</div>'; // end weight card

  // --- Card 2: Vaccination Timeline ---
  html += '<div class="card">';
  html += '<div class="card-header">💉 疫苗时间线</div>';

  var vaccines = bundle.health && bundle.health.vaccination ? bundle.health.vaccination : [];
  for (var vi = 0; vi < vaccines.length; vi++) {
    var v = vaccines[vi];
    var vStatusClass = 'future';
    if (age.weeks >= v.age_weeks) {
      // Check if completed
      var vKey = 'vax_' + v.age_weeks;
      var vCompleted = state.taskStatus && state.taskStatus.tasks && state.taskStatus.tasks[vKey] && state.taskStatus.tasks[vKey].completed_at;
      if (vCompleted) {
        vStatusClass = 'done';
      } else {
        vStatusClass = 'current';
      }
    }

    html += '<div class="timeline-item ' + vStatusClass + '">';
    html += '<div style="flex:1;">';
    html += '<p style="font-weight:600;">' + v.age_weeks + '周 — ' + escapeHtml(v.vaccine) + ' (' + escapeHtml(v.dose_number) + ')</p>';
    if (v.protects_against && v.protects_against.length > 0) {
      html += '<p style="font-size:13px;color:var(--color-text-light);">预防：' + escapeHtml(v.protects_against.join('、')) + '</p>';
    }
    if (v.note) {
      html += '<p style="font-size:12px;color:var(--color-text-light);margin-top:4px;">' + escapeHtml(v.note) + '</p>';
    }
    html += '</div></div>';
  }
  html += '</div>';

  // --- Card 3: Deworming Timeline ---
  html += '<div class="card">';
  html += '<div class="card-header">🪱 驱虫时间线</div>';

  var dewormings = bundle.health && bundle.health.deworming ? bundle.health.deworming : [];
  for (var di = 0; di < dewormings.length; di++) {
    var dw = dewormings[di];
    var dwStatusClass = 'future';
    if (age.weeks >= dw.age_weeks) {
      var dwKey = 'dew_' + dw.age_weeks;
      var dwCompleted = state.taskStatus && state.taskStatus.tasks && state.taskStatus.tasks[dwKey] && state.taskStatus.tasks[dwKey].completed_at;
      if (dwCompleted) {
        dwStatusClass = 'done';
      } else {
        dwStatusClass = 'current';
      }
    }

    html += '<div class="timeline-item ' + dwStatusClass + '">';
    html += '<div style="flex:1;">';
    html += '<p style="font-weight:600;">' + dw.age_weeks + '周 — ' + escapeHtml(dw.type) + '</p>';
    if (dw.product_example) {
      html += '<p style="font-size:13px;color:var(--color-text-light);">推荐：' + escapeHtml(dw.product_example) + '</p>';
    }
    html += '<p style="font-size:13px;color:var(--color-text-light);">频率：' + escapeHtml(dw.frequency) + '</p>';
    if (dw.note) {
      html += '<p style="font-size:12px;color:var(--color-text-light);margin-top:4px;">' + escapeHtml(dw.note) + '</p>';
    }
    html += '</div></div>';
  }
  html += '</div>';

  // --- Common Diseases (Collapsible cards) ---
  var diseases = bundle.health && bundle.health.common_diseases ? bundle.health.common_diseases : [];
  for (var cdIdx = 0; cdIdx < diseases.length; cdIdx++) {
    var disease = diseases[cdIdx];
    var diseaseId = 'collapsible-disease-' + cdIdx;
    html += '<div class="collapsible" id="' + diseaseId + '">';
    html += '<div class="collapsible-header" onclick="document.getElementById(\'' + diseaseId + '\').classList.toggle(\'open\')">🦠 ' + escapeHtml(disease.name) + '</div>';
    html += '<div class="collapsible-body">';

    html += '<p><strong>类型：</strong>' + escapeHtml(disease.type) + '</p>';
    if (disease.mortality) {
      html += '<p><strong>死亡率：</strong>' + escapeHtml(disease.mortality) + '</p>';
    }
    html += '<p style="margin-top:8px;"><strong>🤒 症状：</strong></p>';
    html += '<ul style="padding-left:20px;line-height:1.8;">';
    for (var symi = 0; symi < disease.symptoms.length; symi++) {
      html += '<li>' + escapeHtml(disease.symptoms[symi]) + '</li>';
    }
    html += '</ul>';

    html += '<p style="margin-top:8px;"><strong>💊 治疗：</strong></p>';
    html += '<p style="font-size:13px;line-height:1.7;">' + escapeHtml(disease.treatment) + '</p>';

    html += '<p style="margin-top:8px;"><strong>🛡️ 预防：</strong></p>';
    html += '<p style="font-size:13px;line-height:1.7;">' + escapeHtml(disease.prevention) + '</p>';

    if (disease.note) {
      html += '<p style="margin-top:8px;color:var(--color-text-light);font-size:13px;">💡 ' + escapeHtml(disease.note) + '</p>';
    }

    html += '</div></div>';
  }

  // --- Collapsible: Bathing Guide ---
  if (bundle.health && bundle.health.bathing_guide) {
    var bath = bundle.health.bathing_guide;
    var bathId = 'collapsible-bathing';
    html += '<div class="collapsible" id="' + bathId + '">';
    html += '<div class="collapsible-header" onclick="document.getElementById(\'' + bathId + '\').classList.toggle(\'open\')">🛁 洗澡安全指南</div>';
    html += '<div class="collapsible-body">';

    html += '<p><strong>安全洗澡年龄：</strong>' + bath.safe_age_weeks + '周（理想：' + bath.ideal_age_weeks + '周）</p>';

    // Risks under 8 weeks
    if (bath.risks_under_8_weeks && bath.risks_under_8_weeks.length > 0) {
      html += '<p style="margin-top:8px;color:var(--color-danger);font-weight:600;">⚠️ 8周以下洗澡风险：</p>';
      html += '<ul style="padding-left:20px;line-height:1.8;">';
      for (var ri = 0; ri < bath.risks_under_8_weeks.length; ri++) {
        html += '<li style="color:var(--color-danger);">' + escapeHtml(bath.risks_under_8_weeks[ri]) + '</li>';
      }
      html += '</ul>';
    }

    // If already bathed section
    if (bath.if_already_bathed) {
      var iab = bath.if_already_bathed;
      html += '<div class="divider"></div>';
      html += '<p style="font-weight:700;color:var(--color-orange-dark);">⚠️ ' + escapeHtml(iab.title) + '</p>';

      if (iab.watch_signs && iab.watch_signs.length > 0) {
        html += '<p style="margin-top:8px;font-weight:600;">观察项目：</p>';
        for (var wsi = 0; wsi < iab.watch_signs.length; wsi++) {
          var sign = iab.watch_signs[wsi];
          html += '<label style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;font-size:14px;cursor:pointer;">';
          html += '<input type="checkbox" style="margin-top:3px;">';
          html += '<span>' + escapeHtml(sign) + '</span>';
          html += '</label>';
        }
      }

      if (iab.emergency_if && iab.emergency_if.length > 0) {
        html += '<p style="margin-top:8px;color:var(--color-danger);font-weight:600;">🚨 以下情况立即就医：</p>';
        html += '<ul style="padding-left:20px;line-height:1.8;color:var(--color-danger);">';
        for (var eii = 0; eii < iab.emergency_if.length; eii++) {
          html += '<li>' + escapeHtml(iab.emergency_if[eii]) + '</li>';
        }
        html += '</ul>';
      }

      if (iab.current_action) {
        html += '<p style="margin-top:8px;background:var(--color-orange-light);padding:10px;border-radius:8px;font-size:14px;">' + escapeHtml(iab.current_action) + '</p>';
      }
    }

    // Alternatives
    if (bath.alternatives && bath.alternatives.length > 0) {
      html += '<div class="divider"></div>';
      html += '<p style="font-weight:600;">✅ 安全替代方案：</p>';
      html += '<ul style="padding-left:20px;line-height:1.8;">';
      for (var ai = 0; ai < bath.alternatives.length; ai++) {
        html += '<li>' + escapeHtml(bath.alternatives[ai]) + '</li>';
      }
      html += '</ul>';
    }

    // Safe bathing steps
    if (bath.safe_bathing_steps && bath.safe_bathing_steps.length > 0) {
      html += '<div class="divider"></div>';
      html += '<p style="font-weight:600;">🛁 安全洗澡步骤（8周以上）：</p>';
      html += '<ol style="padding-left:20px;line-height:1.8;">';
      for (var sbi = 0; sbi < bath.safe_bathing_steps.length; sbi++) {
        html += '<li>' + escapeHtml(bath.safe_bathing_steps[sbi]) + '</li>';
      }
      html += '</ol>';
    }

    html += '</div></div>';
  }

  // --- Collapsible: Eye Care ---
  if (bundle.health && bundle.health.eye_care) {
    var eye = bundle.health.eye_care;
    var eyeId = 'collapsible-eye';
    html += '<div class="collapsible" id="' + eyeId + '">';
    html += '<div class="collapsible-header" onclick="document.getElementById(\'' + eyeId + '\').classList.toggle(\'open\')">👁️ 眼部护理</div>';
    html += '<div class="collapsible-body">';

    if (eye.causes && eye.causes.length > 0) {
      html += '<p style="font-weight:600;">常见原因：</p>';
      html += '<ul style="padding-left:20px;line-height:1.8;">';
      for (var ci = 0; ci < eye.causes.length; ci++) {
        html += '<li>' + escapeHtml(eye.causes[ci]) + '</li>';
      }
      html += '</ul>';
    }

    if (eye.cleaning_steps && eye.cleaning_steps.length > 0) {
      html += '<p style="font-weight:600;margin-top:8px;">🧹 清洁步骤：</p>';
      html += '<ol style="padding-left:20px;line-height:1.8;">';
      for (var csi = 0; csi < eye.cleaning_steps.length; csi++) {
        html += '<li>' + escapeHtml(eye.cleaning_steps[csi]) + '</li>';
      }
      html += '</ol>';
    }

    if (eye.medication_tips && eye.medication_tips.length > 0) {
      html += '<p style="font-weight:600;margin-top:8px;">💊 用药技巧：</p>';
      html += '<ul style="padding-left:20px;line-height:1.8;">';
      for (var mti = 0; mti < eye.medication_tips.length; mti++) {
        html += '<li>' + escapeHtml(eye.medication_tips[mti]) + '</li>';
      }
      html += '</ul>';
    }

    if (eye.vet_needed_if && eye.vet_needed_if.length > 0) {
      html += '<p style="font-weight:600;color:var(--color-danger);margin-top:8px;">🚨 需要就医的情况：</p>';
      html += '<ul style="padding-left:20px;line-height:1.8;color:var(--color-danger);">';
      for (var vni = 0; vni < eye.vet_needed_if.length; vni++) {
        html += '<li>' + escapeHtml(eye.vet_needed_if[vni]) + '</li>';
      }
      html += '</ul>';
    }

    html += '</div></div>';
  }

  section.innerHTML = html;

  // Wire up add weight button
  var addBtn = document.getElementById('add-weight-btn');
  if (addBtn) {
    addBtn.addEventListener('click', function () {
      var dateInput = document.getElementById('weight-date-input');
      var gramsInput = document.getElementById('weight-grams-input');
      var dateVal = dateInput ? dateInput.value : '';
      var gramsVal = gramsInput ? parseInt(gramsInput.value, 10) : NaN;

      if (!dateVal) { alert('请选择日期'); return; }
      if (isNaN(gramsVal) || gramsVal <= 0) { alert('请输入有效体重（克）'); return; }

      if (!cat.weight_history) cat.weight_history = [];
      cat.weight_history.push({ date: dateVal, weight_g: gramsVal });
      // Sort by date
      cat.weight_history.sort(function (a, b) { return a.date.localeCompare(b.date); });

      updateCat(App.state.shareKey, { weight_history: cat.weight_history }).then(function () {
        App.state.cat = cat;
        renderHealthTab(App.state);
      }).catch(function (err) {
        alert('保存失败: ' + (err.message || '请检查网络连接'));
      });
    });
  }
}

/* ==================================================================
   Growth Tab
   ================================================================== */

/**
 * Render the growth tab with milestone details, tasks, skills,
 * socialization guide, and tutorials.
 * @param {object} state  App.state
 */
function renderGrowthTab(state) {
  var section = document.getElementById('tab-growth');
  if (!section) return;

  if (!state.cat || !state.bundle) {
    section.innerHTML = '<h2>📚 成长</h2><div class="empty-state">暂无数据</div>';
    return;
  }

  var cat = state.cat;
  var age = state.age;
  var bundle = state.bundle;
  var html = '<h2>📚 成长记录</h2>';

  // Find matching milestone
  var milestone = null;
  var milestones = bundle.milestones && bundle.milestones.milestones ? bundle.milestones.milestones : [];
  for (var mi = 0; mi < milestones.length; mi++) {
    var m = milestones[mi];
    if (age.weeks >= m.age_weeks[0] && age.weeks <= m.age_weeks[1]) {
      milestone = m;
      break;
    }
  }

  if (!milestone) {
    section.innerHTML = '<h2>📚 成长</h2><div class="empty-state">暂无匹配当前年龄的成长数据</div>';
    return;
  }

  var latestWeight = (cat.weight_history && cat.weight_history.length > 0)
    ? cat.weight_history[cat.weight_history.length - 1].weight_g
    : null;

  // --- Card 1: Stage Overview ---
  html += '<div class="card">';
  html += '<div class="card-header">📚 ' + escapeHtml(milestone.stage_name) + '</div>';
  html += '<p style="line-height:1.7;margin-bottom:8px;">' + escapeHtml(milestone.stage_description) + '</p>';

  if (milestone.body_weight_g && milestone.body_weight_g.length === 2) {
    var weightCompare = '';
    if (latestWeight !== null) {
      if (latestWeight < milestone.body_weight_g[0]) {
        weightCompare = '（实际' + latestWeight + 'g，偏低，需加强营养）';
      } else if (latestWeight > milestone.body_weight_g[1]) {
        weightCompare = '（实际' + latestWeight + 'g，偏高，注意控制）';
      } else {
        weightCompare = '（实际' + latestWeight + 'g，正常范围 ✅）';
      }
    }
    html += '<p style="font-size:14px;color:var(--color-text-light);">标准体重：' + milestone.body_weight_g[0] + '–' + milestone.body_weight_g[1] + 'g ' + weightCompare + '</p>';
  }

  html += '</div>';

  // --- Card 2: Development ---
  html += '<div class="card">';
  html += '<div class="card-header">🔬 发育特征</div>';

  if (milestone.physical_development && milestone.physical_development.length > 0) {
    html += '<p style="font-weight:600;font-size:14px;">💪 身体发育：</p>';
    html += '<ul style="padding-left:20px;line-height:1.8;margin-bottom:12px;">';
    for (var pdi = 0; pdi < milestone.physical_development.length; pdi++) {
      html += '<li>' + escapeHtml(milestone.physical_development[pdi]) + '</li>';
    }
    html += '</ul>';
  }

  if (milestone.sensory_development && milestone.sensory_development.length > 0) {
    html += '<p style="font-weight:600;font-size:14px;">👁️ 感官发育：</p>';
    html += '<ul style="padding-left:20px;line-height:1.8;">';
    for (var sdi = 0; sdi < milestone.sensory_development.length; sdi++) {
      html += '<li>' + escapeHtml(milestone.sensory_development[sdi]) + '</li>';
    }
    html += '</ul>';
  }

  html += '</div>';

  // --- Card 3: Daily Tasks ---
  if (milestone.daily_tasks && milestone.daily_tasks.length > 0) {
    html += '<div class="card">';
    html += '<div class="card-header">✅ 本阶段任务</div>';

    for (var dti = 0; dti < milestone.daily_tasks.length; dti++) {
      var dt = milestone.daily_tasks[dti];
      var mandatoryBadge = dt.mandatory ? ' <span class="badge badge-danger">必做</span>' : ' <span class="badge badge-info">建议</span>';
      html += '<div style="padding:10px 0;border-bottom:1px solid var(--color-border);">';
      html += '<p style="font-weight:600;margin-bottom:4px;">' + escapeHtml(dt.task) + mandatoryBadge + '</p>';
      html += '<p style="font-size:13px;color:var(--color-text-light);line-height:1.6;">' + escapeHtml(dt.detail) + '</p>';
      html += '</div>';
    }

    html += '</div>';
  }

  // --- Card 4: Skills to Learn ---
  if (milestone.skills_to_learn && milestone.skills_to_learn.length > 0) {
    html += '<div class="card">';
    html += '<div class="card-header">🎓 需要学习的技能</div>';

    for (var sli = 0; sli < milestone.skills_to_learn.length; sli++) {
      var skill = milestone.skills_to_learn[sli];
      var skillName = skill.skill || skill;
      var skillDetail = skill.detail || '';
      var skillRef = skill.tutorial_ref || null;

      html += '<div style="padding:10px 0;border-bottom:1px solid var(--color-border);">';
      html += '<p style="font-weight:600;">📖 ' + escapeHtml(skillName) + '</p>';
      if (skillDetail) {
        html += '<p style="font-size:13px;color:var(--color-text-light);line-height:1.6;">' + escapeHtml(skillDetail) + '</p>';
      }

      // If tutorial ref exists, render the expanded tutorial
      if (skillRef && bundle.training && bundle.training.tutorials) {
        var tutorial = bundle.training.tutorials[skillRef];
        if (tutorial) {
          var tutId = 'collapsible-tutorial-' + sli;
          html += '<div class="collapsible ' + tutId + '" id="' + tutId + '" style="margin-top:8px;">';
          html += '<div class="collapsible-header" onclick="document.getElementById(\'' + tutId + '\').classList.toggle(\'open\')">📖 展开完整教程：' + escapeHtml(tutorial.title) + '</div>';
          html += '<div class="collapsible-body">';

          if (tutorial.difficulty) {
            html += '<p><strong>难度：</strong>' + escapeHtml(tutorial.difficulty) + '</p>';
          }
          if (tutorial.age_to_start_weeks !== undefined) {
            html += '<p><strong>建议开始年龄：</strong>' + tutorial.age_to_start_weeks + '周</p>';
          }
          if (tutorial.estimated_time) {
            html += '<p><strong>预计时长：</strong>' + escapeHtml(tutorial.estimated_time) + '</p>';
          }

          if (tutorial.preparation) {
            html += '<p style="margin-top:8px;"><strong>准备：</strong>' + escapeHtml(tutorial.preparation) + '</p>';
          }

          if (tutorial.steps && tutorial.steps.length > 0) {
            html += '<p style="margin-top:8px;font-weight:600;">步骤：</p>';
            html += '<ol style="padding-left:20px;line-height:1.8;">';
            for (var tsi = 0; tsi < tutorial.steps.length; tsi++) {
              html += '<li>' + escapeHtml(tutorial.steps[tsi]) + '</li>';
            }
            html += '</ol>';
          }

          if (tutorial.common_mistakes && tutorial.common_mistakes.length > 0) {
            html += '<p style="margin-top:8px;font-weight:600;">⚠️ 常见错误：</p>';
            html += '<ul style="padding-left:20px;line-height:1.8;">';
            for (var cmi = 0; cmi < tutorial.common_mistakes.length; cmi++) {
              html += '<li>' + escapeHtml(tutorial.common_mistakes[cmi]) + '</li>';
            }
            html += '</ul>';
          }

          if (tutorial.if_failed) {
            html += '<p style="margin-top:8px;"><strong>🔧 如果失败：</strong></p>';
            html += '<p style="font-size:13px;line-height:1.7;">' + escapeHtml(tutorial.if_failed) + '</p>';
          }

          html += '</div></div>';
        }
      }

      html += '</div>';
    }

    html += '</div>';
  }

  // --- Card 5: Watch Out ---
  if (milestone.watch_out && milestone.watch_out.length > 0) {
    html += '<div class="card">';
    html += '<div class="card-header">⚠️ 需要警惕</div>';
    html += '<ul style="padding-left:20px;line-height:1.8;">';
    for (var woi = 0; woi < milestone.watch_out.length; woi++) {
      html += '<li style="color:var(--color-danger);">' + escapeHtml(milestone.watch_out[woi]) + '</li>';
    }
    html += '</ul>';
    html += '</div>';
  }

  // --- Card 6: Care Note ---
  if (milestone.care_note) {
    html += '<div class="card">';
    html += '<div class="card-header">💡 护理要点</div>';
    html += '<p style="line-height:1.7;">' + escapeHtml(milestone.care_note) + '</p>';
    html += '</div>';
  }

  // --- Collapsible: Socialization Guide ---
  if (bundle.milestones && bundle.milestones.socialization_guide) {
    var sg = bundle.milestones.socialization_guide;
    var sgId = 'collapsible-socialization';
    html += '<div class="collapsible" id="' + sgId + '">';
    html += '<div class="collapsible-header" onclick="document.getElementById(\'' + sgId + '\').classList.toggle(\'open\')">🤝 ' + escapeHtml(sg.title) + '</div>';
    html += '<div class="collapsible-body">';

    if (sg.critical_window) {
      html += '<p style="color:var(--color-orange-dark);font-weight:600;margin-bottom:8px;">⏰ ' + escapeHtml(sg.critical_window) + '</p>';
    }

    if (sg.what_to_socialize && sg.what_to_socialize.length > 0) {
      html += '<p style="font-weight:600;">📋 需要社会化接触的内容：</p>';
      html += '<ul style="padding-left:20px;line-height:1.8;">';
      for (var wtsi = 0; wtsi < sg.what_to_socialize.length; wtsi++) {
        html += '<li>' + escapeHtml(sg.what_to_socialize[wtsi]) + '</li>';
      }
      html += '</ul>';
    }

    if (sg.how_to_socialize && sg.how_to_socialize.length > 0) {
      html += '<p style="font-weight:600;margin-top:8px;">✅ 如何操作：</p>';
      html += '<ol style="padding-left:20px;line-height:1.8;">';
      for (var htsi = 0; htsi < sg.how_to_socialize.length; htsi++) {
        html += '<li>' + escapeHtml(sg.how_to_socialize[htsi]) + '</li>';
      }
      html += '</ol>';
    }

    if (sg.signs_of_fear && sg.signs_of_fear.length > 0) {
      html += '<p style="font-weight:600;margin-top:8px;">😨 恐惧信号（发现后立即停止）：</p>';
      html += '<ul style="padding-left:20px;line-height:1.8;">';
      for (var sofi = 0; sofi < sg.signs_of_fear.length; sofi++) {
        html += '<li>' + escapeHtml(sg.signs_of_fear[sofi]) + '</li>';
      }
      html += '</ul>';
    }

    if (sg.what_if_missed_window) {
      html += '<p style="font-weight:600;margin-top:8px;">💡 如果错过关键窗口：</p>';
      html += '<p style="font-size:13px;line-height:1.7;">' + escapeHtml(sg.what_if_missed_window) + '</p>';
    }

    html += '</div></div>';
  }

  section.innerHTML = html;
}

/* ==================================================================
   Settings Tab
   ================================================================== */

/**
 * Render the settings tab with profile editing, share link,
 * data backup, AI chat, and about info.
 * @param {object} state  App.state
 */
function renderSettingsTab(state) {
  var section = document.getElementById('tab-settings');
  if (!section) return;

  var cat = state.cat;
  var bundle = state.bundle;
  var html = '<h2>⚙️ 设置</h2>';

  // --- Card 1: Edit Cat Info ---
  html += '<div class="card">';
  html += '<div class="card-header">✏️ 编辑猫咪信息</div>';

  var catName = cat ? cat.name : '';
  var catBirthday = cat ? cat.birthday : '';
  var catBreed = cat ? cat.breed : '中华田园猫';
  var catGender = cat ? cat.gender : '公猫';
  var catWeight = (cat && cat.weight_history && cat.weight_history.length > 0)
    ? cat.weight_history[cat.weight_history.length - 1].weight_g
    : '';

  html += '<div class="form-group">';
  html += '<label class="form-label">猫咪名字</label>';
  html += '<input class="form-input" id="settings-name" type="text" value="' + escapeHtml(catName) + '" autocomplete="off">';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="form-label">出生日期</label>';
  html += '<input class="form-input" id="settings-birthday" type="date" value="' + catBirthday + '">';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="form-label">品种</label>';
  html += '<select class="form-select" id="settings-breed">';
  var breeds = ['中华田园猫', '橘猫', '英短', '美短', '布偶', '缅因', '其他'];
  for (var bi = 0; bi < breeds.length; bi++) {
    var selected = (breeds[bi] === catBreed) ? ' selected' : '';
    html += '<option value="' + escapeHtml(breeds[bi]) + '"' + selected + '>' + escapeHtml(breeds[bi]) + '</option>';
  }
  html += '</select>';
  html += '</div>';

  html += '<div class="form-group">';
  html += '<label class="form-label">性别</label>';
  html += '<div class="flex-row" style="gap:24px;">';
  html += '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;">';
  html += '<input type="radio" name="settings-gender" value="公猫"' + (catGender === '公猫' ? ' checked' : '') + '>公猫';
  html += '</label>';
  html += '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;">';
  html += '<input type="radio" name="settings-gender" value="母猫"' + (catGender === '母猫' ? ' checked' : '') + '>母猫';
  html += '</label>';
  html += '</div>';
  html += '</div>';

  // Add new weight entry
  html += '<div class="form-group">';
  html += '<label class="form-label">添加体重记录</label>';
  html += '<div class="flex-row" style="gap:8px;">';
  html += '<input class="form-input" id="settings-new-weight" type="number" placeholder="克(g)" min="1" step="1" style="flex:1;">';
  html += '<span style="font-size:14px;color:var(--color-text-light);">g</span>';
  html += '</div>';
  html += '</div>';

  html += '<button class="btn btn-primary" id="settings-save-btn">保存修改</button>';
  html += '</div>';

  // --- Card: Share Link ---
  if (App.state.shareKey) {
    var shareUrl = window.location.origin + '/?cat=' + App.state.shareKey;
    html += '<div class="card">';
    html += '<div class="card-header">🔗 分享链接</div>';
    html += '<p style="font-size:14px;color:var(--color-text-light);margin-bottom:8px;">通过此链接可以在其他设备上查看和管理猫咪信息</p>';
    html += '<div style="display:flex;align-items:center;gap:8px;background:var(--color-bg);border:1px solid var(--color-border);border-radius:8px;padding:10px 12px;">';
    html += '<input id="share-url-input" type="text" value="' + escapeHtml(shareUrl) + '" readonly style="flex:1;border:none;background:transparent;font-size:13px;color:var(--color-text);outline:none;min-width:0;">';
    html += '<button class="btn btn-secondary" id="copy-share-url-btn" style="width:auto;padding:6px 12px;font-size:13px;white-space:nowrap;">复制链接</button>';
    html += '</div>';
    html += '</div>';
  }

  // --- Card: Data Backup ---
  html += '<div class="card">';
  html += '<div class="card-header">💾 数据备份</div>';

  html += '<p style="font-size:14px;color:var(--color-text-light);margin-bottom:12px;">导出数据文件以便备份或迁移到新设备。导入之前导出的数据可以恢复记录。</p>';

  html += '<button class="btn btn-secondary" id="export-data-btn" style="margin-bottom:8px;">📥 导出数据</button>';
  html += '<div style="position:relative;">';
  html += '<button class="btn btn-secondary" id="import-data-btn-trigger">📤 导入数据</button>';
  html += '<input type="file" id="import-data-input" accept=".json" style="display:none;">';
  html += '</div>';
  html += '</div>';

  // --- Card: AI Chat ---
  html += '<div class="card">';
  html += '<div class="card-header">🤖 AI 智能问答</div>';
  html += '<p style="font-size:14px;color:var(--color-text-light);margin-bottom:12px;">使用 DeepSeek AI 获取猫咪养护建议。需要您自己的 API Key。</p>';

  var apiKey = AI.getApiKey();
  if (!apiKey) {
    // Show API key setup
    html += '<div id="ai-api-setup">';
    html += '<div class="form-group">';
    html += '<label class="form-label">DeepSeek API Key</label>';
    html += '<input class="form-input" id="ai-api-key-input" type="password" placeholder="sk-..." autocomplete="off">';
    html += '<p style="font-size:12px;color:var(--color-text-muted);margin-top:4px;">API Key 仅保存在您的浏览器本地，不会上传到任何服务器</p>';
    html += '</div>';
    html += '<button class="btn btn-primary" id="ai-save-key-btn">保存并开始使用</button>';
    html += '</div>';
  } else {
    // Show chat interface
    html += '<div id="ai-chat-area">';
    html += '<div class="chat-container">';
    html += '<div class="chat-messages" id="chat-messages">';
    html += '<div class="chat-msg assistant">你好！我是猫咪养护顾问。有什么关于猫咪的问题可以问我 🐱</div>';
    html += '</div>';
    html += '<div class="chat-input-row">';
    html += '<input class="chat-input" id="chat-input" type="text" placeholder="输入问题..." autocomplete="off">';
    html += '<button class="chat-send" id="chat-send-btn">发送</button>';
    html += '</div>';
    html += '</div>';
    html += '<div style="display:flex;gap:8px;margin-top:8px;">';
    html += '<button class="btn btn-secondary" id="clear-chat-btn" style="font-size:14px;padding:8px 16px;width:auto;">清除对话</button>';
    html += '<button class="btn btn-secondary" id="change-api-key-btn" style="font-size:14px;padding:8px 16px;width:auto;">更换 API Key</button>';
    html += '</div>';
    html += '</div>';
  }

  html += '</div>';

  // --- Card: About ---
  html += '<div class="card">';
  html += '<div class="card-header">ℹ️ 关于</div>';
  html += '<p style="font-size:14px;line-height:1.8;">小猫成长助手 v1.0。</p>';
  html += '<p style="font-size:14px;line-height:1.8;color:var(--color-text-light);">知识来源：ASPCA、International Cat Care、Royal Canin、Catster、PetMD、Cats Protection 等权威兽医机构的公开资料。</p>';
  html += '<p style="font-size:14px;line-height:1.8;color:var(--color-danger);font-weight:600;">本应用仅供参考，不能替代专业兽医诊断。紧急情况请立即联系兽医。</p>';
  html += '</div>';

  section.innerHTML = html;

  // --- Wire up Copy Share URL button ---
  var copyBtn = document.getElementById('copy-share-url-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var input = document.getElementById('share-url-input');
      if (!input) return;
      input.select();
      try {
        document.execCommand('copy');
        copyBtn.textContent = '已复制！';
        setTimeout(function () { copyBtn.textContent = '复制链接'; }, 2000);
      } catch (e) {
        // Fallback for modern browsers
        navigator.clipboard.writeText(input.value).then(function () {
          copyBtn.textContent = '已复制！';
          setTimeout(function () { copyBtn.textContent = '复制链接'; }, 2000);
        }).catch(function () {
          alert('复制失败，请手动选择链接文本复制');
        });
      }
    });
  }

  // --- Wire up Save button ---
  var saveBtn = document.getElementById('settings-save-btn');
  if (saveBtn && cat) {
    saveBtn.addEventListener('click', function () {
      var nameEl = document.getElementById('settings-name');
      var birthdayEl = document.getElementById('settings-birthday');
      var breedEl = document.getElementById('settings-breed');
      var newWeightEl = document.getElementById('settings-new-weight');
      var genderRadio = document.querySelector('input[name="settings-gender"]:checked');

      var newName = nameEl ? nameEl.value.trim() : '';
      if (!newName) { alert('请输入猫咪名字'); return; }

      var updateData = {
        name: newName,
        birthday: birthdayEl ? birthdayEl.value : cat.birthday,
        breed: breedEl ? breedEl.value : cat.breed,
        gender: genderRadio ? genderRadio.value : cat.gender
      };

      var newWeight = newWeightEl ? parseInt(newWeightEl.value, 10) : NaN;
      if (!isNaN(newWeight) && newWeight > 0) {
        if (!cat.weight_history) cat.weight_history = [];
        cat.weight_history.push({ date: getTodayStr(), weight_g: newWeight });
        cat.weight_history.sort(function (a, b) { return a.date.localeCompare(b.date); });
        updateData.weight_history = cat.weight_history;
      }

      updateCat(App.state.shareKey, updateData).then(function () {
        // Apply changes to local state
        cat.name = updateData.name;
        cat.birthday = updateData.birthday;
        cat.breed = updateData.breed;
        cat.gender = updateData.gender;
        if (updateData.weight_history) {
          cat.weight_history = updateData.weight_history;
        }
        App.state.cat = cat;
        App.state.age = calculateAge(cat.birthday);
        alert('猫咪信息已保存！');
        renderCurrentTab();
      }).catch(function (err) {
        alert('保存失败: ' + (err.message || '请检查网络连接'));
      });
    });
  }

  // --- Wire up Export button ---
  var exportBtn = document.getElementById('export-data-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', function () {
      if (!App.state.shareKey) { alert('尚未创建猫咪档案'); return; }
      exportBtn.disabled = true;
      exportBtn.textContent = '导出中...';
      exportData(App.state.shareKey).then(function (jsonStr) {
        var blob = new Blob([jsonStr], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'cat-assistant-backup-' + getTodayStr() + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        exportBtn.disabled = false;
        exportBtn.textContent = '导出JSON备份';
      }).catch(function (err) {
        alert('导出失败: ' + (err.message || '未知错误'));
        exportBtn.disabled = false;
        exportBtn.textContent = '导出JSON备份';
      });
    });
  }

  // --- Wire up Import button ---
  var importTrigger = document.getElementById('import-data-btn-trigger');
  var importInput = document.getElementById('import-data-input');
  if (importTrigger && importInput) {
    importTrigger.addEventListener('click', function () {
      importInput.click();
    });

    importInput.addEventListener('change', function () {
      var file = importInput.files[0];
      if (!file) return;

      if (!confirm('导入数据将覆盖当前记录，确定继续？')) {
        importInput.value = '';
        return;
      }

      var reader = new FileReader();
      reader.onload = function (e) {
        var success = importData(e.target.result);
        if (success) {
          alert('数据导入成功！应用将重新加载。');
          if (typeof App !== 'undefined' && App.init) {
            App.init();
          }
        } else {
          alert('数据导入失败，请检查文件格式是否正确。');
        }
        importInput.value = '';
      };
      reader.onerror = function () {
        alert('文件读取失败，请重试。');
        importInput.value = '';
      };
      reader.readAsText(file);
    });
  }

  // --- Wire up AI Chat ---
  // Save API key
  var saveKeyBtn = document.getElementById('ai-save-key-btn');
  if (saveKeyBtn) {
    saveKeyBtn.addEventListener('click', function () {
      var keyInput = document.getElementById('ai-api-key-input');
      var key = keyInput ? keyInput.value.trim() : '';
      if (!key) { alert('请输入 API Key'); return; }
      if (!key.startsWith('sk-')) { alert('API Key 应以 sk- 开头，请检查'); return; }
      AI.setApiKey(key);
      renderSettingsTab(App.state);
    });
  }

  // Change API key
  var changeKeyBtn = document.getElementById('change-api-key-btn');
  if (changeKeyBtn) {
    changeKeyBtn.addEventListener('click', function () {
      if (confirm('确定更换 API Key？')) {
        AI.setApiKey('');
        renderSettingsTab(App.state);
      }
    });
  }

  // Clear chat
  var clearChatBtn = document.getElementById('clear-chat-btn');
  if (clearChatBtn) {
    clearChatBtn.addEventListener('click', function () {
      var msgs = document.getElementById('chat-messages');
      if (msgs) {
        msgs.innerHTML = '<div class="chat-msg assistant">你好！我是猫咪养护顾问。有什么关于猫咪的问题可以问我 🐱</div>';
      }
    });
  }

  // Send message
  var sendBtn = document.getElementById('chat-send-btn');
  var chatInput = document.getElementById('chat-input');
  if (sendBtn && chatInput) {
    var doSend = function () {
      var question = chatInput.value.trim();
      if (!question) return;

      var msgs = document.getElementById('chat-messages');
      if (!msgs) return;

      // Append user message
      var userMsg = document.createElement('div');
      userMsg.className = 'chat-msg user';
      userMsg.textContent = question;
      msgs.appendChild(userMsg);

      // Append thinking indicator
      var thinkingMsg = document.createElement('div');
      thinkingMsg.className = 'chat-msg assistant';
      thinkingMsg.id = 'ai-thinking-msg';
      thinkingMsg.textContent = '正在思考中...';
      thinkingMsg.style.opacity = '0.6';
      msgs.appendChild(thinkingMsg);

      // Scroll to bottom
      msgs.scrollTop = msgs.scrollHeight;

      // Clear input
      chatInput.value = '';

      AI.ask(question, cat, bundle).then(function (answer) {
        // Remove thinking indicator
        var think = document.getElementById('ai-thinking-msg');
        if (think) think.remove();

        // Append assistant response
        var asstMsg = document.createElement('div');
        asstMsg.className = 'chat-msg assistant';
        asstMsg.textContent = answer;
        msgs.appendChild(asstMsg);

        // Scroll to bottom
        msgs.scrollTop = msgs.scrollHeight;
      }).catch(function (err) {
        // Remove thinking indicator
        var think = document.getElementById('ai-thinking-msg');
        if (think) think.remove();

        // Show error
        var errMsg = document.createElement('div');
        errMsg.className = 'chat-msg assistant';
        errMsg.style.color = 'var(--color-danger)';
        errMsg.textContent = '错误：' + err.message;
        msgs.appendChild(errMsg);

        msgs.scrollTop = msgs.scrollHeight;
      });
    };

    sendBtn.addEventListener('click', doSend);
    chatInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        doSend();
      }
    });
  }
}

/* ==================================================================
   Emergency Tab / Modal
   ================================================================== */

/**
 * Render emergency content into both #emergency-guide (modal) and
 * #emergency-content (tab section if it exists).
 * Populates full emergency guidance from the knowledge bundle.
 */
function renderEmergency() {
  var bundle = App.state.bundle;
  if (!bundle || !bundle.emergency) {
    var fallbackHtml = '<div class="card"><p>紧急指南数据加载中...</p></div>';
    var fg = document.getElementById('emergency-guide');
    if (fg) fg.innerHTML = fallbackHtml;
    var fec = document.getElementById('emergency-content');
    if (fec) fec.innerHTML = fallbackHtml;
    return;
  }

  var em = bundle.emergency;
  var html = '';

  // --- Section 1: Immediate vet visit ---
  var whenToSeeVet = em.when_to_see_vet || [];
  var immediateItems = [];
  var within24hItems = [];
  for (var wvi = 0; wvi < whenToSeeVet.length; wvi++) {
    var item = whenToSeeVet[wvi];
    if (item.urgency === '立即就医') {
      immediateItems.push(item);
    } else {
      within24hItems.push(item);
    }
  }

  html += '<div class="card">';
  html += '<p style="font-weight:700;font-size:18px;color:var(--color-danger);margin-bottom:12px;">🚨 立即就医</p>';

  for (var imi = 0; imi < immediateItems.length; imi++) {
    var imp = immediateItems[imi];
    var impId = 'emergency-immediate-' + imi;
    html += '<div class="collapsible" id="' + impId + '">';
    html += '<div class="collapsible-header" onclick="document.getElementById(\'' + impId + '\').classList.toggle(\'open\')" style="color:var(--color-danger);">' + escapeHtml(imp.symptom) + '</div>';
    html += '<div class="collapsible-body">';
    if (imp.possible_causes && imp.possible_causes.length > 0) {
      html += '<p><strong>可能原因：</strong>' + escapeHtml(imp.possible_causes.join('、')) + '</p>';
    }
    html += '<p style="margin-top:8px;"><strong>✅ 应该做什么：</strong></p>';
    html += '<p style="font-size:13px;line-height:1.7;">' + escapeHtml(imp.what_to_do) + '</p>';
    html += '<p style="margin-top:8px;"><strong>❌ 不要做什么：</strong></p>';
    html += '<p style="font-size:13px;line-height:1.7;">' + escapeHtml(imp.what_not_to_do) + '</p>';
    if (imp.while_transporting) {
      html += '<p style="margin-top:8px;"><strong>🚗 运送途中：</strong></p>';
      html += '<p style="font-size:13px;line-height:1.7;">' + escapeHtml(imp.while_transporting) + '</p>';
    }
    html += '</div></div>';
  }
  html += '</div>';

  // --- Section 2: Within 24 hours ---
  if (within24hItems.length > 0) {
    html += '<div class="card">';
    html += '<p style="font-weight:700;font-size:18px;color:var(--color-warning);margin-bottom:12px;">⚠️ 24小时内就医</p>';

    for (var w24i = 0; w24i < within24hItems.length; w24i++) {
      var w24 = within24hItems[w24i];
      var w24Id = 'emergency-24h-' + w24i;
      html += '<div class="collapsible" id="' + w24Id + '">';
      html += '<div class="collapsible-header" onclick="document.getElementById(\'' + w24Id + '\').classList.toggle(\'open\')">' + escapeHtml(w24.symptom) + '</div>';
      html += '<div class="collapsible-body">';
      if (w24.possible_causes && w24.possible_causes.length > 0) {
        html += '<p><strong>可能原因：</strong>' + escapeHtml(w24.possible_causes.join('、')) + '</p>';
      }
      html += '<p style="margin-top:8px;"><strong>✅ 应该做什么：</strong></p>';
      html += '<p style="font-size:13px;line-height:1.7;">' + escapeHtml(w24.what_to_do) + '</p>';
      html += '<p style="margin-top:8px;"><strong>❌ 不要做什么：</strong></p>';
      html += '<p style="font-size:13px;line-height:1.7;">' + escapeHtml(w24.what_not_to_do) + '</p>';
      if (w24.while_transporting) {
        html += '<p style="margin-top:8px;"><strong>🚗 运送途中：</strong></p>';
        html += '<p style="font-size:13px;line-height:1.7;">' + escapeHtml(w24.while_transporting) + '</p>';
      }
      html += '</div></div>';
    }
    html += '</div>';
  }

  // --- Section 3: Stool Guide ---
  if (em.stool_guide) {
    var stool = em.stool_guide;
    html += '<div class="card">';
    html += '<div class="card-header">💩 ' + escapeHtml(stool.title) + '</div>';

    // Normal
    html += '<div style="background:var(--color-success-light);padding:12px;border-radius:8px;margin-bottom:12px;">';
    html += '<p style="font-weight:600;color:var(--color-success);">✅ 正常便便</p>';
    html += '<p style="font-size:13px;"><strong>颜色：</strong>' + escapeHtml(stool.normal.color) + '</p>';
    html += '<p style="font-size:13px;"><strong>形状：</strong>' + escapeHtml(stool.normal.shape) + '</p>';
    html += '<p style="font-size:13px;"><strong>硬度：</strong>' + escapeHtml(stool.normal.consistency) + '</p>';
    html += '<p style="font-size:13px;"><strong>频率：</strong>' + escapeHtml(stool.normal.frequency) + '</p>';
    html += '</div>';

    // Abnormal types
    html += '<p style="font-weight:600;margin-bottom:8px;">⚠️ 异常便便</p>';
    var abnormal = stool.abnormal || [];
    for (var abi = 0; abi < abnormal.length; abi++) {
      var ab = abnormal[abi];
      var urgencyBadge = '';
      if (ab.urgency && ab.urgency.indexOf('立即') !== -1) {
        urgencyBadge = '<span class="badge badge-danger">' + escapeHtml(ab.urgency) + '</span>';
      } else {
        urgencyBadge = '<span class="badge badge-warning">' + escapeHtml(ab.urgency || '') + '</span>';
      }

      html += '<div style="padding:8px 0;border-bottom:1px solid var(--color-border);">';
      html += '<p style="font-weight:600;">' + escapeHtml(ab.type) + '</p>';
      html += '<p style="font-size:13px;color:var(--color-text-light);">' + escapeHtml(ab.meaning) + '</p>';
      html += '<p style="font-size:13px;">' + urgencyBadge + '</p>';
      html += '</div>';
    }

    html += '</div>';
  }

  // --- Section 4: First Aid ---
  if (em.first_aid && em.first_aid.length > 0) {
    html += '<div class="card">';
    html += '<div class="card-header">🩹 急救操作</div>';

    for (var fai = 0; fai < em.first_aid.length; fai++) {
      var fa = em.first_aid[fai];
      var faId = 'emergency-fa-' + fai;
      html += '<div class="collapsible" id="' + faId + '">';
      html += '<div class="collapsible-header" onclick="document.getElementById(\'' + faId + '\').classList.toggle(\'open\')">' + escapeHtml(fa.situation) + '</div>';
      html += '<div class="collapsible-body">';

      if (fa.steps && fa.steps.length > 0) {
        html += '<ol style="padding-left:20px;line-height:1.8;">';
        for (var fasi = 0; fasi < fa.steps.length; fasi++) {
          html += '<li>' + escapeHtml(fa.steps[fasi]) + '</li>';
        }
        html += '</ol>';
      }

      if (fa.when_to_stop) {
        html += '<p style="margin-top:8px;font-weight:600;">🛑 何时停止：</p>';
        html += '<p style="font-size:13px;">' + escapeHtml(fa.when_to_stop) + '</p>';
      }

      html += '</div></div>';
    }

    html += '</div>';
  }

  // --- Section 5: Vital Signs ---
  if (em.vital_signs) {
    var vs = em.vital_signs;
    html += '<div class="card">';
    html += '<div class="card-header">❤️ 生命体征</div>';

    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">';
    html += '<div style="background:var(--color-success-light);padding:12px;border-radius:8px;text-align:center;">';
    html += '<p style="font-size:12px;color:var(--color-text-light);">体温</p>';
    html += '<p style="font-size:18px;font-weight:700;color:var(--color-success);">' + escapeHtml(vs.normal_temp) + '</p>';
    html += '</div>';
    html += '<div style="background:var(--color-success-light);padding:12px;border-radius:8px;text-align:center;">';
    html += '<p style="font-size:12px;color:var(--color-text-light);">心率</p>';
    html += '<p style="font-size:18px;font-weight:700;color:var(--color-success);">' + escapeHtml(vs.normal_heart_rate) + '</p>';
    html += '</div>';
    html += '</div>';

    html += '<p style="font-size:14px;margin-bottom:4px;"><strong>呼吸：</strong>' + escapeHtml(vs.normal_respiratory_rate) + '</p>';

    if (vs.how_to_check) {
      html += '<div class="divider"></div>';
      html += '<p style="font-weight:600;margin-bottom:4px;">📏 如何检查：</p>';
      var checkKeys = Object.keys(vs.how_to_check);
      for (var cki = 0; cki < checkKeys.length; cki++) {
        var ck = checkKeys[cki];
        html += '<p style="font-size:13px;line-height:1.6;padding:4px 0;">';
        html += '<strong>' + escapeHtml(ck) + '：</strong>' + escapeHtml(vs.how_to_check[ck]);
        html += '</p>';
      }
    }

    if (vs.abnormal_signs && vs.abnormal_signs.length > 0) {
      html += '<div class="divider"></div>';
      html += '<p style="font-weight:600;color:var(--color-danger);margin-bottom:4px;">🚨 异常体征：</p>';
      html += '<ul style="padding-left:20px;line-height:1.8;color:var(--color-danger);">';
      for (var asi = 0; asi < vs.abnormal_signs.length; asi++) {
        html += '<li>' + escapeHtml(vs.abnormal_signs[asi]) + '</li>';
      }
      html += '</ul>';
    }

    html += '</div>';
  }

  // --- Section 6: Emergency Kit ---
  if (em.emergency_kit && em.emergency_kit.items) {
    html += '<div class="card">';
    html += '<div class="card-header">🧰 ' + escapeHtml(em.emergency_kit.title) + '</div>';

    var kitItems = em.emergency_kit.items || [];
    for (var kii = 0; kii < kitItems.length; kii++) {
      var ki = kitItems[kii];
      html += '<div style="padding:8px 0;border-bottom:1px solid var(--color-border);">';
      html += '<p style="font-weight:600;">✅ ' + escapeHtml(ki.item) + '</p>';
      html += '<p style="font-size:13px;color:var(--color-text-light);">' + escapeHtml(ki.purpose) + '</p>';
      html += '</div>';
    }

    html += '</div>';
  }

  // Populate modal content (if open)
  var modalGuide = document.getElementById('emergency-guide');
  if (modalGuide) {
    modalGuide.innerHTML = html;
  }

  // Populate tab section (if visible)
  var tabContent = document.getElementById('emergency-content');
  if (tabContent) {
    tabContent.innerHTML = html;
  }
}

/* ------------------------------------------------------------------
   Shared HTML escaping utility
   ------------------------------------------------------------------ */

/**
 * Escape user-supplied strings to prevent XSS when injecting into HTML.
 * Uses the browser's own text-node escaping via a detached div.
 *
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (!str) return '';
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}
