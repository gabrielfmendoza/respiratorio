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

const ALGORITHM_COPY = {
  asma: {
    documentTitle: 'Calculadora de Exacerbación de Asma',
    title: 'Calculadora de Exacerbación de Asma',
    subtitle: 'Evaluación inicial y respuesta al tratamiento'
  },
  neumonia: {
    documentTitle: 'Algoritmo Inicial de Neumonía',
    title: 'Algoritmo Inicial de Neumonía',
    subtitle: 'Estratificación clínica inicial y orientación de manejo'
  }
};

const PNEUMONIA_PROTOCOL = {
  oxygenTarget: 92,
  curbBUN: 20,
  curbUrea: 44,
  curbFr: 30,
  curbAge: 65,
  hypotensionPas: 90,
  hypotensionPad: 60,
  atsPafi: 250,
  atsMinorThreshold: 3,
  pesThreshold: 5
};

const PNEUMONIA_TREATMENT = {
  initialTests: [
    'Solicitar analítica inicial y radiografía de tórax para confirmar o descartar NAC.',
    'Administrar la primera dosis de antibiótico de forma precoz, idealmente dentro de las primeras 6 horas.'
  ],
  ambulatory: [
    'No se requieren más pruebas complementarias además de la evaluación inicial, si la evolución clínica es estable.',
    'Alta médica con manejo ambulatorio y control clínico precoz.',
    'Opciones antibióticas VO: levofloxacino o moxifloxacino en monoterapia.',
    'Alternativa VO: amoxicilina, amoxicilina/clavulánico o cefditoren + azitromicina o claritromicina.'
  ],
  observation: [
    'CURB-65 = 2: valorar internación corta / observación estrecha.',
    'Si precisa ingreso, ampliar estudio microbiológico y monitorización en las primeras horas.',
    'Si evoluciona favorable y el contexto lo permite, definir alta o ingreso breve según reevaluación clínica.'
  ],
  microbiology: [
    'Ampliar estudio microbiológico con esputo, hemocultivos y antígeno urinario para neumococo/Legionella.',
    'Añadir marcadores de gravedad como PCR y procalcitonina según disponibilidad.'
  ],
  hospital: [
    'Internación hospitalaria.',
    'Quinolona VO/IV: levofloxacino o moxifloxacino.',
    'Alternativa: ceftriaxona o ceftarolina + azitromicina o claritromicina VO/IV.'
  ],
  icu: [
    'Ingreso en UCI.',
    'Betalactámico IV + macrólido VO/IV o quinolona IV.',
    'Opciones: ceftriaxona, cefotaxima o ceftarolina + azitromicina/claritromicina, o levofloxacino/moxifloxacino.'
  ],
  corticosteroids: [
    'En NAC grave que requiere UCI, los corticoides adyuvantes pueden valorarse según contexto clínico y comorbilidades concomitantes.'
  ],
  multiresistant: [
    'PES ≥ 5: considerar cobertura empírica para multirresistentes con meropenem + levofloxacino + ceftarolina o linezolid.'
  ],
  pseudomonas: [
    'Sospecha de Pseudomonas: siempre doble cobertura IV con un betalactámico antipseudomónico + quinolona o aminoglucósido.',
    'Opciones de betalactámico: ceftazidima, piperacilina/tazobactam, meropenem o aztreonam si alergia a betalactámicos.'
  ],
  anaerobes: [
    'Si hay absceso pulmonar o empiema pleural, añadir cobertura frente a anaerobios.',
    'Opciones: amoxicilina/ácido clavulánico IV, moxifloxacino, clindamicina o ertapenem.'
  ],
  notConfirmed: [
    'La radiografía no confirma NAC. Reevaluar el diagnóstico y completar estudios según hallazgos clínicos.'
  ]
};

// Predicted PEF reference table (semFYC). Usado para completar "Valor predicho/teórico" cuando hay talla+sexo+edad.
const PREDICTED_PEF = {
  ages: [15,20,25,30,35,40,45,50,55,60,65,70],
  hombres: {
    heights: [160,168,175,183,190],
    values: [
      [518,568,598,612,613,606,592,578,565,555,544,534],
      [530,580,610,623,623,617,603,589,577,566,556,546],
      [540,590,622,636,635,627,615,601,588,578,568,558],
      [552,601,632,645,646,638,626,612,600,589,578,568],
      [562,612,643,656,656,649,637,623,611,599,589,579]
    ],
    sd: 48
  },
  mujeres: {
    heights: [145,152,160,168,175],
    values: [
      [438,445,450,452,452,449,444,436,426,415,400,385],
      [450,456,461,463,463,460,456,448,437,425,410,396],
      [461,467,471,474,473,470,467,458,449,437,422,407],
      [471,478,482,485,484,482,478,470,460,448,434,418],
      [481,488,493,496,496,493,488,480,471,458,445,428]
    ],
    sd: 42
  },
  ninos: {
    heights: [91,99,107,114,122,130,137,145,152,160,168,175],
    values: [100,120,140,170,210,250,285,325,360,400,440,480]
  },
  source: 'Guía semFYC de actuación en Atención Primaria'
};

