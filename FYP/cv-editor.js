/* CV Editor – form, steps, CV generation. Set DEEPSEEK_API_KEY below for AI features. Cover letter is on cover-letter.html */
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';
const DEEPSEEK_API_KEY = 'sk-45a75bfb45174903ada13c17ceb828d4'; // Set your key here for AI suggestions and cover letter

const url = new URLSearchParams(location.search);
const tmplFromUrl = url.get('template') || 'black-white';
const CV_DRAFT_KEY = 'easyjob_cv_draft';

let step = 1;
let saveDraftTimer = null;

function getDraftData() {
  const data = collectCVData();
  const jobTypeEl = document.getElementById('jobType');
  const positionEl = document.getElementById('position');
  const companyEl = document.getElementById('companyName');
  const fnEl = document.querySelector('[data-key="firstName"]');
  const lnEl = document.querySelector('[data-key="lastName"]');
  return {
    step: step,
    template: data.template,
    firstName: (fnEl && fnEl.value) || '',
    lastName: (lnEl && lnEl.value) || '',
    jobTitle: (data.personalInfo && data.personalInfo.jobTitle) || '',
    phone: (data.personalInfo && data.personalInfo.phone) || '',
    email: (data.personalInfo && data.personalInfo.email) || '',
    address: (data.personalInfo && data.personalInfo.address) || '',
    about: data.about || '',
    skills: (data.skills || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean),
    languages: data.languages || [],
    education: data.education || [],
    experience: data.experience || [],
    jobType: (jobTypeEl && jobTypeEl.value) || '',
    position: (positionEl && positionEl.value) || '',
    companyName: (companyEl && companyEl.value) || '',
    city: (document.querySelector('[data-key="city"]') && document.querySelector('[data-key="city"]').value) || '',
    country: (document.querySelector('[data-key="country"]') && document.querySelector('[data-key="country"]').value) || ''
  };
}

function saveDraft() {
  if (saveDraftTimer) clearTimeout(saveDraftTimer);
  saveDraftTimer = setTimeout(function () {
    try {
      const draft = getDraftData();
      localStorage.setItem(CV_DRAFT_KEY, JSON.stringify(draft));
    } catch (e) {
      console.warn('Could not save draft:', e);
    }
  }, 400);
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(CV_DRAFT_KEY);
    if (!raw) return;
    const draft = JSON.parse(raw);
    if (!draft || typeof draft.step !== 'number') return;

    step = Math.min(6, Math.max(1, draft.step));
    document.querySelectorAll('.step').forEach(function (el) { el.classList.remove('active'); });
    const stepEl = document.getElementById('step' + step);
    if (stepEl) stepEl.classList.add('active');
    updateStep();

    document.querySelectorAll('[data-key]').forEach(function (el) {
      const key = el.dataset.key;
      const val = draft[key] !== undefined ? draft[key] : (draft.personalInfo && draft.personalInfo[key]);
      if (val !== undefined && val !== null) el.value = val;
    });
    if (draft.about !== undefined) {
      const aboutEl = document.getElementById('aboutTextarea');
      if (aboutEl) aboutEl.value = draft.about;
    }

    var skillsBox = document.getElementById('skillsBox');
    if (skillsBox && Array.isArray(draft.skills)) {
      skillsBox.innerHTML = '';
      draft.skills.forEach(function (skill) {
        var s = document.createElement('span');
        s.className = 'tag';
        s.innerHTML = (skill || '').trim() + ' <span class="remove" onclick="this.parentElement.remove(); saveDraft();">×</span>';
        skillsBox.appendChild(s);
      });
    }

    var langBox = document.getElementById('langBox');
    if (langBox && Array.isArray(draft.languages)) {
      langBox.innerHTML = '';
      draft.languages.forEach(function (item) {
        addLang();
        var divs = langBox.querySelectorAll('div');
        var last = divs[divs.length - 1];
        if (last) {
          var inputs = last.querySelectorAll('input,select');
          if (inputs[0]) inputs[0].value = item.language || '';
          if (inputs[1]) inputs[1].value = item.level || '';
        }
      });
      if (draft.languages.length === 0) addLang();
    }

    var eduBox = document.getElementById('eduBox');
    if (eduBox && Array.isArray(draft.education)) {
      eduBox.innerHTML = '';
      draft.education.forEach(function (e) {
        var gradMonth = e.gradMonth || '';
        var gradYear = e.gradYear || '';
        if (!gradYear && e.end) { var m = e.end.match(/(\d{4})/); if (m) gradYear = m[1]; }
        addEduBlock({
          institution: e.institution || e.university || '',
          degree: e.degree || '',
          fieldOfStudy: e.fieldOfStudy || e.description || '',
          gradMonth: gradMonth,
          gradYear: gradYear
        });
      });
      if (draft.education.length === 0) addEduBlock({});
    }

    var expBox = document.getElementById('expBox');
    if (expBox && Array.isArray(draft.experience)) {
      expBox.innerHTML = '';
      draft.experience.forEach(function (e) {
        addExpBlock({
          title: e.title,
          company: e.company,
          location: e.location,
          remote: e.remote,
          startMonth: e.startMonth,
          startYear: e.startYear,
          endMonth: e.endMonth,
          endYear: e.endYear,
          currentWork: e.currentWork,
          responsibilities: e.responsibilities
        });
      });
      if (draft.experience.length === 0) addExpBlock({});
    }

    var jt = document.getElementById('jobType');
    if (jt && draft.jobType !== undefined) jt.value = draft.jobType;
    var pos = document.getElementById('position');
    if (pos && draft.position !== undefined) pos.value = draft.position;
    var company = document.getElementById('companyName');
    if (company && draft.companyName !== undefined) company.value = draft.companyName;
  } catch (e) {
    console.warn('Could not load draft:', e);
  }
}

