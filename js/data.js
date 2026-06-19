/* ================================================================
   Cat Care PWA — Data Layer (Supabase)
   ================================================================ */

// Supabase 配置
var SUPABASE_URL = 'https://epuavsmbcbiuvecmplex.supabase.co';
var SUPABASE_KEY = 'sb_publishable_CO3QwKVP6U0wpWGnMNIPPg_EPbjWSvp';

// 全局 Supabase 客户端
var sb = null;

function initSupabase() {
  if (sb) return sb;
  if (!window.supabase) {
    console.error('Supabase SDK 未加载');
    return null;
  }
  try {
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  } catch (e) {
    console.error('Supabase 初始化失败:', e);
    return null;
  }
  return sb;
}

/* ------------------------------------------------------------------
   Knowledge Bundle (本地加载，不变)
   ------------------------------------------------------------------ */

function loadKnowledgeBundle() {
  // 相对路径，兼容 localhost 和 GitHub Pages
  var bundleUrl = 'knowledge/knowledge-bundle.json';
  return fetch(bundleUrl)
    .then(function (response) {
      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }
      return response.json();
    })
    .catch(function (err) {
      var overlay = document.getElementById('loading-overlay');
      if (overlay) {
        overlay.innerHTML =
          '<div class="error-state">' +
          '<p style="color:#E74C3C;font-size:18px;font-weight:600;margin-bottom:8px;">知识库加载失败</p>' +
          '<p style="color:#888;font-size:14px;">' + escapeHtml(err.message) + '</p>' +
          '<p style="color:#AAA;font-size:12px;">请求: ' + escapeHtml(bundleUrl) + '</p>' +
          '<button class="btn btn-primary" style="margin-top:20px;" onclick="location.reload()">重新加载</button>' +
          '</div>';
      }
      throw err;
    });
}

/* ------------------------------------------------------------------
   Cat Profile (Supabase)
   ------------------------------------------------------------------ */

/**
 * 生成随机分享密钥（8位字母数字）
 */
function generateShareKey() {
  var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  var key = '';
  for (var i = 0; i < 8; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

/**
 * 通过 share_key 获取猫咪
 */
async function fetchCat(shareKey) {
  var client = initSupabase();
  var result = await client
    .from('cats')
    .select('*')
    .eq('share_key', shareKey)
    .single();
  if (result.error) return null;
  return result.data;
}

/**
 * 创建新猫咪
 */
async function createCat(catData) {
  var client = initSupabase();
  if (!client) throw new Error('Supabase SDK 未加载，请检查网络');
  var shareKey = generateShareKey();
  var result = await client
    .from('cats')
    .insert({
      share_key: shareKey,
      name: catData.name,
      birthday: catData.birthday,
      breed: catData.breed,
      gender: catData.gender,
      weight_history: catData.weight_history || []
    })
    .select()
    .single();
  if (result.error) {
    var msg = result.error.message || '未知错误';
    if (result.error.code) msg += ' (' + result.error.code + ')';
    if (result.error.details) msg += ' — ' + result.error.details;
    if (result.error.hint) msg += ' — ' + result.error.hint;
    console.error('createCat error:', result.error);
    throw new Error(msg);
  }
  return result.data;
}

/**
 * 更新猫咪信息
 */
async function updateCat(shareKey, updates) {
  var client = initSupabase();
  updates.updated_at = new Date().toISOString();
  var result = await client
    .from('cats')
    .update(updates)
    .eq('share_key', shareKey);
  if (result.error) throw result.error;
}

/* ------------------------------------------------------------------
   Task Status (Supabase)
   ------------------------------------------------------------------ */

/**
 * 获取某只猫的所有任务状态
 */
async function fetchTaskStatus(catId) {
  var client = initSupabase();
  var result = await client
    .from('task_status')
    .select('*')
    .eq('cat_id', catId);
  if (result.error) return { tasks: {} };

  // 转换为旧格式兼容 tasks.js
  var status = { tasks: {}, lastResetDate: getTodayStr() };
  for (var i = 0; i < result.data.length; i++) {
    var t = result.data[i];
    status.tasks[t.task_id] = {
      completed_at: t.completed_at,
      period_next: t.period_next,
      type: t.type
    };
    if (t.last_reset_date && t.last_reset_date > (status.lastResetDate || '')) {
      status.lastResetDate = t.last_reset_date;
    }
  }
  return status;
}

/**
 * 更新单个任务状态（打卡/取消）
 */
async function upsertTaskStatus(catId, taskId, type, completedAt, periodNext, lastResetDate) {
  var client = initSupabase();
  var row = {
    cat_id: catId,
    task_id: taskId,
    type: type,
    completed_at: completedAt || null,
    period_next: periodNext || null,
    last_reset_date: lastResetDate || null
  };
  var result = await client
    .from('task_status')
    .upsert(row, { onConflict: 'cat_id, task_id', ignoreDuplicates: false });
  if (result.error) throw result.error;
}

/**
 * 重置所有每日任务（新的日期 → 清空当日完成状态）
 */
async function resetDailyTasks(catId, todayStr) {
  var client = initSupabase();
  var result = await client
    .from('task_status')
    .update({ completed_at: null, last_reset_date: todayStr })
    .eq('cat_id', catId)
    .eq('type', 'daily_reset');
  if (result.error) throw result.error;
}

/**
 * 订阅任务变更（实时同步）
 */
function subscribeTaskChanges(catId, onUpdate) {
  var client = initSupabase();
  return client
    .channel('task-changes-' + catId)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'task_status', filter: 'cat_id=eq.' + catId },
      function (payload) {
        onUpdate(payload);
      }
    )
    .subscribe();
}

/* ------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------ */

function escapeHtml(str) {
  if (!str) return '';
  str = String(str);
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}