function predictPEFFromTable(age, heightCm, sex){
  if(!age || !heightCm || !sex) return null;
  const table = (sex === 'hombre') ? PREDICTED_PEF.hombres : PREDICTED_PEF.mujeres;
  const ages = PREDICTED_PEF.ages;
  const heights = table.heights;
  const values = table.values;

  // clamp age to table range
  const minAge = ages[0], maxAge = ages[ages.length-1];
  const a = Math.max(minAge, Math.min(maxAge, age));

  // find surrounding age indices
  let i = 0;
  while(i < ages.length-1 && a > ages[i+1]) i++;
  const i1 = Math.min(i+1, ages.length-1);
  const ageLo = ages[i], ageHi = ages[i1];
  const tAge = (ageHi === ageLo) ? 0 : (a - ageLo) / (ageHi - ageLo);

  // find surrounding height indices (clamp if outside)
  if(heightCm <= heights[0]){
    // use first height row
    const row = values[0];
    const vLo = row[i]; const vHi = row[i1];
    return Math.round((vLo + (vHi - vLo) * tAge));
  }
  if(heightCm >= heights[heights.length-1]){
    const row = values[values.length-1];
    const vLo = row[i]; const vHi = row[i1];
    return Math.round((vLo + (vHi - vLo) * tAge));
  }

  let j = 0;
  while(j < heights.length-1 && heightCm > heights[j+1]) j++;
  const j1 = Math.min(j+1, heights.length-1);
  const hLo = heights[j], hHi = heights[j1];
  const tH = (hHi === hLo) ? 0 : (heightCm - hLo) / (hHi - hLo);

  // corner values
  const v00 = values[j][i];
  const v01 = values[j][i1];
  const v10 = values[j1][i];
  const v11 = values[j1][i1];

  // interpolate age for each height
  const f0 = v00 + (v01 - v00) * tAge;
  const f1 = v10 + (v11 - v10) * tAge;
  const result = f0 + (f1 - f0) * tH;
  return Math.round(result);
}

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
      const basic = data.disnea === 'leve' && data.habla === 'parrafos' && data.sibilancias === 'presentes' && data.conciencia === 'normal' && (data.musculatura === 'ausente' || data.musculatura === '');
      const fcOk = (data.fc === null || data.fc < PROTOCOL.tachycardiaModerate);
      const pefOk = (data.pefPercent === null) || (data.pefPercent >= PROTOCOL.moderatePEFThreshold);
      const satOk = (data.sat === null) || (data.sat > PROTOCOL.satModerate);
      return basic && fcOk && pefOk && satOk;
    },

    // Pediatric rules (based on PDF guidance)
    isMildChild: (data) => {
      const pef = data.pefPercent;
      const sat = data.sat;
      const basic = data.disnea === 'leve' && data.habla === 'parrafos' && (data.musculatura === 'ausente' || data.musculatura === '');
      const pefOk = (pef === null) || (pef >= 70);
      const satOk = (sat === null) || (sat > 95);
      return basic && pefOk && satOk;
    },

    isModerateChild: (data) => {
      const pef = data.pefPercent;
      const sat = data.sat;
      if(pef !== null && pef >= 50 && pef < 70) return true;
      if(sat !== null && sat >= 90 && sat <= 95) return true;
      if(data.disnea === 'moderada' || data.habla === 'frases' || data.musculatura === 'presente') return true;
      return false;
    },

    isSevereChild: (data) => {
      const pef = data.pefPercent;
      const sat = data.sat;
      if(pef !== null && pef < 50) return true;
      if(sat !== null && sat < 90) return true;
      if(data.disnea === 'intensa' || data.disnea === 'muy_intensa') return true;
      if(data.habla === 'palabras' || data.habla === 'no_puede') return true;
      if(data.musculatura === 'muy_evidente') return true;
      return false;
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

// Pediatric treatment guidance (textual; dosajes por kg segun guía)
CLINICAL_RULES.treatment.pediatric = {
  leve: [
    "Salbutamol: aerosol 2 disparos con aerocámara o nebulización (0.125–0.25 mg/kg) cada 20 min durante 1 hora.",
    "Buena respuesta: observación 1 h; egreso con β2 cada 4–6 h y control en 48 h."
  ],
  moderada: [
    "Oxígeno humidificado para mantener SatO₂ > 95%.",
    "Salbutamol: nebulización 0.25 mg/kg cada 20 min durante 1 hora; luego cada 2–4 h según necesidad.",
    "Corticoides: Metilprednisolona VO 1–2 mg/kg/día (máx 40 mg) o Hidrocortisona EV 5 mg/kg cada 6 h.",
    "Observación 2 h; egreso con β2 + corticoide VO si respuesta buena."
  ],
  grave: [
    "Internación inmediata + O₂ humidificado.",
    "Salbutamol: nebulización cada 20 min o administración continua (0.5 mg/kg/h según protocolo).",
    "Agregar Ipratropio: 0.25 mg (<6 años) o 0.5 mg (>6 años) cada 20 min durante 1 h, luego cada 6–8 h.",
    "Corticoides EV + hidratación: Hidrocortisona 5 mg/kg cada 6 h.",
    "Si mala respuesta: considerar UTI y aminofilina (bolo 5–6 mg/kg + mant. 0.7 mg/kg/h)."
  ]
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

function getSelectedAlgorithm(){
  const selector = $('algoritmo');
  return selector ? selector.value : 'asma';
}

function clearRenderedState(){
  $('classificationTitle').textContent = '—';
  $('riskLevel').textContent = 'Nivel de riesgo: —';
  $('reevalNotice').textContent = '';
  $('criteriaList').innerHTML = '';
  $('treatmentContent').innerHTML = '';
  $('oxygenAdvice').textContent = '';
  $('magnesiumAdvice').textContent = '';
  $('icuAdvice').textContent = '';
  $('whyContent').textContent = '';
  $('admissionList').innerHTML = '';
  $('icuList').innerHTML = '';
  $('reevalSection').classList.add('hidden');
  $('reevalResult').classList.add('hidden');
  $('reevalClassification').textContent = '';
  $('reevalCriteria').textContent = '';
  const responseEl = $('responseResult');
  responseEl.textContent = '';
  responseEl.style.color = '';
  if($('pefCalc')){
    $('pefCalc').textContent = getSelectedAlgorithm() === 'asma'
      ? ''
      : 'Función pulmonar disponible solo para el algoritmo de asma.';
  }
  window.__initial = null;
  window.__lastSeverity = null;
}

function toggleAlgorithmElements(className, visible){
  document.querySelectorAll('.' + className).forEach((el) => {
    el.classList.toggle('hidden', !visible);
  });
}

function updateAgeSensitiveFields(){
  const age = parseNumber($('edad') ? $('edad').value : null);
  const algorithm = getSelectedAlgorithm();
  const isAdult = age !== null && age >= 15;
  const isPediatric = age !== null && age < 15;
  const adultSexoLabel = $('adultSexoLabel');
  const adultTallaLabel = $('adultTallaLabel');
  const pesoLabel = $('pesoLabel');
  const sexoEl = $('sexo');
  const tallaEl = $('talla');
  const pesoEl = $('peso');
  const funcionSection = $('funcionSection');

  if(algorithm !== 'asma'){
    if(adultSexoLabel) adultSexoLabel.style.display = 'none';
    if(adultTallaLabel) adultTallaLabel.style.display = 'none';
    if(sexoEl){ sexoEl.value = ''; sexoEl.disabled = true; }
    if(tallaEl){ tallaEl.value = ''; tallaEl.disabled = true; }
    if(pesoLabel) pesoLabel.style.display = 'none';
    if(pesoEl){ pesoEl.value = ''; pesoEl.disabled = true; }
    if(funcionSection){
      funcionSection.querySelectorAll('input,select').forEach((el) => { el.value = ''; el.disabled = true; });
      funcionSection.style.display = 'none';
    }
    if($('pefCalc')) $('pefCalc').textContent = 'Función pulmonar disponible solo para el algoritmo de asma.';
    return;
  }

  if(isAdult){
    if(adultSexoLabel) adultSexoLabel.style.display = '';
    if(adultTallaLabel) adultTallaLabel.style.display = '';
    if(sexoEl) sexoEl.disabled = false;
    if(tallaEl) tallaEl.disabled = false;
    if(pesoLabel) pesoLabel.style.display = 'none';
    if(pesoEl){ pesoEl.value = ''; pesoEl.disabled = true; }
    if(funcionSection){
      funcionSection.style.display = '';
      funcionSection.querySelectorAll('input,select').forEach((el) => { el.disabled = false; });
    }
    updatePredictedField();
    return;
  }

  if(adultSexoLabel) adultSexoLabel.style.display = 'none';
  if(adultTallaLabel) adultTallaLabel.style.display = 'none';
  if(sexoEl){ sexoEl.value = ''; sexoEl.disabled = true; }
  if(tallaEl){ tallaEl.value = ''; tallaEl.disabled = true; }
  if(pesoLabel){
    if(isPediatric){
      pesoLabel.style.display = '';
      if(pesoEl) pesoEl.disabled = false;
    } else {
      pesoLabel.style.display = 'none';
      if(pesoEl){ pesoEl.value = ''; pesoEl.disabled = true; }
    }
  }
  if(funcionSection){
    funcionSection.querySelectorAll('input,select').forEach((el) => { el.value = ''; el.disabled = true; });
    funcionSection.style.display = 'none';
  }
  if($('pefCalc')) $('pefCalc').textContent = 'Función pulmonar deshabilitada para pacientes pediátricos.';
}

function updateAlgorithmUI(){
  const algorithm = getSelectedAlgorithm();
  const copy = ALGORITHM_COPY[algorithm] || ALGORITHM_COPY.asma;
  document.title = copy.documentTitle;
  if($('appTitle')) $('appTitle').textContent = copy.title;
  if($('appSubtitle')) $('appSubtitle').textContent = copy.subtitle;
  toggleAlgorithmElements('asma-only', algorithm === 'asma');
  toggleAlgorithmElements('neumonia-only', algorithm === 'neumonia');
  $('startReevalBtn').classList.toggle('hidden', algorithm !== 'asma');
  clearRenderedState();
  updateAgeSensitiveFields();
}

function calculatePEFPercent(medido, predicho){
  if(medido === null || predicho === null || predicho === 0) return null;
  const val = (medido / predicho) * 100;
  return Number.isFinite(val) ? Math.round(val * 10)/10 : null; // 1 decimal
}

// If edad>15 and sexo+talla completados, calcular y completar el campo `valor_predicho`
function updatePredictedField(){
  const age = parseNumber($('edad').value);
  const sex = $('sexo') ? $('sexo').value : '';
  const talla = parseNumber($('talla').value);
  if(age !== null && age > 15 && sex && talla !== null && talla > 0){
    const pred = predictPEFFromTable(age, talla, sex);
    if(pred !== null){
      const predEl = $('valor_predicho');
      predEl.value = pred;
      predEl.dispatchEvent(new Event('input',{bubbles:true}));
      predEl.dispatchEvent(new Event('change',{bubbles:true}));
    }
  }
}

function getDisneaIndications(level){
  const map = {
    '': ['Seleccione un nivel de disnea para ver indicaciones.'],
    'leve': ['Ausente salvo al realizar ejercicio intenso'],
    'moderada': ['Al caminar rápido o subir pendientes muy pronunciadas'],
    'intensa': ['No puede mantener el ritmo de otras personas de la misma edad caminando en llano, o bien, caminando al paso propio tiene que detenerse ocasionalmente'],
    'muy_intensa': ['Caminando en llano al paso propio, tiene que pararse a descansar cada 100 m o cada pocos minutos'],
    '4': ['Impide al sujeto salir de casa']
  };
  return map[level] || ['Sin indicaciones definidas.'];
}

function updateDisneaAdvice(level, targetId = 'disneaAdvice'){
  const el = $(targetId);
  if(!el) return;
  const items = getDisneaIndications(level);
  el.innerHTML = '';
  items.forEach(it => {
    const d = document.createElement('div');
    d.textContent = '• ' + it;
    el.appendChild(d);
  });
}

function validateInputs(values){
  const missing = [];
  if(values.edad === null || values.edad <= 0) missing.push('Edad > 0');
  // Función pulmonar ahora opcional: validar solo si se ingresó un valor
  if(values.valor_medido !== null && values.valor_medido <= 0) missing.push('Valor medido de función pulmonar > 0 (si se ingresa)');
  // predicho puede ser opcional - no forzamos
  if(values.fc !== null && values.fc <= 0) missing.push('Frecuencia cardíaca > 0');
  if(values.fr !== null && values.fr <= 0) missing.push('Frecuencia respiratoria > 0');
  if(values.pas !== null && values.pas <= 0) missing.push('Presión arterial sistólica > 0');
  if(values.pad !== null && values.pad <= 0) missing.push('Presión arterial diastólica > 0');
  if(values.sat !== null && (values.sat < 0 || values.sat > 100)) missing.push('SatO₂ entre 0 y 100');
  return missing;
}

function validatePneumoniaInputs(values){
  const missing = [];
  if(values.edad === null || values.edad <= 0) missing.push('Edad > 0');
  if(values.neu_infiltrado === '') missing.push('Radiografía / infiltrado');
  if(values.fc !== null && values.fc <= 0) missing.push('Frecuencia cardíaca > 0');
  if(values.fr !== null && values.fr <= 0) missing.push('Frecuencia respiratoria > 0');
  if(values.pas !== null && values.pas <= 0) missing.push('Presión arterial sistólica > 0');
  if(values.pad !== null && values.pad <= 0) missing.push('Presión arterial diastólica > 0');
  if(values.sat !== null && (values.sat < 0 || values.sat > 100)) missing.push('SatO₂ entre 0 y 100');
  const hasSymptoms = values.neu_fiebre === 'si' || values.neu_tos === 'seca' || values.neu_tos === 'productiva' || values.neu_expectoracion === 'si' || values.neu_dolor === 'si' || values.neu_dificultad === 'leve' || values.neu_dificultad === 'moderada' || values.neu_dificultad === 'marcada';
  if(!hasSymptoms) missing.push('Al menos un síntoma compatible con NAC');
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
  const age = data && data.edad !== null ? data.edad : null;
  // Use pediatric thresholds for pacientes < 15 años
  if(age !== null && age < 15){
    if(CLINICAL_RULES.severity.isSevereChild(data)) return 'GRAVE';
    if(CLINICAL_RULES.severity.isModerateChild(data)) return 'MODERADA';
    if(CLINICAL_RULES.severity.isMildChild(data)) return 'LEVE';
    return 'NO CLASIFICADA';
  }
  // Adult/default
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
  const age = parseNumber($('edad').value);
  const peso = parseNumber($('peso') ? $('peso').value : null);
  // pediatric specific treatments
  if(age !== null && age < 15){
    const tped = CLINICAL_RULES.treatment.pediatric;
    if(sev === 'LEVE'){
      tped.leve.forEach(it => { const p = document.createElement('div'); p.textContent = '• ' + it; container.appendChild(p); });
    } else if(sev === 'MODERADA'){
      tped.moderada.forEach(it => { const p = document.createElement('div'); p.textContent = '• ' + it; container.appendChild(p); });
    } else if(sev === 'GRAVE'){
      tped.grave.forEach(it => { const p = document.createElement('div'); p.textContent = '• ' + it; container.appendChild(p); });
    } else {
      container.textContent = 'No hay recomendación de tratamiento pediátrico (datos insuficientes).';
    }

    // show mg/kg example calculations when peso disponible
    if(peso && peso > 0){
      const doseBox = document.createElement('div'); doseBox.style.marginTop='8px'; doseBox.style.fontStyle='italic';
      if(sev === 'LEVE'){
        const salbMin = (0.125 * peso).toFixed(2);
        const salbMax = (0.25 * peso).toFixed(2);
        doseBox.innerHTML = `Ejemplos de dosis según peso (${peso} kg) — LEVE: Salbutamol 0.125–0.25 mg/kg (cada 20 min durante 1 h) → ${salbMin}–${salbMax} mg por dosis.`;
      } else if(sev === 'MODERADA'){
        const salb = (0.25 * peso).toFixed(2);
        const met1 = (1 * peso).toFixed(1);
        const met2 = (2 * peso).toFixed(1);
        const hidroc = (5 * peso).toFixed(1);
        doseBox.innerHTML = `Ejemplos de dosis según peso (${peso} kg) — MODERADA: Salbutamol 0.25 mg/kg → ${salb} mg; Metilprednisolona VO 1–2 mg/kg/día → ${met1}–${met2} mg/día; Hidrocortisona EV 5 mg/kg → ${hidroc} mg por dosis.`;
      } else if(sev === 'GRAVE'){
        const contSalb = (0.5 * peso).toFixed(2);
        const iprat = (age !== null && age < 6) ? '0.25 mg' : '0.5 mg';
        const aminMin = (5 * peso).toFixed(1);
        const aminMax = (6 * peso).toFixed(1);
        const aminMaint = (0.7 * peso).toFixed(2);
        doseBox.innerHTML = `Ejemplos de dosis según peso (${peso} kg) — GRAVE: Salbutamol infusión continua ~0.5 mg/kg/h → ${contSalb} mg/h; Ipratropio inhalado: ${iprat}; Aminofilina: bolo 5–6 mg/kg → ${aminMin}–${aminMax} mg; mant. ~0.7 mg/kg/h → ${aminMaint} mg/h.`;
      } else {
        const salbLeveMin = (0.125 * peso).toFixed(2);
        const salbLeveMax = (0.25 * peso).toFixed(2);
        const salbMod = (0.25 * peso).toFixed(2);
        const hidroc = (5 * peso).toFixed(1);
        doseBox.innerHTML = `Ejemplos de dosis según peso (${peso} kg): Salbutamol 0.125–0.25 mg/kg → ${salbLeveMin}–${salbLeveMax} mg; Salbutamol moderada 0.25 mg/kg → ${salbMod} mg; Hidrocortisona EV 5 mg/kg → ${hidroc} mg.`;
      }
      container.appendChild(doseBox);
    }
    return;
  }

  // adult / default treatments
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

function gatherPneumoniaData(){
  return {
    edad: parseNumber($('edad').value),
    fc: parseNumber($('fc').value),
    fr: parseNumber($('fr').value),
    pas: parseNumber($('pas').value),
    pad: parseNumber($('pad').value),
    sat: parseNumber($('sat').value),
    neu_sexo: $('neu_sexo').value,
    neu_fiebre: $('neu_fiebre').value,
    neu_tos: $('neu_tos').value,
    neu_expectoracion: $('neu_expectoracion').value,
    neu_dolor: $('neu_dolor').value,
    neu_dificultad: $('neu_dificultad').value,
    neu_confusion: $('neu_confusion').value,
    neu_infiltrado: $('neu_infiltrado').value,
    neu_comorb: $('neu_comorb').checked,
    neu_intolerancia: $('neu_intolerancia').checked,
    neu_temp: parseNumber($('neu_temp').value),
    neu_bun: parseNumber($('neu_bun').value),
    neu_urea: parseNumber($('neu_urea').value),
    neu_pafi: parseNumber($('neu_pafi').value),
    neu_ats_ventilacion: $('neu_ats_ventilacion').checked,
    neu_ats_vasopresores: $('neu_ats_vasopresores').checked,
    neu_ats_multilobar: $('neu_ats_multilobar').checked,
    neu_ats_leucopenia: $('neu_ats_leucopenia').checked,
    neu_ats_trombocitopenia: $('neu_ats_trombocitopenia').checked,
    neu_ats_fluidos: $('neu_ats_fluidos').checked,
    neu_pes_respiratorio: $('neu_pes_respiratorio').checked,
    neu_pes_renal_cronica: $('neu_pes_renal_cronica').checked,
    neu_pseudo_abx90: $('neu_pseudo_abx90').checked,
    neu_pseudo_hosp_rec: $('neu_pseudo_hosp_rec').checked,
    neu_pseudo_corticoides: $('neu_pseudo_corticoides').checked,
    neu_pseudo_epoc: $('neu_pseudo_epoc').checked,
    neu_pseudo_prev: $('neu_pseudo_prev').checked,
    neu_pseudo_bronq: $('neu_pseudo_bronq').checked,
    neu_absceso_empiema: $('neu_absceso_empiema').checked
  };
}

function pneumoniaBUNCriterion(data){
  return (data.neu_bun !== null && data.neu_bun >= PNEUMONIA_PROTOCOL.curbBUN) || (data.neu_urea !== null && data.neu_urea > PNEUMONIA_PROTOCOL.curbUrea);
}

function calculateCurb65(data){
  let score = 0;
  const positive = [];
  const missing = [];

  if(data.neu_confusion === 'si'){
    score += 1;
    positive.push('Confusion');
  }
  if(data.neu_bun === null && data.neu_urea === null) missing.push('BUN/urea');
  else if(pneumoniaBUNCriterion(data)){
    score += 1;
    positive.push(`BUN >= ${PNEUMONIA_PROTOCOL.curbBUN} mg/dl o urea > ${PNEUMONIA_PROTOCOL.curbUrea} mg/dl`);
  }
  if(data.fr === null) missing.push('Frecuencia respiratoria');
  else if(data.fr >= PNEUMONIA_PROTOCOL.curbFr){
    score += 1;
    positive.push(`FR >= ${PNEUMONIA_PROTOCOL.curbFr} rpm`);
  }
  if(data.pas === null && data.pad === null) missing.push('Presion arterial');
  else if((data.pas !== null && data.pas < PNEUMONIA_PROTOCOL.hypotensionPas) || (data.pad !== null && data.pad <= PNEUMONIA_PROTOCOL.hypotensionPad)){
    score += 1;
    positive.push(`Hipotension: PAS < ${PNEUMONIA_PROTOCOL.hypotensionPas} o PAD <= ${PNEUMONIA_PROTOCOL.hypotensionPad}`);
  }
  if(data.edad === null) missing.push('Edad');
  else if(data.edad >= PNEUMONIA_PROTOCOL.curbAge){
    score += 1;
    positive.push(`Edad >= ${PNEUMONIA_PROTOCOL.curbAge} anos`);
  }

  let risk = 'bajo';
  let disposition = 'AMBULATORIA';
  if(score === 2){
    risk = 'intermedio';
    disposition = 'OBSERVACION';
  } else if(score >= 3){
    risk = 'alto';
    disposition = 'HOSPITALARIA';
  }

  return { score, positive, missing, risk, disposition };
}

function calculateAtsIdsa(data){
  const major = [];
  const minor = [];
  if(data.neu_ats_ventilacion) major.push('Ventilacion mecanica invasiva');
  if(data.neu_ats_vasopresores) major.push('Necesidad de vasopresores');
  if(data.fr !== null && data.fr > 30) minor.push('Frecuencia respiratoria >30 rpm');
  if(data.neu_pafi !== null && data.neu_pafi <= PNEUMONIA_PROTOCOL.atsPafi) minor.push(`PaO2/FiO2 <= ${PNEUMONIA_PROTOCOL.atsPafi}`);
  if(data.neu_ats_multilobar) minor.push('Infiltrados en varios lobulos');
  if(data.neu_confusion === 'si') minor.push('Confusion/desorientacion');
  if(pneumoniaBUNCriterion(data)) minor.push(`Uremia: BUN >= ${PNEUMONIA_PROTOCOL.curbBUN} mg/dl o urea > ${PNEUMONIA_PROTOCOL.curbUrea} mg/dl`);
  if(data.neu_ats_leucopenia) minor.push('Leucocitos <4.000/mm3');
  if(data.neu_ats_trombocitopenia) minor.push('Plaquetas <100.000/mm3');
  if(data.neu_temp !== null && data.neu_temp < 36) minor.push('Temperatura <36 C');
  if(data.neu_ats_fluidos) minor.push('Hipotension con necesidad de fluidoterapia agresiva');
  return {
    major,
    minor,
    majorCount: major.length,
    minorCount: minor.length,
    needsIcu: major.length >= 1 || minor.length >= PNEUMONIA_PROTOCOL.atsMinorThreshold
  };
}

function calculatePES(data){
  let score = 0;
  const factors = [];
  if(data.edad !== null && data.edad > 65){ score += 2; factors.push('Edad >65 anos: +2'); }
  else if(data.edad !== null && data.edad >= 40){ score += 1; factors.push('Edad 40-65 anos: +1'); }
  if(data.neu_sexo === 'hombre'){ score += 1; factors.push('Sexo masculino: +1'); }
  if(data.neu_pes_respiratorio){ score += 2; factors.push('Trastorno respiratorio cronico: +2'); }
  if(data.neu_confusion === 'si'){ score += 2; factors.push('Alteracion de la conciencia: +2'); }
  if(data.neu_pes_renal_cronica){ score += 3; factors.push('Insuficiencia renal cronica: +3'); }
  if(data.neu_fiebre === 'si'){ score -= 1; factors.push('Fiebre: -1'); }
  return { score, factors, highRisk: score >= PNEUMONIA_PROTOCOL.pesThreshold };
}

function evaluatePneumonia(data){
  const symptoms = [];
  if(data.neu_fiebre === 'si') symptoms.push('Fiebre');
  if(data.neu_tos === 'seca') symptoms.push('Tos seca');
  if(data.neu_tos === 'productiva') symptoms.push('Tos productiva');
  if(data.neu_expectoracion === 'si') symptoms.push('Expectoracion');
  if(data.neu_dolor === 'si') symptoms.push('Dolor toracico pleuritico');
  if(data.neu_dificultad === 'leve') symptoms.push('Disnea leve');
  if(data.neu_dificultad === 'moderada') symptoms.push('Disnea moderada');
  if(data.neu_dificultad === 'marcada') symptoms.push('Disnea marcada');
  if(data.neu_infiltrado === 'compatible') symptoms.push('Radiografia compatible con NAC');
  if(data.neu_infiltrado === 'pendiente') symptoms.push('Radiografia pendiente o no disponible');
  if(data.neu_comorb) symptoms.push('Comorbilidades relevantes');
  if(data.neu_intolerancia) symptoms.push('Deshidratacion o intolerancia a la via oral');

  if(data.neu_infiltrado === 'no_compatible'){
    return {
      severity: 'MODERADA',
      title: 'SOSPECHA DE NAC NO CONFIRMADA',
      riskText: 'Nivel de riesgo: REEVALUAR DIAGNOSTICO',
      criteria: symptoms.concat(['La radiografia no es compatible con neumonia adquirida en la comunidad.']),
      treatment: PNEUMONIA_TREATMENT.initialTests.concat(PNEUMONIA_TREATMENT.notConfirmed),
      oxygenAdvice: data.sat !== null && data.sat < PNEUMONIA_PROTOCOL.oxygenTarget ? `-> SatO2 ${data.sat}%: corregir hipoxemia mientras se redefine el diagnostico.` : '',
      icuAdvice: '',
      admissionList: ['La imagen no confirma NAC; completar estudio etiologico segun cuadro clinico.'],
      icuList: ['Ninguno identificado'],
      why: [
        '1. Diagnostico\n   La radiografia no confirma neumonia adquirida en la comunidad.',
        '\n2. Clinica\n   ' + (symptoms.length ? symptoms.join('\n   ') : 'Sin datos clinicos destacados.'),
        '\n3. Conducta\n   Reevaluar diagnostico diferencial y completar estudios.'
      ]
    };
  }

  const curb = calculateCurb65(data);
  const ats = calculateAtsIdsa(data);
  const pes = calculatePES(data);

  let disposition = 'AMBULATORIA';
  if(curb.disposition === 'OBSERVACION') disposition = 'OBSERVACION';
  if(curb.disposition === 'HOSPITALARIA') disposition = 'HOSPITALARIA';
  if(ats.needsIcu) disposition = 'UCI';

  let severity = 'LEVE';
  let title = 'NEUMONIA NO GRAVE';
  let riskText = 'Nivel de riesgo: BAJO - manejo ambulatorio';
  let treatment = PNEUMONIA_TREATMENT.initialTests.concat(PNEUMONIA_TREATMENT.ambulatory);
  let oxygenAdvice = '';
  let icuAdvice = '';
  const admissionList = [];
  let icuList = ['Ninguno identificado'];

  if(disposition === 'OBSERVACION'){
    severity = 'MODERADA';
    title = 'NEUMONIA CON RIESGO INTERMEDIO';
    riskText = 'Nivel de riesgo: INTERMEDIO - valorar internacion corta';
    treatment = PNEUMONIA_TREATMENT.initialTests.concat(PNEUMONIA_TREATMENT.observation, PNEUMONIA_TREATMENT.microbiology);
    admissionList.push('CURB-65 = 2.');
  }
  if(disposition === 'HOSPITALARIA'){
    severity = 'GRAVE';
    title = 'NEUMONIA GRAVE';
    riskText = 'Nivel de riesgo: ALTO - internacion hospitalaria';
    treatment = PNEUMONIA_TREATMENT.initialTests.concat(PNEUMONIA_TREATMENT.microbiology, PNEUMONIA_TREATMENT.hospital);
    admissionList.push('CURB-65 3-5.');
  }
  if(disposition === 'UCI'){
    severity = 'GRAVE';
    title = 'NEUMONIA GRAVE CON CRITERIOS DE UCI';
    riskText = 'Nivel de riesgo: MUY ALTO - ingreso en UCI';
    treatment = PNEUMONIA_TREATMENT.initialTests.concat(PNEUMONIA_TREATMENT.microbiology, PNEUMONIA_TREATMENT.icu, PNEUMONIA_TREATMENT.corticosteroids);
    icuAdvice = 'Cumple criterios ATS/IDSA de ingreso en UCI.';
    icuList = ats.major.concat(ats.minor);
    admissionList.push('Cumple criterios ATS/IDSA para cuidados criticos.');
  }
  if(data.sat !== null && data.sat < PNEUMONIA_PROTOCOL.oxygenTarget){
    oxygenAdvice = `-> SatO2 ${data.sat}%: administrar o considerar oxigeno para mantener SatO2 >= ${PNEUMONIA_PROTOCOL.oxygenTarget}%.`;
    admissionList.push(`Hipoxemia con SatO2 < ${PNEUMONIA_PROTOCOL.oxygenTarget}%.`);
  }
  if(data.neu_infiltrado === 'compatible') admissionList.push('Radiografia compatible con neumonia.');
  if(data.neu_comorb) admissionList.push('Comorbilidades relevantes.');
  if(data.neu_intolerancia) admissionList.push('No tolera via oral o riesgo de deshidratacion.');

  const resistantNotes = [];
  if(pes.highRisk){
    treatment = treatment.concat(PNEUMONIA_TREATMENT.multiresistant);
    resistantNotes.push(`PES = ${pes.score} (>= ${PNEUMONIA_PROTOCOL.pesThreshold})`);
    admissionList.push(`Riesgo de microorganismos multirresistentes por PES elevado (${pes.score}).`);
  }
  const pseudomonasRisk = data.neu_pseudo_abx90 || data.neu_pseudo_hosp_rec || data.neu_pseudo_corticoides || data.neu_pseudo_epoc || data.neu_pseudo_prev || data.neu_pseudo_bronq;
  if(pseudomonasRisk){
    treatment = treatment.concat(PNEUMONIA_TREATMENT.pseudomonas);
    resistantNotes.push('Factores de riesgo para Pseudomonas');
  }
  if(data.neu_absceso_empiema){
    treatment = treatment.concat(PNEUMONIA_TREATMENT.anaerobes);
    resistantNotes.push('Absceso pulmonar o empiema pleural');
  }

  const criteria = [];
  criteria.push(...symptoms);
  criteria.push(`CURB-65 = ${curb.score} (${curb.risk})`);
  if(curb.positive.length) criteria.push(...curb.positive);
  if(ats.needsIcu) criteria.push(`ATS/IDSA positivo: ${ats.majorCount} criterio(s) mayor(es) y ${ats.minorCount} menor(es)`);
  if(resistantNotes.length) criteria.push(...resistantNotes);

  const why = [];
  why.push('1. Diagnostico clinico\n   ' + (symptoms.length ? symptoms.join('\n   ') : 'Sin sintomas destacados.'));
  why.push(`\n2. CURB-65\n   Puntaje = ${curb.score} (${curb.risk}).` + (curb.positive.length ? '\n   ' + curb.positive.join('\n   ') : '') + (curb.missing.length ? `\n   Datos faltantes: ${curb.missing.join(', ')}.` : ''));
  why.push(`\n3. ATS/IDSA UCI\n   Criterios mayores: ${ats.majorCount}. Criterios menores: ${ats.minorCount}.` + (ats.major.length ? '\n   ' + ats.major.join('\n   ') : '') + (ats.minor.length ? '\n   ' + ats.minor.join('\n   ') : ''));
  why.push(`\n4. PES\n   Puntaje = ${pes.score}.` + (pes.factors.length ? '\n   ' + pes.factors.join('\n   ') : ' Sin factores registrados.'));
  why.push(`\n5. Clasificacion\n   ${title}`);

  return {
    severity,
    title,
    riskText,
    criteria: Array.from(new Set(criteria)),
    treatment: Array.from(new Set(treatment)),
    oxygenAdvice,
    icuAdvice,
    admissionList: Array.from(new Set(admissionList.length ? admissionList : ['No se identifican criterios mayores de internacion con los datos cargados.'])),
    icuList,
    why
  };
}

function renderPneumoniaResult(data){
  const result = evaluatePneumonia(data);
  const titleEl = $('classificationTitle');
  const criteriaList = $('criteriaList');
  criteriaList.innerHTML = '';

  window.__lastSeverity = null;
  titleEl.textContent = result.title;
  titleEl.className = 'classification severity-' + result.severity;
  $('riskLevel').textContent = result.riskText;
  $('reevalNotice').textContent = 'La reevaluacion dinamica permanece disponible solo para el algoritmo de asma.';

  result.criteria.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = '✓ ' + item;
    criteriaList.appendChild(li);
  });

  const treatmentContainer = $('treatmentContent');
  treatmentContainer.innerHTML = '';
  result.treatment.forEach((item) => {
    const line = document.createElement('div');
    line.textContent = '• ' + item;
    treatmentContainer.appendChild(line);
  });

  $('oxygenAdvice').textContent = result.oxygenAdvice;
  $('magnesiumAdvice').textContent = '';
  $('icuAdvice').textContent = result.icuAdvice;
  $('whyContent').textContent = result.why.join('\n');

  const admissionListEl = $('admissionList');
  admissionListEl.innerHTML = '';
  result.admissionList.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = '✓ ' + item;
    admissionListEl.appendChild(li);
  });

  const icuListEl = $('icuList');
  icuListEl.innerHTML = '';
  result.icuList.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item === 'Ninguno identificado' ? item : '✓ ' + item;
    icuListEl.appendChild(li);
  });
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
    // store last severity so dosis por kg puedan re-renderizarse al cambiar peso
    window.__lastSeverity = 'GRAVE';
    titleEl.textContent = 'CRISIS CON RIESGO VITAL';
    titleEl.className = 'classification severity-GRAVE';
    riskEl.textContent = 'Nivel de riesgo: ALTO — requiere manejo inmediato y valoración para cuidados críticos.';
    life.forEach(item => { const li = document.createElement('li'); li.textContent = '✓ ' + item; criteriaList.appendChild(li); });
    $('icuAdvice').textContent = 'Requiere valoración urgente por cuidados críticos. ';
    renderTreatment('GRAVE');
    $('magnesiumAdvice').textContent = `Sulfato de magnesio: ${PROTOCOL.magnesium.dose} — infusión ${PROTOCOL.magnesium.infusion} (considere según respuesta y protocolos).`;
    // Siempre mostrar criterios de admisión y UCI (incluir detecciones relevantes)
    const admission = evaluateAdmissionCriteria(data);
    const admissionListEl = $('admissionList'); admissionListEl.innerHTML = '';
    if(admission.length === 0){ const li = document.createElement('li'); li.textContent = 'Ninguno identificado'; admissionListEl.appendChild(li); }
    else admission.forEach(it => { const li=document.createElement('li'); li.textContent='✓ '+it; admissionListEl.appendChild(li); });

    const icuList = evaluateICUCritera(data);
    const icuListEl = $('icuList'); icuListEl.innerHTML = '';
    if(icuList.length === 0){ const li = document.createElement('li'); li.textContent = 'Ninguno identificado'; icuListEl.appendChild(li); }
    else icuList.forEach(it => { const li=document.createElement('li'); li.textContent='✓ '+it; icuListEl.appendChild(li); });

    // Construir y mostrar el detalle "¿Por qué obtuve este resultado?" también para riesgo vital
    const why = [];
    why.push('1. Riesgo vital\n   ' + (life.length ? life.join('\n   ') : 'No detectado.'));
    why.push('\n2. Función pulmonar\n   ' + (data.pefPercent !== null ? `${data.funcion_tipo} = ${data.pefPercent}%` : 'No disponible'));
    why.push('\n3. Saturación\n   ' + (data.sat !== null ? `SatO₂ = ${data.sat}%` : 'No disponible'));
    why.push('\n4. Frecuencia respiratoria\n   ' + (data.fr !== null ? `FR = ${data.fr} rpm` : 'No disponible'));
    why.push('\n5. Frecuencia cardíaca\n   ' + (data.fc !== null ? `FC = ${data.fc} lpm` : 'No disponible'));
    why.push('\n6. Clasificación\n   CRISIS CON RIESGO VITAL');

    $('whyContent').textContent = why.join('\n');

    return;
  }

  // Severity
  const severity = evaluateSeverity(data);
  // store last severity for dynamic dose examples update
  window.__lastSeverity = severity;
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
  if(admission.length === 0){ const li = document.createElement('li'); li.textContent = 'Ninguno identificado'; admissionListEl.appendChild(li); }
  else admission.forEach(it => { const li=document.createElement('li'); li.textContent='✓ '+it; admissionListEl.appendChild(li); });

  // icu criteria list
  const icuListEl = $('icuList'); icuListEl.innerHTML='';
  if(icuList.length === 0){ const li = document.createElement('li'); li.textContent = 'Ninguno identificado'; icuListEl.appendChild(li); }
  else icuList.forEach(it => { const li=document.createElement('li'); li.textContent='✓ '+it; icuListEl.appendChild(li); });

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
    sexo: $('sexo') ? $('sexo').value : '',
    talla: parseNumber($('talla').value),
    peso: parseNumber($('peso') ? $('peso').value : null),
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
    pad: parseNumber($('pad').value),
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
  if(getSelectedAlgorithm() === 'neumonia'){
    const pneumoniaData = gatherPneumoniaData();
    const pneumoniaMissing = validatePneumoniaInputs(pneumoniaData);
    if(pneumoniaMissing.length){
      $('classificationTitle').textContent = 'Faltan datos para completar la evaluación.';
      $('riskLevel').textContent = 'Nivel de riesgo: —';
      $('criteriaList').innerHTML = '';
      $('treatmentContent').textContent = '';
      $('whyContent').textContent = 'Faltan: ' + pneumoniaMissing.join(', ');
      return;
    }
    renderPneumoniaResult(pneumoniaData);
    return;
  }

  const data = gatherFormData();
  const missing = validateInputs(data);
  if(missing.length){
    $('classificationTitle').textContent = 'Faltan datos para completar la evaluación.';
    $('riskLevel').textContent = 'Nivel de riesgo: —';
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
  // Mostrar aviso fijo de reevaluación (1-3 horas)
  const reevalNoticeEl = $('reevalNotice');
  if(reevalNoticeEl) reevalNoticeEl.textContent = 'Reevaluación postratamiento: 1-3 horas.';
}