function updateStep() { document.getElementById('cur').textContent = step; }

function goToPreview() {
  saveDraft();
  document.querySelectorAll('.step').forEach(function (s) { s.classList.remove('active'); });
  document.getElementById('step6').classList.add('active');
  step = 6;
  updateStep();
  if (document.getElementById('cvResult').classList.contains('hidden')) {
    generateCV();
  }
}

function next() {
  if (step < 6) {
    saveDraft();
    document.getElementById('step' + step).classList.remove('active');
    step++;
    document.getElementById('step' + step).classList.add('active');
    updateStep();
  }
}
function prev() {
  if (step > 1) {
    saveDraft();
    document.getElementById('step' + step).classList.remove('active');
    step--;
    document.getElementById('step' + step).classList.add('active');
    updateStep();
  }
}

document.getElementById('skillIn').addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && e.target.value.trim()) {
    const s = document.createElement('span');
    s.className = 'tag';
    s.innerHTML = e.target.value.trim() + ' <span class="remove" onclick="this.parentElement.remove(); saveDraft();">×</span>';
    document.getElementById('skillsBox').appendChild(s);
    e.target.value = '';
    saveDraft();
  }
});

function addLang() {
  const d = document.createElement('div');
  d.className = 'flex gap-3 mb-3';
  d.innerHTML = '<input type="text" placeholder="Language" class="border rounded px-3 py-2 flex-1">' +
    '<select class="border rounded px-3 py-2"><option>Beginner</option><option>Intermediate</option><option>Advanced</option><option>Fluent</option><option>Native</option></select>' +
    '<span class="remove" onclick="this.parentElement.remove(); saveDraft();">×</span>';
  document.getElementById('langBox').appendChild(d);
  saveDraft();
}

var MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
var YEARS = (function () { var a = ['']; for (var y = 2030; y >= 1990; y--) a.push(String(y)); return a; })();

var DEGREE_OPTIONS = ['', 'High School', 'Associate', 'Diploma', 'Bachelor\'s', 'Master\'s', 'PhD', 'Other'];

