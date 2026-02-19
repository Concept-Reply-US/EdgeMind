EdgeMind - Workshop

  AI Agents in Manufacturing — Tribal Knowledge to Institutional Intelligence      
                                                                                                                
  30 min | ProveIt! 2026                                                                                        

  ---
  1. THE KNOWLEDGE PROBLEM (5 min)

  - Manufacturing's most critical knowledge lives in people's heads — not MES, not historian, not SOPs
  - When they leave (retire, transfer, quit), the next person gets the badge but not the intuition
  - They follow procedures without knowing why. Nobody questions it until something breaks.
  - Troubleshooting takes 3x longer without institutional memory
  - The twist: the knowledge isn't always gone — it's buried in your CMMS
    - 5 years of closed tickets: "Replaced bearing on Filler 23, adjusted alignment 2 degrees"
    - Already captured. Already structured. Nobody reads it at 2 AM.
  - Ask the room: "Who's lost a key person and felt it for months? Still feeling it?"
  - Land it: "We built EdgeMind to address this. Not to replace those people — to make their knowledge
  institutional."

  Transition: "So what are AI agents, and why are they different from what you already have?"

  ---
  2. WHAT ARE AI AGENTS, ACTUALLY? (5 min)

  - Cut through the hype. An agent is: tools + context + action, in a loop
  - This is NOT:
    - Chatbot (answers but doesn't act)
    - Dashboard (displays but doesn't reason)
    - Rule engine (follows logic but doesn't learn)
  - Three capabilities for manufacturing:
    a. OBSERVE — real-time sensor data, MQTT/OPC-UA/historians, 50+ msgs/sec, 24/7
    b. REASON — patterns across thousands of data points, correlate upstream vibration with downstream quality,
  connect dots across shifts
    c. ACT — create work orders, alert the right person, publish to UNS, AND read historical CMMS tickets to
  recommend the proven fix, not just the textbook one
  - Key differentiator: agents improve with context. Rules don't.
    - Rule: "alert when vibration > 5 mm/s" — same in year 1 and year 10
    - Agent with RAG + CMMS history: "this ramp pattern matches 3 previous bearing failures on this line — last time, outer race replacement + 2° alignment fixed it for 4 months"
    - Not "learning" in the ML sense — it's remembering via RAG and reasoning with growing operational context
    - The CMMS feedback loop is what makes this real (see section 5)

  Transition: "Let me show you what it looks like when agents build agents."

  ---
  3. HOW WE BUILT EDGEMIND — AGENTS ALL THE WAY DOWN (8 min)

  Part A: The Meta Story (3 min)
  - Built in 5 weeks using Claude Code — an AI coding agent
  - Claude Code orchestrates sub-agents:
    - Architect → designed tiered analysis
    - Engineers → wrote Node.js backend, vanilla JS frontend, Python agent code
    - Code reviewers → 407 tests, 11 suites
    - Security reviewers → audited MQTT pipeline + APIs
  - The system they built deploys its own AI agents
  - Agents building agents. That's the story.

  Part B: What EdgeMind Does (3 min)
  - MQTT broker (50+ msg/sec, 3 enterprises) → Node.js → InfluxDB → Tiered AI → Dashboard
  - Tier 1: Delta detection, every 2 min, pure math, $0.00/check
  - Tier 2: Targeted AI, only when Tier 1 detects change
  - Tier 3: Deep summary, every 30 min, rotating enterprise focus
  - AgentCore chat agent (Strands SDK + MCP Gateway → calls our own REST APIs as tools)
  - CMMS bidirectional: creates work orders OUT, reads historical tickets IN
  - CESMII: publishes insights back to UNS as SM Profile JSON-LD

  Part C: The Cost Story (2 min)
  - Infrastructure: $127/mo | AI: $35/mo (down from $200+)
  - Less than one operator's daily wage. Combined.
  - How:
    - 10 round trips → 1 (pre-fetch all data, single prompt)
    - 120 calls/hr → 6 (Tier 1 gate eliminates 95%)
    - 61x cheaper model (Nova Lite for routine, Sonnet for chat)
    - Circuit breaker: 500K tokens/day, auto-pause, never a surprise bill

  Transition: "Enough about how we built it. Let me show you what happens when a machine starts failing."

  ---
  4. LIVE DEMO — AGENT DETECTS WHAT HUMANS MISS (7 min)

  - [0:00] Show dashboard, normal state, everything green
  - [0:30] Point at filler on FillingLine01 — "A 20-year veteran knows what this sounds like. A 2-month hire
  sees a number."
  - [1:00] Launch filler-vibration scenario — vibration ramps 2.1 → 8.4 mm/s over 3 min
  - [1:30] Watch MQTT stream, values climbing
  - [2:00] "Past 3 mm/s now. Approaching warning threshold."
  - [2:30] Explain Tier 1 running delta detection in background
  - [3:00] Insight appears — read it aloud. Bearing inspection recommendation. "This used to live in one
  person's head. Now it's institutional."
  - [3:30] Expand anomaly — reasoning, ramp pattern, rate of change
  - [4:00] Chat agent: "What is happening with the filler?" — AgentCore queries APIs via MCP, contextual answer
  - [4:30] Inject second anomaly (caploader torque) — cascade detection
  - [5:00] Show CESMII output — intelligence published back to UNS
  - [5:30] COO view — same data, executive abstraction
  - [6:00] Token usage — "that whole analysis cost a fraction of a cent"
  - [6:30] Stop scenario. "That knowledge doesn't go home at 5 PM. Doesn't retire. It's institutional."

  Transition: "How do you start doing this in your own operation?"

  ---
  5. MAKING IT REAL — YOUR FACTORY, YOUR AGENTS (3 min)

  1. START WITH MONITORING (Week 1)
    - Connect historian/MQTT to an anomaly-watching agent
    - Read-only. No changes to existing systems. Low risk.
    - Even "vibration on Filler 7 trending up 15%" is valuable if it runs every shift
  2. CAPTURE TRIBAL KNOWLEDGE (Month 1)
    - Interview your veterans. Record heuristics. Encode as agent context.
    - "South bearing on Line 3 above 4 mm/s AND ambient above 35C → reduce speed before it trips"
    - You already have more than you think — your CMMS has years of closed tickets. Connect the agent to that
  history.
  3. CLOSE THE FEEDBACK LOOP (Quarter 1) — this is where agents actually get better
    - The missing piece: outcome tracking
      - Agent detects anomaly → recommends action → creates work order
      - Operator acts (or doesn't)
      - CMMS captures outcome: what was done, what was found, did it work?
      - Agent stores the tuple: (anomaly → recommendation → action → result)
      - Next time: "Last 3 times this happened: 2 were bearings, 1 was belt tension — check both"
    - Without the loop: agent has good general knowledge + growing memory (RAG)
    - With the loop: agent has YOUR FACTORY'S specific knowledge — what actually works on YOUR equipment
    - That's the difference between a smart assistant and institutional intelligence

    Connections:
    - Agent → CMMS (auto work orders)
    - Agent ← CMMS (historical tickets + outcome tracking)
    - Agent → SCADA (parameter recommendations)
    - Agent → Operator tablets (real-time guidance)

    Operator corrections make it smarter:
    - Thumbs up/down on insights
    - "This wasn't a bearing issue — it was changeover vibration, ignore during shift transitions"
    - "You flagged medium but this should be high — this machine feeds the whole line"
    - Corrections become context for future prompts

  - DO NOT try to replace operators. Agent = institutional memory. Human = decision maker.
  - ROI: At $127/mo, prevent ONE unplanned downtime event and it pays for a full year.

  ---
  6. Q&A (2 min)

  - Cost? → $127/mo infra + $35/mo AI. One prevented downtime pays for a year.
  - Works with our SCADA? → If it has MQTT or OPC-UA, yes. Sparkplug B supported.
  - How does it actually get better? → Not model fine-tuning. RAG with outcome data. Every resolved CMMS ticket makes the retrieval context richer. The feedback loop is the key.
  - Where does agent knowledge come from? → Real-time data + encoded heuristics + CMMS history + outcome tracking.
  - How to start? → MQTT → InfluxDB → agent. Start with monitoring, iterate.
