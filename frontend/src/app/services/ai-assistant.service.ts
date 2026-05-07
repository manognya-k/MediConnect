import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { ConversationHistory } from '../models/chat.model';
import { AuthService } from './auth.service';

interface QA { keywords: string[]; answer: string; }

const DOCTOR_QA: QA[] = [
  {
    keywords: ['today', 'appointment', 'schedule', 'summarise', 'summarize'],
    answer:
      `<strong>Today's Appointment Summary</strong><br><br>` +
      `Here's a typical structured overview for your scheduled patients:<br><br>` +
      `📋 <strong>Morning Clinic (9:00 AM – 12:00 PM)</strong><br>` +
      `• 09:00 — Follow-up: Post-MI patient, review lipid panel &amp; echo results<br>` +
      `• 09:30 — New patient: Hypertension, initial assessment<br>` +
      `• 10:00 — Review: Type 2 Diabetes, HbA1c trending check<br>` +
      `• 10:30 — Follow-up: Atrial fibrillation, anticoagulation review<br><br>` +
      `📋 <strong>Afternoon Clinic (2:00 PM – 5:00 PM)</strong><br>` +
      `• 02:00 — Post-op review: CABG patient, wound &amp; medications<br>` +
      `• 02:30 — Urgent: Chest pain workup, troponin pending<br>` +
      `• 03:00 — Routine: Annual cardiac review<br><br>` +
      `⚠️ <em>Always verify the live schedule in your EMR. Apply clinical judgment for any urgent findings.</em>`,
  },
  {
    keywords: ['ldl', 'cholesterol', 'lipid', 'elevated', 'interpret'],
    answer:
      `<strong>Interpreting Elevated LDL Cholesterol</strong><br><br>` +
      `<strong>LDL Reference Ranges:</strong><br>` +
      `• &lt;100 mg/dL — Optimal<br>` +
      `• 100–129 mg/dL — Near optimal<br>` +
      `• 130–159 mg/dL — Borderline high<br>` +
      `• 160–189 mg/dL — High<br>` +
      `• ≥190 mg/dL — Very high<br><br>` +
      `<strong>Clinical Context:</strong><br>` +
      `• In patients with established ASCVD or diabetes, target LDL &lt;70 mg/dL<br>` +
      `• In high-risk primary prevention, target &lt;100 mg/dL<br>` +
      `• Consider secondary causes: hypothyroidism, nephrotic syndrome, obstructive liver disease<br><br>` +
      `<strong>Management Options:</strong><br>` +
      `• High-intensity statin (Atorvastatin 40–80 mg or Rosuvastatin 20–40 mg)<br>` +
      `• Add Ezetimibe if LDL target not achieved on max statin<br>` +
      `• PCSK9 inhibitors for very high-risk patients<br>` +
      `• Lifestyle: reduce saturated fat, increase soluble fibre, regular aerobic exercise<br><br>` +
      `⚠️ <em>Apply ACC/AHA 2019 guidelines. Always individualise therapy based on 10-year ASCVD risk score.</em>`,
  },
  {
    keywords: ['hypertension', 'stage 2', 'blood pressure', 'bp', 'treatment guideline'],
    answer:
      `<strong>Hypertension Stage 2 — Treatment Guidelines (ACC/AHA 2017)</strong><br><br>` +
      `<strong>Definition:</strong> Systolic ≥140 mmHg and/or Diastolic ≥90 mmHg<br><br>` +
      `<strong>First-Line Pharmacotherapy:</strong><br>` +
      `• Initiate with <strong>2-drug combination</strong> (preferred over sequential monotherapy)<br>` +
      `• Preferred: ACE inhibitor or ARB + Thiazide diuretic or CCB<br>` +
      `• Avoid ACE inhibitor + ARB combination<br><br>` +
      `<strong>Drug Choices by Comorbidity:</strong><br>` +
      `• CKD: ACE inhibitor or ARB (renoprotective)<br>` +
      `• Heart failure (HFrEF): ACE inhibitor/ARB, Beta-blocker, MRA<br>` +
      `• Diabetes: ACE inhibitor or ARB preferred<br>` +
      `• Post-MI: Beta-blocker + ACE inhibitor<br><br>` +
      `<strong>BP Targets:</strong><br>` +
      `• General population: &lt;130/80 mmHg<br>` +
      `• Age ≥65 with high CV risk: &lt;130 mmHg systolic<br><br>` +
      `<strong>Lifestyle Modifications (adjunct to therapy):</strong><br>` +
      `DASH diet · Weight reduction · Na &lt;2.3 g/day · Aerobic exercise 90–150 min/week · Limit alcohol<br><br>` +
      `⚠️ <em>Review every 4 weeks until target achieved. Always apply clinical judgment.</em>`,
  },
  {
    keywords: ['amlodipine', 'metformin', 'drug interaction', 'interaction'],
    answer:
      `<strong>Drug Interaction: Amlodipine + Metformin</strong><br><br>` +
      `<strong>Interaction Level: None clinically significant ✅</strong><br><br>` +
      `Amlodipine (CCB — antihypertensive/antianginal) and Metformin (biguanide — antidiabetic) are <strong>commonly co-prescribed</strong> and have no major pharmacokinetic or pharmacodynamic interactions.<br><br>` +
      `<strong>Key Points:</strong><br>` +
      `• No dose adjustment required for either drug<br>` +
      `• Amlodipine does not affect glycaemic control<br>` +
      `• Metformin does not affect BP or CCB action<br>` +
      `• Both are first-line agents for their respective indications<br><br>` +
      `<strong>Monitoring:</strong><br>` +
      `• Monitor BP and blood glucose as per standard practice<br>` +
      `• Amlodipine: watch for ankle oedema, flushing<br>` +
      `• Metformin: check eGFR regularly; withhold if eGFR &lt;30 mL/min/1.73m²<br><br>` +
      `⚠️ <em>Always cross-check with a current formulary (BNF / Micromedex) for the full patient drug list.</em>`,
  },
  {
    keywords: ['cardiology', 'referral', 'criteria', 'refer'],
    answer:
      `<strong>Cardiology Referral Criteria</strong><br><br>` +
      `<strong>Urgent / Same-Day Referral:</strong><br>` +
      `• Suspected ACS (chest pain + troponin rise or ECG changes)<br>` +
      `• New-onset heart failure with haemodynamic compromise<br>` +
      `• High-degree AV block or sustained ventricular arrhythmia<br>` +
      `• Acute aortic dissection (chest/back pain + BP differential)<br>` +
      `• Cardiac tamponade (Beck's triad)<br><br>` +
      `<strong>Routine / Outpatient Referral:</strong><br>` +
      `• Newly detected AF or flutter for rate/rhythm management review<br>` +
      `• Moderate–severe valvular disease on echo<br>` +
      `• Stable angina not responding to medical therapy<br>` +
      `• High 10-year ASCVD risk (&gt;20%) for risk stratification<br>` +
      `• Unexplained syncope requiring EP evaluation<br>` +
      `• Heart failure for optimisation of GDMT<br>` +
      `• Pre-operative cardiac assessment for major non-cardiac surgery<br><br>` +
      `⚠️ <em>Urgent chest pain with haemodynamic instability — call emergency services immediately. Apply clinical judgment for all referral decisions.</em>`,
  },
  {
    keywords: ['icd', 'icd-10', 'code', 'diabetes', 'ckd', 'chronic kidney'],
    answer:
      `<strong>ICD-10 Coding — Type 2 Diabetes with CKD</strong><br><br>` +
      `<strong>Primary Code: E11.65</strong><br>` +
      `Type 2 diabetes mellitus with hyperglycaemia (use when CKD stage is unspecified or documented alongside)<br><br>` +
      `<strong>Combination Code Sequence:</strong><br>` +
      `Use <strong>E11.65</strong> + the appropriate CKD stage code:<br>` +
      `• N18.1 — CKD Stage 1<br>` +
      `• N18.2 — CKD Stage 2 (mild)<br>` +
      `• N18.3 — CKD Stage 3 (moderate)<br>` +
      `• N18.4 — CKD Stage 4 (severe)<br>` +
      `• N18.5 — CKD Stage 5<br>` +
      `• N18.6 — End-stage renal disease (ESRD)<br><br>` +
      `<strong>Diabetic Nephropathy (if documented):</strong><br>` +
      `• E11.65 → E11.21 (Type 2 DM with diabetic nephropathy)<br>` +
      `• Sequence diabetes code first, then N18.x<br><br>` +
      `<strong>Additional codes to consider:</strong><br>` +
      `• Z79.4 — Long-term use of insulin<br>` +
      `• Z79.84 — Long-term use of oral hypoglycaemic drugs<br><br>` +
      `⚠️ <em>Always verify coding with your institution's clinical coding team and the current ICD-10-CM tabular list.</em>`,
  },
  {
    keywords: ['post-surgery', 'post surgery', 'follow-up', 'follow up', 'postoperative', 'protocol'],
    answer:
      `<strong>Post-Surgery Follow-Up Protocol (General)</strong><br><br>` +
      `<strong>Immediate Post-Op (24–72 hrs):</strong><br>` +
      `• Vital signs monitoring every 4–6 hrs<br>` +
      `• Wound inspection for signs of infection, dehiscence, or haematoma<br>` +
      `• Pain management review and analgesia optimisation<br>` +
      `• DVT prophylaxis: LMWH + compression stockings<br>` +
      `• Early mobilisation as tolerated<br><br>` +
      `<strong>Week 1–2:</strong><br>` +
      `• Suture or staple removal (day 7–14 depending on site)<br>` +
      `• Wound care and infection surveillance<br>` +
      `• Review FBC, CRP, renal function<br>` +
      `• Resume pre-operative medications as appropriate<br><br>` +
      `<strong>Week 4–6:</strong><br>` +
      `• Outpatient surgical review — confirm healing<br>` +
      `• Assess functional recovery and return-to-work status<br>` +
      `• For cardiac surgery: echo at 4–6 weeks, cardiac rehab referral<br><br>` +
      `<strong>3 Months:</strong><br>` +
      `• Specialist outpatient review based on procedure type<br>` +
      `• Imaging or functional tests as indicated<br><br>` +
      `⚠️ <em>Protocols vary by procedure and patient comorbidities. Apply departmental guidelines and clinical judgment.</em>`,
  },
  {
    keywords: ['troponin', 'troponin i', 'elevation', 'differential', 'diagnosis'],
    answer:
      `<strong>Troponin I Elevation — Differential Diagnosis</strong><br><br>` +
      `<strong>Cardiac Causes (Primary):</strong><br>` +
      `• <strong>ACS</strong> (NSTEMI / STEMI) — most common; assess with ECG + serial troponins<br>` +
      `• Myocarditis — viral or autoimmune; fever, chest pain, recent URTI<br>` +
      `• Acute heart failure (demand ischaemia)<br>` +
      `• Cardiac contusion — post-trauma<br>` +
      `• Arrhythmia-induced (sustained SVT / VT)<br>` +
      `• Post-cardioversion or ablation<br><br>` +
      `<strong>Non-Cardiac Causes:</strong><br>` +
      `• <strong>Pulmonary embolism</strong> — RV strain; check D-dimer, CTPA<br>` +
      `• Severe sepsis / septic shock<br>` +
      `• Acute stroke (especially subarachnoid haemorrhage)<br>` +
      `• Renal failure (impaired clearance — Type 2 MI)<br>` +
      `• Rhabdomyolysis<br>` +
      `• Strenuous exercise (mild transient rise)<br><br>` +
      `<strong>Diagnostic Approach:</strong><br>` +
      `1. Serial hs-Troponin at 0 &amp; 3 hrs (ESC 0/3h algorithm)<br>` +
      `2. 12-lead ECG immediately<br>` +
      `3. Clinical history: onset, character, duration, radiation<br>` +
      `4. Echo for wall motion abnormality if ACS suspected<br><br>` +
      `⚠️ <em>A rise &gt;20% in serial troponin is highly suggestive of acute myocardial injury. Always apply clinical context.</em>`,
  },
  {
    keywords: ['hba1c', 'normal range', 'glycated', 'haemoglobin', 'a1c'],
    answer:
      `<strong>HbA1c — Normal Ranges &amp; Clinical Interpretation</strong><br><br>` +
      `<strong>Reference Ranges (IFCC / WHO):</strong><br>` +
      `• &lt;5.7% (39 mmol/mol) — <strong>Normal</strong><br>` +
      `• 5.7–6.4% (39–46 mmol/mol) — <strong>Prediabetes</strong> (impaired glucose regulation)<br>` +
      `• ≥6.5% (48 mmol/mol) — <strong>Diagnostic of Type 2 Diabetes</strong> (confirmed on 2 separate occasions)<br><br>` +
      `<strong>Treatment Targets:</strong><br>` +
      `• General T2DM target: <strong>&lt;7.0%</strong> (53 mmol/mol) — ADA/NICE<br>` +
      `• Less stringent (elderly, comorbidities): &lt;8.0%<br>` +
      `• Tighter target (young, short duration, no CVD): &lt;6.5%<br><br>` +
      `<strong>Limitations:</strong><br>` +
      `• Falsely low: haemolytic anaemia, haemoglobinopathies (HbS, HbC), recent blood transfusion<br>` +
      `• Falsely high: iron-deficiency anaemia, B12 deficiency, renal failure<br><br>` +
      `⚠️ <em>HbA1c reflects average glucose over approximately 8–12 weeks. Use fasting plasma glucose or OGTT if haemoglobinopathy is suspected.</em>`,
  },
  {
    keywords: ['statin', 'statin therapy', 'starting statin', 'guideline'],
    answer:
      `<strong>Guidelines for Starting Statin Therapy (ACC/AHA 2019)</strong><br><br>` +
      `<strong>Four Statin Benefit Groups — Treat Without Calculating Score:</strong><br>` +
      `1. Clinical ASCVD (post-MI, stroke, PAD) → High-intensity statin<br>` +
      `2. LDL ≥190 mg/dL (familial hypercholesterolaemia) → High-intensity statin<br>` +
      `3. Diabetes aged 40–75 → Moderate-intensity statin (high if ≥7.5% 10yr risk)<br>` +
      `4. Primary prevention aged 40–75 with LDL 70–189 mg/dL → Calculate 10-yr ASCVD risk<br><br>` +
      `<strong>10-Year ASCVD Risk Thresholds:</strong><br>` +
      `• &lt;5% — Lifestyle modifications only<br>` +
      `• 5–7.5% — Discuss statin; consider if risk enhancers present<br>` +
      `• 7.5–20% — Moderate-intensity statin<br>` +
      `• ≥20% — High-intensity statin<br><br>` +
      `<strong>Statin Intensity:</strong><br>` +
      `• High: Atorvastatin 40–80 mg | Rosuvastatin 20–40 mg<br>` +
      `• Moderate: Atorvastatin 10–20 mg | Rosuvastatin 5–10 mg | Simvastatin 20–40 mg<br><br>` +
      `⚠️ <em>Check baseline LFTs and CK before starting. Monitor for myopathy. Apply shared decision-making.</em>`,
  },
  {
    keywords: ['icu', 'intensive care', 'refer icu', 'critical care', 'when to refer'],
    answer:
      `<strong>ICU Referral Criteria</strong><br><br>` +
      `<strong>Haemodynamic Instability:</strong><br>` +
      `• Persistent hypotension (SBP &lt;90 mmHg) despite fluid resuscitation<br>` +
      `• Vasopressor or inotrope requirement<br>` +
      `• MAP &lt;65 mmHg not responding to initial management<br><br>` +
      `<strong>Respiratory Failure:</strong><br>` +
      `• SpO₂ &lt;90% on high-flow O₂ or &gt;40% FiO₂<br>` +
      `• Respiratory rate &gt;30 or &lt;8 breaths/min<br>` +
      `• PaO₂/FiO₂ &lt;300 (ARDS criteria)<br>` +
      `• Impending airway compromise<br><br>` +
      `<strong>Neurological Deterioration:</strong><br>` +
      `• GCS ≤8 or acute drop of ≥2 points<br>` +
      `• Status epilepticus<br>` +
      `• Raised ICP requiring monitoring<br><br>` +
      `<strong>Other Indications:</strong><br>` +
      `• Septic shock (Sepsis-3 criteria)<br>` +
      `• Post-cardiac arrest (targeted temperature management)<br>` +
      `• DKA with severe acidosis (pH &lt;7.0) or altered consciousness<br>` +
      `• Major trauma or burns &gt;20% TBSA<br><br>` +
      `⚠️ <em>Use NEWS2 or SOFA scoring for objective deterioration tracking. Consult ICU early — don't wait for full criteria.</em>`,
  },
  {
    keywords: ['bp target', 'blood pressure target', 'diabetic patient', 'diabetes bp'],
    answer:
      `<strong>Recommended BP Targets for Diabetic Patients</strong><br><br>` +
      `<strong>ADA / ACC / AHA 2023 Targets:</strong><br>` +
      `• <strong>General target: &lt;130/80 mmHg</strong><br>` +
      `• For patients with high CV risk (10-yr risk ≥15%): &lt;130/80 mmHg<br>` +
      `• Elderly (≥65 yrs): &lt;140/90 mmHg acceptable if &lt;130/80 causes adverse effects<br><br>` +
      `<strong>Preferred Antihypertensives in Diabetes:</strong><br>` +
      `• <strong>First-line: ACE inhibitor or ARB</strong> (renoprotective, especially with microalbuminuria)<br>` +
      `• Add CCB (Amlodipine) or Thiazide diuretic if needed<br>` +
      `• Avoid ACEi + ARB combination (increased AKI &amp; hyperkalaemia risk)<br><br>` +
      `<strong>Monitoring:</strong><br>` +
      `• Check eGFR and electrolytes 1–2 weeks after starting/changing RAS blocker<br>` +
      `• Home BP monitoring recommended — average ≥12 readings over 4 days<br>` +
      `• Annual urine ACR to detect onset/progression of nephropathy<br><br>` +
      `⚠️ <em>Individualise targets. Tighter control in younger patients; relaxed targets in frail elderly. Always apply clinical judgment.</em>`,
  },
  {
    keywords: ['bnp', 'b-type natriuretic', 'natriuretic', 'brain natriuretic', 'interpret bnp'],
    answer:
      `<strong>BNP / NT-proBNP — Interpretation Guide</strong><br><br>` +
      `<strong>BNP Cut-offs:</strong><br>` +
      `• &lt;100 pg/mL — Heart failure <strong>unlikely</strong><br>` +
      `• 100–400 pg/mL — <strong>Indeterminate</strong> — consider other diagnoses<br>` +
      `• &gt;400 pg/mL — Heart failure <strong>likely</strong><br><br>` +
      `<strong>NT-proBNP Cut-offs (age-stratified):</strong><br>` +
      `• &lt;50 yrs: &lt;450 pg/mL = unlikely HF<br>` +
      `• 50–75 yrs: &lt;900 pg/mL = unlikely HF<br>` +
      `• &gt;75 yrs: &lt;1800 pg/mL = unlikely HF<br>` +
      `• Any age ≥2000 pg/mL — High probability of acute HF<br><br>` +
      `<strong>Factors That Elevate BNP (Non-HF):</strong><br>` +
      `• Renal failure (impaired clearance)<br>` +
      `• AF, PE, COPD (cor pulmonale)<br>` +
      `• Age &gt;75, sepsis<br><br>` +
      `<strong>Factors That Lower BNP:</strong><br>` +
      `• Obesity (adipose tissue clears BNP)<br>` +
      `• Flash pulmonary oedema (early presentation)<br><br>` +
      `⚠️ <em>Always interpret BNP in clinical context with chest X-ray and echo findings. Serial measurements more useful than single values.</em>`,
  },
  {
    keywords: ['lisinopril', 'side effect', 'ace inhibitor'],
    answer:
      `<strong>Common Side Effects of Lisinopril (ACE Inhibitor)</strong><br><br>` +
      `<strong>Very Common (&gt;10%):</strong><br>` +
      `• <strong>Dry persistent cough</strong> — due to bradykinin accumulation; affects 10–15% of patients. Switch to ARB (e.g. Losartan) if intolerable.<br><br>` +
      `<strong>Common (1–10%):</strong><br>` +
      `• Hypotension — especially first-dose; advise patient to take at bedtime initially<br>` +
      `• Dizziness / light-headedness<br>` +
      `• Hyperkalaemia — monitor electrolytes, especially with K⁺-sparing diuretics or CKD<br>` +
      `• Elevated creatinine (↑ up to 30% acceptable — renal haemodynamic effect)<br>` +
      `• Headache, fatigue<br><br>` +
      `<strong>Serious (Rare but Important):</strong><br>` +
      `• <strong>Angioedema</strong> — tongue, lips, airway (0.1–0.7%). STOP immediately; anaphylaxis management. Absolute contraindication to re-challenge or any ACEi.<br>` +
      `• Acute kidney injury — especially with bilateral renal artery stenosis or dehydration<br><br>` +
      `<strong>Contraindications:</strong><br>` +
      `• Pregnancy (teratogenic — Category D) · Prior ACEi angioedema · Hyperkalaemia ≥5.5 mmol/L<br><br>` +
      `⚠️ <em>Check renal function and electrolytes 1–2 weeks after initiation and after each dose increase.</em>`,
  },
  {
    keywords: ['lbbb', 'left bundle', 'bundle branch', 'ecg', 'interpretation'],
    answer:
      `<strong>ECG Interpretation: Left Bundle Branch Block (LBBB)</strong><br><br>` +
      `<strong>Diagnostic Criteria:</strong><br>` +
      `• QRS duration ≥120 ms (broad, slurred complex)<br>` +
      `• Broad notched or slurred R wave in leads I, aVL, V5, V6<br>` +
      `• Absent septal Q waves in I, aVL, V5, V6<br>` +
      `• RS or QS pattern in V1, V2 (deep S wave)<br>` +
      `• ST &amp; T wave changes discordant to QRS (ST depression where R dominant; ST elevation where S dominant)<br><br>` +
      `<strong>Clinical Significance:</strong><br>` +
      `• <strong>New LBBB with chest pain = STEMI equivalent</strong> — activate cath lab (Sgarbossa criteria)<br>` +
      `• Chronic LBBB: associated with cardiomyopathy, hypertensive heart disease, AS<br>` +
      `• Makes standard ischaemia interpretation unreliable<br><br>` +
      `<strong>Sgarbossa Criteria (for ischaemia in LBBB):</strong><br>` +
      `• ST elevation ≥1 mm concordant with QRS (+5 pts)<br>` +
      `• ST depression ≥1 mm in V1–V3 (+3 pts)<br>` +
      `• ST elevation ≥5 mm discordant with QRS (+2 pts)<br>` +
      `• Score ≥3 = 90% specificity for MI<br><br>` +
      `⚠️ <em>New or presumed new LBBB with ACS symptoms warrants urgent senior cardiologist review and consideration of primary PCI.</em>`,
  },
  {
    keywords: ['metformin', 'ckd', 'renal', 'dosing', 'egfr'],
    answer:
      `<strong>Metformin Dosing in CKD</strong><br><br>` +
      `<strong>eGFR-Based Dosing (NICE / FDA Guidance):</strong><br>` +
      `• eGFR ≥60 mL/min/1.73m² — <strong>Full dose</strong>: up to 2000–2550 mg/day<br>` +
      `• eGFR 45–59 — <strong>Caution</strong>: continue with review every 3–6 months; maximum 1000 mg/day<br>` +
      `• eGFR 30–44 — <strong>Reduce dose</strong>: maximum 500 mg twice daily; increased lactic acidosis risk<br>` +
      `• eGFR &lt;30 — <strong>CONTRAINDICATED</strong>: discontinue<br><br>` +
      `<strong>Situations Requiring Temporary Withdrawal:</strong><br>` +
      `• IV contrast administration — withhold for 48 hrs post-procedure<br>` +
      `• Acute illness causing dehydration (vomiting, diarrhoea, fever)<br>` +
      `• Peri-operative period (especially major surgery)<br><br>` +
      `<strong>Lactic Acidosis Risk Factors:</strong><br>` +
      `• CKD · Hepatic impairment · Excessive alcohol · Hypoxia<br><br>` +
      `⚠️ <em>Check eGFR at least annually (more frequently in CKD stages 3b+). Adjust dose at each review. Patient should be educated about sick-day rules.</em>`,
  },
];