function addEduBlock(opts) {
  opts = opts || {};
  var div = document.createElement('div');
  div.className = 'edu-block border rounded-lg p-5 mb-6 relative bg-gray-50';
  var monthOpts = MONTHS.map(function (m) { return '<option value="' + m + '"' + (opts.gradMonth === m ? ' selected' : '') + '>' + (m || 'Month') + '</option>'; }).join('');
  var yearOpts = YEARS.map(function (y) { return '<option value="' + y + '"' + (opts.gradYear === y ? ' selected' : '') + '>' + (y || 'Year') + '</option>'; }).join('');
  var degreeOpts = DEGREE_OPTIONS.map(function (d) { return '<option value="' + d + '"' + (opts.degree === d ? ' selected' : '') + '>' + (d || 'Select') + '</option>'; }).join('');
  div.innerHTML =
    '<span class="remove absolute top-2 right-2 cursor-pointer text-red-500 hover:text-red-700 text-xl" onclick="this.parentElement.remove(); saveDraft();">×</span>' +
    '<div class="mb-4"><label class="block text-gray-700 font-medium mb-1">Institution <span class="text-red-500">*</span></label><input type="text" class="edu-institution border border-gray-300 rounded-lg px-3 py-2 w-full bg-white" placeholder="School Name" value="' + (opts.institution ? opts.institution.replace(/"/g, '&quot;') : '') + '"></div>' +
    '<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">' +
    '<div><label class="block text-gray-700 font-medium mb-1">Degree</label><select class="edu-degree border border-gray-300 rounded-lg px-3 py-2 w-full bg-white">' + degreeOpts + '</select></div>' +
    '<div><label class="block text-gray-700 font-medium mb-1">Field of Study</label><input type="text" class="edu-field border border-gray-300 rounded-lg px-3 py-2 w-full bg-white" placeholder="IT" value="' + (opts.fieldOfStudy ? opts.fieldOfStudy.replace(/"/g, '&quot;') : '') + '"></div>' +
    '</div>' +
    '<div><label class="block text-gray-700 font-medium mb-1">Graduation Date (or expected Graduation Date)</label><div class="flex gap-2"><select class="edu-grad-month border border-gray-300 rounded-lg px-3 py-2 bg-white flex-1">' + monthOpts + '</select><select class="edu-grad-year border border-gray-300 rounded-lg px-3 py-2 bg-white flex-1">' + yearOpts + '</select></div></div>';
  document.getElementById('eduBox').appendChild(div);
  saveDraft();
}

function addEdu() {
  addEduBlock({});
  saveDraft();
}
function addExpWithTitle(title) {
  addExpBlock({ title: title || '' });
}
function addExp() {
  addExpBlock({});
}

function addExpBlock(opts) {
  opts = opts || {};
  var div = document.createElement('div');
  div.className = 'exp-block border rounded-lg p-5 mb-6 relative bg-gray-50';
  var monthOpts = MONTHS.map(function (m) { return '<option value="' + m + '"' + (opts.startMonth === m ? ' selected' : '') + '>' + (m || 'Month') + '</option>'; }).join('');
  var yearOpts = YEARS.map(function (y) { return '<option value="' + y + '"' + (opts.startYear === y ? ' selected' : '') + '>' + (y || 'Year') + '</option>'; }).join('');
  var monthOptsEnd = MONTHS.map(function (m) { return '<option value="' + m + '"' + (opts.endMonth === m ? ' selected' : '') + '>' + (m || 'Month') + '</option>'; }).join('');
  var yearOptsEnd = YEARS.map(function (y) { return '<option value="' + y + '"' + (opts.endYear === y ? ' selected' : '') + '>' + (y || 'Year') + '</option>'; }).join('');
  div.innerHTML =
    '<span class="remove absolute top-2 right-2 cursor-pointer text-red-500 hover:text-red-700 text-xl" onclick="this.parentElement.remove(); saveDraft();">×</span>' +
    '<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">' +
    '<div><label class="block text-gray-700 font-medium mb-1">Job Title <span class="text-red-500">*</span></label><div class="relative"><input type="text" class="exp-job-title border border-gray-300 rounded-lg px-3 py-2 w-full bg-white" placeholder="e.g. Babysitter" value="' + (opts.title ? opts.title.replace(/"/g, '&quot;') : '') + '"><span class="exp-title-check hidden absolute right-3 top-1/2 -translate-y-1/2 text-green-600">✓</span></div></div>' +
    '<div><label class="block text-gray-700 font-medium mb-1">Employer</label><input type="text" class="exp-employer border border-gray-300 rounded-lg px-3 py-2 w-full bg-white" placeholder="Person, organization, company, or family business..." value="' + (opts.company ? opts.company.replace(/"/g, '&quot;') : '') + '"></div>' +
    '</div>' +
    '<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">' +
    '<div><label class="block text-gray-700 font-medium mb-1">Location</label><input type="text" class="exp-location border border-gray-300 rounded-lg px-3 py-2 w-full bg-white" placeholder="e.g. Central" value="' + (opts.location ? opts.location.replace(/"/g, '&quot;') : '') + '"></div>' +
    '<div class="flex items-center gap-2 pt-7"><label class="inline-flex items-center gap-1.5 cursor-pointer"><input type="checkbox" class="exp-remote border-gray-300 rounded"' + (opts.remote ? ' checked' : '') + '><span class="text-gray-700">Remote</span></label></div>' +
    '</div>' +
    '<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">' +
    '<div><label class="block text-gray-700 font-medium mb-1">Start Date</label><div class="flex gap-2"><select class="exp-start-month border border-gray-300 rounded-lg px-3 py-2 bg-white flex-1">' + monthOpts + '</select><select class="exp-start-year border border-gray-300 rounded-lg px-3 py-2 bg-white flex-1">' + yearOpts + '</select></div></div>' +
    '<div><label class="block text-gray-700 font-medium mb-1">End Date</label><div class="flex gap-2"><select class="exp-end-month border border-gray-300 rounded-lg px-3 py-2 bg-white flex-1">' + monthOptsEnd + '</select><select class="exp-end-year border border-gray-300 rounded-lg px-3 py-2 bg-white flex-1">' + yearOptsEnd + '</select></div></div>' +
    '</div>' +
    '<div class="mb-4"><label class="inline-flex items-center gap-1.5 cursor-pointer"><input type="checkbox" class="exp-current-work border-gray-300 rounded"' + (opts.currentWork ? ' checked' : '') + '><span class="text-gray-700">I currently work here</span></label></div>' +
    '<div><label class="block text-gray-700 font-medium mb-1">Responsibilities</label><textarea class="exp-responsibilities border border-gray-300 rounded-lg w-full h-28 px-3 py-2 bg-white" placeholder="Key tasks and achievements..."></textarea><button type="button" onclick="suggestBulletsForExp(this)" class="mt-2 text-sm text-cyan-600 font-medium">Suggestion with AI</button></div>';
  if (opts.responsibilities) div.querySelector('.exp-responsibilities').value = opts.responsibilities;
  document.getElementById('expBox').appendChild(div);
  if (opts.title) {
    var tcheck = div.querySelector('.exp-title-check');
    if (tcheck) tcheck.classList.remove('hidden');
  }
  div.querySelectorAll('.exp-job-title').forEach(function (inp) {
    inp.addEventListener('input', function () {
      var check = div.querySelector('.exp-title-check');
      if (check) check.classList.toggle('hidden', !inp.value.trim());
    });
  });
  var currentCb = div.querySelector('.exp-current-work');
  if (currentCb) {
    currentCb.addEventListener('change', function () {
      var endRow = div.querySelector('.exp-end-month') && div.querySelector('.exp-end-month').closest('div').parentElement;
      if (endRow) endRow.style.opacity = currentCb.checked ? '0.5' : '1';
    });
    if (currentCb.checked) {
      var endRow = div.querySelector('.exp-end-month') && div.querySelector('.exp-end-month').closest('div').parentElement;
      if (endRow) endRow.style.opacity = '0.5';
    }
  }
  saveDraft();
}

function addBlock(box, title1, title2, start, end, desc, isExp) {
  if (box === 'expBox' && isExp) { addExpBlock({}); return; }
  if (box === 'eduBox') { addEduBlock({}); return; }
  const div = document.createElement('div');
  div.className = 'border rounded-lg p-5 mb-5 relative' + (isExp ? ' exp-block' : '');
  div.innerHTML = '<span class="remove absolute top-2 right-2" onclick="this.parentElement.remove(); saveDraft();">×</span>' +
    '<input placeholder="' + title1 + '" class="border rounded w-full mb-3 px-3 py-2">' +
    '<input placeholder="' + title2 + '" class="border rounded w-full mb-3 px-3 py-2">' +
    '<div class="grid grid-cols-2 gap-4 mb-3">' +
    '<input placeholder="' + start + ' (e.g. 2020)" class="border rounded px-3 py-2">' +
    '<input placeholder="' + end + ' (e.g. 2024 or Present)" class="border rounded px-3 py-2">' +
    '</div>' +
    '<textarea placeholder="' + desc + '" class="border rounded w-full h-28 px-3 py-2"></textarea>' +
    (isExp ? '<button type="button" onclick="suggestBulletsForExp(this)" class="mt-2 text-sm text-cyan-600 font-medium">Suggestion with AI</button>' : '');
  document.getElementById(box).appendChild(div);
}

async function suggestBulletsForExp(btn) {
  const apiKey = getDeepSeekApiKey();
  if (!apiKey) { alert('API key is not set. Set DEEPSEEK_API_KEY in cv-editor.js to use AI suggestions.'); return; }
  const block = btn.closest('.exp-block');
  if (!block) return;
  const titleEl = block.querySelector('.exp-job-title');
  const companyEl = block.querySelector('.exp-employer');
  const respEl = block.querySelector('.exp-responsibilities');
  const title = (titleEl && titleEl.value) || '';
  const company = (companyEl && companyEl.value) || '';
  const responsibilities = (respEl && respEl.value) || '';
  if (!title && !company) { alert('Enter at least Job Title or Employer first.'); return; }
  btn.disabled = true;
  btn.textContent = 'Generating...';
  try {
    const res = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: 'You are a resume expert. Output only 2-3 short bullet points for a CV, one per line. Start each with a strong action verb. Be specific and achievement-focused. No preamble.' },
          { role: 'user', content: 'Job title: ' + title + '. Company: ' + company + (responsibilities ? ' Current draft: ' + responsibilities : '') + ' Generate 2-3 professional bullet points for this role.' }
        ],
        temperature: 0.5
      }),
      mode: 'cors'
    });
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    const text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) ? data.choices[0].message.content.trim() : '';
    if (respEl && text) respEl.value = text;
  } catch (e) {
    alert('Could not get suggestions. Check your API key and try again.');
  }
  btn.disabled = false;
  btn.textContent = 'Suggestion with AI';
}

async function improveAboutWithAI() {
  const apiKey = getDeepSeekApiKey();
  if (!apiKey) { alert('API key is not set. Set DEEPSEEK_API_KEY in cv-editor.js to use AI.'); return; }
  const textarea = document.getElementById('aboutTextarea');
  const current = (textarea && textarea.value) || '';
  const skills = Array.from(document.querySelectorAll('#skillsBox .tag')).map(function (t) { return t.firstChild ? t.firstChild.textContent : t.textContent; }).join(', ') || '';
  const jobTitleEl = document.querySelector('[data-key="jobTitle"]');
  const title = (jobTitleEl && jobTitleEl.value) || '';
  const btn = document.querySelector('button[onclick="improveAboutWithAI()"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Improving...'; }
  try {
    const res = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: 'You are a resume expert. Improve the candidate\'s About Me for a CV. Rules: output ONLY the improved text (no labels). Length: strictly 50–75 words—count and do not exceed 75 words. Be concise: cut filler, keep one clear theme (e.g. role + one strength + one outcome). No long sentences.' },
          { role: 'user', content: 'Job title: ' + title + '. Skills: ' + skills + (current ? ' Current draft: ' + current : '') + ' Rewrite as a short About Me. Maximum 75 words. Output only the text.' }
        ],
        temperature: 0.5
      }),
      mode: 'cors'
    });
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    const text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) ? data.choices[0].message.content.trim() : '';
    if (textarea && text) textarea.value = text;
  } catch (e) {
    alert('Could not improve. Check your API key and try again.');
  }
  if (btn) { btn.disabled = false; btn.textContent = 'Improve with AI'; }
}

