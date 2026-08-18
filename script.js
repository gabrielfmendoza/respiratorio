/* script.js
   PROTOCOL_VERSION and PROTOCOL centralizan umbrales y mensajes.
*/
const PROTOCOL_VERSION = "PROTOCOLO DEFINIDO POR EL USUARIO";

const PROTOCOL = {
  severePEFThreshold: 50, // elección del usuario (40-50 conflictivo)
  moderatePEFThreshold: 70,
  oxygenTarget: 92,
  oxygenConsider: 92,
  tachycardiaModerate: 100,
  tachycardiaSevere: 120,
  tachypneaModerate: 20,
  tachypneaSevere: 30,
  satSevere: 90,
  satModerate: 95,
  magnesium: {dose: "2 g EV", infusion: "20 minutos"},
  steroids: {
    oral: "Prednisona/Meprednisona 40–50 mg VO (ver protocolo institucional)",
    iv: "Hidrocortisona 200 mg EV"
  },
  bronchodilator: "Salbutamol + ipratropio (inhalador + aerocámara preferido; alternativa: nebulización con jet de oxígeno)",
  nebulizationExample: "Salbutamol 20 gotas + Ipratropio 40 gotas cada 20 minutos"
};

const CLINICAL_RULES = {
  lifeThreatening: {
    consciousness: (v) => v === 'disminuido',
    silenceAuscultation: (v) => v === 'silencio',
    paradoxical: (v) => v === 'si',
    bradycardia: (fc) => fc !== null && fc !== undefined && fc > 0 && fc < 40,
    hypotension: (pas, pad) => pas !== null && pas !== undefined && (pas < 90),
    apnea: () => false, // no se captura explícitamente
    cardiacArrest: () => false,
    hypercapnia: (paco2) => paco2 !== undefined && paco2 !== null && paco2 > 45,
    satLow90: (sat) => sat !== undefined && sat !== null && sat < 90,
    muscularFatigue: (mus) => mus === 'muy_evidente' || mus === 'presente'
  },

  severity: {
    isMild: (data) => {
      return data.disnea === 'leve' && data.habla === 'parrafos' && data.sibilancias === 'presentes' && data.conciencia === 'normal' && (data.musculatura === 'ausente' || data.musculatura === '') && data.fc < PROTOCOL.tachycardiaModerate && data.pefPercent !== null && data.pefPercent >= PROTOCOL.moderatePEFThreshold && data.sat > PROTOCOL.satModerate;
    },

    isModerate: (data) => {
      return (data.disnea === 'moderada' || data.habla === 'frases' || data.musculatura === 'presente' || data.fc > PROTOCOL.tachycardiaModerate || data.fr > PROTOCOL.tachypneaModerate || (data.pefPercent !== null && data.pefPercent < PROTOCOL.moderatePEFThreshold) || (data.sat !== null && data.sat < PROTOCOL.satModerate));
    },

    isSevere: (data) => {
      const pefSev = (data.pefPercent !== null && data.pefPercent < PROTOCOL.severePEFThreshold);
      return (data.disnea === 'intensa' || data.disnea === 'muy_intensa' || data.habla === 'palabras' || data.habla === 'no_puede' || data.sibilancias === 'muy_marcadas' || data.musculatura === 'muy_evidente' || data.fc >= PROTOCOL.tachycardiaSevere || data.fr >= PROTOCOL.tachypneaSevere || pefSev || (data.sat !== null && data.sat < PROTOCOL.satSevere));
    }
  },

  treatment: {
    leve: [
      "Salbutamol + ipratropio (inhalador + aerocámara preferido)",
      "4–10 puff cada 20 minutos (según respuesta)",
      PROTOCOL.steroids.oral,
      "Alternativa IV: " + PROTOCOL.steroids.iv
    ],
    moderada: [
      "Salbutamol + ipratropio (inhalador + aerocámara preferido)",
      "4–10 puff cada 20 minutos",
      PROTOCOL.steroids.iv,
      PROTOCOL.steroids.oral,
      `Mantener SatO₂ >${PROTOCOL.oxygenTarget}%`
    ],
    grave: [
      "Salbutamol + ipratropio (inhalador + aerocámara preferido)",
      "4–10 puff cada 20 minutos",
      PROTOCOL.steroids.iv,
      `Mantener SatO₂ >${PROTOCOL.oxygenTarget}%`,
      "Budesonida 4 puff cada 15 minutos",
      `Considerar sulfato de magnesio ${PROTOCOL.magnesium.dose} (infusión ${PROTOCOL.magnesium.infusion})`
    ],
    nebulizacionAlternative: [
      `Alternativa: nebulización con jet de oxígeno — ${PROTOCOL.nebulizationExample}`
    ]
  }
};

