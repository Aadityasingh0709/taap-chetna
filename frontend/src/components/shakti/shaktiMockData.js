/**
 * shaktiMockData.js
 * Isolated development-preview responses and suggested prompts for Shakti (Phase 1).
 * 
 * IMPORTANT: In accordance with Phase 1 boundaries, this module provides local
 * UI interaction fixtures. No live LLM, external speech, or weather API is called.
 * This file can be swapped for a live backend service in Phase 2.
 */

export const SHAKTI_SUGGESTED_PROMPTS = [
  {
    id: 'p1',
    text: 'How can I reduce my heat exposure today?',
    tag: 'Daily Safety',
    icon: 'Sun',
  },
  {
    id: 'p2',
    text: 'What should I know before travelling in hot weather?',
    tag: 'Travel Transit',
    icon: 'Compass',
  },
  {
    id: 'p3',
    text: 'How can I plan outdoor activities during hot conditions?',
    tag: 'Activity Planning',
    icon: 'CalendarClock',
  },
  {
    id: 'p4',
    text: 'What information can Taap Chetna help me understand?',
    tag: 'Platform Overview',
    icon: 'Info',
  },
];

/**
 * Returns a tailored, clearly flagged local development preview response.
 * Strictly avoids fabricating real-time weather forecasts or specific medical diagnoses.
 */
