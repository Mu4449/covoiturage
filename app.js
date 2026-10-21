// =====================================================================
// Covoiturage — qui conduit aujourd'hui ?
//
// Chaque jour, chaque personne fait : l'aller-retour, l'aller seulement,
// le retour seulement, ou elle est absente.
//
// Deux systèmes de points au choix (réglage state.system), calculés trajet par trajet
// (l'aller, puis le retour), entre les n personnes de CE trajet :
//   '12' — partage à 12 points : chacune "doit" une part de 12 / n ;
//          le conducteur gagne 12 - part, chaque passager perd sa part.
//   '1'  — 1 point par passager : chaque passager perd ½ point par trajet
//          (1 point pour un aller-retour), le conducteur gagne ½ point par passager.
//   Seul dans la voiture : aucun point.
//   Le conducteur fait toujours l'aller ET le retour (c'est sa voiture) :
//   parmi les personnes en aller-retour, celle qui a le score le plus bas conduit.
//   Égalité : celle qui a conduit il y a le plus longtemps, puis ordre alphabétique.
// =====================================================================

const STORAGE_KEY = 'covoiturage-v1';
const POINTS_TRAJET = 12;
const SYSTEMES = {
  '12': 'Partage à 12 points',
  '1': '1 point par passager',
};
const NOMS_JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

// Statuts possibles d'une personne pour une journée (absent = pas de statut).
const STATUTS = ['ar', 'aller', 'retour'];
const STATUT_COURT = { ar: 'A/R', aller: 'Aller', retour: 'Retour' };
const STATUT_LONG = { ar: 'Aller-retour', aller: 'Aller seulement', retour: 'Retour seulement' };

let state = load();
let editingId = null; // id de la journée en cours de modification (null = nouvelle journée)

// ---------- Sauvegarde ----------

function defaultState() {
  return {
    people: [
      { id: 'p1', name: 'Personne 1' },
      { id: 'p2', name: 'Personne 2' },
      { id: 'p3', name: 'Personne 3' },
      { id: 'p4', name: 'Personne 4' },
    ],
    days: [],
    system: '12',
  };
}

function isValidState(s) {
  return s && Array.isArray(s.people) && Array.isArray(s.days) &&
    s.people.every(p => typeof p.id === 'string' && typeof p.name === 'string') &&
    s.days.every(d => typeof d.date === 'string' && typeof d.driver === 'string' &&
      (Array.isArray(d.present) || (d.status && typeof d.status === 'object')));
}

// Les anciennes journées ({ present: [...] }) deviennent des aller-retour pour tout le monde.
function normalizeState(s) {
  s.days = s.days.map(d => {
    if (d.status) return d;
    const status = {};
    for (const id of d.present) status[id] = 'ar';
    return { id: d.id, date: d.date, status, driver: d.driver };
  });
  if (!SYSTEMES[s.system]) s.system = '12';
  return s;
}

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (isValidState(s)) return normalizeState(s);
  } catch (e) { /* données illisibles : on repart de zéro */ }
  return defaultState();
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ---------- Dates ----------

