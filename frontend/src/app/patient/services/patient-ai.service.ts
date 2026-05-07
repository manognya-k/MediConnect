import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { AiMode, ConversationTurn, PatientAiContext } from '../models/patient-ai.model';
import { PatientStateService } from './patient-state.service';

interface QA { keywords: string[]; answer: string; }

// ── Patient Q&A bank ─────────────────────────────────────────────────────────

const PATIENT_QA: QA[] = [
  // ── Lipid / Cholesterol ───────────────────────────────────────────────────
  {
    keywords: ['lipid panel', 'lipid result', 'lipid report', 'explain my lipid'],
    answer:
      `<strong>Your Lipid Panel — Explained Simply</strong><br><br>` +
      `A lipid panel measures four key fats in your blood:<br><br>` +
      `🔴 <strong>LDL ("Bad" Cholesterol)</strong> — Carries cholesterol to arteries. High levels can clog arteries and increase your risk of heart attack or stroke. Target: below 100 mg/dL.<br><br>` +
      `🟢 <strong>HDL ("Good" Cholesterol)</strong> — Removes cholesterol from arteries back to the liver. Higher is better. Target: above 60 mg/dL.<br><br>` +
      `🟡 <strong>Triglycerides</strong> — A type of fat stored from calories. High levels raise heart disease risk. Target: below 150 mg/dL.<br><br>` +
      `⚪ <strong>Total Cholesterol</strong> — Overall measure. Target: below 200 mg/dL.<br><br>` +
      `<strong>What your result of LDL 185 mg/dL means:</strong><br>` +
      `Your LDL is in the "High" range (160–189 mg/dL). This means there is more cholesterol in your blood than recommended. Your doctor may discuss lifestyle changes or medication.<br><br>` +
      `⚠️ <em>Please discuss these results with your doctor before making any changes to your diet or medications.</em>`,
  },
  {
    keywords: ['elevated ldl', 'high ldl', 'ldl mean', 'what is ldl', 'ldl 185'],
    answer:
      `<strong>What Does Elevated LDL Mean?</strong><br><br>` +
      `LDL stands for <strong>Low-Density Lipoprotein</strong> — often called "bad" cholesterol.<br><br>` +
      `When LDL is too high, cholesterol builds up in the walls of your arteries. Over time, this can narrow the arteries (a process called atherosclerosis) and increase your risk of:<br>` +
      `• Heart attack<br>` +
      `• Stroke<br>` +
      `• Peripheral artery disease<br><br>` +
      `<strong>LDL Levels at a Glance:</strong><br>` +
      `• Below 100 — Optimal ✅<br>` +
      `• 100–129 — Near optimal<br>` +
      `• 130–159 — Borderline high<br>` +
      `• 160–189 — High ⚠️<br>` +
      `• 190+ — Very high ❌<br><br>` +
      `<strong>What you can do:</strong><br>` +
      `• Reduce saturated fats (butter, red meat, fried food)<br>` +
      `• Eat more fibre (oats, beans, fruits, vegetables)<br>` +
      `• Exercise at least 30 minutes most days<br>` +
      `• Avoid smoking<br>` +
      `• Your doctor may recommend a cholesterol-lowering medication (statin)<br><br>` +
      `⚠️ <em>Always follow your doctor's advice before changing your diet or stopping any medications.</em>`,
  },
  {
    keywords: ['lower blood pressure', 'reduce blood pressure', 'bp naturally', 'high blood pressure naturally'],
    answer:
      `<strong>How to Lower Blood Pressure Naturally</strong><br><br>` +
      `Lifestyle changes can make a meaningful difference in your blood pressure. Here's what the evidence supports:<br><br>` +
      `🥗 <strong>Diet (DASH Diet)</strong><br>` +
      `• Reduce salt to less than 5–6 g per day (about 1 teaspoon)<br>` +
      `• Eat plenty of fruits, vegetables, and whole grains<br>` +
      `• Reduce red meat and full-fat dairy<br>` +
      `• Increase potassium-rich foods: bananas, spinach, potatoes<br><br>` +
      `🏃 <strong>Exercise</strong><br>` +
      `• Aim for at least 30 minutes of moderate activity 5 days a week<br>` +
      `• Walking, swimming, or cycling are great choices<br>` +
      `• Avoid very intense exercise without checking with your doctor first<br><br>` +
      `⚖️ <strong>Weight</strong><br>` +
      `• Losing even 5–10% of body weight can noticeably reduce BP<br><br>` +
      `🚫 <strong>Avoid</strong><br>` +
      `• Smoking — damages blood vessels directly<br>` +
      `• Excessive alcohol — limit to 1–2 units per day<br>` +
      `• Stress — try relaxation techniques, adequate sleep<br><br>` +
      `⚠️ <em>These steps work best alongside your prescribed medications — do not stop any medication without speaking to your doctor first.</em>`,
  },
  {
    keywords: ['amlodipine', 'side effect', 'calcium channel'],
    answer:
      `<strong>Amlodipine — Your Prescription Explained</strong><br><br>` +
      `<strong>What it is:</strong> Amlodipine is a calcium channel blocker. It relaxes and widens your blood vessels, making it easier for your heart to pump blood. It treats high blood pressure and chest pain (angina).<br><br>` +
      `<strong>Common Side Effects:</strong><br>` +
      `• <strong>Ankle or leg swelling</strong> (fluid build-up) — most common, affects 1 in 10 people<br>` +
      `• Headache — usually mild and settles after a few weeks<br>` +
      `• Flushing (feeling warm or flushed face)<br>` +
      `• Dizziness — especially when standing up quickly<br>` +
      `• Palpitations (feeling your heart beating)<br><br>` +
      `<strong>Tips:</strong><br>` +
      `• Take it at the same time every day — with or without food<br>` +
      `• Do not stop taking it suddenly without speaking to your doctor<br>` +
      `• The ankle swelling usually improves if you keep your feet raised when sitting<br><br>` +
      `<strong>When to contact your doctor:</strong><br>` +
      `• Severe swelling, difficulty breathing, or chest pain<br>` +
      `• Very low blood pressure symptoms: fainting, extreme dizziness<br><br>` +
      `⚠️ <em>Never stop or change your dose without medical advice.</em>`,
  },
  {
    keywords: ['urgently', 'urgent', 'emergency', 'when should i see', 'see a doctor'],
    answer:
      `<strong>When Should You See a Doctor Urgently?</strong><br><br>` +
      `🚨 <strong>Call Emergency Services (999 / 112) Immediately for:</strong><br>` +
      `• Chest pain or tightness (especially with sweating, nausea, arm pain)<br>` +
      `• Sudden difficulty breathing or shortness of breath at rest<br>` +
      `• Sudden severe headache unlike any before<br>` +
      `• Face drooping, arm weakness, speech difficulty (signs of stroke — use FAST test)<br>` +
      `• Loss of consciousness or collapse<br>` +
      `• Coughing up blood<br><br>` +
      `⚠️ <strong>See Your Doctor Same Day for:</strong><br>` +
      `• Chest pain that comes and goes with activity<br>` +
      `• Sudden swelling in both legs<br>` +
      `• Blood sugar very high or very low and not improving<br>` +
      `• High fever with confusion<br>` +
      `• Severe abdominal pain<br><br>` +
      `📅 <strong>Book a Routine Appointment for:</strong><br>` +
      `• Ongoing fatigue or dizziness<br>` +
      `• Gradual increase in breathlessness<br>` +
      `• Medication review or repeat prescription concerns<br><br>` +
      `⚠️ <em>When in doubt, always seek medical attention rather than waiting. Trust your instincts.</em>`,
  },

  // ── Symptoms ──────────────────────────────────────────────────────────────
  {
    keywords: ['chest tightness', 'chest pain', 'chest pressure', 'chest discomfort'],
    answer:
      `<strong>Chest Tightness — What It Could Mean</strong><br><br>` +
      `🚨 <strong>IMPORTANT:</strong> If your chest tightness is severe, sudden, spreading to your arm or jaw, or comes with sweating, nausea, or difficulty breathing — <strong>call 999 / 112 immediately.</strong> This could be a heart attack.<br><br>` +
      `<strong>Common Causes of Chest Tightness:</strong><br>` +
      `• <strong>Cardiac:</strong> Angina (reduced blood flow to heart — especially on exertion), heart attack<br>` +
      `• <strong>Respiratory:</strong> Asthma, COPD flare, or chest infection<br>` +
      `• <strong>Digestive:</strong> Acid reflux / heartburn (very common — burning sensation)<br>` +
      `• <strong>Musculoskeletal:</strong> Costochondritis (chest wall inflammation — worsens with pressing)<br>` +
      `• <strong>Anxiety / Panic Attack:</strong> Tight chest with rapid heartbeat, dizziness<br><br>` +
      `<strong>Questions to help identify the cause:</strong><br>` +
      `• Does it come on with exercise and go away with rest? → Could be angina<br>` +
      `• Does it worsen after eating? → Could be acid reflux<br>` +
      `• Is it tender when you press on your chest wall? → Likely musculoskeletal<br><br>` +
      `⚠️ <em>Given your history of Hypertension, please do not ignore chest tightness. Contact your doctor today or call emergency services if the pain is severe or unusual.</em>`,
  },
  {
    keywords: ['dizzy', 'dizziness', 'stand up', 'light-headed', 'lightheaded'],
    answer:
      `<strong>Dizziness When Standing Up</strong><br><br>` +
      `What you're describing sounds like <strong>postural (orthostatic) hypotension</strong> — a temporary drop in blood pressure when you move from sitting or lying down to standing.<br><br>` +
      `<strong>Why it happens with your medications:</strong><br>` +
      `• Amlodipine and Lisinopril both lower blood pressure — sometimes too much when you change positions<br>` +
      `• Dehydration can make it worse<br><br>` +
      `<strong>What you can do:</strong><br>` +
      `• <strong>Rise slowly</strong> — sit on the edge of the bed for 30 seconds before standing<br>` +
      `• Drink enough water throughout the day (6–8 glasses)<br>` +
      `• Avoid standing up quickly after meals<br>` +
      `• Hold onto something stable when standing up<br><br>` +
      `<strong>See your doctor if:</strong><br>` +
      `• Dizziness is severe or causing falls<br>` +
      `• You faint or nearly faint<br>` +
      `• It's getting worse or happening more often<br><br>` +
      `⚠️ <em>Your doctor may review your medication doses if this is a recurring problem. Do not stop medications on your own.</em>`,
  },
  {
    keywords: ['headache', 'persistent headache', 'head pain'],
    answer:
      `<strong>Persistent Headache — Possible Causes</strong><br><br>` +
      `🚨 <strong>Seek emergency care immediately if:</strong><br>` +
      `• Headache is sudden and severe ("thunderclap" — worst ever)<br>` +
      `• Headache with stiff neck, fever, or sensitivity to light<br>` +
      `• Headache after a head injury<br>` +
      `• Headache with vision changes, weakness, or confusion<br><br>` +
      `<strong>Common Causes:</strong><br>` +
      `• <strong>Tension headache</strong> — tight band-like pressure around the head; stress, poor posture<br>` +
      `• <strong>Hypertension</strong> — high blood pressure can cause headaches, especially in the back of the head in the morning<br>` +
      `• <strong>Dehydration</strong> — not drinking enough water<br>` +
      `• <strong>Migraine</strong> — throbbing, one-sided, with nausea or light sensitivity<br>` +
      `• <strong>Medication side effect</strong> — Amlodipine can cause headaches, especially when starting<br><br>` +
      `<strong>What helps:</strong><br>` +
      `• Rest in a quiet, dark room<br>` +
      `• Stay hydrated<br>` +
      `• Paracetamol (if not contraindicated) for mild-moderate pain<br><br>` +
      `⚠️ <em>Given your history of hypertension, a persistent headache should be checked by your doctor — it may indicate your blood pressure needs adjustment.</em>`,
  },
  {
    keywords: ['leg swelling', 'legs swelling', 'swollen legs', 'ankle swelling', 'oedema'],
    answer:
      `<strong>Leg Swelling — What Could Be Causing It</strong><br><br>` +
      `<strong>Given your medications, the most likely cause is:</strong><br>` +
      `• <strong>Amlodipine</strong> — ankle and leg swelling is a very common side effect (affects up to 1 in 10 people). This happens because the medication relaxes blood vessels, allowing fluid to pool in the legs.<br><br>` +
      `<strong>Other Causes to Rule Out:</strong><br>` +
      `• <strong>Heart failure</strong> — swelling in both legs, breathlessness, weight gain<br>` +
      `• <strong>Deep vein thrombosis (DVT)</strong> — usually one leg only, with pain, warmth, and redness<br>` +
      `• <strong>Kidney problems</strong> — puffiness around eyes and generalised swelling<br>` +
      `• <strong>Prolonged sitting or standing</strong> — common and harmless<br><br>` +
      `<strong>What helps with Amlodipine-related swelling:</strong><br>` +
      `• Keep legs elevated when sitting (raise feet above heart level)<br>` +
      `• Gentle walking to encourage circulation<br>` +
      `• Compression stockings (ask your doctor first)<br><br>` +
      `<strong>See your doctor urgently if:</strong><br>` +
      `• Swelling is in only one leg with pain or redness (possible DVT)<br>` +
      `• Swelling is sudden and severe<br>` +
      `• You have breathlessness or chest pain alongside swelling<br><br>` +
      `⚠️ <em>Please mention this at your next appointment — your doctor may consider adjusting your medication.</em>`,
  },
  {
    keywords: ['shortness of breath', 'breathless', 'difficulty breathing', 'cant breathe'],
    answer:
      `<strong>Shortness of Breath — What to Do</strong><br><br>` +
      `🚨 <strong>Call 999 / 112 IMMEDIATELY if:</strong><br>` +
      `• You cannot complete a sentence without stopping to breathe<br>` +
      `• Breathlessness came on suddenly at rest<br>` +
      `• You have chest pain or pressure alongside it<br>` +
      `• Your lips or fingertips look blue<br>` +
      `• You feel faint or collapse<br><br>` +
      `<strong>Common Causes:</strong><br>` +
      `• <strong>Heart failure</strong> — especially breathlessness lying flat (orthopnoea), waking at night<br>` +
      `• <strong>Chest infection / pneumonia</strong> — fever, cough, coloured sputum<br>` +
      `• <strong>Asthma or COPD flare</strong> — wheeze, tight chest<br>` +
      `• <strong>Anaemia</strong> — tiredness and breathlessness on exertion<br>` +
      `• <strong>Anxiety</strong> — rapid breathing, tingling, tight chest<br><br>` +
      `<strong>Given your conditions:</strong><br>` +
      `With hypertension and diabetes, breathlessness deserves prompt medical evaluation — it could indicate early heart failure or a cardiac event.<br><br>` +
      `⚠️ <em>Do not ignore breathlessness. If it is new, worsening, or at rest — seek medical help immediately.</em>`,
  },

  // ── Reports ───────────────────────────────────────────────────────────────
  {
    keywords: ['triglycerides', 'triglyceride reading', 'triglyceride result'],
    answer:
      `<strong>Your Triglycerides Explained</strong><br><br>` +
      `Triglycerides are a type of fat stored in your blood from calories your body doesn't use immediately.<br><br>` +
      `<strong>Your reading: 172 mg/dL (Borderline High)</strong><br><br>` +
      `<strong>Reference Ranges:</strong><br>` +
      `• Below 150 mg/dL — Normal ✅<br>` +
      `• 150–199 mg/dL — Borderline High ⚠️<br>` +
      `• 200–499 mg/dL — High<br>` +
      `• 500+ mg/dL — Very High (pancreatitis risk)<br><br>` +
      `<strong>What raises triglycerides:</strong><br>` +
      `• Sugary foods and drinks (fizzy drinks, sweets, white bread)<br>` +
      `• Excessive alcohol<br>` +
      `• Refined carbohydrates<br>` +
      `• Diabetes with poor sugar control<br>` +
      `• Being overweight<br><br>` +
      `<strong>How to lower them:</strong><br>` +
      `• Reduce sugar and refined carbs<br>` +
      `• Avoid alcohol or drink in moderation<br>` +
      `• Eat more omega-3 rich foods (salmon, mackerel, flaxseeds)<br>` +
      `• Exercise regularly<br>` +
      `• Better diabetes control helps significantly<br><br>` +
      `⚠️ <em>Discuss these results with your doctor. With your LDL also elevated, a combined approach may be recommended.</em>`,
  },
  {
    keywords: ['ecg', 'electrocardiogram', 'ecg result', 'what do my ecg'],
    answer:
      `<strong>Understanding Your ECG Results</strong><br><br>` +
      `An ECG (electrocardiogram) records the electrical activity of your heart. It shows the rhythm and rate of your heartbeat and can detect problems with your heart's electrical system.<br><br>` +
      `<strong>What a Normal ECG Shows:</strong><br>` +
      `• Regular heart rhythm (sinus rhythm)<br>` +
      `• Heart rate 60–100 beats per minute<br>` +
      `• Normal P waves, QRS complexes, and T waves<br><br>` +
      `<strong>Common ECG Findings Explained Simply:</strong><br>` +
      `• <strong>Left Ventricular Hypertrophy (LVH)</strong> — thickening of the heart wall, often from years of high blood pressure<br>` +
      `• <strong>ST changes</strong> — may indicate reduced blood flow to the heart<br>` +
      `• <strong>T-wave changes</strong> — can suggest the heart muscle is under strain<br>` +
      `• <strong>AF (atrial fibrillation)</strong> — irregular heartbeat<br><br>` +
      `<strong>With your history of hypertension:</strong><br>` +
      `Your doctor may look for LVH as a sign of the heart working harder than normal. This is one reason why controlling blood pressure is so important.<br><br>` +
      `⚠️ <em>Only your doctor can properly interpret your specific ECG. Please ask them to walk you through the results at your next appointment.</em>`,
  },

  // ── Booking ───────────────────────────────────────────────────────────────
  {
    keywords: ['cardiology appointment', 'cardiologist', 'heart specialist', 'cardiology'],
    answer:
      `<strong>Booking a Cardiology Appointment</strong><br><br>` +
      `Based on your health profile — with hypertension and elevated cholesterol — a cardiology review is a good idea.<br><br>` +
      `<strong>What to expect:</strong><br>` +
      `• Your GP/doctor will usually provide a referral letter<br>` +
      `• Bring a list of your current medications (Amlodipine, Metformin, Aspirin, Lisinopril)<br>` +
      `• Bring your most recent blood test results and any ECG reports<br><br>` +
      `<strong>When cardiology is urgent:</strong><br>` +
      `• Chest pain, especially on exertion<br>` +
      `• Palpitations with dizziness<br>` +
      `• Significant ECG changes<br>` +
      `• Recent hospitalisation for a cardiac event<br><br>` +
      `<strong>When routine is appropriate:</strong><br>` +
      `• Annual review of cardiovascular risk<br>` +
      `• Optimisation of blood pressure and cholesterol medications<br>` +
      `• Echo to check heart structure and function<br><br>` +
      `<strong>Your upcoming appointment:</strong><br>` +
      `Your records show a follow-up with <strong>Dr. Aisha Patel, Cardiology</strong> is already scheduled. Please attend and bring your latest lab results.<br><br>` +
      `⚠️ <em>If you have new or worsening symptoms before your appointment, contact your GP immediately.</em>`,
  },
  {
    keywords: ['diabetes specialist', 'endocrinologist', 'diabetologist', 'who should i see for diabetes'],
    answer:
      `<strong>Who Should I See for Diabetes?</strong><br><br>` +
      `For Type 2 Diabetes management, here are the specialists who can help:<br><br>` +
      `👨‍⚕️ <strong>Diabetologist / Endocrinologist</strong><br>` +
      `• Specialist in hormones and metabolic conditions<br>` +
      `• Best for complex diabetes, insulin initiation, or if your HbA1c is not controlled<br><br>` +
      `👨‍⚕️ <strong>General Practitioner (GP)</strong><br>` +
      `• Manages routine Type 2 Diabetes — prescriptions, HbA1c checks, annual reviews<br>` +
      `• First port of call for most people<br><br>` +
      `👩‍⚕️ <strong>Diabetes Nurse Specialist</strong><br>` +
      `• Provides education on diet, lifestyle, blood glucose monitoring, and medications<br>` +
      `• Excellent resource for day-to-day management questions<br><br>` +
      `👁️ <strong>Ophthalmologist</strong> — Annual diabetic eye screening (retinopathy check)<br>` +
      `🦶 <strong>Podiatrist</strong> — Annual foot check to prevent diabetic complications<br>` +
      `💊 <strong>Pharmacist</strong> — Medication counselling and adherence support<br><br>` +
      `⚠️ <em>Your GP coordinates your diabetes care team. Ask them for a referral if your diabetes is not well controlled or if you have complications.</em>`,
  },

  // ── General health ────────────────────────────────────────────────────────
  {
    keywords: ['blood pressure reading', 'blood pressure mean', 'systolic', 'diastolic'],
    answer:
      `<strong>Understanding Your Blood Pressure Reading</strong><br><br>` +
      `Blood pressure is written as two numbers — for example <strong>130/85 mmHg</strong>:<br><br>` +
      `• <strong>Top number (Systolic)</strong> — pressure when your heart beats and pumps blood<br>` +
      `• <strong>Bottom number (Diastolic)</strong> — pressure when your heart is resting between beats<br><br>` +
      `<strong>Blood Pressure Categories:</strong><br>` +
      `• Below 120/80 — <strong>Optimal ✅</strong><br>` +
      `• 120–129 / below 80 — <strong>Elevated</strong><br>` +
      `• 130–139 / 80–89 — <strong>Stage 1 Hypertension</strong> ⚠️<br>` +
      `• 140+ / 90+ — <strong>Stage 2 Hypertension</strong> ❌<br>` +
      `• 180+ / 120+ — <strong>Hypertensive crisis — seek emergency care immediately</strong> 🚨<br><br>` +
      `<strong>Tips for accurate reading:</strong><br>` +
      `• Sit quietly for 5 minutes before measuring<br>` +
      `• Avoid caffeine and exercise 30 minutes before<br>` +
      `• Measure at the same time each day<br>` +
      `• Take 2–3 readings and average them<br><br>` +
      `⚠️ <em>Your target is below 130/80 mmHg given your conditions. Keep taking your medications and attend regular check-ups.</em>`,
  },
  {
    keywords: ['manage diabetes', 'diabetes better', 'control diabetes', 'blood sugar'],
    answer:
      `<strong>How to Manage Your Diabetes Better</strong><br><br>` +
      `Type 2 Diabetes can be very effectively managed with the right lifestyle habits alongside your medications.<br><br>` +
      `🥗 <strong>Diet</strong><br>` +
      `• Choose low glycaemic index (GI) foods — brown rice, wholemeal bread, lentils, vegetables<br>` +
      `• Reduce sugary drinks, sweets, and white bread<br>` +
      `• Control portion sizes — eat smaller, more regular meals<br>` +
      `• Eat more fibre — helps control blood sugar<br><br>` +
      `🏃 <strong>Exercise</strong><br>` +
      `• 150 minutes of moderate activity per week (brisk walking, swimming)<br>` +
      `• Exercise lowers blood sugar — check your levels before and after if you're on insulin<br><br>` +
      `💊 <strong>Medications</strong><br>` +
      `• Take Metformin as prescribed — do not skip doses<br>` +
      `• Never stop medications without speaking to your doctor<br><br>` +
      `🩺 <strong>Monitoring</strong><br>` +
      `• Attend your annual diabetes review (eyes, feet, kidneys, HbA1c)<br>` +
      `• Monitor your blood glucose at home if advised<br><br>` +
      `⚠️ <em>Your HbA1c target is below 7%. Small consistent daily changes make a big difference over time.</em>`,
  },
  {
    keywords: ['avoid', 'food', 'high cholesterol', 'cholesterol diet'],
    answer:
      `<strong>Foods to Avoid with High Cholesterol</strong><br><br>` +
      `<strong>Reduce or Avoid:</strong><br>` +
      `• 🥩 Red meat (beef, pork, lamb) — especially fatty cuts<br>` +
      `• 🧈 Butter, lard, ghee<br>` +
      `• 🥛 Full-fat dairy (whole milk, cream, cheese)<br>` +
      `• 🍟 Fried and fast foods<br>` +
      `• 🍰 Cakes, pastries, biscuits (contain trans fats)<br>` +
      `• 🥚 Limit egg yolks to 3–4 per week (egg whites are fine)<br><br>` +
      `<strong>Foods That Actually Help Lower Cholesterol:</strong><br>` +
      `• 🥣 Oats and barley (soluble fibre binds cholesterol)<br>` +
      `• 🥦 Vegetables and fruits<br>` +
      `• 🐟 Oily fish (salmon, mackerel, sardines — 2 portions per week)<br>` +
      `• 🥜 Nuts (especially walnuts, almonds — small handful daily)<br>` +
      `• 🫒 Olive oil instead of butter<br>` +
      `• 🫘 Beans, lentils, chickpeas<br><br>` +
      `<strong>LDL-lowering plant sterols:</strong><br>` +
      `Plant sterol-enriched products (e.g. Benecol) can reduce LDL by 10–15% when taken daily.<br><br>` +
      `⚠️ <em>Diet alone may not be sufficient — discuss cholesterol medication with your doctor alongside dietary changes.</em>`,
  },
  {
    keywords: ['reduce ldl', 'lower ldl', 'ldl diet', 'ldl cholesterol diet'],
    answer:
      `<strong>How to Reduce LDL Cholesterol Through Diet</strong><br><br>` +
      `<strong>The Most Effective Dietary Changes:</strong><br><br>` +
      `1️⃣ <strong>Increase Soluble Fibre</strong> (reduces LDL by 5–10%)<br>` +
      `• Oats, porridge, oat bran<br>` +
      `• Beans, lentils, chickpeas<br>` +
      `• Apples, pears, oranges<br>` +
      `• Psyllium husk supplement<br><br>` +
      `2️⃣ <strong>Replace Saturated Fats with Unsaturated Fats</strong><br>` +
      `• Use olive oil or rapeseed oil instead of butter<br>` +
      `• Avocado, nuts, seeds<br>` +
      `• Oily fish twice a week<br><br>` +
      `3️⃣ <strong>Plant Sterols / Stanols</strong> (reduces LDL by 10–15%)<br>` +
      `• Fortified yoghurts, drinks, or spreads (e.g. Benecol, Flora ProActiv)<br>` +
      `• 1.5–3g per day alongside meals<br><br>` +
      `4️⃣ <strong>Reduce Processed and Fried Foods</strong><br>` +
      `• Avoid trans fats (partially hydrogenated oils) in packaged foods<br><br>` +
      `5️⃣ <strong>Soy Protein</strong><br>` +
      `• Replace some animal protein with soy (tofu, edamame, soy milk)<br><br>` +
      `⚠️ <em>Diet changes typically reduce LDL by 20–30%. Combined with your doctor's medication plan, this can significantly lower your cardiovascular risk.</em>`,
  },
  {
    keywords: ['symptoms of high blood pressure', 'hypertension symptoms', 'signs of high bp'],
    answer:
      `<strong>Symptoms of High Blood Pressure</strong><br><br>` +
      `High blood pressure (hypertension) is often called the <strong>"Silent Killer"</strong> because most people have <strong>no symptoms at all</strong> — even when readings are dangerously high.<br><br>` +
      `<strong>When symptoms do occur (usually at very high levels):</strong><br>` +
      `• Headache — particularly at the back of the head in the morning<br>` +
      `• Dizziness or lightheadedness<br>` +
      `• Blurred or double vision<br>` +
      `• Nosebleeds<br>` +
      `• Shortness of breath<br>` +
      `• Chest pain or tightness<br>` +
      `• Palpitations (feeling your heart beating)<br><br>` +
      `<strong>Hypertensive Crisis (BP above 180/120):</strong><br>` +
      `🚨 Severe headache, vision changes, confusion, nausea — call 999 immediately<br><br>` +
      `<strong>This is why regular monitoring matters:</strong><br>` +
      `Since you may feel completely normal with high BP, checking your blood pressure regularly at home or at your GP is essential. It's the only way to know.<br><br>` +
      `⚠️ <em>Keep taking your prescribed medications even when you feel well — your BP may be controlled because of them, not despite them.</em>`,
  },
  {
    keywords: ['exercise', 'hypertension', 'exercise with high blood pressure', 'safe to exercise'],
    answer:
      `<strong>Is It Safe to Exercise with Hypertension?</strong><br><br>` +
      `<strong>Yes — exercise is one of the best things you can do for high blood pressure.</strong><br><br>` +
      `Regular aerobic exercise can lower systolic blood pressure by 5–8 mmHg, which is comparable to some medications.<br><br>` +
      `<strong>Recommended Exercise:</strong><br>` +
      `• 🚶 <strong>Brisk walking</strong> — 30 minutes, 5 days a week (safest starting point)<br>` +
      `• 🏊 Swimming — low-impact, excellent for blood pressure<br>` +
      `• 🚴 Cycling — indoor cycling is very safe<br>` +
      `• 💃 Dancing — enjoyable and effective<br><br>` +
      `<strong>Exercise Precautions:</strong><br>` +
      `• Warm up for 5–10 minutes before and cool down after<br>` +
      `• Avoid very heavy weightlifting — it causes sharp BP spikes<br>` +
      `• Stay hydrated<br>` +
      `• Monitor for dizziness, chest pain, or unusual breathlessness — stop and rest if these occur<br>` +
      `• Check with your doctor before starting if you've been inactive for a long time<br><br>` +
      `<strong>Your BP during exercise will naturally rise</strong> — this is normal and safe. It's resting BP that matters.<br><br>` +
      `⚠️ <em>If you experience chest pain, severe breathlessness, or palpitations during exercise — stop immediately and seek medical attention.</em>`,
  },
];