function findDoctorAnswer(text: string): string {
  const lower = text.toLowerCase();
  for (const qa of DOCTOR_QA) {
    if (qa.keywords.some(kw => lower.includes(kw))) {
      return qa.answer;
    }
  }
  return (
    `Thank you for your query. Based on current clinical guidelines, here is a general overview:<br><br>` +
    `For specific clinical decisions, I recommend consulting:<br>` +
    `• <strong>NICE Guidelines</strong> (nice.org.uk) for UK-based practice<br>` +
    `• <strong>ACC/AHA Guidelines</strong> for cardiology and internal medicine<br>` +
    `• <strong>UpToDate</strong> or <strong>BNF</strong> for medication queries<br>` +
    `• Your hospital's clinical pharmacist for complex drug interactions<br><br>` +
    `If you have a more specific clinical question — such as a lab value to interpret, a drug name, or a condition — please rephrase and I will do my best to assist.<br><br>` +
    `⚠️ <em>Always apply your own clinical judgment. This AI provides informational support only.</em>`
  );
}

@Injectable({ providedIn: 'root' })
export class AiAssistantService {
  constructor(private auth: AuthService) {}

  sendMessage(messages: ConversationHistory[]): Observable<string> {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    const text = lastUserMsg?.content ?? '';
    const answer = findDoctorAnswer(text);
    return of(answer).pipe(delay(900));
  }
}
