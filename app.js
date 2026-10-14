(() => {
  const audioElements = [document.querySelector('#audio-a'), document.querySelector('#audio-b')];
  const ui = Object.fromEntries(['clock','heading-time','next-break-status','playback-status','current-title','current-artist','current-category','player-artwork','waveform','seek-slider','elapsed-time','remaining-time','play-button','queue-list','queue-count','queue-duration','queue-empty','library-list','library-count','commercial-count','commercial-items','commercial-duration','commercial-source','next-index','next-track-kind','next-track-title','next-track-artist','next-track-duration','next-artwork','volume-slider','volume-value','crossfade-slider','crossfade-value','automation-status','engine-status','mode-description','schedule-row','schedule-time','schedule-toggle','satellite-row','failover-toggle','failover-status','failover-description','log-list','toast-region','commercial-note','trigger-commercial','help-dialog'].map(id => [id.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()), document.getElementById(id)]));
  const state = { library: [], queue: [], currentId: null, mode: 'manual', filter: 'all', search: '', activeSlot: 0, transition: null, adRun: null, resumeId: null, scheduleEnabled: false, lastScheduledKey: '', failover: false, microphone: false, audioContext: null, gains: [], logs: [], favorites: new Set(), dragIndex: null };
  try {
    const storedLogs = JSON.parse(localStorage.getItem('autoradio-pro.logs') || '[]');
    if (Array.isArray(storedLogs)) state.logs = storedLogs.slice(0, 150);
  } catch { state.logs = []; }
  const audioExtensions = /\.(mp3|wav|aac|ogg|flac|m4a|opus|webm)$/i;
  const waveformHeights = [7,12,16,9,13,6,18,11,7,15,10,18,8,13,6,16,10,14,7,18,11,6,13,9,16,7,12,18,8,14,6,11,17,9,13,7,16,10,18,8,12,6,15,10,17,7,13,9,18,11,6,14,8,16,10,13,7,18,9,12,6,16,11,8];

  ui.waveform.innerHTML = waveformHeights.map((height, index) => `<i style="--h:${height}px;--delay:${(index % 9) * -0.08}s"></i>`).join('');
  audioElements.forEach((audio, slot) => {
    audio.preload = 'auto';
    audio.volume = Number(ui.volumeSlider.value) / 100;
    audio.addEventListener('timeupdate', () => onTimeUpdate(slot));
    audio.addEventListener('ended', () => onTrackEnded(slot));
    audio.addEventListener('play', () => updatePlaybackUI());
    audio.addEventListener('pause', () => updatePlaybackUI());
    audio.addEventListener('error', () => onAudioError(slot));
  });

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
    const minutes = Math.floor(seconds / 60);
    return `${String(minutes).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  }
  function durationLabel(seconds) { return Number.isFinite(seconds) && seconds > 0 ? formatTime(seconds) : '—:——'; }
  function currentAudio() { return audioElements[state.activeSlot]; }
  function currentTrack() { return state.library.find(track => track.id === state.currentId) || null; }
  function queueIndex(id = state.currentId) { return state.queue.findIndex(track => track.id === id); }
  function onAudioError(slot) {
    if (slot !== state.activeSlot || !state.currentId) return;
    if (state.failover) {
      const currentIndex = queueIndex();
      const fallback = state.queue.slice(Math.max(currentIndex + 1, 0)).find(track => track.id !== state.currentId && track.category === 'music') || state.queue.find(track => track.id !== state.currentId && track.category === 'music');
      if (fallback) { toast(`Falha na faixa atual. Playlist de segurança: ${fallback.title}.`, true); playTrack(fallback.id); return; }
    }
    toast('Este arquivo não pôde ser reproduzido neste navegador.', true);
  }
  function escapeHTML(text) { return String(text).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }
  function parseFile(file) {
    const fallback = file.name.replace(audioExtensions, '').replace(/[._]+/g, ' ').trim();
    const parts = fallback.split(/\s+-\s+/);
    return { title: parts.length > 1 ? parts.slice(1).join(' - ') : fallback || file.name, artist: parts.length > 1 ? parts[0] : 'Artista não identificado' };
  }
  function toast(message, error = false) {
    const item = document.createElement('div'); item.className = `toast${error ? ' error' : ''}`; item.textContent = message; ui.toastRegion.append(item); window.setTimeout(() => item.remove(), 3300);
  }
  function trackInitials(track) { return track.category === 'commercial' ? 'AD' : track.title.slice(0, 2).toUpperCase(); }
  function getCommercials() { return state.library.filter(track => track.category === 'commercial'); }
  function updateLibrary() {
    const query = state.search.trim().toLocaleLowerCase('pt-BR');
    const tracks = state.library.filter(track => (state.filter === 'all' || track.category === state.filter) && (!query || `${track.title} ${track.artist} ${track.name}`.toLocaleLowerCase('pt-BR').includes(query)));
    ui.libraryCount.textContent = state.library.length;
    ui.commercialCount.textContent = getCommercials().length;
    if (!tracks.length) {
      ui.libraryList.innerHTML = `<div class="library-empty">${state.library.length ? 'Nenhum arquivo corresponde à busca.' : 'Seus arquivos de áudio aparecem aqui depois da importação.'}</div>`;
      updateCommercialSummary(); return;
    }
    ui.libraryList.innerHTML = tracks.map(track => `<div class="library-row" draggable="true" data-id="${track.id}"><span class="library-art">${escapeHTML(trackInitials(track))}</span><span class="library-copy"><strong title="${escapeHTML(track.title)}">${escapeHTML(track.title)}</strong><small>${escapeHTML(track.artist)}${track.category === 'commercial' ? '<span class="track-tag">· COMERCIAL</span>' : ''}</small></span><span class="library-size">${durationLabel(track.duration)}</span><span class="library-row-actions"><button class="icon-button add-track" type="button" data-action="add" data-id="${track.id}" title="Adicionar à fila" aria-label="Adicionar ${escapeHTML(track.title)} à fila">＋</button><button class="icon-button commercialize${track.category === 'commercial' ? ' active' : ''}" type="button" data-action="commercial" data-id="${track.id}" title="${track.category === 'commercial' ? 'Remover dos comerciais' : 'Definir como comercial'}" aria-label="${track.category === 'commercial' ? 'Remover dos comerciais' : 'Definir como comercial'}">${track.category === 'commercial' ? '◈' : '◷'}</button></span></div>`).join('');
    ui.libraryList.querySelectorAll('.library-row').forEach(row => {
      row.addEventListener('dragstart', event => { event.dataTransfer.setData('text/plain', row.dataset.id); event.dataTransfer.effectAllowed = 'copy'; });
    });
    updateCommercialSummary();
  }
  function renderQueue() {
    ui.queueCount.textContent = state.queue.length;
    const totalSeconds = state.queue.reduce((sum, track) => sum + (track.duration || 0), 0);
    ui.queueDuration.textContent = totalSeconds ? `DURAÇÃO ${formatTime(totalSeconds)}` : 'DURAÇÃO —';
    ui.queueEmpty.hidden = state.queue.length > 0;
    ui.queueList.querySelectorAll('.queue-row').forEach(row => row.remove());
    state.queue.forEach((track, index) => {
      const row = document.createElement('div'); row.className = `queue-row${track.id === state.currentId ? ' current' : ''}`; row.draggable = true; row.dataset.id = track.id; row.dataset.index = index;
      row.innerHTML = `<span class="queue-position">${track.id === state.currentId ? '▶' : String(index + 1).padStart(2, '0')}</span><span class="queue-row-art">${escapeHTML(trackInitials(track))}</span><span class="queue-row-copy"><strong title="${escapeHTML(track.title)}">${escapeHTML(track.title)}</strong><small>${escapeHTML(track.artist)}${track.category === 'commercial' ? ' · COMERCIAL' : ''}</small></span><span class="queue-row-duration">${durationLabel(track.duration)}</span><button class="icon-button row-remove" type="button" data-action="remove" data-id="${track.id}" title="Remover da fila" aria-label="Remover ${escapeHTML(track.title)}">×</button>`;
      row.addEventListener('dblclick', () => playTrack(track.id));
      row.addEventListener('dragstart', event => { state.dragIndex = index; row.classList.add('dragging'); event.dataTransfer.setData('text/plain', track.id); event.dataTransfer.effectAllowed = 'move'; });
      row.addEventListener('dragend', () => { state.dragIndex = null; row.classList.remove('dragging'); });
      row.addEventListener('dragover', event => { if (state.dragIndex !== null) { event.preventDefault(); row.classList.add('dragging-over'); } });
      row.addEventListener('dragleave', () => row.classList.remove('dragging-over'));
      row.addEventListener('drop', event => {
        event.preventDefault(); row.classList.remove('dragging-over');
        const from = state.dragIndex; const to = Number(row.dataset.index);
        if (from !== null && from !== to) { const [moved] = state.queue.splice(from, 1); state.queue.splice(to, 0, moved); renderQueue(); }
      });
      ui.queueList.append(row);
    });
    updateNextTrack();
  }
  function updateNextTrack() {
    const index = queueIndex(); const next = state.queue[index >= 0 ? index + 1 : 0];
    ui.nextIndex.textContent = state.queue.length ? `${String(Math.max(index + 2, 1)).padStart(2, '0')} / ${String(state.queue.length).padStart(2, '0')}` : '— / —';
    ui.nextTrackKind.textContent = next ? next.category === 'commercial' ? 'COMERCIAL' : 'FILA DE PROGRAMAÇÃO' : 'FILA VAZIA';
    ui.nextTrackTitle.textContent = next?.title || 'Nenhuma faixa seguinte'; ui.nextTrackArtist.textContent = next?.artist || 'Adicione faixas à fila'; ui.nextTrackDuration.textContent = durationLabel(next?.duration);
    ui.nextArtwork.innerHTML = `<span>${next ? escapeHTML(trackInitials(next)) : '98'}</span>`;
  }
  function updateCommercialSummary() {
    const tracks = getCommercials(); const seconds = tracks.reduce((total, track) => total + (track.duration || 0), 0);
    ui.commercialItems.innerHTML = `${tracks.length} <span>${tracks.length === 1 ? 'anúncio' : 'anúncios'}</span>`;
    ui.commercialDuration.textContent = tracks.length ? formatTime(seconds) : '00:00';
    ui.commercialSource.textContent = tracks.length ? `${tracks.map(track => track.title).slice(0, 2).join(' · ')}${tracks.length > 2 ? ` +${tracks.length - 2}` : ''}` : 'Defina arquivos do acervo como comerciais.';
    ui.triggerCommercial.disabled = tracks.length === 0;
  }
  function ensureAudioContext() {
    if (state.audioContext) { if (state.audioContext.state === 'suspended') state.audioContext.resume(); return; }
    try {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return;
      state.audioContext = new Context();
      state.gains = audioElements.map(audio => { const source = state.audioContext.createMediaElementSource(audio); const gain = state.audioContext.createGain(); source.connect(gain).connect(state.audioContext.destination); return gain; });
    } catch { state.audioContext = null; state.gains = []; }
  }
  function setGain(slot, value, duration = 0) {
    const gain = state.gains[slot]?.gain;
    if (!gain) { audioElements[slot].volume = Math.max(0, Math.min(1, value * Number(ui.volumeSlider.value) / 100)); return; }
    gain.cancelScheduledValues(state.audioContext.currentTime);
    if (duration) gain.linearRampToValueAtTime(value * Number(ui.volumeSlider.value) / 100, state.audioContext.currentTime + duration);
    else gain.setValueAtTime(value * Number(ui.volumeSlider.value) / 100, state.audioContext.currentTime);
  }
  function updatePlaybackUI() {
    const playing = !currentAudio().paused && Boolean(state.currentId);
    ui.playButton.classList.toggle('is-playing', playing); ui.playButton.setAttribute('aria-label', playing ? 'Pausar' : 'Reproduzir'); ui.playButton.title = playing ? 'Pausar (Espaço)' : 'Reproduzir (Espaço)';
    ui.playbackStatus.innerHTML = playing ? '<span class="live-dot"></span> REPRODUZINDO' : 'EM ESPERA';
    ui.playbackStatus.classList.toggle('is-playing', playing);
    ui.waveform.classList.toggle('is-playing', playing); ui.engineStatus.textContent = playing ? 'Áudio em reprodução' : state.currentId ? 'Reprodução pausada' : 'Pronto para operar';
    renderQueue();
  }
  function drawProgress() {
    const audio = currentAudio(); const duration = Number.isFinite(audio.duration) ? audio.duration : 0; const current = audio.currentTime || 0;
    const percent = duration ? Math.min(100, current / duration * 100) : 0;
    ui.seekSlider.max = String(duration || 100); ui.seekSlider.value = String(duration ? current : 0); ui.seekSlider.style.setProperty('--fill', `${percent}%`);
    ui.elapsedTime.textContent = formatTime(current); ui.remainingTime.textContent = `−${formatTime(Math.max(0, duration - current))}`;
    ui.playerArtwork.classList.toggle('audio-warning', duration > 0 && duration - current <= 15 && duration - current > 0 && !state.adRun);
  }
  function onTimeUpdate(slot) {
    if (slot !== state.activeSlot) return;
    drawProgress();
    const duration = currentAudio().duration; const remaining = duration - currentAudio().currentTime;
    if (!state.transition && !state.adRun && state.queue.length > 1 && remaining <= Number(ui.crossfadeSlider.value) && remaining > 0.1) startCrossfade();
  }
  async function playTrack(id, { reset = true } = {}) {
    const track = state.library.find(item => item.id === id); if (!track) return;
    ensureAudioContext();
    if (state.transition) { clearInterval(state.transition.timer); audioElements[state.transition.nextSlot].pause(); state.transition = null; }
    const oldAudio = currentAudio(); const oldTrackId = state.currentId; const audio = oldAudio;
    state.currentId = id; state.activeSlot = audioElements.indexOf(audio); audio.pause();
    if (audio.src !== track.url) audio.src = track.url;
    if (reset || oldTrackId !== id) audio.currentTime = 0;
    setGain(state.activeSlot, 1);
    ui.currentTitle.textContent = track.title; ui.currentArtist.textContent = track.artist; ui.currentCategory.textContent = track.category === 'commercial' ? 'BLOCO COMERCIAL' : 'PROGRAMAÇÃO MUSICAL';
    ui.playerArtwork.classList.toggle('commercial-art', track.category === 'commercial');
    if (track.category === 'commercial') ui.currentCategory.textContent = 'BLOCO COMERCIAL';
    try { await audio.play(); } catch { toast('O navegador não conseguiu reproduzir este arquivo.', true); }
    updatePlaybackUI(); if (oldTrackId !== id) writeLog(track, 'Música');
  }
  function startCrossfade() {
    const index = queueIndex(); const next = state.queue[index + 1]; const seconds = Number(ui.crossfadeSlider.value);
    if (!next || !seconds || state.transition || !currentTrack()) return;
    const nextSlot = 1 - state.activeSlot; const nextAudio = audioElements[nextSlot];
    if (nextAudio.src !== next.url) nextAudio.src = next.url;
    nextAudio.currentTime = 0; setGain(nextSlot, 0); ensureAudioContext(); nextAudio.play().then(() => {
      const oldSlot = state.activeSlot; const started = performance.now(); const durationMs = seconds * 1000;
      state.transition = { nextSlot, nextId: next.id, timer: 0 };
      state.transition.timer = window.setInterval(() => {
        const fraction = Math.min(1, (performance.now() - started) / durationMs);
        setGain(oldSlot, 1 - fraction); setGain(nextSlot, fraction);
        if (fraction >= 1) {
          window.clearInterval(state.transition?.timer); audioElements[oldSlot].pause(); setGain(oldSlot, 1);
          state.activeSlot = nextSlot; state.currentId = next.id; state.transition = null;
          const track = currentTrack(); ui.currentTitle.textContent = track.title; ui.currentArtist.textContent = track.artist; ui.currentCategory.textContent = track.category === 'commercial' ? 'BLOCO COMERCIAL' : 'PROGRAMAÇÃO MUSICAL';
          writeLog(track, 'Música'); renderQueue(); updatePlaybackUI();
        }
      }, 40);
    }).catch(() => { nextAudio.pause(); setGain(nextSlot, 1); });
  }
  function onTrackEnded(slot) {
    if (slot !== state.activeSlot) return;
    if (state.adRun) { playNextCommercial(); return; }
    const index = queueIndex(); const next = state.queue[index + 1];
    if (next) playTrack(next.id); else { state.currentId = null; ui.currentTitle.textContent = 'Programação concluída'; ui.currentArtist.textContent = 'Adicione novas faixas à fila para continuar.'; ui.currentCategory.textContent = 'PROGRAMAÇÃO MUSICAL'; ui.engineStatus.textContent = 'Pronto para operar'; updatePlaybackUI(); }
  }
  function playNextCommercial() {
    if (!state.adRun) return;
    state.adRun.index += 1;
    if (state.adRun.index < state.adRun.tracks.length) { playTrack(state.adRun.tracks[state.adRun.index].id); return; }
    const resumeId = state.resumeId; state.adRun = null; state.resumeId = null; ui.commercialNote.innerHTML = '<span>i</span> O bloco terminou; a programação foi retomada.'; ui.automationStatus.textContent = 'Pronta';
    if (resumeId && state.library.some(track => track.id === resumeId)) playTrack(resumeId); else { state.currentId = null; ui.currentTitle.textContent = 'Bloco comercial concluído'; ui.currentArtist.textContent = 'A programação está pronta para continuar.'; ui.currentCategory.textContent = 'FIM DO BLOCO'; updatePlaybackUI(); }
    toast('Bloco comercial concluído.');
  }
  function startCommercialBlock() {
    const tracks = getCommercials();
    if (!tracks.length) { toast('Adicione arquivos ao acervo e marque-os como comerciais.', true); return; }
    if (state.adRun) { toast('Um bloco comercial já está em execução.', true); return; }
    state.resumeId = state.currentId; state.adRun = { tracks, index: 0 };
    ui.commercialNote.innerHTML = '<span>i</span> Bloco em execução. A programação retoma ao terminar.'; ui.automationStatus.textContent = 'Bloco comercial';
    toast(`Bloco comercial iniciado · ${tracks.length} ${tracks.length === 1 ? 'anúncio' : 'anúncios'}.`); playTrack(tracks[0].id);
  }
  function writeLog(track, type) {
    const date = new Date(); state.logs.unshift({ time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), title: track.title, artist: track.artist, category: track.category, type, duration: track.duration });
    state.logs = state.logs.slice(0, 150); renderLogs();
    try { localStorage.setItem('autoradio-pro.logs', JSON.stringify(state.logs)); } catch { toast('Histórico mantido apenas nesta sessão: armazenamento indisponível.', true); }
  }
  function renderLogs() {
    if (!state.logs.length) { ui.logList.innerHTML = '<div class="log-empty">As execuções aparecerão aqui.</div>'; return; }
    ui.logList.innerHTML = state.logs.slice(0, 5).map(entry => `<div class="log-row"><span class="log-time">${entry.time}</span><span class="log-dot${entry.category === 'commercial' ? ' ad' : ''}"></span><span class="log-copy"><strong title="${escapeHTML(entry.title)}">${escapeHTML(entry.title)}</strong><span>${entry.category === 'commercial' ? 'Comercial' : escapeHTML(entry.artist)}</span></span><span class="log-duration">${durationLabel(entry.duration)}</span></div>`).join('');
  }
  function updateMode(mode) {
    state.mode = mode;
    document.querySelectorAll('.mode-option').forEach(button => { const active = button.dataset.mode === mode; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
    ui.scheduleRow.hidden = mode !== 'automatic'; ui.satelliteRow.hidden = mode !== 'satellite';
    const descriptions = { manual: 'Dispare um bloco no momento certo, com um único comando.', automatic: 'Programe o disparo automático para um horário específico.', satellite: 'Aguardando o sincronismo externo da rede de satélite.' };
    ui.modeDescription.textContent = descriptions[mode]; ui.nextBreakStatus.textContent = { manual: 'Manual', automatic: 'Automático', satellite: 'Satélite' }[mode];
    ui.triggerCommercial.innerHTML = `<span aria-hidden="true">▶</span> ${mode === 'satellite' ? 'Disparo manual de contingência' : 'Soltar bloco comercial'} <kbd>F2</kbd>`;
    if (mode !== 'automatic') { state.scheduleEnabled = false; ui.scheduleToggle.classList.remove('active'); ui.scheduleToggle.textContent = '○'; }
    if (mode === 'automatic') toast('Agende o horário e ative o disparo automático.');
  }
  function importFiles(files) {
    const accepted = Array.from(files).filter(file => file.type.startsWith('audio/') || audioExtensions.test(file.name));
    if (!accepted.length) { toast('Selecione arquivos de áudio compatíveis.', true); return; }
    accepted.forEach(file => {
      const duplicate = state.library.some(track => track.name === file.name && track.size === file.size);
      if (duplicate) return;
      const metadata = parseFile(file); const track = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, name: file.name, title: metadata.title, artist: metadata.artist, size: file.size, duration: 0, url: URL.createObjectURL(file), category: 'music' };
      const probe = new Audio(); probe.preload = 'metadata'; probe.src = track.url;
      probe.addEventListener('loadedmetadata', () => { track.duration = probe.duration || 0; updateLibrary(); renderQueue(); }, { once: true });
      state.library.push(track);
    });
    updateLibrary(); renderQueue(); toast(`${accepted.length} ${accepted.length === 1 ? 'arquivo adicionado' : 'arquivos adicionados'} ao acervo.`);
  }
  function setVolume(value) {
    const level = Number(value) / 100; ui.volumeValue.textContent = `${value}%`;
    ui.volumeSlider.style.background = `linear-gradient(90deg,#6faaa0 ${value}%,#34413e ${value}%)`;
    audioElements.forEach((audio, slot) => { if (state.gains[slot]) state.gains[slot].gain.setTargetAtTime(level, state.audioContext.currentTime, .015); else audio.volume = level; });
  }
  function addToQueue(id) {
    const track = state.library.find(item => item.id === id); if (!track) return;
    state.queue.push(track); renderQueue(); toast(`“${track.title}” entrou na fila.`);
  }
  function exportLogs() {
    if (!state.logs.length) { toast('Ainda não há execuções para exportar.', true); return; }
    const rows = [['Horário','Tipo','Título','Artista','Duração'], ...state.logs.map(log => [log.time, log.category === 'commercial' ? 'Comercial' : 'Música', log.title, log.artist, durationLabel(log.duration)])];
    const csv = '\uFEFF' + rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = `execucao-radio-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url); toast('Relatório CSV exportado.');
  }
  function updateClock() {
    const now = new Date(); ui.clock.textContent = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const scheduled = ui.scheduleTime.value;
    if (state.mode === 'automatic' && state.scheduleEnabled && scheduled && ui.clock.textContent.slice(0, 5) === scheduled) {
      const key = `${now.toDateString()} ${scheduled}`;
      if (key !== state.lastScheduledKey) { state.lastScheduledKey = key; startCommercialBlock(); }
    }
  }

  document.getElementById('audio-files').addEventListener('change', event => { importFiles(event.target.files); event.target.value = ''; });
  document.getElementById('library-list').addEventListener('click', event => {
    const button = event.target.closest('[data-action]'); if (!button) return;
    const track = state.library.find(item => item.id === button.dataset.id); if (!track) return;
    if (button.dataset.action === 'add') addToQueue(track.id);
    if (button.dataset.action === 'commercial') { track.category = track.category === 'commercial' ? 'music' : 'commercial'; updateLibrary(); renderQueue(); toast(`${track.title}: ${track.category === 'commercial' ? 'marcado como comercial' : 'retornado a música'}.`); }
  });
  document.getElementById('queue-list').addEventListener('click', event => {
    const button = event.target.closest('[data-action="remove"]'); if (!button) return;
    const index = state.queue.findIndex(track => track.id === button.dataset.id); if (index >= 0) { const [removed] = state.queue.splice(index, 1); renderQueue(); if (removed.id === state.currentId) { state.queue.length ? playTrack(state.queue[Math.max(0, index - 1)].id) : currentAudio().pause(); } }
  });
  ui.queueList.addEventListener('dragover', event => { if (state.dragIndex === null) event.preventDefault(); });
  ui.queueList.addEventListener('drop', event => {
    if (state.dragIndex !== null) return; event.preventDefault(); const id = event.dataTransfer.getData('text/plain'); if (id) addToQueue(id);
  });
  ui.libraryList.addEventListener('dragstart', event => { const row = event.target.closest('.library-row'); if (row) state.dragIndex = null; });
  const libraryPanel = document.querySelector('.library-panel');
  window.addEventListener('dragover', event => { if (Array.from(event.dataTransfer?.types || []).includes('Files')) { event.preventDefault(); libraryPanel.classList.add('drag-active'); } });
  window.addEventListener('dragleave', event => { if (event.relatedTarget === null) libraryPanel.classList.remove('drag-active'); });
  window.addEventListener('drop', event => { if (Array.from(event.dataTransfer?.types || []).includes('Files')) { event.preventDefault(); libraryPanel.classList.remove('drag-active'); importFiles(event.dataTransfer.files); } });
  document.getElementById('empty-browse').addEventListener('click', () => document.getElementById('audio-files').click());
  document.getElementById('library-search').addEventListener('input', event => { state.search = event.target.value; updateLibrary(); });
  document.querySelectorAll('.filter-button').forEach(button => button.addEventListener('click', () => { state.filter = button.dataset.filter; document.querySelectorAll('.filter-button').forEach(item => item.classList.toggle('active', item === button)); updateLibrary(); }));
  document.querySelectorAll('.mode-option').forEach(button => button.addEventListener('click', () => updateMode(button.dataset.mode)));
  ui.playButton.addEventListener('click', async () => {
    if (!state.currentId) { if (state.queue.length) await playTrack(state.queue[0].id); else toast('Adicione uma faixa à fila antes de reproduzir.', true); return; }
    ensureAudioContext(); if (currentAudio().paused) currentAudio().play().catch(() => toast('O áudio não pôde ser iniciado.', true)); else currentAudio().pause(); updatePlaybackUI();
  });
  document.getElementById('next-button').addEventListener('click', () => { const next = state.queue[queueIndex() + 1] || state.queue[0]; if (next) playTrack(next.id); else toast('A fila está vazia.', true); });
  document.getElementById('previous-button').addEventListener('click', () => {
    if (currentAudio().currentTime > 3) { currentAudio().currentTime = 0; return; }
    const previous = state.queue[Math.max(0, queueIndex() - 1)]; if (previous && previous.id !== state.currentId) playTrack(previous.id); else currentAudio().currentTime = 0;
  });
  ui.seekSlider.addEventListener('input', () => { if (Number.isFinite(currentAudio().duration)) currentAudio().currentTime = Number(ui.seekSlider.value); });
  ui.volumeSlider.addEventListener('input', () => setVolume(ui.volumeSlider.value));
  ui.crossfadeSlider.addEventListener('input', () => { ui.crossfadeValue.textContent = ui.crossfadeSlider.value; ui.crossfadeSlider.style.background = `linear-gradient(90deg,#56bdad ${Number(ui.crossfadeSlider.value) / 12 * 100}%,#34413e ${Number(ui.crossfadeSlider.value) / 12 * 100}%)`; });
  document.getElementById('shuffle-button').addEventListener('click', () => { for (let index = state.queue.length - 1; index > 0; index--) { const random = Math.floor(Math.random() * (index + 1)); [state.queue[index], state.queue[random]] = [state.queue[random], state.queue[index]]; } renderQueue(); toast('Fila embaralhada.'); });
  document.getElementById('clear-queue').addEventListener('click', () => { state.queue = []; if (!state.adRun) { currentAudio().pause(); state.currentId = null; ui.currentTitle.textContent = 'Nenhuma faixa no ar'; ui.currentArtist.textContent = 'Adicione arquivos de áudio para começar.'; ui.currentCategory.textContent = 'PROGRAMAÇÃO MUSICAL'; updatePlaybackUI(); } renderQueue(); toast('Fila de programação limpa.'); });
  ui.triggerCommercial.addEventListener('click', startCommercialBlock);
  ui.scheduleToggle.addEventListener('click', () => {
    state.scheduleEnabled = !state.scheduleEnabled; ui.scheduleToggle.classList.toggle('active', state.scheduleEnabled); ui.scheduleToggle.textContent = state.scheduleEnabled ? '✓' : '○'; ui.scheduleToggle.setAttribute('aria-label', state.scheduleEnabled ? 'Desativar agendamento' : 'Ativar agendamento');
    ui.automationStatus.textContent = state.scheduleEnabled ? `Agendado para ${ui.scheduleTime.value}` : 'Pronta'; toast(state.scheduleEnabled ? `Disparo automático ativado para ${ui.scheduleTime.value}.` : 'Agendamento automático desativado.');
  });
  document.getElementById('satellite-pulse').addEventListener('click', () => { if (state.mode !== 'satellite') return; toast('Pulso externo simulado.'); startCommercialBlock(); });
  ui.failoverToggle.addEventListener('click', () => { state.failover = !state.failover; ui.failoverToggle.setAttribute('aria-checked', String(state.failover)); ui.failoverStatus.textContent = state.failover ? 'ATIVA' : 'INATIVA'; ui.failoverStatus.classList.toggle('active', state.failover); ui.failoverDescription.textContent = state.failover ? state.queue.length ? `${state.queue.length} faixas disponíveis como referência de segurança.` : 'Fila de segurança sem faixas. Adicione áudios à programação.' : 'Ative para assumir a programação em caso de interrupção.'; toast(state.failover ? 'Playlist de segurança armada.' : 'Playlist de segurança desativada.'); });
  document.getElementById('mic-button').addEventListener('click', event => { state.microphone = !state.microphone; event.currentTarget.style.color = state.microphone ? '#f0ba70' : ''; event.currentTarget.title = state.microphone ? 'Desativar microfone' : 'Alternar microfone'; toast(state.microphone ? 'Microfone sinalizado como ativo.' : 'Microfone sinalizado como inativo.'); });
  document.getElementById('emergency-button').addEventListener('click', () => { if (!window.confirm('Ativar emergência? A reprodução será interrompida.')) return; audioElements.forEach(audio => audio.pause()); state.currentId = null; state.adRun = null; state.transition = null; ui.currentTitle.textContent = 'Transmissão interrompida'; ui.currentArtist.textContent = 'Emergência acionada pelo operador.'; ui.currentCategory.textContent = 'SINAL DE EMERGÊNCIA'; ui.automationStatus.textContent = 'Emergência'; updatePlaybackUI(); toast('Áudio interrompido pelo operador.', true); });
  document.getElementById('favorite-button').addEventListener('click', event => { if (!state.currentId) { toast('Nenhuma faixa no ar para marcar.', true); return; } const active = state.favorites.has(state.currentId); if (active) state.favorites.delete(state.currentId); else state.favorites.add(state.currentId); event.currentTarget.textContent = active ? '☆' : '★'; event.currentTarget.style.color = active ? '' : '#e8bf72'; });
  document.getElementById('more-button').addEventListener('click', () => { const track = currentTrack(); if (track) toast(`${track.title} · ${track.artist} · ${durationLabel(track.duration)}`); });
  document.getElementById('log-download').addEventListener('click', exportLogs);
  document.getElementById('view-all-logs').addEventListener('click', () => { if (!state.logs.length) toast('Ainda não há execuções registradas.', true); else { ui.logList.innerHTML = state.logs.map(entry => `<div class="log-row"><span class="log-time">${entry.time}</span><span class="log-dot${entry.category === 'commercial' ? ' ad' : ''}"></span><span class="log-copy"><strong>${escapeHTML(entry.title)}</strong><span>${escapeHTML(entry.artist)} · ${entry.category === 'commercial' ? 'Comercial' : 'Música'}</span></span><span class="log-duration">${durationLabel(entry.duration)}</span></div>`).join(''); toast(`${state.logs.length} execuções no histórico desta sessão.`); } });
  document.getElementById('help-button').addEventListener('click', () => ui.helpDialog.showModal());
  document.getElementById('close-help').addEventListener('click', () => ui.helpDialog.close());
  document.getElementById('engine-info').addEventListener('click', () => toast('O áudio é executado pelo navegador. Drivers ASIO, WASAPI exclusivo e sinais GPIO requerem integração nativa.'));
  ui.helpDialog.addEventListener('click', event => { if (event.target === ui.helpDialog) ui.helpDialog.close(); });
  document.addEventListener('keydown', event => {
    const target = event.target; const typing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target.isContentEditable;
    if (event.key === 'Escape' && ui.helpDialog.open) ui.helpDialog.close();
    if (typing || ui.helpDialog.open) return;
    if (event.code === 'Space') { event.preventDefault(); ui.playButton.click(); }
    else if (event.key === 'F1') { event.preventDefault(); document.querySelector('#estudio').scrollIntoView({ behavior: 'smooth' }); }
    else if (event.key === 'F2') { event.preventDefault(); startCommercialBlock(); }
    else if (event.key === 'F3') { event.preventDefault(); document.getElementById('next-button').click(); }
    else if (event.key === 'F4') { event.preventDefault(); document.getElementById('mic-button').click(); }
    else if (event.key === 'F12') { event.preventDefault(); document.getElementById('emergency-button').click(); }
    else if (event.key === '/' && !event.ctrlKey && !event.metaKey) { event.preventDefault(); document.getElementById('library-search').focus(); }
  });
  updateClock(); window.setInterval(updateClock, 250); updateLibrary(); renderQueue(); renderLogs(); updateMode('manual'); drawProgress();
})();