function collectCVData() {
  const cvData = {};
  document.querySelectorAll('[data-key]').forEach(function (i) { cvData[i.dataset.key] = i.value || ''; });
  cvData.fullName = ((cvData.firstName || '') + ' ' + (cvData.lastName || '')).trim();
  cvData.skills = Array.from(document.querySelectorAll('#skillsBox .tag')).map(function (t) { return t.firstChild ? t.firstChild.textContent : t.textContent; }).join(', ') || '';

  const languages = [];
  document.querySelectorAll('#langBox > div').forEach(function (b) {
    const v = b.querySelectorAll('input,select');
    languages.push({ language: v[0].value || '', level: v[1].value || '' });
  });

  const education = [];
  document.querySelectorAll('#eduBox .edu-block').forEach(function (b) {
    var instEl = b.querySelector('.edu-institution');
    var degEl = b.querySelector('.edu-degree');
    var fieldEl = b.querySelector('.edu-field');
    var monthEl = b.querySelector('.edu-grad-month');
    var yearEl = b.querySelector('.edu-grad-year');
    var gradDate = (monthEl && yearEl && (monthEl.value || yearEl.value)) ? ((monthEl.value || '') + ' ' + (yearEl.value || '')).trim() : '';
    education.push({
      institution: instEl ? instEl.value : '',
      degree: degEl ? degEl.value : '',
      fieldOfStudy: fieldEl ? fieldEl.value : '',
      gradMonth: monthEl ? monthEl.value : '',
      gradYear: yearEl ? yearEl.value : '',
      university: instEl ? instEl.value : '',
      start: '',
      end: gradDate || '',
      description: fieldEl ? fieldEl.value : ''
    });
  });

  const experience = [];
  document.querySelectorAll('#expBox .exp-block').forEach(function (b) {
    var titleEl = b.querySelector('.exp-job-title');
    var companyEl = b.querySelector('.exp-employer');
    var locationEl = b.querySelector('.exp-location');
    var remoteCb = b.querySelector('.exp-remote');
    var startMonth = b.querySelector('.exp-start-month');
    var startYear = b.querySelector('.exp-start-year');
    var endMonth = b.querySelector('.exp-end-month');
    var endYear = b.querySelector('.exp-end-year');
    var currentCb = b.querySelector('.exp-current-work');
    var respEl = b.querySelector('.exp-responsibilities');
    var startStr = (startMonth && startYear && (startMonth.value || startYear.value)) ? ((startMonth.value || '') + ' ' + (startYear.value || '')).trim() : '';
    var endStr = (currentCb && currentCb.checked) ? 'Present' : ((endMonth && endYear && (endMonth.value || endYear.value)) ? ((endMonth.value || '') + ' ' + (endYear.value || '')).trim() : '');
    if (!endStr) endStr = 'Present';
    experience.push({
      title: titleEl ? titleEl.value : '',
      company: companyEl ? companyEl.value : '',
      location: locationEl ? locationEl.value : '',
      remote: remoteCb ? remoteCb.checked : false,
      start: startStr,
      end: endStr,
      startMonth: startMonth ? startMonth.value : '',
      startYear: startYear ? startYear.value : '',
      endMonth: endMonth ? endMonth.value : '',
      endYear: endYear ? endYear.value : '',
      currentWork: currentCb ? currentCb.checked : false,
      responsibilities: respEl ? respEl.value : ''
    });
  });

  var addressParts = [cvData.city, cvData.country].filter(Boolean);
  var address = addressParts.length ? addressParts.join(', ') : (cvData.address || '');
  return {
    template: tmplFromUrl,
    personalInfo: {
      fullName: cvData.fullName,
      jobTitle: cvData.jobTitle,
      email: cvData.email,
      phone: cvData.phone,
      address: address
    },
    about: cvData.about,
    skills: cvData.skills,
    languages: languages,
    education: education,
    experience: experience
  };
}

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function toBullets(txt, max) {
  const raw = String(txt || '').split(/[\n•\-\t]+/).map(function (s) { return s.trim(); }).filter(Boolean);
  return raw.slice(0, max || 5).map(function (r) { return esc(r); }).filter(Boolean);
}

