(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const screens = $$('.screen');
  const state = {
    path: null, warmupIndex: 0, warmupAnswers: {}, missionSelection: null,
    attempts: 0, startedAt: 0, timeLeft: 120, timerId: null, earned: false,
    selectedClues: [], toastTimer: null, warmupLocked: false
  };

  const paths = {
    ai: {
      name: 'AI Specialist', badge: 'AI Pathfinder', challenge: 'Train the Machine',
      icon: '✧', accent: '#75b9df', soft: '#eaf6fc',
      description: 'Teach a simple classifier to recognize patterns without memorizing the examples.',
      warmups: [
        {q:'What does a training example usually contain?', a:['A labeled input the model can learn from','Only the final prediction, with no input','A random number unrelated to the task','A guarantee that every future case will be correct'], correct:0, why:'Training examples pair useful inputs with known labels, helping a classifier learn patterns.'},
        {q:'Why should a training dataset include varied examples?', a:['To make the dataset larger at any cost','To help the classifier work on unfamiliar cases','To remove all difficult examples','To ensure the model memorizes every row'], correct:1, why:'Relevant diversity helps a model learn patterns that generalize beyond the exact examples it saw.'}
      ]
    },
    data: {
      name: 'Data Analyst', badge: 'Data Strategist', challenge: 'Find the Story',
      icon: '▥', accent: '#d4af37', soft: '#fff8e4',
      description: 'Investigate the business numbers and choose the conclusion the evidence actually supports.',
      warmups: [
        {q:'A shop earns $1,000 in revenue and spends $650 on operating costs. What is its operating profit?', a:['$1,650','$650','$350','$1,000'], correct:2, why:'Profit here is revenue minus operating costs: $1,000 − $650 = $350.'},
        {q:'Orders rise by 20%, but revenue stays flat. What is the most useful next question?', a:['Did the average revenue per order decrease?','Can we assume profit doubled?','Should we ignore revenue from now on?','Does this prove all customers are unhappy?'], correct:0, why:'If total revenue is unchanged while order count rises, average revenue per order likely fell. Check the figures before deciding why.'}
      ]
    },
    cyber: {
      name: 'Cybersecurity', badge: 'Cyber Guardian', challenge: 'Catch the Threat',
      icon: '⌁', accent: '#6cae9b', soft: '#eaf7f2',
      description: 'Correlate account events and select the two clues most relevant to a possible compromise.',
      warmups: [
        {q:'Which combination is the strongest sign that an account may be compromised?', a:['A successful login from a familiar device','A new login location followed by an unfamiliar password change','A user signing in during normal working hours','A single failed login followed by no activity'], correct:1, why:'A new location plus an unexpected account change is stronger combined evidence than one event alone.'},
        {q:'Why is one unfamiliar IP address not always proof of an attack?', a:['IP addresses never change','Legitimate travel, VPNs, or network changes can alter the IP','Every unfamiliar IP is automatically safe','IP addresses contain the user’s password'], correct:1, why:'IP context matters. Correlating location, device, timing, and follow-up actions reduces false alarms.'}
      ]
    },
    dev: {
      name: 'Developer', badge: 'Code Crafter', challenge: 'Debug the System',
      icon: '</>', accent: '#7f9ed0', soft: '#eef2fc',
      description: 'Find the smallest logical fix that handles ordinary inputs and the edge case.',
      warmups: [
        {q:'A loop must process every item in an array of length n. Which index condition is usually correct?', a:['i < n','i <= n','i > n','i === n + 1'], correct:0, why:'Array indexes run from 0 through n − 1, so i < n visits every valid item without stepping past the end.'},
        {q:'What is the best first step when a program fails one test case?', a:['Rewrite the entire program immediately','Remove the failing test','Reproduce the case and trace the expected versus actual result','Assume the test is wrong'], correct:2, why:'A small reproducible test helps isolate the cause and verify that a fix addresses the actual bug.'}
      ]
    }
  };

  const challenges = {
    ai: {
      intro:'A simple classifier should label a fruit as “apple” or “orange” using color and texture. Choose the training dataset most likely to help it classify new fruit correctly.',
      render: () => `
        <div class="mission-panel">
          <div class="panel-heading"><h3>Training lab · dataset review</h3><span class="panel-tag">CLASSIFICATION</span></div>
          <p class="mission-intro">The model has not seen the test fruit before. Which dataset gives it the strongest basis for learning useful patterns?</p>
          <div style="overflow-x:auto"><table class="dataset-table"><thead><tr><th>Dataset</th><th>Examples</th><th>Coverage</th><th>Labels</th></tr></thead><tbody>
          <tr><td><b>Set A</b></td><td>40 apples, all bright red</td><td>One color, one texture</td><td>Correct</td></tr>
          <tr><td><b>Set B</b></td><td>24 apples + 24 oranges</td><td>Many colors, sizes & textures</td><td>Correct</td></tr>
          <tr><td><b>Set C</b></td><td>100 mixed fruit</td><td>Many colors & textures</td><td>Labels missing</td></tr>
          <tr><td><b>Set D</b></td><td>48 examples, duplicated</td><td>Mostly identical samples</td><td>Correct</td></tr>
          </tbody></table></div>
          <p class="challenge-note">Goal: generalize to new fruit, not just perform well on examples already seen. This is a rule-based learning concept demo, not a trained AI model.</p>
          <div class="choice-grid" style="margin-top:16px">
            ${[['A','Set A — consistent examples may make the task simpler.'],['B','Set B — balanced, correctly labeled, diverse examples.'],['C','Set C — maximum variety, even without labels.'],['D','Set D — more rows through repeated examples.']].map(([v,t])=>choice(v,t)).join('')}
          </div>
        </div>`
    },
    data: {
      intro:'A small retailer wants to understand why profit changed in April. Review the month-by-month dashboard, then select the explanation supported by the figures.',
      render: () => `
        <div class="metrics">
          <div class="metric"><span>APRIL ORDERS</span><strong>1,200</strong><em>+20% vs March</em></div>
          <div class="metric"><span>APRIL REVENUE</span><strong>$24,000</strong><em>+9.1% vs March</em></div>
          <div class="metric"><span>OPERATING COSTS</span><strong>$18,000</strong><em>+28.6% vs March</em></div>
          <div class="metric"><span>APRIL PROFIT</span><strong>$6,000</strong><em>Revenue − costs</em></div>
        </div>
        <div class="mission-panel">
          <div class="panel-heading"><h3>Monthly performance</h3><span class="panel-tag">MARCH → APRIL</span></div>
          <div class="mini-chart" aria-label="Bar chart of March and April revenue and costs">
            <div class="bar-group"><div class="bar" style="height:70%"></div><span class="bar-label">Mar revenue</span></div>
            <div class="bar-group"><div class="bar" style="height:55%;background:#d9c16d"></div><span class="bar-label">Mar costs</span></div>
            <div class="bar-group"><div class="bar" style="height:82%"></div><span class="bar-label">Apr revenue</span></div>
            <div class="bar-group"><div class="bar" style="height:74%;background:#d9c16d"></div><span class="bar-label">Apr costs</span></div>
          </div>
          <div style="overflow-x:auto"><table class="analytics-table"><thead><tr><th>Month</th><th>Orders</th><th>Revenue</th><th>Costs</th><th>Profit</th></tr></thead><tbody>
          <tr><td>March</td><td>1,000</td><td>$22,000</td><td>$14,000</td><td>$8,000</td></tr>
          <tr><td>April</td><td>1,200</td><td>$24,000</td><td>$18,000</td><td>$6,000</td></tr>
          </tbody></table></div>
          <p class="challenge-note">Select the single explanation best supported by the displayed data.</p>
          <div class="choice-grid" style="margin-top:14px">
            ${[
              ['A','Profit rose because the business received more orders.'],
              ['B','Revenue fell in April, causing profit to fall.'],
              ['C','Costs grew faster than revenue, reducing profit by $2,000.'],
              ['D','April profit was $42,000 because revenue and costs are added.']
            ].map(([v,t])=>choice(v,t)).join('')}
          </div>
        </div>`
    },
    cyber: {
      intro:'An account owner reports an unexpected password reset. Review the timeline and select exactly two events that together provide the strongest evidence of possible account compromise.',
      render: () => `
        <div class="mission-panel">
          <div class="panel-heading"><h3>Account incident · user 4821</h3><span class="panel-tag">EVENT TIMELINE</span></div>
          <p class="event-hint">Select exactly two clues. Normal activity is included as context.</p>
          <div id="eventList">
          ${[
            ['08:42:11','Successful login · Amman, JO','Known laptop · familiar IP range · usual weekday pattern','normal'],
            ['08:43:02','Failed login · Amman, JO','One mistyped password from the known laptop','normal'],
            ['09:17:46','Successful login · unfamiliar network','New device fingerprint · IP geolocates to another country','clue1'],
            ['09:19:13','Account security settings changed','Password reset completed from the new device 87 seconds after login','clue2'],
            ['09:26:50','Session refresh · Amman, JO','Known laptop session remains active','normal']
          ].map(([time,title,detail,id],i)=>`<button class="event-row" type="button" data-clue="${id}" aria-pressed="false"><span class="event-check">✓</span><span><strong>${title}</strong><p>${detail}</p></span><span class="event-time">${time}</span></button>`).join('')}
          </div>
          <p class="challenge-note">Security investigations rely on correlated signals. A single unfamiliar location can be legitimate; the sequence and account changes add context.</p>
        </div>`
    },
    dev: {
      intro:'This function should return the average of a list of numbers. It currently fails an edge case. Choose the fix that makes all three tests pass.',
      render: () => `
        <div class="mission-panel">
          <div class="panel-heading"><h3>Code editor · average()</h3><span class="panel-tag">LOGIC DEBUGGING</span></div>
          <pre class="code-block"><span class="code-line">function average(numbers) {</span>
  let total = 0;
  for (let i = 0; i &lt; numbers.length; i++) {
    total += numbers[i];
  }
  return total / numbers.length;
<span class="code-line">}</span></pre>
          <div class="panel-heading"><h3>Test cases</h3><span class="panel-tag">3 TESTS</span></div>
          <div class="test-cases">
            <div class="test-case"><small>TEST 01 · STANDARD</small><code>average([2, 4]) → 3</code></div>
            <div class="test-case"><small>TEST 02 · NEGATIVE</small><code>average([-2, 2]) → 0</code></div>
            <div class="test-case"><small>TEST 03 · EDGE CASE</small><code>average([]) → 0</code></div>
          </div>
          <p class="challenge-note">The current code returns NaN for an empty array because it divides 0 by 0. Select a fix that preserves the other results.</p>
          <div class="choice-grid" style="margin-top:14px">
            ${[
              ['A','Return 0 immediately when numbers.length is 0; otherwise calculate the average.'],
              ['B','Change the loop condition to i <= numbers.length.'],
              ['C','Always return total, without dividing by the length.'],
              ['D','Divide total by numbers.length + 1 for every input.']
            ].map(([v,t])=>choice(v,t)).join('')}
          </div>
        </div>`
    }
  };

  function choice(letter, text) {
    return `<button class="choice-card" type="button" data-choice="${letter}" aria-pressed="false"><span class="choice-index">${letter}</span><span>${text}</span></button>`;
  }

  function showScreen(name) {
    stopTimer();
    screens.forEach(s => {
      const active = s.dataset.screen === name;
      s.hidden = !active;
      s.classList.toggle('active', active);
    });
    window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
    $('#app').focus({preventScroll:true});
  }

  function toast(message) {
    const el = $('#toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  function renderPaths() {
    const grid = $('#pathGrid');
    grid.innerHTML = Object.entries(paths).map(([key,p],i)=>`
      <button class="path-card" type="button" data-path="${key}" style="--path-accent:${p.accent};--path-soft:${p.soft}">
        <span class="path-num">0${i+1} / 04</span><span class="path-icon">${p.icon}</span>
        <h3>${p.name}</h3><p>${p.description}</p><span class="path-link">Explore this path <span>↗</span></span>
      </button>`).join('');
    $$('.path-card',grid).forEach(btn=>btn.addEventListener('click',()=>selectPath(btn.dataset.path)));
  }

  function selectPath(key) {
    state.path=key; state.warmupIndex=0; state.warmupAnswers={}; state.missionSelection=null;
    state.attempts=0; state.earned=false; state.selectedClues=[];
    renderWarmup(); showScreen('warmup');
  }

  function renderWarmup() {
    const p=paths[state.path], q=p.warmups[state.warmupIndex];
    $('#warmupPathLabel').innerHTML=`<span>✦</span> ${p.name.toUpperCase()}`;
    $('#warmupProgress').style.width=`${(state.warmupIndex/2)*100}%`;
    $('#warmupCount').textContent=`0${state.warmupIndex+1}`;
    $('#warmupQuestion').textContent=q.q;
    $('#warmupAnswers').innerHTML=q.a.map((answer,i)=>`<button type="button" class="answer-option" data-answer="${i}" aria-pressed="false"><span class="answer-letter">${String.fromCharCode(65+i)}</span><span>${answer}</span></button>`).join('');
    $('#warmupFeedback').hidden=true; $('#warmupFeedback').className='feedback';
    $('#warmupNext').disabled=true; $('#warmupNext').textContent=state.warmupIndex===1?'Begin challenge →':'Continue →';
    $('#warmupHint').textContent='Select one answer to continue.';
    state.warmupLocked=false;
    $$('.answer-option').forEach(btn=>btn.addEventListener('click',()=>answerWarmup(Number(btn.dataset.answer))));
  }

  function answerWarmup(index) {
    if(state.warmupLocked)return;
    const q=paths[state.path].warmups[state.warmupIndex];
    state.warmupAnswers[state.warmupIndex]=index; state.warmupLocked=true;
    $$('.answer-option').forEach((btn,i)=>{
      btn.disabled=true;
      if(i===q.correct)btn.classList.add('correct');
      if(i===index&&i!==q.correct)btn.classList.add('incorrect');
      btn.setAttribute('aria-pressed',String(i===index));
    });
    const feedback=$('#warmupFeedback'), correct=index===q.correct;
    feedback.hidden=false; feedback.className=`feedback ${correct?'good':'bad'}`;
    feedback.textContent=`${correct?'Correct.':'Not quite.'} ${q.why}`;
    $('#warmupHint').textContent='Ready when you are.';
    $('#warmupNext').disabled=false;
    $('#warmupProgress').style.width=`${((state.warmupIndex+1)/2)*100}%`;
  }

  function nextWarmup() {
    if(!state.warmupLocked){toast('Choose an answer before continuing.');return;}
    if(state.warmupIndex===0){state.warmupIndex=1;renderWarmup();}
    else startMission();
  }

  function startMission() {
    state.attempts=0; state.missionSelection=null; state.selectedClues=[];
    $('#missionPath').textContent=paths[state.path].name.toUpperCase();
    $('#missionName').textContent=paths[state.path].challenge;
    $('#missionContent').innerHTML=`<p class="mission-intro">${challenges[state.path].intro}</p>${challenges[state.path].render()}`;
    $('#missionStatus').textContent='Review the evidence, then submit your solution.';
    $('#submitMission').disabled=false;
    $('#missionProgressText').textContent='MISSION BRIEFING';
    $('#missionProgress').style.width='25%';
    if(state.path==='cyber') setupCyber();
    else $$('.choice-card').forEach(btn=>btn.addEventListener('click',()=>selectChoice(btn.dataset.choice)));
    showScreen('mission'); startTimer();
  }

  function selectChoice(value) {
    state.missionSelection=value;
    $$('.choice-card').forEach(btn=>{const selected=btn.dataset.choice===value;btn.classList.toggle('selected',selected);btn.setAttribute('aria-pressed',String(selected));});
    $('#missionStatus').textContent=`Option ${value} selected. You can change it before submitting.`;
    $('#missionProgressText').textContent='SOLUTION SELECTED';
    $('#missionProgress').style.width='70%';
  }

  function setupCyber() {
    state.selectedClues=[];
    $$('.event-row').forEach(btn=>btn.addEventListener('click',()=>{
      const id=btn.dataset.clue;
      if(btn.classList.contains('selected'))state.selectedClues=state.selectedClues.filter(x=>x!==id);
      else if(state.selectedClues.length<2)state.selectedClues.push(id);
      else {toast('Choose exactly two clues. Deselect one first.');return;}
      btn.classList.toggle('selected',state.selectedClues.includes(id));
      btn.setAttribute('aria-pressed',String(state.selectedClues.includes(id)));
      $('.event-check',btn).textContent=state.selectedClues.includes(id)?'✓':'✓';
      $('#missionStatus').textContent=`${state.selectedClues.length} of 2 clues selected.`;
      $('#missionProgressText').textContent=state.selectedClues.length===2?'READY TO SUBMIT':'INVESTIGATE EVENTS';
      $('#missionProgress').style.width=state.selectedClues.length===2?'70%':'40%';
    }));
  }

  function startTimer() {
    stopTimer(); state.timeLeft=120; state.startedAt=Date.now(); updateTimer();
    state.timerId=setInterval(()=>{
      state.timeLeft=Math.max(0,120-Math.floor((Date.now()-state.startedAt)/1000));
      updateTimer();
      if(state.timeLeft<=0){stopTimer();finishMission(false,true);}
    },250);
  }
  function stopTimer(){if(state.timerId){clearInterval(state.timerId);state.timerId=null;}}
  function updateTimer() {
    const m=String(Math.floor(state.timeLeft/60)).padStart(2,'0'),s=String(state.timeLeft%60).padStart(2,'0');
    $('#timer').textContent=`${m}:${s}`;$('#timerBox').classList.toggle('urgent',state.timeLeft<=20);
  }

  function verify() {
    if(state.path==='ai')return state.missionSelection==='B';
    if(state.path==='data')return state.missionSelection==='C';
    if(state.path==='cyber')return state.selectedClues.length===2&&state.selectedClues.includes('clue1')&&state.selectedClues.includes('clue2');
    if(state.path==='dev')return state.missionSelection==='A';
    return false;
  }

  function submitMission() {
    if(state.path==='cyber'&&state.selectedClues.length!==2){toast('Select exactly two clues before submitting.');return;}
    if(state.path!=='cyber'&&!state.missionSelection){toast('Choose an answer before submitting.');return;}
    state.attempts++;
    if(verify())finishMission(true,false);
    else {
      $('#missionStatus').textContent='Not quite — review the evidence and adjust your selection. You can try again while time remains.';
      $('#missionProgressText').textContent='REVIEW YOUR EVIDENCE';
      $('#missionProgress').style.width='48%';
      toast('That solution is not quite right. Try again!');
    }
  }

  function finishMission(success, timedOut) {
    stopTimer(); state.earned=success;
    const elapsed=120-state.timeLeft;
    $('#resultTitle').textContent=success?'Mission complete.':'Time to regroup.';
    $('#resultMessage').textContent=success
      ?`You completed ${paths[state.path].challenge} by using evidence and careful reasoning. Your ${paths[state.path].badge} badge is earned.`
      :timedOut?'The two-minute mission window ended before the correct solution was submitted. Every attempt is a chance to learn — reset the mission and try again.':'Your mission is ready for another attempt.';
    $('#resultSymbol').textContent=success?'✦':'↻';
    $('#resultAttempts').textContent=String(Math.max(1,state.attempts)).padStart(2,'0');
    $('#resultTime').textContent=`${String(Math.floor(elapsed/60)).padStart(2,'0')}:${String(elapsed%60).padStart(2,'0')}`;
    $('#downloadBadge').hidden=!success;
    $('#retryMission').hidden=success;
    $('#badgePreview').innerHTML=success?makeBadgeSvg(state.path):makeRetryArt();
    $('.result-screen').classList.toggle('result-failed',!success);
    showScreen('result');
  }

  function makeRetryArt() {
    return `<svg viewBox="0 0 400 440" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mission retry illustration"><rect x="10" y="10" width="380" height="420" rx="24" fill="#fff" stroke="#dce7ef"/><circle cx="200" cy="165" r="82" fill="#f2f8fc"/><path d="M200 105a60 60 0 1 1-52 30" fill="none" stroke="#d4af37" stroke-width="8" stroke-linecap="round"/><path d="m139 119 9 22 23-4" fill="none" stroke="#d4af37" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><text x="200" y="290" text-anchor="middle" font-family="Arial,sans-serif" font-size="24" font-weight="700" fill="#24527a">TRY AGAIN</text><text x="200" y="320" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" fill="#708497">A fresh attempt is waiting.</text><text x="200" y="365" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" letter-spacing="2" fill="#b18e26">NASHAMA CHALLENGE</text></svg>`;
  }

  function escapeXml(str) {
    return String(str).replace(/[<>&'"]/g, c=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c]));
  }
  function makeBadgeSvg(key) {
    const p=paths[key], emblem = `<path d="M200 54 218 94 262 78 243 121 277 150 231 155 218 200 200 163 163 200 169 155 123 150 157 121 138 78 182 94Z" fill="#fff" stroke="#D4AF37" stroke-width="3"/><path d="M200 84 213 114 245 117 221 138 228 170 200 153 172 170 179 138 155 117 187 114Z" fill="#B8DDF2" stroke="#24527A" stroke-width="2"/><circle cx="200" cy="130" r="12" fill="#D4AF37"/><path d="m194 130 4 4 8-9" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="880" viewBox="0 0 400 440" role="img" aria-label="${escapeXml(p.badge)} achievement badge">
      <defs><linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4df8d"/><stop offset=".48" stop-color="#D4AF37"/><stop offset="1" stop-color="#b18b20"/></linearGradient><linearGradient id="blue" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#eef7fc"/></linearGradient></defs>
      <rect width="400" height="440" rx="24" fill="#fff"/><rect x="8" y="8" width="384" height="424" rx="20" fill="url(#blue)" stroke="#D4AF37" stroke-width="2"/><rect x="17" y="17" width="366" height="406" rx="16" fill="none" stroke="#b8ddef" stroke-width="1.5"/>
      <path d="M20 28h70M20 28v70M380 28h-70M380 28v70M20 412h70M20 412v-70M380 412h-70M380 412v-70" fill="none" stroke="#D4AF37" stroke-width="2"/>
      <text x="200" y="48" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" font-weight="700" letter-spacing="3" fill="#24527A">NASHAMA CHALLENGE</text>
      <path d="M70 63H330" stroke="#d4af37" stroke-width="1"/><circle cx="200" cy="63" r="3" fill="#D4AF37"/>
      <g>${emblem}</g>
      <text x="200" y="230" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" font-weight="700" letter-spacing="3" fill="#6c879a">ACHIEVEMENT UNLOCKED</text>
      <text x="200" y="268" text-anchor="middle" font-family="Arial,sans-serif" font-size="${p.badge.length>14?25:29}" font-weight="700" fill="#24527A">${escapeXml(p.badge)}</text>
      <text x="200" y="294" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" letter-spacing="1.5" fill="#5f778a">${escapeXml(p.name.toUpperCase())}</text>
      <rect x="90" y="318" width="220" height="34" rx="17" fill="#24527A"/><text x="200" y="340" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" font-weight="700" letter-spacing="2" fill="#fff">MISSION COMPLETED</text>
      <path d="M94 378H306" stroke="#d4af37" stroke-width="1"/><text x="200" y="400" text-anchor="middle" font-family="Arial,sans-serif" font-size="9" letter-spacing="2" fill="#8a9ca8">COURAGE · CURIOSITY · CREATIVITY</text>
    </svg>`;
  }

  function downloadBadge() {
    if(!state.earned){toast('Complete the mission to earn your badge.');return;}
    const svg=makeBadgeSvg(state.path);
    const blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'});
    const url=URL.createObjectURL(blob), a=document.createElement('a');
    a.href=url;a.download=`nashama-${state.path}-badge.svg`;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    toast('Your badge download has started.');
  }

  function exitToPaths() { stopTimer(); showScreen('paths'); }
  function retry() { startMission(); }
  $('#startBtn').addEventListener('click',()=>{renderPaths();showScreen('paths');});
  $('#brandHome').addEventListener('click',e=>{e.preventDefault();stopTimer();showScreen('welcome');});
  $('#backWelcome').addEventListener('click',()=>showScreen('welcome'));
  $('#exitWarmup').addEventListener('click',exitToPaths);
  $('#warmupNext').addEventListener('click',nextWarmup);
  $('#exitMission').addEventListener('click',()=>{if(confirm('Leave this mission? Your current timer and selections will reset.'))showScreen('paths');});
  $('#submitMission').addEventListener('click',submitMission);
  $('#downloadBadge').addEventListener('click',downloadBadge);
  $('#anotherPath').addEventListener('click',()=>{renderPaths();showScreen('paths');});
  $('#retryMission').addEventListener('click',retry);
  renderPaths();
})();