function showReevalSection(){
  if(getSelectedAlgorithm() !== 'asma'){
    showMessage('La reevaluación dinámica está disponible solo para asma.');
    return;
  }
  $('reevalSection').classList.remove('hidden');
  $('reevalSection').scrollIntoView({behavior:'smooth'});
}

function handleEvaluateReeval(){
  if(getSelectedAlgorithm() !== 'asma'){
    showMessage('La reevaluación dinámica está disponible solo para asma.');
    return;
  }
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

  const combined = Object.assign({}, window.__initial);
  combined.reeval = r;
  const good = (r.pefPercent !== null && r.pefPercent > 60) || (r.sat !== null && r.sat > PROTOCOL.oxygenTarget) || (r.disnea === 'leve' || r.disnea === '');
  const response = good ? 'BUENA RESPUESTA' : 'MALA RESPUESTA';

  $('r_c_fc').textContent = r.fc !== null ? r.fc : '—';
  $('r_c_fr').textContent = r.fr !== null ? r.fr : '—';
  $('r_c_sat').textContent = r.sat !== null ? r.sat + '%' : '—';
  $('r_c_pef').textContent = r.pefPercent !== null ? r.pefPercent + '%' : '—';
  $('r_c_disnea').textContent = r.disnea || '—';

  $('e_fc').textContent = (window.__initial.fc !== null && r.fc !== null) ? (r.fc - window.__initial.fc > 0 ? `↑ ${r.fc - window.__initial.fc}` : `↓ ${window.__initial.fc - r.fc}`) : '—';
  $('e_fr').textContent = (window.__initial.fr !== null && r.fr !== null) ? (r.fr - window.__initial.fr > 0 ? `↑ ${r.fr - window.__initial.fr}` : `↓ ${window.__initial.fr - r.fr}`) : '—';
  $('e_sat').textContent = (window.__initial.sat !== null && r.sat !== null) ? (r.sat - window.__initial.sat > 0 ? `↑ ${r.sat - window.__initial.sat}%` : `↓ ${window.__initial.sat - r.sat}%`) : '—';
  $('e_pef').textContent = (window.__initial.pefPercent !== null && r.pefPercent !== null) ? (Math.round((r.pefPercent - window.__initial.pefPercent) * 10) / 10 + ' puntos porcentuales') : '—';
  $('e_disnea').textContent = (window.__initial.disnea && r.disnea) ? (window.__initial.disnea === r.disnea ? 'Sin cambio' : `${window.__initial.disnea} → ${r.disnea}`) : '—';

  $('reevalResult').classList.remove('hidden');
  $('responseResult').textContent = response === 'BUENA RESPUESTA' ? 'BUENA RESPUESTA AL TRATAMIENTO' : 'MALA RESPUESTA AL TRATAMIENTO';
  $('responseResult').style.color = response === 'BUENA RESPUESTA' ? 'var(--success)' : 'var(--danger)';

  const admission = evaluateAdmissionCriteria(Object.assign({}, combined), true);
  const admissionListEl = $('admissionList');
  admissionListEl.innerHTML = '';
  if(admission.length === 0){ const li = document.createElement('li'); li.textContent = 'Ninguno identificado'; admissionListEl.appendChild(li); }
  else admission.forEach((it) => { const li = document.createElement('li'); li.textContent = '✓ ' + it; admissionListEl.appendChild(li); });

  const icu = evaluateICUCritera(combined);
  const icuListEl = $('icuList');
  icuListEl.innerHTML = '';
  if(icu.length === 0){ const li = document.createElement('li'); li.textContent = 'Ninguno identificado'; icuListEl.appendChild(li); }
  else icu.forEach((it) => { const li = document.createElement('li'); li.textContent = '✓ ' + it; icuListEl.appendChild(li); });

  window.__initial.reeval = { ...r, response };
}