// Utilidades y selección de elementos
const $ = (id) => document.getElementById(id);

function parseNumber(v){
  if(v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function showMessage(msg){
  alert(msg);
}

function calculatePEFPercent(medido, predicho){
  if(medido === null || predicho === null || predicho === 0) return null;
  const val = (medido / predicho) * 100;
  return Number.isFinite(val) ? Math.round(val * 10)/10 : null; // 1 decimal
}

function validateInputs(values){
  const missing = [];
  if(values.edad === null || values.edad <= 0) missing.push('Edad > 0');
  if(values.valor_medido === null || values.valor_medido <= 0) missing.push('Valor medido de función pulmonar > 0');
  // predicho puede ser opcional - no forzamos
  if(values.fc !== null && values.fc <= 0) missing.push('Frecuencia cardíaca > 0');
  if(values.fr !== null && values.fr <= 0) missing.push('Frecuencia respiratoria > 0');
  if(values.sat !== null && (values.sat < 0 || values.sat > 100)) missing.push('SatO₂ entre 0 y 100');
  return missing;
}

function evaluateLifeThreatening(data){
  const L = CLINICAL_RULES.lifeThreatening;
  const detected = [];
  if(L.consciousness(data.conciencia)) detected.push('Alteración del estado de conciencia');
  if(L.silenceAuscultation(data.sibilancias)) detected.push('Silencio auscultatorio');
  if(L.paradoxical(data.paradojico)) detected.push('Movimiento paradójico toracoabdominal');
  if(L.bradycardia(data.fc)) detected.push('Bradicardia (FC baja)');
  if(L.hypotension(data.pas, data.pad)) detected.push('Hipotensión (PAS <90 mmHg)');
  if(L.hypercapnia(data.paco2)) detected.push('Hipercapnia significativa (PaCO₂ elevada)');
  if(L.satLow90(data.sat)) detected.push('SatO₂ <90%');
  if(L.muscularFatigue(data.musculatura)) detected.push('Signos de fatiga muscular');
  return detected;
}

function evaluateSeverity(data){
  if(CLINICAL_RULES.severity.isSevere(data)) return 'GRAVE';
  if(CLINICAL_RULES.severity.isModerate(data)) return 'MODERADA';
  if(CLINICAL_RULES.severity.isMild(data)) return 'LEVE';
  return 'NO CLASIFICADA';
}

function buildCriteriaList(detected, extras){
  const list = [];
  detected.forEach(d => list.push(d));
  extras.forEach(e => list.push(e));
  return list;
}

function evaluateOxygenRequirement(sat){
  if(sat === null) return null;
  if(sat < PROTOCOL.satSevere) return {recommend: true, reason: `SatO₂ ${sat}% — considerar oxigenoterapia. Objetivo: SatO₂ ≥${PROTOCOL.oxygenTarget}%`};
  if(sat < PROTOCOL.oxygenConsider) return {recommend: true, reason: `SatO₂ ${sat}% — considerar oxigenoterapia para mantener ≥${PROTOCOL.oxygenTarget}%`};
  return {recommend:false, reason: `SatO₂ ${sat}% — no se identifican criterios de hipoxemia que requieran oxigenoterapia inmediata según los datos ingresados`};
}

function evaluateAdmissionCriteria(data, post=false){
  const list = [];
  if(post && data.sat !== null && data.sat < PROTOCOL.oxygenTarget) list.push('Necesidad de oxígeno para mantener SatO₂ ≥'+PROTOCOL.oxygenTarget+'%');
  if(post && data.pefPercent !== null && data.pefPercent < 60) list.push('PEF/FEV1 postratamiento <60%');
  if(data.ant1) list.push('Antecedente de crisis grave previa');
  if(data.ant3) list.push('Ingreso previo a UCI');
  if(data.ant5) list.push('Mala respuesta previa al tratamiento');
  if(data.ant6) list.push('Uso de corticoides sistémicos');
  if(data.ant7) list.push('Comorbilidades relevantes');
  if(data.ant9) list.push('Imposibilidad de garantizar cuidados domiciliarios / acceso inadecuado');
  if(data.reeval && data.reeval.response === 'MALA RESPUESTA') list.push('Mala respuesta al tratamiento');
  // Complicaciones no ingresadas (neumotórax/neumonía) deben ser añadidas manualmente
  return list;
}

function evaluateICUCritera(data){
  const list = [];
  const lt = evaluateLifeThreatening(data);
  if(lt.length) list.push(...lt);
  if(data.deterioro) list.push('Deterioro progresivo pese al tratamiento');
  if(data.musculatura === 'muy_evidente') list.push('Fatiga muscular / uso muy evidente de musculatura accesoria');
  if(data.fc !== null && data.fc >= PROTOCOL.tachycardiaSevere) list.push('Taquicardia marcada (FC ≥ '+PROTOCOL.tachycardiaSevere+')');
  if(data.fr !== null && data.fr >= PROTOCOL.tachypneaSevere) list.push('Taquipnea marcada (FR ≥ '+PROTOCOL.tachypneaSevere+')');
  return list;
}

function renderTreatment(sev){
  const t = CLINICAL_RULES.treatment;
  const container = $('treatmentContent');
  container.innerHTML = '';
  if(sev === 'LEVE'){
    t.leve.forEach(it => { const p = document.createElement('div'); p.textContent = '• ' + it; container.appendChild(p); });
    t.nebulizacionAlternative.forEach(it => { const p = document.createElement('div'); p.textContent = it; p.style.fontStyle='italic'; container.appendChild(p); });
  } else if(sev === 'MODERADA'){
    t.moderada.forEach(it => { const p = document.createElement('div'); p.textContent = '• ' + it; container.appendChild(p); });
    t.nebulizacionAlternative.forEach(it => { const p = document.createElement('div'); p.textContent = it; p.style.fontStyle='italic'; container.appendChild(p); });
  } else if(sev === 'GRAVE'){
    t.grave.forEach(it => { const p = document.createElement('div'); p.textContent = '• ' + it; container.appendChild(p); });
    const alt = document.createElement('div'); alt.textContent = t.nebulizacionAlternative[0]; alt.style.fontStyle='italic'; container.appendChild(alt);
  } else {
    container.textContent = 'No hay recomendación de tratamiento (datos insuficientes).';
  }
}

function renderResult(data){
  const main = $('mainResult');
  const titleEl = $('classificationTitle');
  const riskEl = $('riskLevel');
  const criteriaList = $('criteriaList');
  criteriaList.innerHTML = '';

  // Life threatening first
  const life = evaluateLifeThreatening(data);
  if(life.length){
    titleEl.textContent = 'CRISIS CON RIESGO VITAL';
    titleEl.className = 'classification severity-GRAVE';
    riskEl.textContent = 'Nivel de riesgo: ALTO — requiere manejo inmediato y valoración para cuidados críticos.';
    life.forEach(item => { const li = document.createElement('li'); li.textContent = '✓ ' + item; criteriaList.appendChild(li); });
    $('icuAdvice').textContent = 'Requiere valoración urgente por cuidados críticos. ';
    renderTreatment('GRAVE');
    $('magnesiumAdvice').textContent = `Sulfato de magnesio: ${PROTOCOL.magnesium.dose} — infusión ${PROTOCOL.magnesium.infusion} (considere según respuesta y protocolos).`;
    return;
  }

  // Severity
  const severity = evaluateSeverity(data);
  titleEl.textContent = `CRISIS ${severity}`;
  titleEl.className = 'classification severity-'+severity;
  const criteriaDetected = [];

  // collect criteria according to data
  if(data.fr !== null){
    if(data.fr >= PROTOCOL.tachypneaSevere) criteriaDetected.push(`FR ${data.fr} rpm (≥ ${PROTOCOL.tachypneaSevere})`);
    else if(data.fr > PROTOCOL.tachypneaModerate) criteriaDetected.push(`FR ${data.fr} rpm (> ${PROTOCOL.tachypneaModerate})`);
  }
  if(data.fc !== null){
    if(data.fc >= PROTOCOL.tachycardiaSevere) criteriaDetected.push(`FC ${data.fc} lpm (≥ ${PROTOCOL.tachycardiaSevere})`);
    else if(data.fc > PROTOCOL.tachycardiaModerate) criteriaDetected.push(`FC ${data.fc} lpm (> ${PROTOCOL.tachycardiaModerate})`);
  }
  if(data.pefPercent !== null) criteriaDetected.push(`${data.funcion_tipo} = ${data.pefPercent}%`);
  if(data.sat !== null) criteriaDetected.push(`SatO₂ = ${data.sat}%`);
  if(data.disnea) criteriaDetected.push(`Disnea: ${data.disnea.replace('_',' ')}`);
  if(data.habla) criteriaDetected.push(`Habla: ${data.habla}`);
  if(data.sibilancias) criteriaDetected.push(`Sibilancias: ${data.sibilancias}`);
  if(data.musculatura) criteriaDetected.push(`Uso musculatura accesoria: ${data.musculatura}`);
  if(data.paradojico === 'si') criteriaDetected.push('Movimiento paradójico toracoabdominal: Sí');

  // render criteria
  criteriaDetected.forEach(c => { const li = document.createElement('li'); li.textContent = '✓ ' + c; criteriaList.appendChild(li); });

  // risk level text
  let riskText = 'Nivel de riesgo: —';
  if(severity === 'LEVE') riskText = 'Nivel de riesgo: BAJO';
  if(severity === 'MODERADA') riskText = 'Nivel de riesgo: INTERMEDIO';
  if(severity === 'GRAVE') riskText = 'Nivel de riesgo: ALTO';
  riskEl.textContent = riskText;

  // oxygen
  const ox = evaluateOxygenRequirement(data.sat);
  if(ox && ox.recommend){
    $('oxygenAdvice').textContent = `→ ${ox.reason}`;
  } else if(ox){
    $('oxygenAdvice').textContent = `→ ${ox.reason}`;
  } else {
    $('oxygenAdvice').textContent = '';
  }

  // magnesium suggestion
  if(severity === 'GRAVE'){
    $('magnesiumAdvice').textContent = `Considerar sulfato de magnesio: ${PROTOCOL.magnesium.dose} — infusión ${PROTOCOL.magnesium.infusion} (según respuesta).`;
  } else {
    $('magnesiumAdvice').textContent = '';
  }

  // ICU suggestions
  const icuList = evaluateICUCritera(data);
  if(icuList.length){
    $('icuAdvice').textContent = 'VALORACIÓN URGENTE POR CUIDADOS CRÍTICOS.';
  } else {
    $('icuAdvice').textContent = '';
  }

  renderTreatment(severity);

  // admission criteria
  const admission = evaluateAdmissionCriteria(data);
  const admissionListEl = $('admissionList'); admissionListEl.innerHTML='';
  admission.forEach(it => { const li=document.createElement('li'); li.textContent='✓ '+it; admissionListEl.appendChild(li); });

  // icu criteria list
  const icuListEl = $('icuList'); icuListEl.innerHTML='';
  icuList.forEach(it => { const li=document.createElement('li'); li.textContent='✓ '+it; icuListEl.appendChild(li); });

  // why panel content
  const why = [];
  const lifeStr = life.length ? 'Detectado' : 'No detectado.';
  why.push('1. Riesgo vital\n   ' + (life.length ? life.join('\n   ') : 'No detectado.'));
  why.push('\n2. Función pulmonar\n   ' + (data.pefPercent !== null ? `${data.funcion_tipo} = ${data.pefPercent}%` : 'No disponible')); 
  why.push('\n3. Saturación\n   ' + (data.sat !== null ? `SatO₂ = ${data.sat}%` : 'No disponible'));
  why.push('\n4. Frecuencia respiratoria\n   ' + (data.fr !== null ? `FR = ${data.fr} rpm` : 'No disponible'));
  why.push('\n5. Frecuencia cardíaca\n   ' + (data.fc !== null ? `FC = ${data.fc} lpm` : 'No disponible'));
  why.push('\n6. Clasificación\n   ' + `Crisis ${severity}`);

  $('whyContent').textContent = why.join('\n');
}

function gatherFormData(){
  const data = {
    edad: parseNumber($('edad').value),
    ant1: $('ant1').checked,
    ant3: $('ant3').checked,
    ant5: $('ant5').checked,
    ant6: $('ant6').checked,
    ant7: $('ant7').checked,
    ant9: $('ant9').checked,
    disnea: $('disnea').value,
    habla: $('habla').value,
    sibilancias: $('sibilancias').value,
    conciencia: $('conciencia').value,
    musculatura: $('musculatura').value,
    paradojico: $('paradojico').value,
    fc: parseNumber($('fc').value),
    fr: parseNumber($('fr').value),
    pas: parseNumber($('pas').value),
    sat: parseNumber($('sat').value),
    funcion_tipo: $('funcion_tipo').value,
    valor_medido: parseNumber($('valor_medido').value),
    valor_predicho: parseNumber($('valor_predicho').value),
    paco2: parseNumber($('paco2').value),
    reeval: null
  };
  data.pefPercent = calculatePEFPercent(data.valor_medido, data.valor_predicho);
  return data;
}

function handleEvaluate(){
  const data = gatherFormData();
  const missing = validateInputs(data);
  if(missing.length){
    $('classificationTitle').textContent = 'Faltan datos para completar la evaluación.';
    $('criteriaList').innerHTML='';
    $('treatmentContent').textContent='';
    $('whyContent').textContent = 'Faltan: ' + missing.join(', ');
    return;
  }
  renderResult(data);
  // expose initial values for reeval compare
  window.__initial = data;
  // populate compare left column
  $('c_fc').textContent = data.fc !== null ? data.fc : '—';
  $('c_fr').textContent = data.fr !== null ? data.fr : '—';
  $('c_sat').textContent = data.sat !== null ? data.sat+'%' : '—';
  $('c_pef').textContent = data.pefPercent !== null ? data.pefPercent+'%' : '—';
  $('c_disnea').textContent = data.disnea || '—';
}

function showReevalSection(){
  $('reevalSection').classList.remove('hidden');
  $('reevalSection').scrollIntoView({behavior:'smooth'});
}

function handleEvaluateReeval(){
  if(!window.__initial){ showMessage('Primero realizar evaluación inicial.'); return; }
  const r = {
    disnea: $('r_disnea').value,
    habla: $('r_habla').value,
    sibilancias: $('r_sibilancias').value,
    conciencia: $('r_conciencia').value,
    fc: parseNumber($('r_fc').value),
    fr: parseNumber($('r_fr').value),
    sat: parseNumber($('r_sat').value),
    valor_medido: parseNumber($('r_valor_medido').value),
    valor_predicho: parseNumber($('r_valor_predicho').value)
  };
  r.pefPercent = calculatePEFPercent(r.valor_medido, r.valor_predicho);

  // build combined data object for ICU/admission checks
  const combined = Object.assign({}, window.__initial);
  combined.reeval = r;
  // determine response
  const good = (r.pefPercent !== null && r.pefPercent > 60) || (r.sat !== null && r.sat > PROTOCOL.oxygenTarget) || (r.disnea === 'leve' || r.disnea === '');
  const response = good ? 'BUENA RESPUESTA' : 'MALA RESPUESTA';
  // populate table
  $('r_c_fc').textContent = r.fc !== null ? r.fc : '—';
  $('r_c_fr').textContent = r.fr !== null ? r.fr : '—';
  $('r_c_sat').textContent = r.sat !== null ? r.sat+'%' : '—';
  $('r_c_pef').textContent = r.pefPercent !== null ? r.pefPercent+'%' : '—';
  $('r_c_disnea').textContent = r.disnea || '—';

  $('e_fc').textContent = (window.__initial.fc !== null && r.fc !== null) ? (r.fc - window.__initial.fc > 0 ? `↑ ${r.fc - window.__initial.fc}` : `↓ ${window.__initial.fc - r.fc}`) : '—';
  $('e_fr').textContent = (window.__initial.fr !== null && r.fr !== null) ? (r.fr - window.__initial.fr > 0 ? `↑ ${r.fr - window.__initial.fr}` : `↓ ${window.__initial.fr - r.fr}`) : '—';
  $('e_sat').textContent = (window.__initial.sat !== null && r.sat !== null) ? (r.sat - window.__initial.sat > 0 ? `↑ ${r.sat - window.__initial.sat}%` : `↓ ${window.__initial.sat - r.sat}%`) : '—';
  $('e_pef').textContent = (window.__initial.pefPercent !== null && r.pefPercent !== null) ? (Math.round((r.pefPercent - window.__initial.pefPercent)*10)/10 + ' puntos porcentuales') : '—';
  $('e_disnea').textContent = (window.__initial.disnea && r.disnea) ? (window.__initial.disnea === r.disnea ? 'Sin cambio' : `${window.__initial.disnea} → ${r.disnea}`) : '—';

  $('reevalResult').classList.remove('hidden');
  $('responseResult').textContent = response === 'BUENA RESPUESTA' ? 'BUENA RESPUESTA AL TRATAMIENTO' : 'MALA RESPUESTA AL TRATAMIENTO';
  if(response === 'BUENA RESPUESTA') $('responseResult').style.color = 'var(--success)'; else $('responseResult').style.color = 'var(--danger)';

  // admission criteria
  const admission = evaluateAdmissionCriteria(Object.assign({}, combined), true);
  const admissionListEl = $('admissionList'); admissionListEl.innerHTML='';
  admission.forEach(it => { const li=document.createElement('li'); li.textContent='✓ '+it; admissionListEl.appendChild(li); });

  // ICU
  const icu = evaluateICUCritera(combined);
  const icuListEl = $('icuList'); icuListEl.innerHTML='';
  icu.forEach(it => { const li=document.createElement('li'); li.textContent='✓ '+it; icuListEl.appendChild(li); });

  // set stored reeval result
  window.__initial.reeval = { ...r, response: response };
}

function resetCalculator(){
  if(!confirm('Confirmar: ¿desea iniciar una nueva evaluación y borrar los datos actuales?')) return;
  document.getElementById('calcForm').reset();
  $('classificationTitle').textContent = '—';
  $('riskLevel').textContent = 'Nivel de riesgo: —';
  $('criteriaList').innerHTML='';
  $('treatmentContent').innerHTML='';
  $('oxygenAdvice').textContent='';
  $('magnesiumAdvice').textContent='';
  $('icuAdvice').textContent='';
  $('whyContent').textContent='';
  $('admissionList').innerHTML='';
  $('icuList').innerHTML='';
  $('reevalSection').classList.add('hidden');
  $('reevalResult').classList.add('hidden');
  window.__initial = null;
}

function init(){
  $('evaluarBtn').addEventListener('click', handleEvaluate);
  $('startReevalBtn').addEventListener('click', showReevalSection);
  $('evaluateReevalBtn').addEventListener('click', handleEvaluateReeval);
  $('resetBtn').addEventListener('click', resetCalculator);
  $('printBtn').addEventListener('click', () => window.print());

  // show PEF calculation dynamically
  const updatePEF = () => {
    const med = parseNumber($('valor_medido').value);
    const pred = parseNumber($('valor_predicho').value);
    const tipo = $('funcion_tipo').value;
    const out = $('pefCalc');
    const pct = calculatePEFPercent(med, pred);
    if(pct === null){
      out.textContent = tipo + ': cálculo PEF% no disponible (falta valor medido o predicho).';
    } else {
      out.textContent = `${tipo} %\n${med} / ${pred} × 100 = ${pct}%`;
    }
  };
  ['valor_medido','valor_predicho','funcion_tipo'].forEach(id => { $(id).addEventListener('input', updatePEF); });
  // Ripple helpers (Material-like ripple for buttons)
  function createRipple(el, evt){
    const rect = el.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const size = Math.max(rect.width, rect.height) * 1.2;
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (evt.clientX - rect.left - size/2) + 'px';
    ripple.style.top = (evt.clientY - rect.top - size/2) + 'px';
    el.appendChild(ripple);
    setTimeout(()=>{ try{ ripple.remove(); }catch(e){} }, 700);
  }

  function attachRipples(){
    document.querySelectorAll('button').forEach(btn => {
      btn.classList.add('material-button');
      btn.addEventListener('pointerdown', function(e){
        createRipple(this, e);
      });
    });
  }
  // attach ripples to buttons in the form
  attachRipples();
}

// Inicializar
document.addEventListener('DOMContentLoaded', init);

/*
  CASOS DE PRUEBA (manuales)

  Caso 1 — Crisis leve
  - PEF predicho 482, medido 350 (PEF 72.6%)
  - SatO₂ 96
  - Disnea leve, habla en párrafos
  Resultado esperado: Crisis leve

  Caso 2 — Crisis moderada
  - PEF predicho 482, medido 280 (PEF 58.1%)
  - FR 24, SatO₂ 94
  Resultado esperado: Crisis moderada

  Caso 3 — Crisis grave
  - PEF predicho 482, medido 180 (PEF 37.3%)
  - FR 32, FC 126, SatO₂ 88
  Resultado esperado: Crisis grave

  Caso 4 — Riesgo vital
  - Alteración de conciencia = "disminuido"
  - Silencio auscultatorio
  - SatO₂ 88
  Resultado: CRISIS CON RIESGO VITAL (prevalece sobre PEF)

  Caso 5 — Buena respuesta
  - Inicial: PEF 38%, SatO₂ 89%, grave/moderado
  - Post: PEF 65%, SatO₂ 93%, mejoría clínica
  Resultado: BUENA RESPUESTA / considerar criterios de alta

  Caso 6 — Mala respuesta
  - Persistencia de síntomas + PEF post <60%
  Resultado: MALA RESPUESTA / considerar hospitalización
*/