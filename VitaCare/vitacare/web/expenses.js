import {createVitaCareClient} from './client.js';
const {call: api} = createVitaCareClient({onUnauthorized: () => location.replace('./')});
const $root = document.getElementById('root');
const $toast = document.getElementById('toast');
const LOC = { en: 'en-GB', fr: 'fr-FR', ar: 'ar-u-nu-latn' };
const CATS = ['consult', 'tests', 'imaging', 'medication', 'other'];

const T = {
  en: {
    tagline: 'Your care journey, in one place', demo: 'Demo',
    navJourney: 'My journey', navCosts: 'My costs', navLabel: 'Main menu',
    language: 'Language', textSize: 'Text size', size1: 'Normal', size2: 'Large', size3: 'Extra large',
    hello: 'Hello, Mohamed', caseLabel: 'Your current journey', caseName: 'Tiredness and dizziness',
    stepsDone: 'Steps done: {n} of {m}', nextStep: 'Your next step',
    when: 'When', where: 'Where', why: 'Why', bring: 'Bring with you', expectedCost: 'Expected cost', noDate: 'No date yet', about: 'about',
    allDone: 'All steps are done', allDoneText: 'Check your costs and send your CNAM claims.',
    seeCosts: 'See my costs', toBook: 'Mark as booked', toDone: 'Mark as done',
    st_done: 'Done', st_booked: 'Booked', st_todo: 'To do', upNext: 'Next', allSteps: 'All steps',
    peekTitle: 'Money so far',
    costsTitle: 'My costs', youSpent: 'You have spent', stillToCome: 'Still to come (estimate)', refundWaiting: 'Refund waiting (estimate)', refundGot: 'Already refunded',
    wholeJourney: 'Whole journey: about {x}', legendPaid: 'Paid', legendExp: 'Expected',
    rateTitle: 'Refund rate used in estimates', rateNote: 'Your own guess. Adjust it to match your CNAM file.', less: 'Decrease', more: 'Increase',
    byType: 'Where the money goes',
    cat_consult: 'Doctor visits', cat_tests: 'Lab tests', cat_imaging: 'X-ray and scans', cat_medication: 'Medication', cat_other: 'Transport and other',
    listPaid: 'Paid so far', listUpcoming: 'Coming up', none: 'Nothing here yet.',
    addExpense: 'Add an expense', quick: 'Common choices', q_pharmacy: 'Pharmacy', q_taxi: 'Taxi', q_parking: 'Parking',
    formWhat: 'What did you pay for?', formAmount: 'Amount', formType: 'Type', save: 'Save', cancel: 'Cancel',
    formErr: 'Write what you paid for and an amount above zero.',
    amountPaid: 'Amount paid', amountExp: 'Expected amount', update: 'Update',
    cnam: 'CNAM', claim: 'CNAM refund', cl_none: 'Not sent', cl_sent: 'File sent', cl_refunded: 'Refunded',
    remove: 'Remove', notDone: 'Mark as not done', addedByYou: 'Added by you',
    tipTitle: 'Save money', tipText: 'Bring your blood test and X-ray results to the cardiologist. Repeating them could cost about {x}.',
    tDone: 'Marked as done. {x} added to your costs.', tBooked: 'Marked as booked.', tAdded: 'Expense added.', tRemoved: 'Expense removed.',
    tUpdated: 'Amount updated.', tClaim: 'Refund status updated.', tReverted: 'Step moved back.', tReset: 'Demo reset.', undo: 'Undo',
    footerNote: 'Example data and prices for this demo. This page does not give medical advice.', reset: 'Reset the demo', currency: 'TND',
    items: {
      gp: { t: 'Visit the family doctor', p: 'Family doctor’s office' },
      blood: { t: 'Blood test', p: 'Medical lab' },
      xray: { t: 'Chest X-ray', p: 'Radiology center' },
      cardio: { t: 'See the cardiologist', p: 'Cardiology clinic', why: 'To look at your heart, using your blood test and X-ray.', bring: 'ID card, CNAM card, your blood test and X-ray results' },
      echo: { t: 'Heart ultrasound (echocardiogram)', p: 'Radiology center', why: 'Your cardiologist may ask for it to see how your heart works.', bring: 'ID card, CNAM card, the cardiologist’s prescription' },
      meds: { t: 'Pick up your medication', p: 'Pharmacy', why: 'The treatment prescribed after your cardiology visit.', bring: 'Prescription, CNAM card' }
    }
  },
  fr: {
    tagline: 'Votre parcours de soins, au même endroit', demo: 'Démo',
    navJourney: 'Mon parcours', navCosts: 'Mes dépenses', navLabel: 'Menu principal',
    language: 'Langue', textSize: 'Taille du texte', size1: 'Normal', size2: 'Grand', size3: 'Très grand',
    hello: 'Bonjour Mohamed', caseLabel: 'Votre parcours actuel', caseName: 'Fatigue et vertiges',
    stepsDone: 'Étapes terminées : {n} sur {m}', nextStep: 'Votre prochaine étape',
    when: 'Quand', where: 'Où', why: 'Pourquoi', bring: 'À apporter', expectedCost: 'Coût prévu', noDate: 'Pas encore de date', about: 'environ',
    allDone: 'Toutes les étapes sont terminées', allDoneText: 'Vérifiez vos dépenses et déposez vos dossiers de remboursement CNAM.',
    seeCosts: 'Voir mes dépenses', toBook: 'Marquer comme réservé', toDone: 'Marquer comme fait',
    st_done: 'Fait', st_booked: 'Réservé', st_todo: 'À faire', upNext: 'Prochaine', allSteps: 'Toutes les étapes',
    peekTitle: 'L’argent jusqu’ici',
    costsTitle: 'Mes dépenses', youSpent: 'Vous avez dépensé', stillToCome: 'À venir (estimation)', refundWaiting: 'Remboursement attendu (estimation)', refundGot: 'Déjà remboursé',
    wholeJourney: 'Parcours complet : environ {x}', legendPaid: 'Payé', legendExp: 'Prévu',
    rateTitle: 'Taux de remboursement utilisé', rateNote: 'Votre propre estimation. Ajustez-la selon votre dossier CNAM.', less: 'Diminuer', more: 'Augmenter',
    byType: 'Où va l’argent',
    cat_consult: 'Consultations', cat_tests: 'Analyses', cat_imaging: 'Radio et imagerie', cat_medication: 'Médicaments', cat_other: 'Transport et autres',
    listPaid: 'Déjà payé', listUpcoming: 'À venir', none: 'Rien pour le moment.',
    addExpense: 'Ajouter une dépense', quick: 'Choix courants', q_pharmacy: 'Pharmacie', q_taxi: 'Taxi', q_parking: 'Parking',
    formWhat: 'Pour quoi avez-vous payé ?', formAmount: 'Montant', formType: 'Type', save: 'Enregistrer', cancel: 'Annuler',
    formErr: 'Indiquez la raison du paiement et un montant supérieur à zéro.',
    amountPaid: 'Montant payé', amountExp: 'Montant prévu', update: 'Mettre à jour',
    cnam: 'CNAM', claim: 'Remboursement CNAM', cl_none: 'Non déposé', cl_sent: 'Dossier déposé', cl_refunded: 'Remboursé',
    remove: 'Supprimer', notDone: 'Marquer comme non fait', addedByYou: 'Ajouté par vous',
    tipTitle: 'Économisez', tipText: 'Apportez vos analyses et votre radio au cardiologue. Les refaire pourrait coûter environ {x}.',
    tDone: 'Étape terminée. {x} ajouté à vos dépenses.', tBooked: 'Rendez-vous noté.', tAdded: 'Dépense ajoutée.', tRemoved: 'Dépense supprimée.',
    tUpdated: 'Montant mis à jour.', tClaim: 'Statut du remboursement mis à jour.', tReverted: 'Étape remise à faire.', tReset: 'Démo réinitialisée.', undo: 'Annuler',
    footerNote: 'Données et prix d’exemple pour cette démonstration. Cette page ne donne pas de conseil médical.', reset: 'Réinitialiser la démo', currency: 'DT',
    items: {
      gp: { t: 'Consultation chez le médecin de famille', p: 'Cabinet du médecin de famille' },
      blood: { t: 'Analyses de sang', p: 'Laboratoire d’analyses' },
      xray: { t: 'Radio des poumons', p: 'Centre de radiologie' },
      cardio: { t: 'Consultation chez le cardiologue', p: 'Cabinet de cardiologie', why: 'Pour examiner votre cœur à partir de vos analyses et de votre radio.', bring: 'Carte d’identité, carte CNAM, vos analyses et votre radio' },
      echo: { t: 'Échographie du cœur', p: 'Centre de radiologie', why: 'Le cardiologue peut la demander pour voir comment fonctionne votre cœur.', bring: 'Carte d’identité, carte CNAM, ordonnance du cardiologue' },
      meds: { t: 'Récupérer vos médicaments', p: 'Pharmacie', why: 'Le traitement prescrit après votre visite chez le cardiologue.', bring: 'Ordonnance, carte CNAM' }
    }
  },
  ar: {
    tagline: 'مسار علاجك في مكان واحد', demo: 'نسخة تجريبية',
    navJourney: 'مساري', navCosts: 'مصاريفي', navLabel: 'القائمة الرئيسية',
    language: 'اللغة', textSize: 'حجم الخط', size1: 'عادي', size2: 'كبير', size3: 'كبير جدا',
    hello: 'مرحبا محمد', caseLabel: 'مسارك الحالي', caseName: 'التعب والدوخة',
    stepsDone: 'المراحل المنجزة: {n} من {m}', nextStep: 'خطوتك القادمة',
    when: 'الموعد', where: 'المكان', why: 'السبب', bring: 'ما يجب إحضاره', expectedCost: 'التكلفة المتوقعة', noDate: 'لا يوجد موعد بعد', about: 'حوالي',
    allDone: 'أنجزت كل المراحل', allDoneText: 'راجع مصاريفك وأرسل ملفات التعويض إلى الكنام.',
    seeCosts: 'عرض مصاريفي', toBook: 'سجّل الحجز', toDone: 'سجّل الإنجاز',
    st_done: 'تم', st_booked: 'تم الحجز', st_todo: 'لم يتم بعد', upNext: 'التالية', allSteps: 'كل المراحل',
    peekTitle: 'المال الذي صرفته إلى الآن',
    costsTitle: 'مصاريفي', youSpent: 'لقد صرفت', stillToCome: 'مصاريف قادمة (تقدير)', refundWaiting: 'تعويض منتظر (تقدير)', refundGot: 'تم تعويضه',
    wholeJourney: 'كامل المسار: حوالي {x}', legendPaid: 'مدفوع', legendExp: 'متوقع',
    rateTitle: 'نسبة التعويض المعتمدة في التقدير', rateNote: 'هذا تخمينك الخاص. عدّلها حسب ملفك لدى الكنام.', less: 'إنقاص', more: 'زيادة',
    byType: 'أين يذهب المال',
    cat_consult: 'زيارات الأطباء', cat_tests: 'التحاليل', cat_imaging: 'الأشعة والتصوير', cat_medication: 'الأدوية', cat_other: 'النقل ومصاريف أخرى',
    listPaid: 'ما تم دفعه', listUpcoming: 'المصاريف القادمة', none: 'لا شيء هنا بعد.',
    addExpense: 'إضافة مصروف', quick: 'اختيارات شائعة', q_pharmacy: 'صيدلية', q_taxi: 'تاكسي', q_parking: 'موقف سيارات',
    formWhat: 'ما الذي دفعت من أجله؟', formAmount: 'المبلغ', formType: 'النوع', save: 'حفظ', cancel: 'إلغاء',
    formErr: 'اكتب سبب الدفع ومبلغا أكبر من الصفر.',
    amountPaid: 'المبلغ المدفوع', amountExp: 'المبلغ المتوقع', update: 'تحديث',
    cnam: 'الكنام', claim: 'تعويض الكنام', cl_none: 'لم يُرسل', cl_sent: 'تم إرسال الملف', cl_refunded: 'تم التعويض',
    remove: 'حذف', notDone: 'تراجع عن الإنجاز', addedByYou: 'أضفته أنت',
    tipTitle: 'وفّر مصاريفك', tipText: 'أحضر نتائج التحاليل والأشعة إلى طبيب القلب. إعادتها قد تكلّفك حوالي {x}.',
    tDone: 'تم تسجيل الإنجاز. أضفنا {x} إلى مصاريفك.', tBooked: 'تم تسجيل الحجز.', tAdded: 'تمت إضافة المصروف.', tRemoved: 'تم حذف المصروف.',
    tUpdated: 'تم تحديث المبلغ.', tClaim: 'تم تحديث حالة التعويض.', tReverted: 'تم التراجع عن الإنجاز.', tReset: 'تمت إعادة ضبط العرض.', undo: 'تراجع',
    footerNote: 'بيانات وأسعار تجريبية للعرض فقط. هذه الصفحة لا تقدّم نصيحة طبية.', reset: 'إعادة ضبط العرض', currency: 'د.ت',
    items: {
      gp: { t: 'زيارة الطبيب العام', p: 'عيادة الطبيب العام' },
      blood: { t: 'تحاليل الدم', p: 'مخبر التحاليل' },
      xray: { t: 'أشعة الصدر', p: 'مركز الأشعة' },
      cardio: { t: 'زيارة طبيب القلب', p: 'عيادة طب القلب', why: 'لفحص القلب اعتمادا على نتائج التحاليل والأشعة.', bring: 'بطاقة التعريف، بطاقة الكنام، نتائج التحاليل والأشعة' },
      echo: { t: 'إيكو القلب (فحص بالموجات فوق الصوتية)', p: 'مركز الأشعة', why: 'قد يطلبه طبيب القلب ليرى كيف يعمل قلبك.', bring: 'بطاقة التعريف، بطاقة الكنام، وصفة طبيب القلب' },
      meds: { t: 'اقتناء الأدوية', p: 'صيدلية', why: 'العلاج الموصوف بعد زيارة طبيب القلب.', bring: 'الوصفة الطبية، بطاقة الكنام' }
    }
  }
};