function shortAbout(txt) {
  return esc(String(txt || '').trim());
}

function getCVTemplateHTML(templateId, data, photoDataUrl) {
  const p = data.personalInfo || {};
  const name = esc(p.fullName || '');
  const title = esc(p.jobTitle || '');
  const email = esc(p.email || '');
  const phone = esc(p.phone || '');
  const address = esc(p.address || '');
  const about = shortAbout(data.about);
  const skillsList = (data.skills || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  const langList = (data.languages || []).map(function (l) { return esc(l.language) + (l.level ? ' (' + esc(l.level) + ')' : ''); });
  const eduList = data.education || [];
  const expList = data.experience || [];
  const photo = photoDataUrl ? '<img src="' + photoDataUrl + '" alt="Photo" style="width:100%;height:100%;object-fit:cover;">' : '';

  const eduItems = eduList.map(function (e) {
    var degreeLine = esc(e.degree) + (e.description ? ' in ' + esc(e.description) : '');
    var uniLine = esc(e.university);
    var dateStr = e.start && e.end ? (esc(e.start) + ' – ' + esc(e.end)) : (e.end ? esc(e.end) : '');
    return '<div style="margin-bottom:10px;"><strong>' + degreeLine + '</strong><br>' + uniLine + (dateStr ? ' · ' + dateStr : '') + '</div>';
  }).join('');
  const expItems = expList.map(function (e) {
    const bullets = toBullets(e.responsibilities);
    const ul = bullets.length ? '<ul style="margin:6px 0 0 0;padding-left:18px;font-size:12px;line-height:1.4;">' + bullets.map(function (b) { return '<li>' + b + '</li>'; }).join('') + '</ul>' : '';
    var endIsPresent = (e.end === 'Present' || String(e.end || '').trim() === 'Present');
    var dateStr = endIsPresent ? (e.start ? esc(e.start) : '') : (esc(e.start) + ' – ' + esc(e.end));
    var dateSpan = dateStr ? '<span style="float:right;font-size:11px;">' + dateStr + '</span>' : '';
    return '<div style="margin-bottom:14px;"><strong>' + esc(e.title) + '</strong> · ' + esc(e.company) + ' ' + dateSpan + ul + '</div>';
  }).join('');
  const skillsUl = '<ul style="margin:6px 0 0 0;padding-left:18px;font-size:12px;line-height:1.5;">' + skillsList.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>';

  if (templateId === 'black-white') {
    return '<div class="cv-template cv-template-bw" style="font-family:sans-serif;max-width:210mm;margin:0 auto;border:1px solid #ddd;background:#fff;overflow:visible;">' +
      '<div style="display:flex;align-items:flex-start;padding:18px 20px;gap:16px;border-bottom:1px solid #ddd;">' +
      '<div style="width:80px;height:80px;border-radius:50%;overflow:hidden;background:#f0f0f0;flex-shrink:0;">' + photo + '</div>' +
      '<div style="flex:1;">' +
      '<h1 style="margin:0 0 2px 0;font-size:20px;font-weight:700;letter-spacing:0.02em;">' + name.toUpperCase() + '</h1>' +
      '<p style="margin:0 0 8px 0;font-size:13px;color:#333;">' + title + '</p>' +
      '<p style="margin:0;font-size:11px;color:#555;">' + (phone ? phone + ' · ' : '') + (email ? email : '') + (address ? ' · ' + address : '') + '</p>' +
      '</div></div>' +
      '<div style="background:#e8e8e8;padding:6px 14px;font-size:11px;font-weight:700;letter-spacing:0.05em;">ABOUT ME</div>' +
      '<div style="padding:12px 16px;font-size:12px;line-height:1.5;color:#333;">' + about + '</div>' +
      '<div style="background:#e8e8e8;padding:6px 14px;font-size:11px;font-weight:700;letter-spacing:0.05em;">EDUCATION</div>' +
      '<div style="padding:12px 16px;font-size:12px;">' + eduItems + '</div>' +
      '<div style="background:#e8e8e8;padding:6px 14px;font-size:11px;font-weight:700;letter-spacing:0.05em;">EXPERIENCE</div>' +
      '<div style="padding:12px 16px;font-size:12px;">' + expItems + '</div>' +
      '<div style="background:#e8e8e8;padding:6px 14px;font-size:11px;font-weight:700;letter-spacing:0.05em;">SKILLS</div>' +
      '<div style="padding:12px 16px;">' + skillsUl + '</div>' +
      '<div style="background:#e8e8e8;padding:6px 14px;font-size:11px;font-weight:700;letter-spacing:0.05em;">LANGUAGES</div>' +
      '<div style="padding:12px 16px;font-size:12px;"><ul style="margin:6px 0 0 0;padding-left:18px;line-height:1.5;">' + langList.map(function (l) { return '<li>' + l + '</li>'; }).join('') + '</ul></div></div>';
  }

  if (templateId === 'simple' || templateId === 'grey-modern') {
    var secBar = 'style="background:#06b6d4;color:#fff;padding:6px 14px;font-size:11px;font-weight:700;letter-spacing:0.05em;border-radius:4px 0 0 4px;margin-left:-20px;padding-left:20px;"';
    var n = skillsList.length;
    var colSize = Math.ceil(n / 3) || 1;
    var col1 = skillsList.slice(0, colSize).map(function (s) { return '<li style="margin-bottom:2px;">' + esc(s) + '</li>'; }).join('');
    var col2 = skillsList.slice(colSize, colSize * 2).map(function (s) { return '<li style="margin-bottom:2px;">' + esc(s) + '</li>'; }).join('');
    var col3 = skillsList.slice(colSize * 2).map(function (s) { return '<li style="margin-bottom:2px;">' + esc(s) + '</li>'; }).join('');
    var skillsThreeCol = '<div style="display:flex;gap:24px;margin-top:6px;"><div style="flex:1;"><ul style="margin:0;padding-left:18px;font-size:12px;line-height:1.5;color:#111;">' + col1 + '</ul></div><div style="flex:1;"><ul style="margin:0;padding-left:18px;font-size:12px;line-height:1.5;color:#111;">' + col2 + '</ul></div><div style="flex:1;"><ul style="margin:0;padding-left:18px;font-size:12px;line-height:1.5;color:#111;">' + col3 + '</ul></div></div>';
    var simpleExpItems = expList.map(function (e) {
      var bullets = toBullets(e.responsibilities);
      var ul = bullets.length ? '<ul style="margin:6px 0 0 0;padding-left:18px;font-size:12px;line-height:1.4;color:#111;">' + bullets.map(function (b) { return '<li>' + b + '</li>'; }).join('') + '</ul>' : '';
      var endIsPresent = (e.end === 'Present' || String(e.end || '').trim() === 'Present');
      var dateStr = endIsPresent ? (e.start ? esc(e.start) + ' - Present' : 'Present') : (esc(e.start) + ' - ' + esc(e.end));
      var dateSpan = dateStr ? '<span style="float:right;font-size:11px;font-weight:400;">' + dateStr + '</span>' : '';
      return '<div style="margin-bottom:14px;"><div style="overflow:hidden;"><strong>' + esc(e.title) + ', ' + esc(e.company) + '</strong> ' + dateSpan + '</div>' + ul + '</div>';
    }).join('');
    var simpleEduItems = eduList.map(function (e) {
      var degreeLine = esc(e.degree) + (e.description ? ' in ' + esc(e.description) : '');
      var dateStr = e.start && e.end ? (esc(e.start) + ' - ' + esc(e.end)) : (e.end ? esc(e.end) : '');
      var dateSpan = dateStr ? '<span style="float:right;font-size:11px;font-weight:400;">' + dateStr + '</span>' : '';
      return '<div style="margin-bottom:14px;"><div style="overflow:hidden;"><strong>' + degreeLine + '</strong> ' + dateSpan + '</div><div style="font-size:12px;color:#111;"><strong>' + esc(e.university || '') + '</strong></div></div>';
    }).join('');
    var simpleLangHtml = langList.length ? '<ul style="margin:6px 0 0 0;padding-left:18px;line-height:1.5;color:#111;"><li><strong>Languages:</strong> ' + langList.join(', ') + '.</li></ul>' : '';
    return '<div class="cv-template cv-template-simple" style="font-family:sans-serif;max-width:210mm;margin:0 auto;background:#fff;overflow:visible;padding:20px;color:#111;">' +
      '<div style="text-align:center;padding-bottom:12px;border-bottom:1px solid #ddd;">' +
      '<h1 style="margin:0 0 4px 0;font-size:22px;font-weight:700;color:#111;letter-spacing:0.02em;">' + name.toUpperCase() + '</h1>' +
      '<p style="margin:0 0 6px 0;font-size:14px;font-weight:700;color:#111;">' + title.toUpperCase() + '</p>' +
      '<p style="margin:0;font-size:12px;color:#111;">' + [address, email, phone].filter(Boolean).map(function (x) { return esc(x); }).join(' | ') + '</p>' +
      '</div>' +
      '<div style="margin-top:12px;"><div ' + secBar + '>ABOUT ME</div><div style="padding:10px 0;font-size:12px;line-height:1.5;color:#111;">' + about + '</div></div>' +
      '<div style="margin-top:12px;"><div ' + secBar + '>SKILLS</div>' + skillsThreeCol + '</div>' +
      '<div style="margin-top:12px;"><div ' + secBar + '>WORK EXPERIENCE</div><div style="padding:10px 0;font-size:12px;color:#111;">' + simpleExpItems + '</div></div>' +
      '<div style="margin-top:12px;"><div ' + secBar + '>EDUCATION</div><div style="padding:10px 0;font-size:12px;">' + simpleEduItems + '</div></div>' +
      '<div style="margin-top:12px;"><div ' + secBar + '>LANGUAGES</div><div style="padding:10px 0;font-size:12px;">' + simpleLangHtml + '</div></div></div>';
  }

  if (templateId === 'beige-brown') {
    return '<div class="cv-template cv-template-beige" style="font-family:sans-serif;max-width:210mm;margin:0 auto;background:#f5f0e8;">' +
      '<div style="background:linear-gradient(135deg,#4a3728 0%,#6b5344 100%);padding:20px;position:relative;">' +
      '<div style="display:flex;align-items:flex-start;gap:16px;">' +
      '<div style="width:88px;height:88px;border-radius:50%;overflow:hidden;background:#4a3728;border:3px solid rgba(255,255,255,0.3);flex-shrink:0;">' + photo + '</div>' +
      '<div style="flex:1;color:#fff;">' +
      '<h1 style="margin:0 0 2px 0;font-size:20px;font-weight:700;letter-spacing:0.02em;">' + name.toUpperCase() + '</h1>' +
      '<p style="margin:0 0 10px 0;font-size:12px;opacity:0.95;">' + title.toUpperCase() + '</p>' +
      '<p style="margin:0;font-size:11px;line-height:1.45;opacity:0.9;">' + about + '</p></div></div></div>' +
      '<div style="display:flex;">' +
      '<div style="width:72mm;padding:16px;background:#f5f0e8;">' +
      '<p style="margin:0 0 6px 0;font-size:11px;color:#4a3728;">' + phone + '</p><p style="margin:0 0 6px 0;font-size:11px;color:#4a3728;">' + email + '</p><p style="margin:0 0 12px 0;font-size:11px;color:#4a3728;">' + address + '</p>' +
      '<div style="color:#4a3728;font-size:10px;font-weight:700;letter-spacing:0.05em;margin-top:16px;">SKILLS</div>' +
      '<ul style="margin:6px 0 0 0;padding-left:14px;font-size:11px;color:#333;">' + skillsList.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>' +
      '<div style="color:#4a3728;font-size:10px;font-weight:700;letter-spacing:0.05em;margin-top:16px;">EDUCATION</div>' +
      '<div style="font-size:11px;margin-top:6px;">' + eduItems + '</div>' +
      '<div style="color:#4a3728;font-size:10px;font-weight:700;letter-spacing:0.05em;margin-top:16px;">LANGUAGE</div>' +
      '<p style="margin:6px 0 0 0;font-size:11px;">' + langList.join(', ') + '</p></div>' +
      '<div style="flex:1;padding:16px;border-left:1px solid #e0d8cc;font-size:12px;">' +
      '<div style="color:#4a3728;font-size:10px;font-weight:700;letter-spacing:0.05em;margin-bottom:10px;">EXPERIENCE</div>' + expItems +
      '</div></div></div>';
  }

  return getCVTemplateHTML('black-white', data, photoDataUrl);
}

function getDeepSeekApiKey() {
  return (typeof DEEPSEEK_API_KEY === 'string' && DEEPSEEK_API_KEY.trim()) || '';
}

function generateCV() {
  const cvData = collectCVData();
  if (!cvData.personalInfo.fullName || !cvData.personalInfo.jobTitle || !cvData.personalInfo.email) {
    alert('Please fill in required fields: First Name, Last Name, Job Title, and Email');
    return;
  }
  document.getElementById('cvLoading').classList.remove('hidden');
  document.getElementById('cvLoadingText').classList.remove('hidden');
  document.getElementById('cvResult').classList.add('hidden');

  function finishCV(photoDataUrl) {
    const templateId = (cvData.template || 'black-white').toLowerCase();
    const html = getCVTemplateHTML(templateId, cvData, photoDataUrl || null);
    document.getElementById('cvLoading').classList.add('hidden');
    document.getElementById('cvLoadingText').classList.add('hidden');
    document.getElementById('cvResult').classList.remove('hidden');
    document.getElementById('cvContent').innerHTML = html;
    var saveBtn = document.getElementById('saveCvBtn');
    if (saveBtn) saveBtn.disabled = false;
  }
  const photoInput = document.getElementById('photoInput');
  if (photoInput && photoInput.files && photoInput.files[0]) {
    const reader = new FileReader();
    reader.onload = function () { finishCV(reader.result); };
    reader.readAsDataURL(photoInput.files[0]);
  } else {
    finishCV(null);
  }
}

async function saveCVToAccount() {
  const btn = document.getElementById('saveCvBtn');
  const originalText = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

  try {
    const client = window.getEasyjobSupabase && window.getEasyjobSupabase();
    if (!client) throw new Error('Supabase 未初始化（請檢查 supabase-config.js）');

    const { data: sessionData } = await client.auth.getSession();
    const session = sessionData && sessionData.session;
    if (!session) {
      alert('請先登入先可以保存。');
      window.location.href = 'login.html';
      return;
    }

    const cvContent = document.getElementById('cvContent');
    const html = cvContent ? cvContent.innerHTML : '';
    if (!html || html.trim().length < 20) throw new Error('未有 CV 內容可保存，請先 Generate CV。');

    const draft = getDraftData();
    const title = (draft && draft.jobTitle)
      ? (draft.jobTitle + ' - ' + (draft.firstName || '') + ' ' + (draft.lastName || '')).trim()
      : ('CV - ' + new Date().toISOString().slice(0, 10));

    const payload = {
      user_id: session.user.id,
      title: title,
      template: (draft && draft.template) ? String(draft.template) : (tmplFromUrl || ''),
      content_html: html,
      draft_json: draft
    };

    const { error } = await client.from('cv_documents').insert(payload);
    if (error) throw error;

    alert('已保存到 Account！');
    window.location.href = 'account.html';
  } catch (e) {
    console.error(e);
    alert('保存失敗：' + (e && e.message ? e.message : '未知錯誤'));
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = originalText; }
  }
}

