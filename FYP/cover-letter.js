/* Cover Letter page – wizard, generate from draft CV (localStorage), same colors as cv-editor */
const DEEPSEEK_API_URL = '/api/ai/chat';
const DEEPSEEK_MODEL = 'deepseek-chat';
const CV_DRAFT_KEY = 'easyjob_cv_draft';

var coverLetterStep = 1;
var coverLetterData = { experienceYears: '', student: '', schoolType: '', degree: '', fieldOfStudy: '', workingStyle: '', strengths: [] };

/** Build CV data shape from localStorage draft (same as collectCVData output) for API prompt */
function getCVDataFromDraft() {
  try {
    var raw = localStorage.getItem(CV_DRAFT_KEY);
    if (!raw) return { personalInfo: {}, about: '', skills: '', languages: [], education: [], experience: [] };
    var d = JSON.parse(raw);
    var fullName = ((d.firstName || '') + ' ' + (d.lastName || '')).trim();
    var address = [d.city, d.country].filter(Boolean).join(', ') || (d.address || '');
    var skills = Array.isArray(d.skills) ? d.skills.join(', ') : (d.skills || '');
    var languages = d.languages || [];
    var education = (d.education || []).map(function (e) {
      var end = (e.gradMonth && e.gradYear) ? (e.gradMonth + ' ' + e.gradYear) : (e.gradYear || e.end || '');
      return { degree: e.degree || '', description: e.fieldOfStudy || '', university: e.institution || '', end: end };
    });
    var experience = (d.experience || []).map(function (e) {
      var end = (e.currentWork || e.end === 'Present') ? 'Present' : (e.end || '');
      return { title: e.title || '', company: e.company || '', responsibilities: (e.responsibilities || '').slice(0, 120), end: end };
    });
    return {
      personalInfo: { fullName: fullName, jobTitle: d.jobTitle || '', email: d.email || '', phone: d.phone || '', address: address },
      about: d.about || '',
      skills: skills,
      languages: languages,
      education: education,
      experience: experience
    };
  } catch (e) {
    return { personalInfo: {}, about: '', skills: '', languages: [], education: [], experience: [] };
  }
}

function clShowStep(n) {
  coverLetterStep = n;
  var stepNumEl = document.getElementById('clStepNum');
  if (stepNumEl) stepNumEl.textContent = n;
  document.querySelectorAll('#coverLetterWizard .cl-step').forEach(function (el) { el.classList.add('hidden'); });
  var stepEl = document.querySelector('.cl-step[data-cl="' + n + '"]');
  if (stepEl) {
    stepEl.classList.remove('hidden');
    var key = stepEl.dataset.clKey;
    if (key && coverLetterData[key]) {
      stepEl.querySelectorAll('.cl-option').forEach(function (o) {
        if (o.dataset.value === coverLetterData[key]) o.classList.add('selected', 'border-cyan-500', 'bg-cyan-50');
        else o.classList.remove('selected', 'border-cyan-500', 'bg-cyan-50');
      });
    }
  }
  var backBtn = document.getElementById('clBackBtn');
  if (backBtn) backBtn.style.visibility = n === 1 ? 'hidden' : 'visible';
  var nextBtn = document.getElementById('clNextBtn');
  if (nextBtn) nextBtn.textContent = n === 8 ? 'Generate' : 'Continue';
  if (n === 7) updateClStrengthsDisplay();
}

function clNext() {
  if (coverLetterStep === 1) {
    var jobType = (document.getElementById('jobType') && document.getElementById('jobType').value) || '';
    var position = (document.getElementById('position') && document.getElementById('position').value) || '';
    var company = (document.getElementById('companyName') && document.getElementById('companyName').value) || '';
    if (!jobType || !position || !company) {
      alert('Please fill in Job Type, Position, and Company Name.');
      return;
    }
  }
  if (coverLetterStep === 2) {
    var sel = document.querySelector('.cl-step[data-cl="2"] .cl-option.selected');
    if (!sel) { alert('Please select how long you have been working.'); return; }
    coverLetterData.experienceYears = sel.dataset.value;
  }
  if (coverLetterStep === 3) {
    var sel = document.querySelector('.cl-step[data-cl="3"] .cl-option.selected');
    if (!sel) { alert('Please select student status.'); return; }
    coverLetterData.student = sel.dataset.value;
  }
  if (coverLetterStep === 4) {
    var sel = document.querySelector('.cl-step[data-cl="4"] .cl-option.selected');
    if (!sel) { alert('Please select school type.'); return; }
    coverLetterData.schoolType = sel.dataset.value;
  }
  if (coverLetterStep === 5) {
    coverLetterData.degree = (document.getElementById('clDegree') && document.getElementById('clDegree').value) || '';
    coverLetterData.fieldOfStudy = (document.getElementById('clFieldOfStudy') && document.getElementById('clFieldOfStudy').value) || '';
  }
  if (coverLetterStep === 6) {
    var sel = document.querySelector('.cl-step[data-cl="6"] .cl-option.selected');
    if (!sel) { alert('Please select your working style.'); return; }
    coverLetterData.workingStyle = sel.dataset.value;
  }
  if (coverLetterStep === 7) {
    if (coverLetterData.strengths.length < 1) { alert('Please choose at least one strength (up to 3).'); return; }
  }
  if (coverLetterStep === 8) {
    generateCoverLetterFromWizard();
    return;
  }
  clShowStep(coverLetterStep + 1);
}