function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toDateStr(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function isWeekday(date) {
  const j = date.getDay();
  return j >= 1 && j <= 5; // lundi à vendredi
}

function formatDate(str) {
  const d = parseDate(str);
  return `${NOMS_JOURS[d.getDay()]} ${d.toLocaleDateString('fr-FR')}`;
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Prochain jour de semaine sans journée enregistrée, à partir d'aujourd'hui
// (ou du lendemain de la dernière journée enregistrée si elle est plus récente).
function nextDefaultDate() {
  const used = new Set(state.days.map(d => d.date));
  let date = new Date();
  date.setHours(0, 0, 0, 0);
  const last = state.days.map(d => d.date).sort().pop();
  if (last && parseDate(last) >= date) {
    date = parseDate(last);
    date.setDate(date.getDate() + 1);
  }
  while (!isWeekday(date) || used.has(toDateStr(date))) {
    date.setDate(date.getDate() + 1);
  }
  return toDateStr(date);
}

// ---------- Calcul des scores ----------

// Personnes de chaque trajet, dans l'ordre de la liste des personnes.
function legsOf(status) {
  const ids = state.people.map(p => p.id);
  return {
    aller: ids.filter(id => status[id] === 'ar' || status[id] === 'aller'),
    retour: ids.filter(id => status[id] === 'ar' || status[id] === 'retour'),
  };
}

// Personnes qui font l'aller-retour : les seules qui peuvent conduire.
function roundTripIds(status) {
  return state.people.map(p => p.id).filter(id => status[id] === 'ar');
}

function hasAnyone(status) {
  return Object.keys(status).length > 0;
}

// Points d'un trajet : { conducteur, passager } selon le nombre de personnes.
function legPoints(n) {
  if (n < 2) return { driver: 0, passenger: 0 };
  if (state.system === '1') return { driver: (n - 1) / 2, passenger: -0.5 };
  const part = POINTS_TRAJET / n;
  return { driver: POINTS_TRAJET - part, passenger: -part };
}

// Points gagnés/perdus par chaque personne pour une journée (aller + retour).
function pointsOfDay(day) {
  const result = {};
  for (const leg of Object.values(legsOf(day.status))) {
    const pts = legPoints(leg.length);
    for (const id of leg) {
      result[id] = (result[id] || 0) + (id === day.driver ? pts.driver : pts.passenger);
    }
  }
  return result;
}

// Recalcule tout depuis l'historique (les scores ne sont jamais stockés).
function computeStats(days) {
  const stats = {};
  for (const p of state.people) {
    // driven / passenger : trajets en covoiturage (au moins 2 dans la voiture)
    stats[p.id] = { score: 0, driven: 0, passenger: 0, lastDrive: '' };
  }
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  for (const day of sorted) {
    const pts = pointsOfDay(day);
    for (const id of Object.keys(pts)) {
      if (stats[id]) stats[id].score += pts[id];
    }
    for (const leg of Object.values(legsOf(day.status))) {
      for (const id of leg) {
        if (!stats[id] || leg.length < 2) continue;
        if (id === day.driver) stats[id].driven++;
        else stats[id].passenger++;
      }
    }
    if (stats[day.driver]) stats[day.driver].lastDrive = day.date;
  }
  return stats;
}

// Classe les candidats : le premier est celui qui doit conduire.
function rankCandidates(candidateIds, stats) {
  return [...candidateIds].sort((a, b) => {
    const sa = stats[a], sb = stats[b];
    if (sa.score !== sb.score) return sa.score - sb.score;
    if (sa.lastDrive !== sb.lastDrive) return sa.lastDrive.localeCompare(sb.lastDrive); // '' (jamais) passe en premier
    return personName(a).localeCompare(personName(b), 'fr');
  });
}

// Pour proposer un conducteur, on ne tient compte que des journées AVANT la date choisie
// (utile si on saisit une journée oubliée ou si on en modifie une ancienne).
function statsBefore(date) {
  return computeStats(state.days.filter(d => d.date < date && d.id !== editingId));
}

// ---------- Affichage ----------

function personName(id) {
  const p = state.people.find(p => p.id === id);
  return p ? p.name : '?';
}

function names(ids) {
  return ids.map(personName).join(', ');
}

function esc(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatPoints(n) {
  const text = String(Math.abs(Math.round(n * 100) / 100)).replace('.', ',');
  if (n > 0) return `+${text}`;
  if (n < 0) return `−${text}`;
  return '0';
}

function pointsClass(n) {
  return n > 0 ? 'pos' : n < 0 ? 'neg' : 'zero';
}

// Décrit les passagers d'une journée : "avec X, Y" ou "aller : X · retour : Y".
function passengersText(status, driver) {
  const legs = legsOf(status);
  const aller = legs.aller.filter(id => id !== driver);
  const retour = legs.retour.filter(id => id !== driver);
  if (aller.join() === retour.join()) {
    return aller.length ? `avec ${names(aller)}` : 'seul(e)';
  }
  return `aller : ${aller.length ? names(aller) : 'seul(e)'} · retour : ${retour.length ? names(retour) : 'seul(e)'}`;
}

function legSummary(status) {
  const legs = legsOf(status);
  return ['aller', 'retour'].map(leg => {
    const n = legs[leg].length;
    const pts = legPoints(n);
    const label = capitalize(leg);
    if (n === 0) return `${label} : personne`;
    if (n === 1) return `${label} : seul(e), 0 point`;
    return `${label} : ${n} pers. (conducteur ${formatPoints(pts.driver)}, passager ${formatPoints(pts.passenger)})`;
  }).join(' · ');
}

function $(id) { return document.getElementById(id); }

function renderPeople() {
  $('people').innerHTML = state.people.map(p =>
    `<input type="text" data-id="${p.id}" value="${esc(p.name)}" maxlength="30" aria-label="Nom">`
  ).join('');
  $('people').querySelectorAll('input').forEach(input => {
    input.addEventListener('change', () => {
      const name = input.value.trim();
      const p = state.people.find(p => p.id === input.dataset.id);
      if (name) p.name = name; else input.value = p.name;
      save();
      renderAll();
    });
  });
}

function renderPresence(status) {
  $('presence').innerHTML = state.people.map(p => `
    <div class="status-row">
      <span>${esc(p.name)}</span>
      <select data-person="${p.id}">
        <option value="">Absent(e)</option>
        ${STATUTS.map(s => `<option value="${s}" ${status[p.id] === s ? 'selected' : ''}>${STATUT_LONG[s]}</option>`).join('')}
      </select>
    </div>`).join('');
  $('presence').querySelectorAll('select').forEach(sel => sel.addEventListener('change', updateSuggestion));
}

function selectedStatus() {
  const status = {};
  $('presence').querySelectorAll('select').forEach(sel => {
    if (sel.value) status[sel.dataset.person] = sel.value;
  });
  return status;
}

// Met à jour le conducteur proposé et la liste déroulante selon les présences.
function updateSuggestion(keepDriver) {
  const date = $('date').value;
  const status = selectedStatus();
  const candidates = roundTripIds(status);
  const box = $('suggestion');
  const select = $('driver');

  $('date-warning').textContent = date && !isWeekday(parseDate(date)) ? 'Attention : ce jour est un week-end.' : '';

  if (!hasAnyone(status) || candidates.length === 0) {
    box.innerHTML = hasAnyone(status)
      ? '<p class="warning">Personne ne fait l\'aller-retour : pas de conducteur possible ce jour-là.</p>'
      : '<p class="muted">Indique qui vient.</p>';
    select.innerHTML = '';
    select.disabled = true;
    return;
  }

  const stats = statsBefore(date || '9999-12-31');
  const ranking = rankCandidates(candidates, stats);
  const suggested = ranking[0];
  const details = ranking.map(id =>
    `<li><span>${esc(personName(id))}</span><span class="${pointsClass(stats[id].score)}">${formatPoints(stats[id].score)}</span></li>`
  ).join('');
  box.innerHTML = `
    <p class="big">C'est à <strong>${esc(personName(suggested))}</strong> de conduire</p>
    <p class="muted small">Score le plus bas parmi les personnes en aller-retour.<br>${esc(legSummary(status))}</p>
    <ol class="ranking">${details}</ol>`;

  const previous = keepDriver === true ? select.value : null;
  select.innerHTML = candidates.map(id =>
    `<option value="${id}">${esc(personName(id))}${id === suggested ? ' (proposé)' : ''}</option>`
  ).join('');
  select.value = previous && candidates.includes(previous) ? previous : suggested;
  select.disabled = false;
}

function allRoundTrip() {
  const status = {};
  for (const p of state.people) status[p.id] = 'ar';
  return status;
}

function renderForm(day) {
  $('form-title').textContent = day ? `Modifier la journée du ${formatDate(day.date)}` : 'Nouvelle journée';
  $('date').value = day ? day.date : nextDefaultDate();
  $('cancel-edit').hidden = !day;
  $('delete-day').hidden = !day;
  $('form-error').textContent = '';
  renderPresence(day ? day.status : allRoundTrip());
  updateSuggestion();
  if (day) $('driver').value = day.driver;
}

// Nombre de trajets -> nombre de jours (un aller-retour = 1, un seul trajet = ½).
function formatDays(trips) {
  const whole = Math.floor(trips / 2);
  if (trips % 2 === 0) return String(whole);
  return whole === 0 ? '½' : `${whole} ½`;
}

function renderStats() {
  const stats = computeStats(state.days);
  const max = Math.max(1, ...state.people.map(p => stats[p.id].driven + stats[p.id].passenger));

  $('chart').innerHTML = state.people.map(p => {
    const s = stats[p.id];
    const seg = (cls, trips, label) => {
      if (trips === 0) return '';
      const width = (trips / max) * 88; // on laisse de la place pour le total au bout de la barre
      return `<div class="seg ${cls}" style="width:${width}%"
        data-tip="${esc(p.name)} — ${label} : ${formatDays(trips)} jour${trips > 2 ? 's' : ''}">${width >= 6 ? formatDays(trips) : ''}</div>`;
    };
    return `<div class="bar-row">
      <span class="bar-name" title="${esc(p.name)}">${esc(p.name)}</span>
      <div class="bar-track">
        ${seg('driver', s.driven, 'conducteur')}${seg('pass', s.passenger, 'passager')}
        <span class="bar-total">${formatDays(s.driven + s.passenger)}</span>
      </div>
    </div>`;
  }).join('');

  $('stats').innerHTML = state.people.map(p => {
    const s = stats[p.id];
    const total = s.driven + s.passenger;
    const percent = total ? `${Math.round((s.driven / total) * 100)} %` : '—';
    return `<tr>
      <td>${esc(p.name)}</td>
      <td class="num">${formatDays(s.driven)}</td>
      <td class="num">${formatDays(s.passenger)}</td>
      <td class="num"><strong>${formatDays(total)}</strong></td>
      <td class="num">${percent}</td>
    </tr>`;
  }).join('');

  const tip = $('tooltip');
  $('chart').querySelectorAll('.seg').forEach(el => {
    el.addEventListener('mousemove', e => {
      tip.textContent = el.dataset.tip;
      tip.hidden = false;
      tip.style.left = `${e.clientX + 12}px`;
      tip.style.top = `${e.clientY + 14}px`;
    });
    el.addEventListener('mouseleave', () => { tip.hidden = true; });
    // Sur téléphone (pas de souris) : l'infobulle s'affiche en touchant la barre.
    el.addEventListener('click', e => {
      e.stopPropagation();
      const box = el.getBoundingClientRect();
      tip.textContent = el.dataset.tip;
      tip.hidden = false;
      tip.style.left = `${Math.max(8, Math.min(box.left, window.innerWidth - tip.offsetWidth - 8))}px`;
      tip.style.top = `${box.top - tip.offsetHeight - 6}px`;
    });
  });
}

// ---------- Planning de la semaine ----------
// Le planning en cours de préparation (pas encore enregistré) :
// { monday: 'AAAA-MM-JJ', presence: { date: { personId: statut } }, overrides: { date: id du conducteur choisi à la main } }
let plan = null;

const JOURS_COURTS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function mondayOf(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return addDays(d, -((d.getDay() + 6) % 7));
}

function weekDates(mondayStr) {
  return [0, 1, 2, 3, 4].map(i => toDateStr(addDays(parseDate(mondayStr), i)));
}

// Du lundi au jeudi : semaine en cours. Du vendredi au dimanche : semaine suivante.
function defaultMonday() {
  const today = new Date();
  const j = today.getDay();
  const monday = mondayOf(today);
  return toDateStr(j === 0 || j >= 5 ? addDays(monday, 7) : monday);
}

function initPlan(mondayStr) {
  const dates = weekDates(mondayStr);
  const saved = state.days.filter(d => dates.includes(d.date));
  plan = { monday: mondayStr, presence: {}, overrides: {} };
  for (const date of dates) {
    const day = saved.find(d => d.date === date);
    // Semaine déjà enregistrée : on reprend l'historique. Sinon tout le monde en aller-retour au départ.
    plan.presence[date] = day ? { ...day.status } : saved.length ? {} : allRoundTrip();
    if (day) plan.overrides[date] = day.driver;
  }
  // On ne garde comme "choix à la main" que les conducteurs différents de la proposition.
  for (const r of computePlan().result) {
    if (plan.overrides[r.date] === r.suggested) delete plan.overrides[r.date];
  }
}

// Recalcule les jours en cours de préparation (pas encore enregistrés) quand l'historique change.
function refreshPlan() {
  if (plan) initPlan(plan.monday);
}

// Calcule le conducteur de chaque jour, dans l'ordre : chaque jour tient compte des jours précédents.
function computePlan() {
  const base = state.days.filter(d => d.date < plan.monday);
  const planned = [];
  const result = [];
  for (const date of weekDates(plan.monday)) {
    const status = plan.presence[date];
    const candidates = roundTripIds(status);
    if (candidates.length === 0) {
      result.push({ date, status, candidates, driver: null, suggested: null });
      continue;
    }
    const suggested = rankCandidates(candidates, computeStats([...base, ...planned]))[0];
    const chosen = plan.overrides[date];
    const driver = chosen && candidates.includes(chosen) ? chosen : suggested;
    planned.push({ date, status, driver });
    result.push({ date, status, candidates, driver, suggested });
  }
  return { result, before: computeStats(base), after: computeStats([...base, ...planned]) };
}

function shortDate(str) {
  const d = parseDate(str);
  return `${JOURS_COURTS[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function planText(result) {
  const lines = [`Covoiturage — semaine du ${parseDate(plan.monday).toLocaleDateString('fr-FR')}`];
  for (const r of result) {
    const label = capitalize(NOMS_JOURS[parseDate(r.date).getDay()]);
    if (r.driver) {
      // *texte* s'affiche en gras dans WhatsApp, Signal, Telegram…
      lines.push(`${label} : *${personName(r.driver)}* conduit — ${passengersText(r.status, r.driver)}`);
    } else if (hasAnyone(r.status)) {
      lines.push(`${label} : pas de conducteur possible (personne ne fait l'aller-retour)`);
    } else {
      lines.push(`${label} : pas de covoiturage`);
    }
  }
  return lines.join('\n');
}

// Statut suivant quand on clique sur une case : — → A/R → Aller → Retour → —
function nextStatus(current) {
  const i = STATUTS.indexOf(current);
  return i === STATUTS.length - 1 ? null : STATUTS[i + 1];
}

function renderPlanning() {
  if (!plan) initPlan(defaultMonday());
  const { result, before, after } = computePlan();
  const dates = weekDates(plan.monday);

  $('week-label').textContent = `Semaine du ${parseDate(plan.monday).toLocaleDateString('fr-FR')}`;
  const savedCount = state.days.filter(d => dates.includes(d.date)).length;
  $('week-status').textContent = savedCount
    ? `✔ Planning enregistré (${savedCount} journée${savedCount > 1 ? 's' : ''}). Tu peux encore le modifier et l'enregistrer à nouveau.`
    : 'Planning pas encore enregistré.';

  const head = `<tr><th>Personne</th>${dates.map(d => `<th class="center">${shortDate(d)}</th>`).join('')}<th class="num score-col">Score avant → après</th></tr>`;

  const rows = state.people.map(p => {
    const cells = result.map(r => {
      const s = r.status[p.id];
      const cls = r.driver === p.id ? 'driver' : s === 'ar' ? 'ar' : s ? 'half' : 'away';
      const label = r.driver === p.id ? '🚗' : s ? STATUT_COURT[s] : '—';
      const title = s ? STATUT_LONG[s] : 'Absent(e)';
      return `<td class="center"><button type="button" class="cell ${cls}" data-date="${r.date}" data-person="${p.id}"
        title="${title} — cliquer pour changer">${label}</button></td>`;
    }).join('');
    const b = before[p.id].score, a = after[p.id].score;
    const scores = `<span class="${pointsClass(b)}">${formatPoints(b)}</span> → <span class="${pointsClass(a)}">${formatPoints(a)}</span>`;
    // Sur téléphone, la colonne des scores est masquée et le score s'affiche sous le prénom.
    return `<tr><td>${esc(p.name)}<span class="name-score">${scores}</span></td>${cells}<td class="num score-col">${scores}</td></tr>`;
  }).join('');

  const drivers = result.map(r => {
    if (!r.driver) {
      return hasAnyone(r.status)
        ? '<td class="center small warning">personne en A/R :<br>pas de conducteur</td>'
        : '<td class="center muted small">personne</td>';
    }
    const options = r.candidates.map(id =>
      `<option value="${id}" ${id === r.driver ? 'selected' : ''}>${esc(personName(id))}${id === r.suggested ? ' ★' : ''}</option>`
    ).join('');
    const forced = r.driver !== r.suggested ? '<div class="small warning">choisi à la main</div>' : '';
    return `<td class="center"><select data-driver-date="${r.date}">${options}</select>${forced}</td>`;
  }).join('');

  $('planning').innerHTML = `<thead>${head}</thead><tbody>${rows}
    <tr class="drivers-row"><td><strong>Conducteur</strong></td>${drivers}<td></td></tr></tbody>`;

  $('planning').querySelectorAll('button.cell').forEach(btn => btn.addEventListener('click', () => {
    const status = plan.presence[btn.dataset.date];
    const next = nextStatus(status[btn.dataset.person]);
    if (next) status[btn.dataset.person] = next; else delete status[btn.dataset.person];
    renderPlanning();
  }));
  $('planning').querySelectorAll('select[data-driver-date]').forEach(sel => sel.addEventListener('change', () => {
    const r = result.find(r => r.date === sel.dataset.driverDate);
    if (sel.value === r.suggested) delete plan.overrides[r.date]; else plan.overrides[r.date] = sel.value;
    renderPlanning();
  }));

  $('plan-text').value = planText(result);
}

function savePlan() {
  const { result } = computePlan();
  const dates = weekDates(plan.monday);
  const impossible = result.filter(r => !r.driver && hasAnyone(r.status));
  if (impossible.length && !confirm(
    `Pas de conducteur possible ${impossible.map(r => 'le ' + formatDate(r.date)).join(', ')} ` +
    '(personne ne fait l\'aller-retour). Ce jour ne sera pas enregistré. Continuer ?')) return;
  const existing = state.days.filter(d => dates.includes(d.date));
  if (existing.length && !confirm('Des journées sont déjà enregistrées pour cette semaine. Les remplacer par ce planning ?')) return;
  state.days = state.days.filter(d => !dates.includes(d.date));
  result.filter(r => r.driver).forEach((r, i) => {
    state.days.push({ id: `d${Date.now()}-${i}`, date: r.date, status: { ...r.status }, driver: r.driver });
  });
  editingId = null;
  save();
  refreshPlan();
  renderAll();
}

function copyPlanText() {
  const area = $('plan-text');
  area.select();
  const done = () => { $('copy-plan').textContent = 'Copié ✔'; setTimeout(() => { $('copy-plan').textContent = 'Copier le texte'; }, 1500); };
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(area.value).then(done, () => { document.execCommand('copy'); done(); });
  } else {
    document.execCommand('copy');
    done();
  }
}

// Partage Android (WhatsApp, SMS…) : seulement si le téléphone le permet.
function sharePlanText() {
  navigator.share({ title: 'Planning covoiturage', text: $('plan-text').value }).catch(() => { /* partage annulé */ });
}

function changeWeek(offset) {
  initPlan(toDateStr(addDays(parseDate(plan.monday), offset * 7)));
  renderPlanning();
}

function renderAll() {
  $('system').value = state.system;
  $('system-rule').textContent = state.system === '1'
    ? 'Par aller-retour : chaque passager −1, le conducteur +1 par passager (moitié pour un aller ou un retour seul).'
    : 'Chaque trajet vaut 12 points partagés : à 2 → conducteur +6 / passager −6, à 3 → +8 / −4, à 4 → +9 / −3.';
  renderPlanning();
  renderPeople();
  renderForm(editingId ? state.days.find(d => d.id === editingId) : null);
  renderStats();
}

// ---------- Actions ----------

// Si la date choisie est déjà enregistrée, le formulaire passe en modification de cette journée.
function onDateChange() {
  const existing = state.days.find(d => d.date === $('date').value);
  if (existing && existing.id !== editingId) {
    editingId = existing.id;
    renderForm(existing);
  } else {
    updateSuggestion(true);
  }
}

function deleteDay() {
  const day = state.days.find(d => d.id === editingId);
  if (!day || !confirm(`Supprimer la journée du ${formatDate(day.date)} ?`)) return;
  state.days = state.days.filter(d => d.id !== day.id);
  editingId = null;
  save();
  refreshPlan();
  renderAll();
}

function saveDay() {
  const date = $('date').value;
  const status = selectedStatus();
  const driver = $('driver').value;
  const error = $('form-error');

  if (!date) return error.textContent = 'Choisis une date.';
  if (!hasAnyone(status)) return error.textContent = 'Indique au moins une personne présente.';
  if (roundTripIds(status).length === 0) {
    return error.textContent = 'Personne ne fait l\'aller-retour : pas de conducteur possible, la journée n\'est pas enregistrée.';
  }
  if (status[driver] !== 'ar') return error.textContent = 'Le conducteur doit faire l\'aller-retour.';
  if (state.days.some(d => d.date === date && d.id !== editingId)) {
    return error.textContent = 'Une autre journée est déjà enregistrée à cette date.';
  }

  const day = { id: editingId || `d${Date.now()}`, date, status, driver };
  if (editingId) {
    state.days = state.days.map(d => d.id === editingId ? day : d);
  } else {
    state.days.push(day);
  }
  editingId = null;
  save();
  refreshPlan();
  renderAll();
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `covoiturage-${toDateStr(new Date())}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const s = JSON.parse(reader.result);
      if (!isValidState(s)) throw new Error();
      if (!confirm('Remplacer toutes les données actuelles par celles du fichier ?')) return;
      state = normalizeState(s);
      editingId = null;
      save();
      refreshPlan();
      renderAll();
      alert('Données importées.');
    } catch (e) {
      alert('Ce fichier n\'est pas une sauvegarde de covoiturage valide.');
    }
  };
  reader.readAsText(file);
}

// ---------- Démarrage ----------

$('prev-week').addEventListener('click', () => changeWeek(-1));
$('next-week').addEventListener('click', () => changeWeek(1));
$('save-plan').addEventListener('click', savePlan);
$('copy-plan').addEventListener('click', copyPlanText);
$('system').innerHTML = Object.entries(SYSTEMES).map(([k, label]) => `<option value="${k}">${label}</option>`).join('');
$('system').addEventListener('change', () => {
  state.system = $('system').value;
  save();
  refreshPlan();
  renderAll();
});
if (navigator.share) {
  $('share-plan').hidden = false;
  $('share-plan').addEventListener('click', sharePlanText);
}
document.addEventListener('click', () => { $('tooltip').hidden = true; });
$('date').addEventListener('change', onDateChange);
$('delete-day').addEventListener('click', deleteDay);
$('save-day').addEventListener('click', saveDay);
$('cancel-edit').addEventListener('click', () => { editingId = null; renderAll(); });
$('export').addEventListener('click', exportData);
$('import').addEventListener('click', () => $('import-file').click());
$('import-file').addEventListener('change', e => {
  if (e.target.files[0]) importData(e.target.files[0]);
  e.target.value = '';
});

renderAll();

// Fonctionnement sans Internet une fois installée (seulement quand la page est en ligne,
// pas quand on ouvre index.html en double-cliquant sur le PC).
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js');
}