function findPatientAnswer(text: string, _mode: AiMode): string {
  const lower = text.toLowerCase();
  for (const qa of PATIENT_QA) {
    if (qa.keywords.some(kw => lower.includes(kw))) {
      return qa.answer;
    }
  }
  return (
    `Thank you for your question! Here's some general guidance:<br><br>` +
    `Your current health context shows:<br>` +
    `• <strong>Conditions:</strong> Hypertension Stage 1, Type 2 Diabetes<br>` +
    `• <strong>Medications:</strong> Amlodipine, Metformin, Aspirin, Lisinopril<br><br>` +
    `For your specific question, I'd recommend:<br>` +
    `• Speaking with your GP or specialist at your next appointment<br>` +
    `• Using the <strong>Symptom Checker</strong> mode if you're describing a symptom<br>` +
    `• Using the <strong>Report Explanation</strong> mode if you have lab results to understand<br><br>` +
    `You can also try rephrasing your question — for example:<br>` +
    `• "What does my LDL result mean?"<br>` +
    `• "What are the side effects of Amlodipine?"<br>` +
    `• "I have a headache — what could cause it?"<br><br>` +
    `⚠️ <em>Always consult your doctor for personalised medical advice. This assistant provides general health information only.</em>`
  );
}

// ── Mock context (used until backend patient context endpoint is available) ──

