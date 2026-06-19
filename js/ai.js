/* ================================================================
   Cat Care PWA — DeepSeek AI Chat Module
   ================================================================ */

var AI = {
  getApiKey: function () {
    return localStorage.getItem('deepseek_api_key') || '';
  },

  setApiKey: function (key) {
    localStorage.setItem('deepseek_api_key', key);
  },

  /**
   * Build a Chinese system prompt with current cat context.
   * @param {object} cat
   * @param {object} bundle
   * @returns {string}
   */
  buildSystemPrompt: function (cat, bundle) {
    var stage = null;
    if (bundle && bundle.milestones && bundle.milestones.milestones) {
      var milestones = bundle.milestones.milestones;
      for (var i = 0; i < milestones.length; i++) {
        var m = milestones[i];
        if (cat.age_weeks >= m.age_weeks[0] && cat.age_weeks <= m.age_weeks[1]) {
          stage = m;
          break;
        }
      }
    }

    var latestWeight = (cat.weight_history && cat.weight_history.length > 0)
      ? cat.weight_history[cat.weight_history.length - 1].weight_g + 'g'
      : '未知';

    var age = calculateAge(cat.birthday);

    return '你是一位专业的猫咪养护顾问。当前猫咪信息：名字' + cat.name +
      '，' + cat.breed + '，' + cat.gender + '，' + age.weeks + '周龄，体重' +
      latestWeight + '。当前成长阶段：' + (stage ? stage.stage_name : '未知') +
      '。请基于权威兽医知识回答问题，用中文回答。如果问题涉及紧急医疗情况，请先建议立即联系兽医。';
  },

  /**
   * Send a question to the DeepSeek Chat API and return the answer.
   * @param {string} question
   * @param {object} cat
   * @param {object} bundle
   * @returns {Promise<string>}
   */
  ask: function (question, cat, bundle) {
    var apiKey = this.getApiKey();
    if (!apiKey || !apiKey.startsWith('sk-')) {
      return Promise.reject(new Error('请先在下方设置有效的 DeepSeek API Key（以sk-开头）'));
    }

    return fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: this.buildSystemPrompt(cat, bundle) },
          { role: 'user', content: question }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    }).then(function (resp) {
      if (!resp.ok) {
        return resp.json().catch(function () { return {}; }).then(function (err) {
          throw new Error(err.error && err.error.message ? err.error.message : 'API请求失败(' + resp.status + ')');
        });
      }
      return resp.json();
    }).then(function (data) {
      return data.choices[0].message.content;
    });
  }
};