/* ---------- helpers ---------- */
const pad = n => String(n).padStart(2, '0');
function iso(offset) { const d = new Date(); d.setDate(d.getDate() + offset); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
const todayISO = () => iso(0);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function t(k, v) {
  let s = T[S.lang][k]; if (s == null) s = T.en[k];
  if (v) for (const x in v) s = s.split('{' + x + '}').join(v[x]);
  return s;
}
function num(n) {
  const r = Math.round(n * 1000) / 1000;
  let s = Number.isInteger(r) ? String(r) : r.toFixed(3);
  if (S.lang !== 'en') s = s.replace('.', ',');
  return s;
}
function money(n) { return '<bdi class="money"><span class="n">' + num(n) + '</span><span class="u">' + esc(t('currency')) + '</span></bdi>'; }
function parseAmt(v) {
  const s = String(v == null ? '' : v)
    .replace(/[٠-٩]/g, d => d.charCodeAt(0) - 0x660)
    .replace(/[۰-۹]/g, d => d.charCodeAt(0) - 0x6F0)
    .replace(/٫/g, '.').replace(/[\s ]/g, '').replace(',', '.');
  const n = parseFloat(s);
  return isFinite(n) ? Math.round(n * 1000) / 1000 : NaN;
}
function fmtDate(d, long) {
  if (!d) return '';
  try {
    const p = d.split('-').map(Number);
    return new Intl.DateTimeFormat(LOC[S.lang], long ? { weekday: 'long', day: 'numeric', month: 'long' } : { day: 'numeric', month: 'long' }).format(new Date(p[0], p[1] - 1, p[2]));
  } catch (e) { return d; }
}
const sv = p => '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + p + '</svg>';
const ICON = {
  check: sv('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  cal: sv('<rect x="4" y="5.5" width="16" height="14.5" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>'),
  circle: sv('<circle cx="12" cy="12" r="7.5" stroke-dasharray="2.5 3"/>'),
  chev: sv('<path d="M7 10l5 5 5-5"/>'),
  plus: sv('<path d="M12 5v14M5 12h14"/>'),
  minus: sv('<path d="M5 12h14"/>'),
  trash: sv('<path d="M5 7h14M10 7V4.5h4V7M7 7l1 12.5h8L17 7"/>'),
  arrow: sv('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  list: sv('<path d="M9.5 6.5H20M9.5 12H20M9.5 17.5H20M4 6.5l1.2 1.2L7.5 5.2M4 12l1.2 1.2L7.5 10.7M4 17.5l1.2 1.2 2.3-2.5"/>'),
  coin: sv('<circle cx="12" cy="12" r="8.5"/><path d="M14.6 9.3c-.6-.7-1.5-1-2.6-1-1.5 0-2.5.8-2.5 1.9 0 2.6 5.2 1.2 5.2 3.9 0 1.1-1 1.9-2.6 1.9-1.1 0-2-.4-2.7-1.1M12 6.3v2M12 15.8v2"/>'),
  brand: '<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false"><rect width="40" height="40" rx="11" fill="currentColor"/><path d="M11 28c6 0 4-8 9-8s3-8 9-8" fill="none" stroke="var(--accent-ink)" stroke-width="3" stroke-linecap="round"/><circle cx="11" cy="28" r="3" fill="var(--accent-ink)"/><circle cx="29" cy="12" r="3" fill="var(--accent-ink)"/></svg>'
};

/* ---------- data ---------- */
function newForm() { return { open: false, title: '', amount: '', cat: 'other', err: false }; }
let version=0, busy=false;
const S={lang:'fr',size:1,rate:70,items:[],view:'costs',open:null,editVal:null,form:newForm(),snap:null,focusId:null};
async function save(){
  busy=true; $root.inert=true;
  try{
    const result=await api('diary-save',{version,data:{lang:S.lang,size:S.size,rate:S.rate,items:S.items.filter(i=>i.custom)}});
    version=result.version;
  }catch(error){alert(error.message);location.reload()}
  finally{busy=false;$root.inert=false}
}
const crossLogo='<img alt="" src="./ui/brand.png">';
const isDone = i => i.status === 'done';
const byId = id => S.items.find(i => i.id === id);
const itemTitle = i => i.k ? T[S.lang].items[i.k].t : i.title;
const itemPlace = i => i.assigned ? ({fr:'Médecin',en:'Doctor',ar:'الطبيب'})[S.lang] : i.k ? T[S.lang].items[i.k].p : t('addedByYou');

function totals() {
  const rate = S.rate / 100;
  const done = S.items.filter(isDone), rest = S.items.filter(i => !isDone(i));
  const sum = (a, f) => a.reduce((s, i) => s + f(i), 0);
  const refundable = done.filter(i => i.reimb);
  const byCat = {}; CATS.forEach(c => byCat[c] = { paid: 0, exp: 0 });
  S.items.forEach(i => { const c = byCat[i.cat] || byCat.other; if (isDone(i)) c.paid += i.paid || 0; else c.exp += i.est || 0; });
  return {
    spent: sum(done, i => i.paid || 0), upcoming: sum(rest, i => i.est || 0),
    waiting: sum(refundable.filter(i => i.claim !== 'refunded'), i => i.paid || 0) * rate,
    got: sum(refundable.filter(i => i.claim === 'refunded'), i => i.paid || 0) * rate,
    byCat, tests: sum(done.filter(i => i.step && (i.cat === 'tests' || i.cat === 'imaging')), i => i.paid || 0)
  };
}

/* ---------- views ---------- */
function viewHeader() {
  const L = [['ar', 'العربية'], ['fr', 'Français'], ['en', 'English']];
  return '<header class="top"><div class="brand">' + crossLogo.replace('<img','<img width="43" height="43"') + '<div><b>VitaCare<span hidden>' + t('demo') + '</span></b><span class="tag">' + t('tagline') + '</span></div></div>' +
    '<div class="controls">' +
    '<div class="ctl"><span class="ctl-l" id="l-lang">' + t('language') + '</span><div class="pills" role="group" aria-labelledby="l-lang">' +
    L.map(x => '<button class="chipbtn" id="lang-' + x[0] + '" lang="' + x[0] + '" data-act="lang" data-v="' + x[0] + '" aria-pressed="' + (S.lang === x[0]) + '">' + x[1] + '</button>').join('') + '</div></div>' +
    '<div class="ctl"><span class="ctl-l" id="l-size">' + t('textSize') + '</span><div class="pills" role="group" aria-labelledby="l-size">' +
    [1, 2, 3].map(n => '<button class="chipbtn sz' + n + '" id="size-' + n + '" data-act="size" data-v="' + n + '" aria-pressed="' + (S.size === n) + '" aria-label="' + t('size' + n) + '" title="' + t('size' + n) + '">A</button>').join('') + '</div></div>' +
    '</div></header>';
}
function viewNav() {
  const it = [['journey', 'navJourney', ICON.list], ['costs', 'navCosts', ICON.coin]];
  return '<nav class="nav" aria-label="' + t('navLabel') + '"><ul>' + it.map(x =>
    '<li><a id="nav-' + x[0] + '" href="#' + x[0] + '"' + (S.view === x[0] ? ' aria-current="page"' : '') + '>' + x[2] + '<span>' + t(x[1]) + '</span></a></li>').join('') + '</ul></nav>';
}
function viewFooter() {
  return '<footer class="foot"><p>' + t('footerNote') + '</p><button class="linkbtn" id="reset-btn" data-act="reset">' + t('reset') + '</button></footer>';
}
const CHIPIC = { done: ICON.check, booked: ICON.cal, todo: ICON.circle };

function stepRow(i, isNext) {
  const st = i.status;
  const when = i.date ? fmtDate(i.date, false) + (i.time && st !== 'done' ? ', <bdi>' + i.time + '</bdi>' : '') : '';
  const meta = [esc(itemPlace(i))]; if(i.instructions)meta.push(esc(i.instructions)); if (when) meta.push(when);
  const amt = st === 'done' ? money(i.paid || 0) : t('about') + ' ' + money(i.est || 0);
  const btn = (!isNext && st !== 'done') ? '<button class="btn" id="adv-' + i.id + '" data-act="advance" data-id="' + i.id + '">' + (st === 'todo' && !i.assigned ? t('toBook') : t('toDone')) + '</button>' : '';
  return '<li class="step st-' + st + '"><span class="ico" aria-hidden="true">' + CHIPIC[st] + '</span><div class="sbody">' +
    '<div class="srow"><h3>' + esc(itemTitle(i)) + '</h3>' + (isNext ? '<span class="chip next">' + t('upNext') + '</span>' : '') + '</div>' +
    '<p class="meta">' + meta.join(' · ') + '</p>' +
    '<p class="meta line"><span class="chip c-' + st + '">' + CHIPIC[st] + t('st_' + st) + '</span><span class="samt">' + amt + '</span></p>' + btn + '</div></li>';
}

function viewJourney() {
  const steps = S.items.filter(i => i.step), doneN = steps.filter(isDone).length;
  const next = steps.find(i => !isDone(i)), X = totals();
  const intro='<div class="intro"><h1>'+esc(person.name)+'</h1><p class="lead">'+t('navJourney')+'</p></div>';
  if(!steps.length)return intro+'<p class="empty">'+({fr:'Aucune tâche attribuée.',en:'No assigned tasks.',ar:'لا توجد مهام.'})[S.lang]+'</p>';
  const prog = '<div class="prog"><p class="prog-l">' + t('stepsDone', { n: doneN, m: steps.length }) + '</p><div class="segs" aria-hidden="true">' +
    steps.map(s => '<span class="' + (isDone(s) ? 'on' : '') + '"></span>').join('') + '</div></div>';
  let nextCard;
  if (next) {
    const d = T[S.lang].items[next.k] || {};
    const facts = [
      [t('when'), next.date ? fmtDate(next.date, true) + (next.time ? ', <bdi>' + next.time + '</bdi>' : '') : t('noDate')],
      d.p ? [t('where'), esc(d.p)] : null,
      next.instructions ? [({fr:'Consignes',en:'Instructions',ar:'تعليمات'})[S.lang], esc(next.instructions)] : null,
      d.why ? [t('why'), esc(d.why)] : null,
      d.bring ? [t('bring'), esc(d.bring)] : null,
      [t('expectedCost'), t('about') + ' ' + money(next.est || 0)]
    ].filter(Boolean);
    nextCard = '<section class="card next" aria-labelledby="next-h"><p class="eyebrow">' + t('nextStep') + '</p><h2 id="next-h">' + esc(itemTitle(next)) + '</h2>' +
      '<dl class="facts">' + facts.map(f => '<div><dt>' + f[0] + '</dt><dd>' + f[1] + '</dd></div>').join('') + '</dl>' +
      '<button class="btn primary big" id="adv-main" data-act="advance" data-id="' + next.id + '">' + ICON.check + (next.status === 'todo' && !next.assigned ? t('toBook') : t('toDone')) + '</button></section>';
  } else {
    nextCard = '<section class="card next" aria-labelledby="next-h"><h2 id="next-h">' + t('allDone') + '</h2><p class="note" style="margin:.5rem 0 1rem">' + t('allDoneText') + '</p>' +
      '<a class="btn primary big" href="#costs">' + t('seeCosts') + '</a></section>';
  }
  const peek = '<a class="card peek" href="#costs" id="peek-link"><p class="eyebrow">' + t('peekTitle') + '</p><dl class="rows">' +
    '<div><dt>' + t('youSpent') + '</dt><dd>' + money(X.spent) + '</dd></div>' +
    '<div><dt>' + t('stillToCome') + '</dt><dd>' + money(X.upcoming) + '</dd></div></dl>' +
    '<span class="more">' + t('seeCosts') + ICON.arrow + '</span></a>';
  const list = '<section class="col" aria-labelledby="steps-h"><h2 id="steps-h">' + t('allSteps') + '</h2><ol class="steps">' +
    steps.map(s => stepRow(s, next && s.id === next.id)).join('') + '</ol></section>';
  return intro + '<div class="grid two"><div class="col">' + prog + nextCard + peek + '</div>' + list + '</div>';
}

function expRow(i) {
  const done = isDone(i), open = S.open === i.id;
  const sub = [esc(itemPlace(i))]; if (i.date) sub.push(fmtDate(i.date, false));
  let chip = '';
  if (done && i.reimb) chip = '<span class="chip cl-' + i.claim + '">' + t('cnam') + ' · ' + t('cl_' + i.claim) + '</span>';
  else if (!done) chip = '<span class="chip c-' + i.status + '">' + t('st_' + i.status) + '</span>';
  const amount = done ? money(i.paid || 0) : t('about') + ' ' + money(i.est || 0);
  let panel = '';
  if (open) {
    const val = S.editVal != null ? S.editVal : num(done ? (i.paid || 0) : (i.est || 0));
    const claimBtns = ['none', 'sent', 'refunded'].map(c =>
      '<button type="button" class="chipbtn" id="claim-' + i.id + '-' + c + '" data-act="claim" data-id="' + i.id + '" data-v="' + c + '" aria-pressed="' + (i.claim === c) + '">' + t('cl_' + c) + '</button>').join('');
    const claimBlock = (done && i.reimb) ? '<div class="field"><span class="lbl" id="cl-l-' + i.id + '">' + t('claim') + '</span><div class="wrapx" role="group" aria-labelledby="cl-l-' + i.id + '">' + claimBtns + '</div></div>' : '';
    let extra = '';
    if (i.custom) extra = '<button type="button" class="btn danger" id="rm-' + i.id + '" data-act="remove" data-id="' + i.id + '">' + ICON.trash + t('remove') + '</button>';
    else if (done) extra = '<button type="button" class="btn" id="nd-' + i.id + '" data-act="notdone" data-id="' + i.id + '">' + t('notDone') + '</button>';
    panel = '<div class="panel" id="panel-' + i.id + '">' +
      '<form class="field" data-form="edit" data-id="' + i.id + '"><label for="edit-amt-' + i.id + '">' + (done ? t('amountPaid') : t('amountExp')) + '</label>' +
      '<div class="amt"><input id="edit-amt-' + i.id + '" type="text" inputmode="decimal" autocomplete="off" value="' + esc(val) + '"><span class="unit">' + esc(t('currency')) + '</span>' +
      '<button class="btn" type="submit" id="upd-' + i.id + '">' + t('update') + '</button></div></form>' + claimBlock + (extra ? '<div class="btnrow">' + extra + '</div>' : '') + '</div>';
  }
  return '<li class="exp' + (open ? ' open' : '') + '"><button class="exp-head" id="exp-' + i.id + '" data-act="toggle" data-id="' + i.id + '" aria-expanded="' + open + '" aria-controls="panel-' + i.id + '">' +
    '<span class="exp-main"><span class="exp-t">' + esc(itemTitle(i)) + '</span><span class="exp-s">' + sub.join(' · ') + '</span>' + chip + '</span>' +
    '<span class="exp-amt">' + amount + '</span><span class="chev" aria-hidden="true">' + ICON.chev + '</span></button>' + panel + '</li>';
}

function addForm() {
  const f = S.form;
  if (!f.open) return '<button class="btn primary big" id="add-open" data-act="addopen">' + ICON.plus + t('addExpense') + '</button>';
  const quick = [['pharmacy', 'medication'], ['taxi', 'other'], ['parking', 'other']].map(x =>
    '<button type="button" class="chipbtn dashed" id="q-' + x[0] + '" data-act="quick" data-k="' + x[0] + '" data-c="' + x[1] + '">' + t('q_' + x[0]) + '</button>').join('');
  const cats = CATS.map(c => '<button type="button" class="chipbtn" id="fc-' + c + '" data-act="fcat" data-v="' + c + '" aria-pressed="' + (f.cat === c) + '">' + t('cat_' + c) + '</button>').join('');
  return '<form class="card addf" data-form="add" id="add-form" novalidate><h2>' + t('addExpense') + '</h2>' +
    '<div class="field"><span class="lbl">' + t('quick') + '</span><div class="wrapx">' + quick + '</div></div>' +
    '<div class="field"><label for="f-title">' + t('formWhat') + '</label><input id="f-title" maxlength="500" type="text" dir="auto" autocomplete="off" value="' + esc(f.title) + '"></div>' +
    '<div class="field"><label for="f-amount">' + t('formAmount') + ' (' + esc(t('currency')) + ')</label><input id="f-amount" class="short" type="text" inputmode="decimal" autocomplete="off" value="' + esc(f.amount) + '"></div>' +
    '<div class="field"><span class="lbl">' + t('formType') + '</span><div class="wrapx">' + cats + '</div></div>' +
    (f.err ? '<p class="err" role="alert">' + t('formErr') + '</p>' : '') +
    '<div class="btnrow"><button class="btn primary" type="submit" id="f-save">' + t('save') + '</button><button class="btn" type="button" id="f-cancel" data-act="addclose">' + t('cancel') + '</button></div></form>';
}

function viewCosts() {
  const X = totals(), total = X.spent + X.upcoming;
  const pp = total ? X.spent / total * 100 : 0, pe = total ? 100 - pp : 0;
  const hero = '<section class="hero" aria-labelledby="spent-l"><p class="hero-l" id="spent-l">' + t('youSpent') + '</p><p class="hero-n">' + money(X.spent) + '</p>' +
    '<div class="bar" role="img" aria-label="' + esc(t('legendPaid')) + ': ' + num(X.spent) + ', ' + esc(t('legendExp')) + ': ' + num(X.upcoming) + '">' +
    (pp > 0 ? '<span class="seg-paid" style="width:' + pp + '%"></span>' : '') + (pe > 0 ? '<span class="seg-exp" style="width:' + pe + '%"></span>' : '') + '</div>' +
    '<p class="legend"><span><i class="sw paid"></i>' + t('legendPaid') + '</span><span><i class="sw exp"></i>' + t('legendExp') + '</span></p>' +
    '<p class="whole">' + t('wholeJourney', { x: money(total) }) + '</p>' +
    '<dl class="rows"><div><dt>' + t('stillToCome') + '</dt><dd>' + money(X.upcoming) + '</dd></div>' +
    '<div><dt>' + t('refundWaiting') + '</dt><dd>' + money(X.waiting) + '</dd></div>' +
    '<div><dt>' + t('refundGot') + '</dt><dd>' + money(X.got) + '</dd></div></dl></section>';
  const rate = '<section class="card" aria-labelledby="rate-h"><h2 id="rate-h" style="font-size:1.05rem">' + t('rateTitle') + '</h2>' +
    '<div class="stepper"><button class="btn icon" id="rate-less" data-act="rate" data-d="-5" aria-label="' + t('less') + '">' + ICON.minus + '</button>' +
    '<output class="rate-v" for="rate-less rate-more">' + S.rate + '%</output>' +
    '<button class="btn icon" id="rate-more" data-act="rate" data-d="5" aria-label="' + t('more') + '">' + ICON.plus + '</button></div>' +
    '<p class="note">' + t('rateNote') + '</p></section>';
  const showTip = X.tests > 0 && S.items.some(i => i.k === 'cardio' && !isDone(i));
  const tip = showTip ? '<section class="card tip"><h2>' + t('tipTitle') + '</h2><p style="margin-top:.4rem">' + t('tipText', { x: money(X.tests) }) + '</p></section>' : '';
  const max = Math.max(1, ...CATS.map(c => X.byCat[c].paid + X.byCat[c].exp));
  const cats = CATS.filter(c => X.byCat[c].paid + X.byCat[c].exp > 0).map(c => {
    const p = X.byCat[c].paid, e = X.byCat[c].exp;
    const parts = []; if (p > 0) parts.push(t('legendPaid') + ': ' + money(p)); if (e > 0) parts.push(t('legendExp') + ': ' + money(e));
    return '<li class="cat"><div class="catrow"><span>' + t('cat_' + c) + '</span><span>' + money(p + e) + '</span></div>' +
      '<div class="bar" aria-hidden="true">' + (p > 0 ? '<span class="seg-paid" style="width:' + (p / max * 100) + '%"></span>' : '') + (e > 0 ? '<span class="seg-exp" style="width:' + (e / max * 100) + '%"></span>' : '') + '</div>' +
      '<p class="catsub">' + parts.join(' · ') + '</p></li>';
  }).join('');
  const byType = '<section class="card" aria-labelledby="bt-h"><h2 id="bt-h">' + t('byType') + '</h2><ul class="cats">' + cats + '</ul></section>';
  const paidList = S.items.filter(i=>i.custom && isDone(i)).sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.id - a.id);
  const comingList = [];
  const block = (h, id, arr) => '<section aria-labelledby="' + id + '"><h2 class="listh" id="' + id + '">' + h + '</h2>' +
    (arr.length ? '<ul class="exps">' + arr.map(expRow).join('') + '</ul>' : '<p class="empty">' + t('none') + '</p>') + '</section>';
  return '<h1>' + t('costsTitle') + '</h1><div class="grid two"><div class="col sticky">' + hero + rate + tip + '</div>' +
    '<div class="col">' + addForm() + byType + block(t('listPaid'), 'paid-h', paidList) + block(t('listUpcoming'), 'up-h', comingList) + '</div></div>';
}

function render(){
  const de = document.documentElement;
  de.lang = S.lang; de.dir = S.lang === 'ar' ? 'rtl' : 'ltr'; de.setAttribute('data-size', String(S.size));
  const a = document.activeElement;
  const keep = S.focusId || (a && a.id);
  const ss = a && a.selectionStart, se = a && a.selectionEnd;
  $root.innerHTML='<a class="linkbtn" href="./">← VitaCare</a>'+viewHeader()+viewNav()+'<main>'+(S.view==='costs'?viewCosts():viewJourney())+'</main>';
  if (keep) {
    const el = document.getElementById(keep);
    if (el && el.focus) {
      el.focus({ preventScroll: true });
      if (!S.focusId && ss != null && el.setSelectionRange) { try { el.setSelectionRange(ss, se); } catch (x) { } }
    }
  }
  S.focusId = null;
}

/* ---------- actions ---------- */
let toastTimer;
function showToast(msg, undo) {
  $toast.innerHTML = '<span>' + msg + '</span>' + (undo ? '<button class="btn" id="toast-undo" data-act="undo">' + t('undo') + '</button>' : '');
  $toast.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(hideToast, 8000);
}
function hideToast() { $toast.hidden = true; $toast.innerHTML = ''; }
function mutate(fn, msg, undo) {
  S.snap = JSON.stringify(S.items); fn(); save(); render();
  showToast(typeof msg === 'function' ? msg() : msg, undo !== false);
}
function advance(id) {
  const i=byId(id); if(!i)return;
  if(i.assigned){api('complete',{task:-i.id}).then(()=>{i.status='done';render()}).catch(e=>alert(e.message));return}
  let msg='';
  mutate(() => {
    if (i.status === 'todo' && !i.assigned) { i.before = { status: 'todo', date: i.date, time: i.time || null }; i.status = 'booked'; msg = t('tBooked'); }
    else if (i.status === 'booked' || i.assigned) {
      i.before = { status: i.status, date: i.date, time: i.time || null };
      i.status = 'done'; i.paid = i.est || 0; if (!i.date || i.date > todayISO()) i.date = todayISO(); i.time = null;
      msg = t('tDone', { x: money(i.paid) });
    }
  }, () => msg);
}
document.addEventListener('click', e => { if(busy)return;
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act, id = Number(b.dataset.id), v = b.dataset.v;
  if (a === 'lang') { S.lang = v; save(); render(); }
  else if (a === 'size') { S.size = Number(v); save(); render(); }
  else if (a === 'advance') advance(id);
  else if (a === 'toggle') { S.open = S.open === id ? null : id; S.editVal = null; render(); }
  else if (a === 'claim') mutate(() => { byId(id).claim = v; }, t('tClaim'));
  else if (a === 'notdone') mutate(() => {
    const i = byId(id), bf = i.before || { status: 'todo', date: null, time: null };
    i.status = bf.status; i.date = bf.date; i.time = bf.time; i.paid = null; i.claim = 'none';
  }, t('tReverted'));
  else if (a === 'remove') mutate(() => { S.items = S.items.filter(x => x.id !== id); S.open = null; }, t('tRemoved'));
  else if (a === 'rate') { S.rate = Math.max(0, Math.min(100, S.rate + Number(b.dataset.d))); save(); render(); }
  else if (a === 'addopen') { S.form.open = true; S.focusId = 'f-title'; render(); }
  else if (a === 'addclose') { S.form = newForm(); render(); }
  else if (a === 'quick') { S.form.title = t('q_' + b.dataset.k); S.form.cat = b.dataset.c; S.form.err = false; S.focusId = 'f-amount'; render(); }
  else if (a === 'fcat') { S.form.cat = v; render(); }
  else if (a === 'undo') { if (S.snap) { S.items = JSON.parse(S.snap); S.snap = null; save(); render(); } hideToast(); }
});
document.addEventListener('input', e => {
  const el = e.target; if (!el || !el.id) return;
  if (el.id === 'f-title') S.form.title = el.value;
  else if (el.id === 'f-amount') S.form.amount = el.value;
  else if (el.id.indexOf('edit-amt-') === 0) S.editVal = el.value;
});
document.addEventListener('submit', e => {
  const f = e.target.closest && e.target.closest('form[data-form]'); if (!f) return;
  e.preventDefault();
  if (f.dataset.form === 'add') {
    const title = S.form.title.trim(), amt = parseAmt(S.form.amount);
    if (!title || !(amt > 0)) { S.form.err = true; S.focusId = !title ? 'f-title' : 'f-amount'; render(); return; }
    mutate(() => {
      S.items.push({ id: Date.now(), title, cat: S.form.cat, step: false, status: 'done', est: amt, paid: amt, date: todayISO(), claim: 'none', reimb: S.form.cat !== 'other', custom: true });
      S.form = newForm();
    }, t('tAdded'));
  } else if (f.dataset.form === 'edit') {
    const id = Number(f.dataset.id), inp = document.getElementById('edit-amt-' + id);
    const val = parseAmt(S.editVal != null ? S.editVal : (inp ? inp.value : ''));
    if (!(val >= 0)) return;
    mutate(() => { const it = byId(id); if (isDone(it)) it.paid = val; else it.est = val; S.editVal = null; }, t('tUpdated'));
  }
});


let person;
function route(){S.view=location.hash==='#journey'?'journey':'costs';render()}
async function start(){
 const state=await api('state');person=state.me;
 if(person.role!=='patient'){location.replace('./');return}
 const diary=await api('diary-read');version=diary.version;
 if(diary.data){Object.assign(S,diary.data)}
 S.items.push(...state.tasks.map(i=>({id:-i.id,title:i.title,instructions:i.instructions,date:i.due,assigned:true,step:true,status:i.done?'done':'todo',est:0,paid:0,reimb:false,claim:'none',cat:'other'})));
 route();window.addEventListener('hashchange',route);
}
start().catch(e=>{$root.textContent=e.message});
window.addEventListener('pageshow',e=>{if(e.persisted)location.reload()});