function resetCalculator(){
  if(!confirm('Confirmar: ¿desea iniciar una nueva evaluación y borrar los datos actuales?')) return;
  document.getElementById('calcForm').reset();
  clearRenderedState();
  updateAlgorithmUI();
  updateDisneaAdvice('', 'disneaAdvice');
  updateDisneaAdvice('', 'r_disneaAdvice');
}

function init(){
  $('evaluarBtn').addEventListener('click', handleEvaluate);
  $('startReevalBtn').addEventListener('click', () => {
    const header = document.querySelector('#reevalSection h2');
    if(header) header.textContent = 'Evaluación dinámica — Reevaluación 1-3 horas';
    showReevalSection();
  });
  $('evaluateReevalBtn').addEventListener('click', handleEvaluateReeval);
  $('resetBtn').addEventListener('click', resetCalculator);
  $('printBtn').addEventListener('click', () => window.print());

  const disneaEl = $('disnea');
  if(disneaEl){ disneaEl.addEventListener('change', () => updateDisneaAdvice(disneaEl.value)); updateDisneaAdvice(disneaEl.value); }
  const rdisEl = $('r_disnea');
  if(rdisEl){ rdisEl.addEventListener('change', () => updateDisneaAdvice(rdisEl.value, 'r_disneaAdvice')); updateDisneaAdvice(rdisEl.value, 'r_disneaAdvice'); }

  const edadEl = $('edad');
  const algoritmoEl = $('algoritmo');
  const sexoEl = $('sexo');
  const tallaEl = $('talla');

  if(edadEl) edadEl.addEventListener('input', updateAgeSensitiveFields);
  if(algoritmoEl) algoritmoEl.addEventListener('change', updateAlgorithmUI);
  updateAlgorithmUI();

  if(sexoEl) sexoEl.addEventListener('change', updatePredictedField);
  if(tallaEl) tallaEl.addEventListener('input', updatePredictedField);

  const pesoElInput = $('peso');
  if(pesoElInput){ pesoElInput.addEventListener('input', () => { if(window.__lastSeverity) renderTreatment(window.__lastSeverity); }); }

  const updatePEF = () => {
    const med = parseNumber($('valor_medido').value);
    const pred = parseNumber($('valor_predicho').value);
    const tipo = $('funcion_tipo').value;
    const out = $('pefCalc');
    const pct = calculatePEFPercent(med, pred);
    if(pct === null){
      out.textContent = tipo + ': calculo PEF% no disponible (falta valor medido o predicho).';
    } else {
      out.textContent = `${tipo} %\n${med} / ${pred} × 100 = ${pct}%`;
    }
  };
  ['valor_medido','valor_predicho','funcion_tipo'].forEach((id) => { $(id).addEventListener('input', updatePEF); });

  function createRipple(el, evt){
    const rect = el.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const size = Math.max(rect.width, rect.height) * 1.2;
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (evt.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (evt.clientY - rect.top - size / 2) + 'px';
    el.appendChild(ripple);
    setTimeout(() => { try { ripple.remove(); } catch (e) {} }, 700);
  }

  function attachRipples(){
    document.querySelectorAll('button').forEach((btn) => {
      btn.classList.add('material-button');
      btn.addEventListener('pointerdown', function(e){
        createRipple(this, e);
      });
    });
  }

  attachRipples();
}

document.addEventListener('DOMContentLoaded', init);

/*
  CASOS DE PRUEBA (manuales)

  Caso 1 — Crisis leve
  - PEF predicho 482, medido 350 (PEF 72.6%)
  - SatO2 96
  - Disnea leve, habla en párrafos
  Resultado esperado: Crisis leve

  Caso 2 — Crisis moderada
  - PEF predicho 482, medido 280 (PEF 58.1%)
  - FR 24, SatO2 94
  Resultado esperado: Crisis moderada

  Caso 3 — Crisis grave
  - PEF predicho 482, medido 180 (PEF 37.3%)
  - FR 32, FC 126, SatO2 88
  Resultado esperado: Crisis grave

  Caso 4 — Riesgo vital
  - Alteración de conciencia = "disminuido"
  - Silencio auscultatorio
  - SatO2 88
  Resultado: CRISIS CON RIESGO VITAL (prevalece sobre PEF)

  Caso 5 — Buena respuesta
  - Inicial: PEF 38%, SatO2 89%, grave/moderado
  - Post: PEF 65%, SatO2 93%, mejoría clínica
  Resultado: BUENA RESPUESTA / considerar criterios de alta

  Caso 6 — Mala respuesta
  - Persistencia de síntomas + PEF post <60%
  Resultado: MALA RESPUESTA / considerar hospitalización
*/