function clPrev() {
  if (coverLetterStep <= 1) return;
  clShowStep(coverLetterStep - 1);
}

function updateClStrengthsDisplay() {
  var chosen = document.getElementById('clStrengthsChosen');
  if (!chosen) return;
  var arr = coverLetterData.strengths || [];
  chosen.innerHTML = arr.map(function (s) {
    return '<button type="button" class="cl-remove-strength inline-flex items-center justify-between w-full sm:w-auto px-5 py-2.5 rounded-lg bg-cyan-500 text-white font-medium text-left" data-value="' + s.replace(/"/g, '&quot;') + '"><span>' + s + '</span><span class="ml-2" aria-hidden="true">✓</span></button>';
  }).join('');
  chosen.querySelectorAll('.cl-remove-strength').forEach(function (btn) {
    btn.onclick = function () {
      coverLetterData.strengths = coverLetterData.strengths.filter(function (x) { return x !== btn.dataset.value; });
      updateClStrengthsDisplay();
    };
  });
}

document.addEventListener('DOMContentLoaded', function () {
  var wizard = document.getElementById('coverLetterWizard');
  if (!wizard) return;
  wizard.addEventListener('click', function (e) {
    var opt = e.target.closest('.cl-option');
    if (opt && opt.dataset.value && !opt.classList.contains('cl-strength')) {
      opt.closest('.cl-step').querySelectorAll('.cl-option').forEach(function (o) { o.classList.remove('selected', 'border-cyan-500', 'bg-cyan-50'); });
      opt.classList.add('selected', 'border-cyan-500', 'bg-cyan-50');
      var key = opt.closest('.cl-step').dataset.clKey;
      if (key) coverLetterData[key] = opt.dataset.value;
    }
    var strength = e.target.closest('.cl-strength');
    if (strength && strength.dataset.value) {
      var arr = coverLetterData.strengths || [];
      var idx = arr.indexOf(strength.dataset.value);
      if (idx >= 0) {
        arr.splice(idx, 1);
      } else if (arr.length < 3) {
        arr.push(strength.dataset.value);
      }
      coverLetterData.strengths = arr;
      updateClStrengthsDisplay();
    }
  });
});

async function generateCoverLetterFromWizard() {
  var jobType = (document.getElementById('jobType') && document.getElementById('jobType').value) || '';
  var position = (document.getElementById('position') && document.getElementById('position').value) || '';
  var companyName = (document.getElementById('companyName') && document.getElementById('companyName').value) || '';
  if (!jobType || !position || !companyName) {
    alert('Please fill in Job Type, Position, and Company Name (Step 1).');
    return;
  }
  var cvDataObj = getCVDataFromDraft();
  document.getElementById('coverLetterLoading').classList.remove('hidden');
  document.getElementById('coverLetterResult').classList.add('hidden');
  document.getElementById('coverLetterWizard').classList.add('hidden');

  var p = cvDataObj.personalInfo || {};
  var langList = (cvDataObj.languages || []).map(function (l) { return (l.language || '') + ' (' + (l.level || '') + ')'; }).filter(Boolean).join(', ') || 'Not specified';
  var eduList = (cvDataObj.education || []).map(function (e) { return (e.degree || '') + ' in ' + (e.description || '') + ' at ' + (e.university || '') + ' (' + (e.end || '') + ')'; }).filter(Boolean).join('; ') || 'Not specified';
  var expList = (cvDataObj.experience || []).map(function (e) { return (e.title || '') + ' at ' + (e.company || '') + ': ' + (e.responsibilities || ''); }).filter(Boolean).join('\n') || 'Not specified';
  var strengths = (coverLetterData.strengths && coverLetterData.strengths.length) ? coverLetterData.strengths.join(', ') : '';

  var userPrompt = 'Write a professional cover letter. Use the candidate information below and the questionnaire answers.\n\nTarget: ' + position + ' at ' + companyName + ' (Job type: ' + jobType + ').\n\nQuestionnaire: Experience length: ' + (coverLetterData.experienceYears || '') + '. Student: ' + (coverLetterData.student || '') + '. School type: ' + (coverLetterData.schoolType || '') + '. Degree: ' + (coverLetterData.degree || '') + '. Field of study: ' + (coverLetterData.fieldOfStudy || '') + '. Working style: ' + (coverLetterData.workingStyle || '') + '. Top strengths to highlight: ' + strengths + '.\n\nCandidate: ' + (p.fullName || '') + ', ' + (p.jobTitle || '') + '. Email: ' + (p.email || '') + '; Phone: ' + (p.phone || '') + '. About: ' + (cvDataObj.about || '') + '. Skills: ' + (cvDataObj.skills || '') + '. Languages: ' + langList + '. Education: ' + eduList + '. Experience: ' + expList + '.\n\nWrite the cover letter only. Professional tone, about one page. Highlight the chosen strengths where relevant.';

  try {
    var response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: 'You are a professional career coach. Write clear, tailored cover letters. Output only the cover letter text.' },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.5
      })
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    var result = await response.json();
    var coverLetterText = (result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content) ? result.choices[0].message.content.trim() : '';
    if (!coverLetterText) throw new Error('Empty response');
    document.getElementById('coverLetterLoading').classList.add('hidden');
    document.getElementById('coverLetterResult').classList.remove('hidden');
    document.getElementById('coverLetterContent').textContent = coverLetterText;
  } catch (error) {
    document.getElementById('coverLetterLoading').classList.add('hidden');
    document.getElementById('coverLetterResult').classList.remove('hidden');
    document.getElementById('coverLetterContent').innerHTML = '<div class="bg-red-50 border border-red-200 rounded-lg p-6"><p class="text-red-800 font-semibold">Error generating cover letter</p><p class="text-red-600 text-sm">' + (error.message || '') + '</p></div>';
  }
}