export function getShaktiPreviewResponse(userPrompt) {
  const normalized = (userPrompt || '').toLowerCase().trim();

  // 1. Heat exposure prompt
  if (normalized.includes('reduce') || normalized.includes('exposure') || normalized.includes('today')) {
    return {
      text: `Reducing direct solar and ambient thermal exposure is vital for protecting your cardiovascular and renal systems:

• **Midday Sun Window**: Avoid strenuous outdoor activities between 12:00 PM and 3:30 PM, when radiant solar flux is at its peak.
• **Microclimate Shading**: Whenever outdoors, seek vegetated or canopy shade, or carry a light-colored umbrella.
• **Active Hydration**: Sip water or oral rehydration salts (ORS) steadily every 20–30 minutes rather than drinking large volumes infrequently.
• **Personal Risk Profile**: Check the **Personal Heat Risk** calculator on your dashboard to see your tailored work-to-rest ratio based on your age and occupation.

*(Phase 1 Local Preview • In Phase 2, Shakti will dynamically query live satellite telemetry and your saved profile.)*`,
      bullets: [
        'Avoid strenuous exertion 12:00 PM – 3:30 PM',
        'Hydrate with water and ORS electrolytes every 25 mins',
        'Wear loose, breathable, light-colored cotton clothing',
      ],
      suggestedNext: [
        'How does high humidity affect sweat cooling?',
        'What are early warning signs of heat exhaustion?',
      ],
    };
  }

  // 2. Travel transition prompt
  if (normalized.includes('travel') || normalized.includes('journey') || normalized.includes('trip') || normalized.includes('transit')) {
    return {
      text: `Travelling between regions with differing temperatures and humidity can place sudden strain on your thermoregulation:

• **Acclimatization Gap**: Your cardiovascular system requires 3–7 days to adjust to higher ambient temperatures or sudden humidity spikes.
• **Transit Thermal Shock**: Stepping out of chilled air-conditioned trains, buses, or cabs directly into 40°C+ ambient heat causes rapid cutaneous vasodilation and dizziness.
• **Hydration Buffer**: Carry an insulated water flask and avoid caffeinated energy drinks or sodas while on the road.
• **Travel Risk Analyzer**: Explore the **Travel Transition** tool in the top navigation to analyze departure and destination thermal gradients.

*(Phase 1 Local Preview • Real-time travel route heat risk analysis will be integrated in Phase 2.)*`,
      bullets: [
        'Gradual thermal acclimatization takes 3–5 days',
        'Carry insulated hydration supplies during road and rail transit',
        'Check destination wet-bulb temperatures before departing',
      ],
      suggestedNext: [
        'How can I plan outdoor activities during hot conditions?',
        'What should I know about bus vs car heat exposure?',
      ],
    };
  }

  // 3. Activity planning prompt
  if (normalized.includes('plan') || normalized.includes('outdoor') || normalized.includes('activity') || normalized.includes('schedule')) {
    return {
      text: `Smart scheduling is one of the most effective ways to mitigate heat illness during hot periods:

• **Thermal Golden Hours**: Schedule heavy outdoor labor, athletic workouts, or errands during the early morning (before 10:00 AM) or after sunset.
• **Work-Rest Protocols**: Follow structured rest pauses in cool or ventilated spaces (e.g., 45 mins active : 15 mins shaded rest).
• **Wet-Bulb Awareness**: When relative humidity exceeds 70%, the human body cannot cool effectively through sweat evaporation alone.
• **What-If Planner**: Utilize the **What-If Planner** on Taap Chetna to test how shifting your shift hours lowers your physiological heat index.

*(Phase 1 Local Preview • AI-assisted hourly scheduling recommendations will be powered by backend ML models in Phase 2.)*`,
      bullets: [
        'Front-load tasks before 10:00 AM or delay after sunset',
        'Pair physical exertion with frequent shaded recovery halts',
        'Monitor urine color (pale straw indicates good hydration)',
      ],
      suggestedNext: [
        'How can I reduce my heat exposure today?',
        'What are the symptoms of heat stroke vs heat exhaustion?',
      ],
    };
  }

  // 4. Platform overview prompt
  if (normalized.includes('taap chetna') || normalized.includes('platform') || normalized.includes('help') || normalized.includes('understand')) {
    return {
      text: `Taap Chetna (ताप चेतना) is India's dedicated heat-health intelligence platform. Here is how it protects citizens:

1. **Personal Heat Risk Calculator**: Analyzes your age, occupation, pre-existing health factors, and living conditions alongside real-time weather telemetry to calculate an exact vulnerability score and clinical fluid prescription.
2. **Travel Transition Analyzer**: Evaluates origin-destination thermal shock, transit mode exposure, and acclimatization advice.
3. **What-If Scenario Planner**: Lets you simulate lifestyle adaptations (e.g., earlier hours, cool-roof paint, increased hydration) to observe immediate risk reductions.
4. **Shakti Assistant**: Your dedicated conversational companion, designed to answer heat-health questions in clear language.

*(Phase 1 Local Preview • More interactive capabilities will be introduced as AI modules connect in upcoming phases.)*`,
      bullets: [
        'Evidence-based clinical hydration protocols',
        'Live environmental and wet-bulb calculations',
        'Scenario-based intervention modeling',
      ],
      suggestedNext: [
        'How can I reduce my heat exposure today?',
        'What should I know before travelling in hot weather?',
      ],
    };
  }

  // 5. General fallback response
  return {
    text: `Thank you for your question!

*(Phase 1 Local Interface Preview)*: Shakti is currently running in local demonstration mode. In this phase, the chat interface, voice states, and live conversation layouts are fully interactive, while the AI inference pipeline, speech recognition, and live telemetry integrations are scheduled for Phase 2.

**Core Heat Resilience Reminders:**
• Keep daily hydration between 3.0L and 4.0L with electrolyte intake during extreme heat days.
• Check your personalized risk score on the **Personal Heat Risk** dashboard for customized guidance.
• Seek shaded or well-ventilated areas during the midday hours (12:00 PM – 3:30 PM).`,
    bullets: [
      'Maintain continuous oral rehydration with water and ORS',
      'Wear wide-brim hats or light cotton head coverings outdoors',
      'Watch for dizziness, rapid pulse, or lack of sweating as warning signs',
    ],
    suggestedNext: [
      'How can I reduce my heat exposure today?',
      'What should I know before travelling in hot weather?',
    ],
  };
}

/**
 * Pre-scripted live conversation transcript for Phase 3 prototype preview
 */
export const LIVE_VOICE_DEMO_TRANSCRIPT = [
  {
    speaker: 'shakti',
    text: 'Namaste! Live voice connection initialized. How can I assist your heat safety today?',
    time: '00:03',
  },
  {
    speaker: 'citizen',
    text: 'I have to travel by bus across the city this afternoon. What should I prepare?',
    time: '00:12',
  },
  {
    speaker: 'shakti',
    text: 'Afternoon bus transit can reach cabin temperatures 4°C to 6°C above ambient levels. Carry an insulated bottle with 1 liter of chilled electrolyte water, choose window seats away from direct sun, and take a 10-minute shaded rest immediately upon arrival.',
    time: '00:24',
  },
];