function downloadCVPDF() {
  const cvContent = document.getElementById('cvContent');
  const templateEl = cvContent && cvContent.querySelector('.cv-template');
  if (!templateEl) {
    alert('請先點擊「Generate CV」產生履歷後再下載 PDF。');
    return;
  }
  var textLen = (templateEl.textContent || '').trim().length;
  if (textLen === 0) {
    console.warn('downloadCVPDF: template content is empty');
    alert('履歷內容為空，請先填寫並產生 CV 後再下載。');
    return;
  }
  if (!window.html2pdf) {
    alert('PDF 程式庫未載入，請檢查網路連線後重新整理頁面。');
    return;
  }
  const btn = document.querySelector('button[onclick="downloadCVPDF()"]');
  const originalText = btn ? btn.textContent : '';
  if (btn) {
    btn.disabled = true;
    btn.textContent = '正在產生 PDF...';
  }
  const firstName = (document.querySelector('[data-key="firstName"]') && document.querySelector('[data-key="firstName"]').value) || 'My';
  const filename = (firstName.replace(/[^\w\s-]/g, '') || 'CV').trim() + '_CV.pdf';
  var opt = {
    margin: 10,
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 1.2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      scrollY: 0,
      scrollX: 0
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  function restoreBtn() {
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }

  templateEl.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      html2pdf().set(opt).from(templateEl).toPdf().get('pdf').then(function (pdf) {
        var blob = pdf.output('blob');
        if (!blob || blob.size === 0) {
          restoreBtn();
          console.error('downloadCVPDF: generated PDF blob is empty');
          alert('產生的 PDF 為空，請稍後再試或換一個瀏覽器。');
          return;
        }
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        restoreBtn();
      }).catch(function (err) {
        restoreBtn();
        console.error('PDF generation failed:', err);
        alert('無法產生 PDF：' + (err && err.message ? err.message : '請稍後再試或換一個瀏覽器。'));
      });
    });
  });
}