function buildMockContext(state: PatientStateService): PatientAiContext {
  const p = state.getPatient();
  return {
    patientName:     p?.name        ?? 'Patient',
    patientId:       p?.patientCode ?? 'PT-0000',
    age:             p?.age         ?? 0,
    gender:          p?.gender      ?? 'Unknown',
    bloodGroup:      p?.bloodGroup  ?? 'Unknown',
    conditions:      ['Hypertension Stage 1', 'Type 2 Diabetes'],
    prescriptions:   [
      'Amlodipine 5mg (morning)',
      'Metformin 500mg (2× daily)',
      'Aspirin 75mg (morning)',
      'Lisinopril 10mg (evening)'
    ],
    labFlags:        ['LDL 185 mg/dL (elevated)', 'Triglycerides 172 mg/dL (borderline)'],
    nextAppointment: 'Dr. Aisha Patel, cardiology follow-up'
  };
}

@Injectable({ providedIn: 'root' })
export class PatientAiService {

  private cachedContext: PatientAiContext | null = null;

  constructor(private state: PatientStateService) {}

  getPatientContext(): Observable<PatientAiContext> {
    const ctx = buildMockContext(this.state);
    this.cachedContext = ctx;
    return of(ctx);
  }

  getCachedContext(): PatientAiContext | null { return this.cachedContext; }

  sendMessage(messages: ConversationTurn[], mode: AiMode): Observable<string> {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    const text = lastUserMsg?.content ?? '';
    const answer = findPatientAnswer(text, mode);
    return of(answer).pipe(delay(900));
  }
}
