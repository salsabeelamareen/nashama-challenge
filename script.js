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
    const p=paths[key];
    const icons={
      ai:`<rect x="157" y="88" width="86" height="76" rx="13" fill="#082B67" stroke="#C58A00" stroke-width="5"/><path d="m177 122 13-12m-13 12 13 12m30-24-13 24m30-24-13 12 13 12" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M172 77v11m28-11v11m28-11v11m-56 76v11m28-11v11m28-11v11m-82-62h11m-11 25h11m-11 25h11m86-50h11m-11 25h11m-11 25h11" stroke="#C58A00" stroke-width="4" stroke-linecap="round"/>`,
      data:`<rect x="145" y="86" width="110" height="82" rx="10" fill="#fff" stroke="#C58A00" stroke-width="5"/><path d="M164 150v-22h16v22m10 0v-39h16v39m10 0v-29h16v29" fill="#79C6F5" stroke="#082B67" stroke-width="4" stroke-linejoin="round"/><path d="M160 103h80" stroke="#082B67" stroke-width="4"/>`,
      cyber:`<path d="M200 78 250 98v36c0 31-22 48-50 61-28-13-50-30-50-61V98Z" fill="#fff" stroke="#C58A00" stroke-width="5"/><rect x="179" y="119" width="42" height="34" rx="6" fill="#082B67"/><path d="M188 119v-9a12 12 0 0 1 24 0v9m-12 14v7" fill="none" stroke="#082B67" stroke-width="5" stroke-linecap="round"/>`,
      dev:`<rect x="145" y="91" width="110" height="74" rx="10" fill="#082B67" stroke="#C58A00" stroke-width="5"/><path d="m176 116-14 12 14 12m48-24 14 12-14 12m-16-26-12 28" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M182 178h36m-18-13v13" stroke="#C58A00" stroke-width="5" stroke-linecap="round"/>`
    };
    const emblem=icons[key]||icons.dev;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="880" viewBox="0 0 400 440" role="img" aria-label="${escapeXml(p.badge)} achievement badge">
      <defs><linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4df8d"/><stop offset=".48" stop-color="#D4AF37"/><stop offset="1" stop-color="#b18b20"/></linearGradient><linearGradient id="blue" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#eef7fc"/></linearGradient></defs>
      <rect width="400" height="440" rx="24" fill="#fff"/><rect x="8" y="8" width="384" height="424" rx="20" fill="url(#blue)" stroke="#C58A00" stroke-width="2"/><rect x="17" y="17" width="366" height="406" rx="16" fill="none" stroke="#b8ddef" stroke-width="1.5"/>
      <path d="M20 28h70M20 28v70M380 28h-70M380 28v70M20 412h70M20 412v-70M380 412h-70M380 412v-70" fill="none" stroke="#D4AF37" stroke-width="2"/>
      <text x="200" y="48" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" font-weight="700" letter-spacing="3" fill="#082B67">NASHAMA CHALLENGE</text>
      <path d="M70 63H330" stroke="#d4af37" stroke-width="1"/><circle cx="200" cy="63" r="3" fill="#D4AF37"/>
      <g>${emblem}</g>
      <text x="200" y="230" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" font-weight="700" letter-spacing="3" fill="#6c879a">ACHIEVEMENT UNLOCKED</text>
      <text x="200" y="268" text-anchor="middle" font-family="Arial,sans-serif" font-size="${p.badge.length>14?25:29}" font-weight="700" fill="#082B67">${escapeXml(p.badge)}</text>
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
  const arTranslations = {
    'JORDAN · INNOVATION IN ACTION':'الأردن · الابتكار على أرض الواقع','YOUR NEXT CHALLENGE STARTS HERE':'تحدّيك القادم يبدأ من هنا','Think boldly.':'فكّر بجرأة.','Build what’s next.':'اصنع المستقبل.','Step into a hands-on technology mission. Explore a path, solve a challenge, and earn your NASHAMA achievement badge.':'ابدأ مهمة تقنية تفاعلية، واختر مسارك، وحلّ التحدّي، واحصل على شارة إنجاز النشامى.','Start your journey':'ابدأ رحلتك','4 paths':'٤ مسارات','2-minute missions':'مهام مدتها دقيقتان','No sign-up':'لا حاجة للتسجيل','BUILT FOR CURIOUS MINDS':'صُمّم للعقول الفضولية','LEARN BY DOING':'تعلّم بالتجربة','COURAGE · CURIOSITY · CREATIVITY':'الشجاعة · الفضول · الإبداع','YOUR MISSION':'مهمتك','Make it count.':'اجعلها تجربة مميزة.','PATHS TO EXPLORE':'مسارات للاستكشاف','One bold next step':'خطوة جريئة نحو الأمام','01 / DISCOVER':'٠١ / اكتشف','DESIGNED FOR THE NEXT GENERATION OF INNOVATORS':'صُمّم للجيل القادم من المبتكرين','CHOOSE YOUR MISSION':'اختر مهمتك','Which path will you take?':'أيّ مسار ستختار؟','Pick the challenge that sparks your curiosity. You can explore every path.':'اختر التحدّي الذي يثير فضولك. يمكنك استكشاف جميع المسارات.','01':'٠١','PATH SELECTION':'اختيار المسار','Every path leads to a new skill.':'كل مسار يقودك إلى مهارة جديدة.','← Back to welcome':'← العودة إلى البداية','GET INTO THE FLOW':'ابدأ بالتفكير','Warm up':'هيّئ','your thinking.':'عقلك للتفكير.','Two quick questions to get familiar with your mission. Choose an answer to see why it works.':'سؤالان سريعان للتعرّف على مهمتك. اختر إجابة لتعرف لماذا هي صحيحة.',' / 02 QUESTIONS':' / سؤالان','WARM-UP QUESTION':'سؤال تمهيدي','~ 20–40 SEC':'~ ٢٠–٤٠ ثانية','Select one answer to continue.':'اختر إجابة للمتابعة.','Continue':'متابعة','Begin challenge':'ابدأ التحدّي','← Change path':'← تغيير المسار','← Exit mission':'← الخروج من المهمة','TIME LEFT':'الوقت المتبقي','MISSION BRIEFING':'موجز المهمة','Review the evidence, then submit your solution.':'راجع الأدلة، ثم أرسل الحل.','Submit solution':'إرسال الحل','MISSION REPORT':'تقرير المهمة','Mission complete.':'اكتملت المهمة.','Download badge':'تنزيل الشارة','Try another path':'جرّب مسارًا آخر','Retry this mission':'↻ أعد المحاولة','YOUR EARNED ACHIEVEMENT':'إنجازك الذي حصلت عليه','Yours to keep. No account needed.':'احتفظ بشارتك. لا حاجة إلى حساب.','MADE FOR THE SPIRIT OF DISCOVERY':'صُنع بروح الاكتشاف','LOCAL · PRIVATE · INTERACTIVE':'محلي · خاص · تفاعلي','AI Specialist':'اختصاصي الذكاء الاصطناعي','AI Pathfinder':'مستكشف الذكاء الاصطناعي','Train the Machine':'درّب الآلة','Teach a simple classifier to recognize patterns without memorizing the examples.':'علّم نموذج تصنيف بسيطًا التعرّف على الأنماط دون حفظ الأمثلة.','What does a training example usually contain?':'ممّ يتكوّن مثال التدريب عادةً؟','A labeled input the model can learn from':'مدخل مُعنون يمكن للنموذج التعلّم منه','Only the final prediction, with no input':'التنبؤ النهائي فقط، دون مدخلات','A random number unrelated to the task':'رقم عشوائي لا علاقة له بالمهمة','A guarantee that every future case will be correct':'ضمان أن كل حالة مستقبلية ستكون صحيحة','Why should a training dataset include varied examples?':'لماذا يجب أن تتضمن بيانات التدريب أمثلة متنوعة؟','To make the dataset larger at any cost':'لزيادة حجم البيانات بأي ثمن','To help the classifier work on unfamiliar cases':'لمساعدة المصنّف على التعامل مع حالات غير مألوفة','To remove all difficult examples':'لحذف جميع الأمثلة الصعبة','To ensure the model memorizes every row':'لضمان أن يحفظ النموذج كل صف','Data Analyst':'محلل بيانات','Data Strategist':'خبير استراتيجيات البيانات','Find the Story':'اكتشف القصة','Investigate the business numbers and choose the conclusion the evidence actually supports.':'حلّل أرقام العمل واختر الاستنتاج الذي تدعمه الأدلة فعلًا.','A shop earns $1,000 in revenue and spends $650 on operating costs. What is its operating profit?':'حقق متجر إيرادات قدرها ١٠٠٠ دولار وأنفق ٦٥٠ دولارًا تكاليف تشغيل. ما ربح التشغيل؟','Orders rise by 20%, but revenue stays flat. What is the most useful next question?':'ارتفع عدد الطلبات ٢٠٪ لكن الإيرادات بقيت ثابتة. ما السؤال التالي الأكثر فائدة؟','Did the average revenue per order decrease?':'هل انخفض متوسط الإيراد لكل طلب؟','Cybersecurity':'الأمن السيبراني','Cyber Guardian':'حارس الأمن السيبراني','Catch the Threat':'اكتشف التهديد','Correlate account events and select the two clues most relevant to a possible compromise.':'اربط أحداث الحساب واختر الدليلين الأكثر صلة باحتمال اختراقه.','Which combination is the strongest sign that an account may be compromised?':'أي مجموعة من العلامات تشير بقوة إلى احتمال اختراق الحساب؟','A successful login from a familiar device':'تسجيل دخول ناجح من جهاز مألوف','A new login location followed by an unfamiliar password change':'موقع تسجيل دخول جديد يتبعه تغيير غير مألوف لكلمة المرور','A user signing in during normal working hours':'تسجيل دخول المستخدم خلال ساعات العمل المعتادة','A single failed login followed by no activity':'محاولة دخول فاشلة واحدة دون نشاط لاحق','Why is one unfamiliar IP address not always proof of an attack?':'لماذا لا يُعد عنوان IP غير المألوف دليلًا قاطعًا على هجوم؟','Legitimate travel, VPNs, or network changes can alter the IP':'قد يغيّر السفر أو VPN أو تغيّر الشبكة عنوان IP بشكل طبيعي','Developer':'مطوّر البرمجيات','Code Crafter':'صانع الشيفرات','Debug the System':'أصلح أخطاء النظام','Find the smallest logical fix that handles ordinary inputs and the edge case.':'اعثر على أصغر إصلاح منطقي يتعامل مع المدخلات العادية والحالات الحدّية.','A loop must process every item in an array of length n. Which index condition is usually correct?':'يجب أن تعالج الحلقة كل عنصر في مصفوفة طولها n. ما شرط الفهرس الصحيح عادةً؟','What is the best first step when a program fails one test case?':'ما أفضل خطوة أولى عندما يفشل البرنامج في أحد الاختبارات؟','Reproduce the case and trace the expected versus actual result':'أعِد إنتاج الحالة وتتبع النتيجة المتوقعة مقارنةً بالفعلية','Correct.':'صحيح.','Not quite.':'ليس تمامًا.','Ready when you are.':'أنت جاهز للمتابعة.','Choose an answer before continuing.':'اختر إجابة قبل المتابعة.','Review the evidence and adjust your selection. You can try again while time remains.':'راجع الأدلة وعدّل اختيارك. يمكنك المحاولة مجددًا ما دام الوقت متاحًا.','That solution is not quite right. Try again!':'الحل ليس صحيحًا تمامًا. حاول مرة أخرى!','Select exactly two clues before submitting.':'اختر دليلين بالضبط قبل الإرسال.','Choose an answer before submitting.':'اختر إجابة قبل الإرسال.','Leave this mission? Your current timer and selections will reset.':'هل تريد مغادرة المهمة؟ ستتم إعادة ضبط المؤقت والاختيارات.','You completed':'لقد أكملت مهمة','by using evidence and careful reasoning. Your':'باستخدام الأدلة والتفكير الدقيق. وقد حصلت على شارة','badge is earned.':'الإنجاز الخاصة بك.','Time to regroup.':'حان وقت إعادة المحاولة.','Your mission is ready for another attempt.':'مهمتك جاهزة لمحاولة أخرى.','Complete the mission to earn your badge.':'أكمل المهمة لتحصل على الشارة.','Your badge download has started.':'بدأ تنزيل الشارة.','Option':'الخيار','selected. You can change it before submitting.':'تم اختياره. يمكنك تغييره قبل الإرسال.','SOLUTION SELECTED':'تم اختيار الحل','REVIEW YOUR EVIDENCE':'راجع الأدلة','TRAINING LAB · DATASET REVIEW':'مختبر التدريب · مراجعة البيانات','Training lab · dataset review':'مختبر التدريب · مراجعة البيانات','CLASSIFICATION':'التصنيف','The model has not seen the test fruit before. Which dataset gives it the strongest basis for learning useful patterns?':'لم يرَ النموذج الفاكهة الاختبارية من قبل. أي مجموعة بيانات تمنحه أفضل أساس لتعلّم الأنماط؟','Dataset':'مجموعة البيانات','Examples':'أمثلة','Coverage':'التغطية','Labels':'التسميات','Correct':'صحيحة','Goal: generalize to new fruit, not just perform well on examples already seen. This is a rule-based learning concept demo, not a trained AI model.':'الهدف: التعميم على فاكهة جديدة، لا الاكتفاء بأداء جيد على الأمثلة السابقة. هذا عرض توضيحي لمفهوم التعلّم وليس نموذج ذكاء اصطناعي مدرّبًا.','Set A — consistent examples may make the task simpler.':'المجموعة A — أمثلة متشابهة قد تجعل المهمة أبسط.','Set B — balanced, correctly labeled, diverse examples.':'المجموعة B — أمثلة متنوعة ومتوازنة وذات تسميات صحيحة.','Set C — maximum variety, even without labels.':'المجموعة C — تنوّع كبير حتى دون تسميات.','Set D — more rows through repeated examples.':'المجموعة D — صفوف أكثر عبر تكرار الأمثلة.','Monthly performance':'الأداء الشهري','MARCH → APRIL':'مارس ← أبريل','Select the single explanation best supported by the displayed data.':'اختر التفسير الوحيد الذي تدعمه البيانات المعروضة بأفضل شكل.','Profit rose because the business received more orders.':'ارتفع الربح لأن عدد الطلبات زاد.','Revenue fell in April, causing profit to fall.':'انخفضت الإيرادات في أبريل، مما أدى إلى انخفاض الربح.','Costs grew faster than revenue, reducing profit by $2,000.':'ارتفعت التكاليف أسرع من الإيرادات، فانخفض الربح بمقدار ٢٠٠٠ دولار.','April profit was $42,000 because revenue and costs are added.':'بلغ ربح أبريل ٤٢٠٠٠ دولار لأن الإيرادات والتكاليف تُجمع.','EVENT TIMELINE':'الجدول الزمني للأحداث','Select exactly two clues. Normal activity is included as context.':'اختر دليلين بالضبط. أُدرج النشاط الطبيعي لتوفير السياق.','Successful login · Amman, JO':'تسجيل دخول ناجح · عمّان، الأردن','Known laptop · familiar IP range · usual weekday pattern':'حاسوب محمول معروف · نطاق IP مألوف · نمط معتاد خلال أيام الأسبوع','Failed login · Amman, JO':'تسجيل دخول فاشل · عمّان، الأردن','One mistyped password from the known laptop':'كلمة مرور أُدخلت خطأً مرة واحدة من الحاسوب المعروف','Successful login · unfamiliar network':'تسجيل دخول ناجح · شبكة غير مألوفة','New device fingerprint · IP geolocates to another country':'بصمة جهاز جديدة · يشير موقع IP إلى دولة أخرى','Account security settings changed':'تغيّرت إعدادات أمان الحساب','Password reset completed from the new device 87 seconds after login':'تمت إعادة تعيين كلمة المرور من الجهاز الجديد بعد ٨٧ ثانية من تسجيل الدخول','Session refresh · Amman, JO':'تحديث الجلسة · عمّان، الأردن','Known laptop session remains active':'لا تزال جلسة الحاسوب المعروف نشطة','Security investigations rely on correlated signals. A single unfamiliar location can be legitimate; the sequence and account changes add context.':'تعتمد التحقيقات الأمنية على ربط المؤشرات. قد يكون الموقع غير المألوف طبيعيًا؛ ويضيف تسلسل الأحداث وتغييرات الحساب سياقًا مهمًا.','Code editor · average()':'محرر الشيفرة · average()','LOGIC DEBUGGING':'تصحيح الأخطاء المنطقية','Test cases':'حالات الاختبار','The current code returns NaN for an empty array because it divides 0 by 0. Select a fix that preserves the other results.':'تعيد الشيفرة الحالية NaN للمصفوفة الفارغة لأنها تقسم صفرًا على صفر. اختر إصلاحًا يحافظ على النتائج الأخرى.','Return 0 immediately when numbers.length is 0; otherwise calculate the average.':'أعِد 0 مباشرةً إذا كان طول المصفوفة صفرًا؛ وإلا فاحسب المتوسط.','Change the loop condition to i <= numbers.length.':'غيّر شرط الحلقة إلى i <= numbers.length.','Always return total, without dividing by the length.':'أعِد المجموع دائمًا دون قسمته على الطول.','Divide total by numbers.length + 1 for every input.':'اقسم المجموع على numbers.length + 1 لكل المدخلات.'
  };
  Object.assign(arTranslations, {
    'Not quite — review the evidence and adjust your selection. You can try again while time remains.':'ليست الإجابة صحيحة تمامًا — راجع الأدلة وعدّل اختيارك. يمكنك المحاولة مجددًا ما دام الوقت متاحًا.',
    'That solution is not quite right. Try again!':'هذا الحل غير صحيح تمامًا. حاول مرة أخرى!',
    'Select exactly two clues before submitting.':'اختر دليلين بالضبط قبل الإرسال.',
    'Choose an answer before submitting.':'اختر إجابة قبل الإرسال.',
    'Leave this mission? Your current timer and selections will reset.':'هل تريد مغادرة هذه المهمة؟ ستتم إعادة ضبط المؤقت والاختيارات الحالية.',
    'The two-minute mission window ended before the correct solution was submitted. Every attempt is a chance to learn — reset the mission and try again.':'انتهى وقت الدقيقتين قبل إرسال الحل الصحيح. كل محاولة فرصة للتعلّم — أعد ضبط المهمة وحاول مجددًا.',
    'Your mission is ready for another attempt.':'مهمتك جاهزة لمحاولة أخرى.',
    'You completed ':'لقد أكملت ',
    ' by using evidence and careful reasoning. Your ':' باستخدام الأدلة والتفكير المنطقي. وقد حصلت على شارة ',
    ' badge is earned.':' الإنجاز الخاصة بك.',
    '2 of 2 clues selected.':'تم اختيار دليلين من أصل ٢.','1 of 2 clues selected.':'تم اختيار دليل واحد من أصل ٢.','0 of 2 clues selected.':'لم يتم اختيار أي دليل من أصل ٢.',
    'READY TO SUBMIT':'جاهز للإرسال','INVESTIGATE EVENTS':'تحرَّ عن الأحداث','SOLUTION SELECTED':'تم اختيار الحل','REVIEW YOUR EVIDENCE':'راجع الأدلة','MISSION COMPLETED':'اكتملت المهمة','ACHIEVEMENT UNLOCKED':'تم فتح الإنجاز','TRY AGAIN':'حاول مرة أخرى','A fresh attempt is waiting.':'هناك محاولة جديدة بانتظارك.','NASHAMA CHALLENGE':'تحدّي النشامى'
  });
  Object.assign(arTranslations, {
    'Correct.':'إجابة صحيحة.','Not quite.':'ليست الإجابة الصحيحة تمامًا.','Ready when you are.':'أنت جاهز للمتابعة.','Choose an answer before continuing.':'اختر إجابة قبل المتابعة.','Review the evidence, then submit your solution.':'راجع الأدلة، ثم أرسل الحل.','MISSION BRIEFING':'موجز المهمة','Option ':'الخيار ',' selected. You can change it before submitting.':' تم اختياره. يمكنك تغييره قبل الإرسال.','Choose exactly two clues.':'اختر دليلين بالضبط.','Select the single explanation best supported by the displayed data.':'اختر التفسير الذي تدعمه البيانات المعروضة بأفضل شكل.','TRAINING LAB · DATASET REVIEW':'مختبر التدريب · مراجعة مجموعة البيانات','CLASSIFICATION':'التصنيف','Monthly performance':'الأداء الشهري','MARCH → APRIL':'مارس ← أبريل','EVENT TIMELINE':'الجدول الزمني للأحداث','LOGIC DEBUGGING':'تصحيح الأخطاء المنطقية','Code editor · average()':'محرر الشيفرة · average()','Test cases':'حالات الاختبار','Dataset':'مجموعة البيانات','Examples':'أمثلة','Coverage':'التغطية','Labels':'التسميات','Correct':'صحيح','Set A':'المجموعة A','Set B':'المجموعة B','Set C':'المجموعة C','Set D':'المجموعة D','AI Specialist':'اختصاصي الذكاء الاصطناعي','Data Analyst':'محلل بيانات','Cybersecurity':'الأمن السيبراني','Developer':'مطوّر برمجيات','Train the Machine':'درّب الآلة','Find the Story':'اكتشف القصة في البيانات','Catch the Threat':'اكتشف التهديد','Debug the System':'صحّح أخطاء النظام','AI Pathfinder':'مستكشف الذكاء الاصطناعي','Data Strategist':'استراتيجي البيانات','Cyber Guardian':'حارس الأمن السيبراني','Code Crafter':'مبدع الشيفرات','Correct. Your answer is supported by the evidence.':'إجابة صحيحة. الأدلة تدعم إجابتك.','Not quite. Review the evidence and try again.':'ليست صحيحة تمامًا. راجع الأدلة وحاول مجددًا.','Submit solution':'إرسال الحل','Try again':'حاول مجددًا','MISSION COMPLETED':'اكتملت المهمة','ACHIEVEMENT UNLOCKED':'تم فتح الإنجاز','TRY AGAIN':'حاول مجددًا','A fresh attempt is waiting.':'يمكنك بدء محاولة جديدة.','NASHAMA CHALLENGE':'تحدّي النشامى','YOUR EARNED ACHIEVEMENT':'إنجازك المكتسب','TIME USED':'الوقت المستغرق','ATTEMPTS':'عدد المحاولات','DETERMINATION':'الإصرار'
  });
  let currentLanguage = 'en';
  const originalTranslations = Object.entries(arTranslations).sort((a,b)=>b[0].length-a[0].length);
  function translateText(text, language) {
    let result = text;
    if (language === 'ar') {
      for (const [en, ar] of originalTranslations) result = result.split(en).join(ar);
    } else {
      for (const [en, ar] of originalTranslations) result = result.split(ar).join(en);
    }
    return result;
  }
  function translatePage(language) {
    currentLanguage = language;
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.body.classList.toggle('arabic-language', language === 'ar');
    const toggle = $('#languageToggle');
    if (toggle) toggle.textContent = language === 'ar' ? 'English' : 'العربية';
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => { if (node.parentElement && !['SCRIPT','STYLE'].includes(node.parentElement.tagName)) node.nodeValue = translateText(node.nodeValue, language); });
    $$('[aria-label]').forEach(el => { const v=el.getAttribute('aria-label'); el.setAttribute('aria-label',translateText(v,language)); });
    document.title = language === 'ar' ? 'تحدّي النشامى | اكتشف تحدّيك' : 'NASHAMA Challenge | Discover Your Challenge';
  }
  $('#languageToggle').addEventListener('click', () => translatePage(currentLanguage === 'en' ? 'ar' : 'en'));
  let translatingMutations = false;
  const languageObserver = new MutationObserver(() => {
    if (currentLanguage !== 'ar' || translatingMutations) return;
    translatingMutations = true;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes=[]; while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node=>{if(node.parentElement&&!['SCRIPT','STYLE'].includes(node.parentElement.tagName)){const next=translateText(node.nodeValue,'ar');if(next!==node.nodeValue)node.nodeValue=next;}});
    translatingMutations = false;
  });
  languageObserver.observe(document.body,{childList:true,subtree:true,characterData:true});

  renderPaths();
})();