var formEl = document.getElementById('form');
if (formEl) {
  formEl.addEventListener('input', saveDraft);
  formEl.addEventListener('change', saveDraft);
  formEl.addEventListener('input', function (e) {
    var el = e.target;
    if (el.classList && el.classList.contains('input-with-check')) {
      var check = el.parentElement && el.parentElement.querySelector('.input-check');
      if (check) check.classList.toggle('hidden', !el.value.trim());
    }
  });
  formEl.addEventListener('change', function (e) {
    var el = e.target;
    if (el.classList && el.classList.contains('input-with-check')) {
      var check = el.parentElement && el.parentElement.querySelector('.input-check');
      if (check) check.classList.toggle('hidden', !el.value.trim());
    }
  });
}
formEl = null;

var photoInput = document.getElementById('photoInput');
var photoPreview = document.getElementById('photoPreview');
if (photoInput && photoPreview) {
  photoInput.addEventListener('change', function () {
    var file = photoInput.files && photoInput.files[0];
    if (file && file.type.indexOf('image') !== -1) {
      var reader = new FileReader();
      reader.onload = function () {
        photoPreview.innerHTML = '<img src="' + reader.result + '" alt="Photo" class="w-full h-full object-cover">';
      };
      reader.readAsDataURL(file);
    }
  });
}

document.querySelectorAll('.input-with-check').forEach(function (input) {
  var check = input.parentElement && input.parentElement.querySelector('.input-check');
  if (check) check.classList.toggle('hidden', !input.value.trim());
});

addLang();
addEdu();
addExp();
loadDraft();
document.querySelectorAll('.input-with-check').forEach(function (input) {
  var check = input.parentElement && input.parentElement.querySelector('.input-check');
  if (check) check.classList.toggle('hidden', !input.value.trim());
});