async function saveCoverLetterToAccount() {
  try {
    const client = window.getEasyjobSupabase && window.getEasyjobSupabase();
    if (!client) throw new Error('Supabase is not initialized (check supabase-config.js).');

    const { data: sessionData } = await client.auth.getSession();
    const session = sessionData && sessionData.session;
    if (!session) {
      alert('Please sign in to save.');
      window.location.href = 'login.html';
      return;
    }

    const contentEl = document.getElementById('coverLetterContent');
    const text = contentEl ? (contentEl.textContent || '').trim() : '';
    if (!text || text.length < 20) throw new Error('No cover letter content to save. Please generate it first.');

    const position = (document.getElementById('position') && document.getElementById('position').value) || 'Position';
    const company = (document.getElementById('companyName') && document.getElementById('companyName').value) || 'Company';
    const title = (position + ' - ' + company + ' Cover Letter').trim();

    const payload = {
      user_id: session.user.id,
      title: title,
      content_text: text,
      wizard_json: coverLetterData
    };

    const { error } = await client.from('cover_letters').insert(payload);
    if (error) throw error;

    alert('Saved to your account!');
    window.location.href = 'account.html';
  } catch (e) {
    console.error(e);
    alert('Save failed: ' + (e && e.message ? e.message : 'Unknown error'));
  }
}

function copyCoverLetter() {
  var contentEl = document.getElementById('coverLetterContent');
  var content = contentEl ? contentEl.textContent : '';
  navigator.clipboard.writeText(content).then(function () {
    alert('Cover letter copied to clipboard!');
  }).catch(function (err) {
    console.error('Failed to copy:', err);
    alert('Failed to copy. Please select and copy manually.');
  });
}

function downloadCoverLetter() {
  var contentEl = document.getElementById('coverLetterContent');
  var content = contentEl ? contentEl.textContent : '';
  var blob = new Blob([content], { type: 'text/plain' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  var pos = document.getElementById('position');
  var company = document.getElementById('companyName');
  a.download = ((pos && pos.value) || 'Position') + '_' + ((company && company.value) || 'Company') + '_CoverLetter.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
