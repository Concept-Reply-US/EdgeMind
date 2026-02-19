# AI Agents in Manufacturing -- From Tribal Knowledge to Institutional Intelligence

## 30-Minute Workshop Guide

**Presenter**: Stefan Bekker, Concept Reply US
**Event**: ProveIt! Conference 2026
**Dashboard**: https://edge-mind.concept-reply-sandbox.com

---

# SECTION 1: Structured Outline with Speaker Notes

## Agenda

| # | Segment | Duration | Key Takeaway |
|---|---------|----------|--------------|
| 1 | The Knowledge Problem | 5 min | Manufacturing's most critical asset walks out the door every day |
| 2 | What Are AI Agents, Actually? | 5 min | Not chatbots. Not dashboards. Observe, Reason, Act. |
| 3 | How We Built EdgeMind -- Agents All the Way Down | 8 min | AI agents built a system that deploys AI agents |
| 4 | Live Demo -- Agent Detects What Humans Miss | 7 min | Bearing degradation detected and explained in under 3 minutes |
| 5 | Making It Real -- Your Factory, Your Agents | 3 min | Three starting points for any manufacturing operation |
| 6 | Q&A | 2 min | Open floor |

---

## Segment 1: The Knowledge Problem (5 minutes)

### Content Outline

- Manufacturing runs on tribal knowledge -- the accumulated intuition, heuristics, and pattern recognition that experienced operators carry in their heads
- This knowledge is invisible until the person who holds it leaves: retires, transfers, gets promoted, quits
- The next person inherits the job title but not the understanding. They follow procedures without knowing why. They repeat rituals that made sense to someone, once, for reasons nobody documented
- Nobody questions it until something breaks. Then the troubleshooting takes three times longer because the institutional memory is gone
- The cost is real and measurable: repeated failures, longer mean time to repair, inconsistent quality, knowledge silos between shifts
- Here is the twist: sometimes the knowledge is not actually gone. It is buried. In your CMMS tickets. In maintenance logs. In shift handover notes. "Replaced bearing on Filler 23, adjusted alignment 2 degrees." "Cleaned heat exchanger fouling, reduced inlet temp by 5C." Five years of closed work orders IS the tribal knowledge -- already captured, already structured. But nobody reads five years of closed tickets when a machine goes down at 2 AM.
- This is not a technology problem. It is a people problem. But technology -- specifically AI agents -- can be part of the solution

### Speaker Notes

> "Here is manufacturing's dirty secret: the most valuable knowledge in your operation is not in your MES, not in your historian, and not in your SOPs. It lives in the heads of the people who have been running your lines for twenty years."

> "That veteran operator who knows that a particular machine sounds different when a bearing is going bad. The maintenance tech who has a sixth sense for when a pump is about to fail. The shift lead who knows exactly which parameters to tweak when quality starts drifting. That knowledge took decades to build. And when those people leave -- retirement, promotion, new job -- it walks out the door with them."

> "The next person gets the badge, the locker, and a binder of procedures. But they do not get the intuition. They follow the steps without understanding the why. They repeat rituals that made sense to someone, once, for reasons nobody wrote down. And nobody questions it -- until something breaks. Then the troubleshooting takes three times longer because the person who would have said 'check the south bearing first' is fishing in Montana."

> "But here is the thing -- sometimes that knowledge is not completely gone. It is buried. In your CMMS. In five years of closed work orders. 'Replaced bearing on Filler 23, adjusted alignment 2 degrees.' 'Cleaned heat exchanger fouling, reduced inlet temp by 5C.' That is the tribal knowledge, already captured. But nobody digs through a thousand closed tickets at 2 AM when a machine is down."

> "Show of hands -- who here has lost a key person and felt the impact for months? Keep your hand up if you are still feeling it."

> "That is what we built EdgeMind to address. Not to replace those people -- you cannot replace decades of experience with software. But to create a system that watches the same data they watched, learns the patterns they learned, and shares that knowledge with every operator on every shift. Institutional intelligence that never retires."

### Transition

"So what are AI agents, and why are they different from the dashboards and rule engines you already have?"

### Key Numbers to Emphasize

- **70%** of manufacturing knowledge is undocumented (industry estimate)
- **3x longer** troubleshooting when institutional knowledge is lost
- The knowledge gap compounds across shifts, sites, and years

### Audience Engagement

"Who here has lost a key person and felt the impact for months? Keep your hand up if you are still feeling it."

---

## Segment 2: What Are AI Agents, Actually? (5 minutes)

### Content Outline

- Cut through the hype. There is a lot of noise around AI agents right now. Let us be precise.
- An AI agent is: an AI system that can **use tools**, **remember context**, and **take action** -- autonomously, in a loop
- This is different from:
  - **Chatbots** -- they answer questions but do not act
  - **Dashboards** -- they display data but do not reason about it
  - **Rule engines** -- they follow predefined logic but do not learn
- Three capabilities that matter for manufacturing:
  1. **Observe** -- consume real-time sensor data from MQTT brokers, OPC-UA servers, historians, SCADA systems. Not batch data. Not daily reports. Live data at 50+ messages per second.
  2. **Reason** -- detect patterns humans miss across thousands of data points simultaneously. Correlate upstream vibration with downstream quality drift. Notice that OEE always drops at 2 AM on Tuesdays. Connect dots across shifts.
  3. **Act** -- create work orders in your CMMS, alert the right person via the right channel, publish findings back to your data infrastructure so other systems can consume the intelligence. And act does not just mean creating new tickets -- it means referencing historical ones. The agent can pull up what worked last time this bearing failed and recommend the proven fix, not just the textbook one.
- The key differentiator: **agents get better over time**. Rules do not. A rule that says "alert when vibration exceeds 5 mm/s" will fire the same way in year one and year ten. An agent that has seen a hundred bearing failures knows that the ramp rate matters more than the absolute value.

### Speaker Notes

> "Let me cut through the hype. There is a lot of noise around AI agents. Some of it is marketing. Some of it is real. Let us be precise about what we mean."

> "An AI agent is three things combined. First, it can use tools -- it can call APIs, query databases, create tickets. Second, it remembers context -- it knows what happened an hour ago and can connect it to what is happening now. Third, it takes action -- not just tells you something, but does something about it."

> "This is different from a chatbot. A chatbot answers your question and forgets you exist. It is different from a dashboard. A dashboard shows you the data and waits for you to notice the problem. And it is crucially different from a rule engine. A rule engine says 'if vibration exceeds 5, alert.' An agent says 'vibration is at 4.2 but the ramp rate looks like the last three bearing failures I have seen -- schedule inspection now, before it hits 5.'"

> "Three capabilities matter for manufacturing. Observe: consume real-time sensor data. Not a batch report at end of shift -- live data at fifty messages per second. Reason: detect patterns that no human can see because they span thousands of data points across multiple systems. Act: create the work order, alert the right person, and publish the finding back to your data infrastructure so every other system benefits. But act is not just about creating new work orders. It is about reading the old ones. Your CMMS has five years of closed tickets -- what worked, what did not, which parts were replaced, which adjustments fixed the problem. An agent that can read that history recommends the proven fix, not just the textbook procedure."

> "The key differentiator is this: agents get better over time. Rules do not. That rule you wrote in 2019 fires the same way today. An agent that has seen a hundred bearing failures develops nuance."

### Transition

"So that is what an agent is. Let me show you what it looks like when agents build agents."

---

## Segment 3: How We Built EdgeMind -- Agents All the Way Down (8 minutes)

### Content Outline

**Part A: The Meta Story -- Agents Building Agents (3 min)**

- EdgeMind was built in 5 weeks by a small team using Claude Code -- an AI coding agent
- Claude Code is not a single agent. It orchestrates specialized sub-agents:
  - **Architect agent** designed the tiered analysis system
  - **Engineer agents** wrote the modules (Node.js backend, vanilla JS frontend, Python agent code)
  - **Code reviewer agents** caught bugs before production (407 tests across 11 suites)
  - **Security reviewer agents** audited the MQTT ingestion pipeline and API endpoints
- The system these agents built is a factory intelligence dashboard that itself deploys AI agents to monitor factories
- Agents building agents. That is the meta layer.

**Part B: What EdgeMind Does (3 min)**

- Connects to a factory MQTT broker (50+ messages/sec across 3 enterprises)
- Stores all numeric time-series data in InfluxDB
- Runs a three-tier AI analysis system:
  - **Tier 1: Delta detection** -- every 2 minutes, pure math, no AI call. Compares current metrics against a snapshot. If nothing changed by more than 5%, it does nothing. Cost per check: **$0.00**
  - **Tier 2: Targeted analysis** -- triggered only when Tier 1 detects meaningful change. One focused AI call. "Enterprise B availability dropped 8% -- investigate."
  - **Tier 3: Comprehensive summary** -- every 30 minutes, rotating enterprise focus. Keeps the dashboard fresh even during stable operation.
- Deploys an AWS Bedrock AgentCore chat agent with the Strands SDK
  - Connects to an MCP Gateway that auto-generates tools from EdgeMind's OpenAPI spec
  - The agent can query OEE, equipment states, batch status, and factory context -- through your own APIs, exposed as tools
  - Streaming responses via SSE for real-time chat experience
- Integrates with MaintainX CMMS bidirectionally (`lib/cmms-maintainx.js`)
  - **Outbound**: creates work orders automatically when the agent detects anomalies
  - **Inbound (the vision)**: pulls historical ticket data to enrich agent recommendations -- "this bearing failed before, here is what the tech did last time"
- Publishes AI insights back to the Unified Namespace as CESMII SM Profile JSON-LD
  - Intelligence flows back into the plant's data infrastructure
  - Other systems on the UNS can consume EdgeMind's analysis

**Part C: The Cost Story (2 min)**

- Monthly infrastructure: **~$127/mo** (Fargate backend, InfluxDB, ALB, CloudFront, S3)
- Monthly AI: **~$35/mo** (down from an estimated $200+)
- That is less than a single operator's daily wage. Combined.
- How we got there:
  - **Context pre-computation**: Instead of letting the AI call tools in a loop (4-10 Bedrock round trips), we pre-fetch all data ourselves in parallel and embed it in one prompt. **10 round trips down to 1.**
  - **Tiered analysis**: Tier 1 gate eliminates **95% of AI calls** during stable operation. 120 calls/hour became ~6.
  - **Model selection**: Routine analysis uses Amazon Nova Lite ($0.00007/call). Interactive Q&A uses Claude Sonnet ($0.0044/call). That is a **61x cost difference** for the same job.
  - **Token budget circuit breaker**: Daily cap of 500,000 input tokens. If exceeded, analysis pauses automatically. Data collection continues. You never get a surprise bill.

### Speaker Notes

> "Here is where it gets meta. EdgeMind was built in five weeks using Claude Code -- which is itself an AI coding agent. But it is not just one agent. Claude Code orchestrates a team of specialized sub-agents. An architect agent designed the tiered analysis system. Engineer agents wrote the Node.js backend, the vanilla JS frontend, the Python agent code. Code reviewer agents ran every change through validation -- we have 407 tests across 11 suites. Security reviewers audited the MQTT ingestion pipeline."

> "The system these agents built? It deploys its own AI agents. An AWS Bedrock AgentCore chat agent, built with the Strands SDK, connected to an MCP Gateway that auto-generates tools from our OpenAPI spec. The agent can query OEE, check equipment states, look up batch status -- all through the same APIs the dashboard uses, exposed as tools via the Model Context Protocol. And it integrates with MaintainX -- our CMMS. Not just to create work orders when the agent finds something, but the vision is bidirectional: pull historical ticket data so the agent can say 'this bearing failed six months ago, the tech replaced the outer race and adjusted alignment by two degrees, and it ran clean for four months.' That is institutional knowledge, surfaced at exactly the right moment."

> "Agents that built a system that deploys agents. That is the story."

> "Now, the part everyone in this room cares about: what does it cost?"

> "Total infrastructure: about 127 dollars a month. That is a Fargate container, InfluxDB, a load balancer, CloudFront, and S3. Total AI cost: 35 dollars a month. Down from an estimated two hundred plus."

> "How? Three things. First, we stopped letting the AI call tools in a loop. Old approach: prompt Claude, Claude calls a tool, result comes back, Claude calls another tool, another result -- four to ten Bedrock round trips per analysis. New approach: we fetch all the data ourselves, in parallel, and stuff it into one prompt. **Ten round trips down to one.**"

> "Second, we built a gatekeeper. Tier 1 runs every two minutes, checks if anything actually changed. If not -- no AI call. Zero cost. This one check eliminates ninety-five percent of our Bedrock calls."

> "Third, we use a cheaper model for routine analysis. Amazon Nova Lite costs sixty-one times less per call than Claude Sonnet. We keep Sonnet for the interactive chat where you need the smartest model. Routine monitoring? Nova Lite handles it fine."

> "And if something goes wrong -- a runaway analysis loop, unexpected data volume -- there is a circuit breaker. Five hundred thousand input tokens per day, configurable. Hit the limit, analysis pauses. Data keeps flowing. You never get a surprise bill."

### Transition

"Enough about how we built it. Let me show you what it does when a machine starts failing."

### Key Numbers to Emphasize

- **5 weeks** from zero to production dashboard
- **50+ msgs/sec** MQTT throughput
- **10 Bedrock round trips down to 1** (context pre-computation)
- **120 calls/hr down to ~6** (95% reduction via tiered analysis)
- **61x cheaper** model for routine analysis (Nova Lite vs Sonnet)
- **$127/mo** infrastructure, **$35/mo** AI
- **500,000** daily token budget with automatic circuit breaker
- **407 tests** across 11 suites
- **$0.00** per Tier 1 check

---

## Segment 4: Live Demo -- Agent Detects What Humans Miss (7 minutes)

See **Section 3: Demo Script** below for the full step-by-step walkthrough.

### Speaker Notes

> "I am going to trigger a bearing degradation scenario on a high-speed rotary filler in Enterprise B. This is the kind of failure that an experienced operator might catch early -- a subtle change in vibration pattern, a slight drop in production rate. A new hire will not notice it until the machine is down."

> "The agent detects the vibration ramp, correlates it with the production rate drop, and tells maintenance exactly what to inspect -- in under three minutes. That knowledge does not go home at five PM. It does not retire. It does not call in sick. It is institutional intelligence, available on every shift."

### Transition

"That is the product. Now let me talk about how you get started in your own operation."

---

## Segment 5: Making It Real -- Your Factory, Your Agents (3 minutes)

### Content Outline

- Three starting points, ordered from easiest to most impactful:

1. **Start with monitoring**
   - Connect your historian or MQTT broker to an agent that watches for anomalies
   - No changes to your existing systems. Read-only access. Low risk.
   - Even a basic agent that says "vibration on Filler 7 is trending up 15% over the last hour" is valuable if it runs on every shift

2. **Capture tribal knowledge**
   - Interview your veterans before they leave. Record their heuristics. Encode their rules into agent context.
   - "When the south bearing on Line 3 gets above 4 mm/s AND the ambient temperature is above 35C, reduce speed to 280 before it trips"
   - That becomes part of the agent's system prompt. Every operator on every shift gets the benefit of 30 years of experience.
   - But you probably already HAVE more institutional knowledge than you realize. Your CMMS has years of closed tickets -- what broke, what fixed it, which parts were used, what adjustments worked. Connect your agent to your work order history. Five years of closed tickets becomes your agent's training data.

3. **Close the loop**
   - Connect agent insights to your CMMS (automatic work orders)
   - Connect to SCADA (parameter adjustment recommendations)
   - Connect to operator tablets (real-time guidance)
   - The agent observes, reasons, and acts -- not just reports

- What NOT to do: do not try to replace operators. The agent is the institutional memory. The human is the decision maker. The agent says "I think this bearing is failing, here is why, and here is what I recommend." The operator decides whether to act on it.

- The ROI question: "One prevented unplanned downtime event pays for a year of agent infrastructure. At $127 a month, you need to prevent exactly one incident."

### Speaker Notes

> "Three starting points. First, just monitor. Hook an agent up to your historian or MQTT broker. Read-only. No changes to your existing systems. Even a basic agent that tells you 'vibration on Filler 7 is trending up' is valuable if it runs twenty-four seven and your best operator only works eight hours."

> "Second, capture tribal knowledge while you still can. Sit down with your veterans. Record their heuristics. 'When the south bearing gets above 4 and the ambient is above 35, slow down before it trips.' That becomes context the agent carries. Every operator on every shift gets the benefit. And here is the part most people miss -- you probably already have more institutional knowledge than you think. Your CMMS. Five years of closed work orders. What broke, what the tech did, what parts were used, what worked. That IS the tribal knowledge. It is already captured, already structured. You just cannot access it at two AM when a machine is down. An agent can."

> "Third, close the loop. Connect the agent to your CMMS so it creates work orders automatically. Connect it to operator tablets so the guidance appears in real time. The agent observes, reasons, and acts."

> "But here is what NOT to do: do not try to replace operators. The agent is the institutional memory. The human is the decision maker. The agent says 'I think this bearing is failing, here is why, here is what I recommend.' The operator decides."

> "The ROI question is simple. At 127 dollars a month for infrastructure, you need to prevent exactly one unplanned downtime event per year to justify the investment. One."

### Transition

"I have about two minutes for questions. Who wants to go first?"

---

## Segment 6: Q&A (2 minutes)

### Prepared Answers for Expected Questions

**"What does this cost to run?"**
> "About $127 per month total infrastructure. $22 for Fargate backend, $7 for InfluxDB on Spot instances, $35 for Bedrock AI, $16 for the load balancer, and a few dollars for CloudFront and storage. The AI cost dropped from an estimated $200+ per month to $35 after the tiered architecture and model switch."

**"Can this work with our existing SCADA/PLC setup?"**
> "If your data lands on an MQTT broker or you have an OPC-UA server, yes. We also support Sparkplug B protocol. The topic parser is generic -- you need enterprise, site, area, and machine in your topic structure. If you have a historian, an MQTT bridge gets you connected."

**"How accurate is the AI analysis?"**
> "It depends on the model and the quality of your data. Sonnet for interactive queries is very good at reasoning across multiple data sources. Nova Lite for routine monitoring occasionally produces less nuanced summaries, but it catches real anomalies. Every insight comes with a confidence score. Low-confidence insights are flagged."

**"How long from anomaly to insight?"**
> "About 3 minutes worst case. Tier 1 runs every 2 minutes. If it detects a meaningful change, Tier 2 fires immediately. The Bedrock call takes a few seconds. So worst case is 2 minutes waiting for the next Tier 1 check plus Bedrock latency."

**"What about data privacy? Does factory data leave our network?"**
> "The AI calls go to AWS Bedrock, which is within your AWS account and region. Bedrock does not use your data for model training. The data stays in your VPC for InfluxDB storage. You control the network boundaries."

**"Where does the agent get its knowledge? How does it know what to recommend?"**
> "Three sources. First, the real-time sensor data -- it watches your MQTT or OPC-UA streams continuously. Second, the context we encode -- veteran operator heuristics, equipment specifications, known failure modes. Third -- and this is the one people miss -- your CMMS. Years of closed work orders are institutional knowledge in structured form. 'Replaced bearing on Filler 23, adjusted alignment 2 degrees, ran clean for four months.' An agent that can read your work order history recommends the proven fix, not just the textbook procedure. The knowledge is not gone. It is buried in your CMMS. The agent surfaces it at the right moment."

**"How do we get started?"**
> "Simplest path: connect your MQTT broker to an InfluxDB instance, point an agent at it. The entire EdgeMind stack is Node.js and InfluxDB -- no exotic infrastructure. Start with monitoring, iterate from there."

---

# SECTION 2: Slide Content

---

### Slide 1: Title

**AI Agents in Manufacturing**
*From Tribal Knowledge to Institutional Intelligence*

- Stefan Bekker | Concept Reply US
- ProveIt! Conference 2026
- https://edge-mind.concept-reply-sandbox.com

**Visual**: Dark background. Factory floor silhouette with data streams flowing upward, converging into a brain/network icon. Subtitle below. No screenshots yet.

**Speaker notes**: "This is a workshop about a real problem in manufacturing and a practical solution. The problem: critical knowledge lives in people's heads. The solution: AI agents that turn that knowledge into institutional intelligence that never retires."

---

### Slide 2: The Knowledge Problem

**Your Best Operator Is a Single Point of Failure**

- Critical manufacturing knowledge is undocumented and lives in people's heads
- When expertise walks out the door, the next person inherits the job but not the intuition
- They follow procedures they do not understand, repeat rituals without knowing why
- Troubleshooting takes 3x longer without institutional memory
- Knowledge gaps compound across shifts, sites, and years
- The cost: repeated failures, quality inconsistency, extended downtime
- The twist: some of that knowledge is already captured -- buried in your CMMS tickets, maintenance logs, shift notes. But nobody reads five years of closed tickets at 2 AM.

**Visual**: Simple diagram. Person icon with a thought bubble full of gears/patterns, an arrow pointing to a door labeled "Retirement / Transfer / Quit". On the other side, an empty thought bubble over a new person icon. Below: a filing cabinet labeled "CMMS: 5 years of closed tickets" with a padlock.

**Speaker notes**: "The most valuable asset in your operation is not your equipment. It is the knowledge inside your best people's heads. And it is completely unprotected. One retirement, one resignation, and decades of pattern recognition disappear overnight. But here is the twist -- some of that knowledge is not actually gone. It is buried in your CMMS. Five years of closed work orders. What broke, what fixed it, which adjustments worked. The knowledge is there. You just cannot access it when you need it."

---

### Slide 3: What If the System Could Remember?

**AI Agents: Observe, Reason, Act**

- **Observe** -- Consume real-time sensor data (MQTT, OPC-UA, historians)
  - 50+ messages per second, 24/7, every shift
- **Reason** -- Detect patterns humans miss across thousands of data points
  - Correlate upstream vibration with downstream quality drift
  - Connect dots across shifts, lines, and enterprises
- **Act** -- Create work orders, alert the right person, publish findings
  - Intelligence flows back into the plant's data infrastructure
  - Read historical CMMS tickets to recommend what worked last time

**Not chatbots. Not dashboards. Not rule engines.**
Agents get better over time. Rules do not.

**Visual**: Three columns with icons -- Eye (Observe), Brain (Reason), Hand (Act). Below each, 2-3 bullet points. At the bottom, a crossed-out chatbot icon, dashboard icon, and rule engine icon.

**Speaker notes**: "An agent is three things. It observes real-time data -- not batch reports, live data. It reasons about that data -- finding patterns no human can track across thousands of data points. And it acts -- creates work orders, alerts people, publishes findings. But 'act' is not just outbound. An agent can read your historical CMMS tickets and recommend the fix that actually worked last time -- not just the textbook answer. That last part is what separates agents from dashboards. Dashboards show you data and wait. Agents do something about it."

---

### Slide 4: The Meta Layer

**We Used AI Agents to Build a System That Uses AI Agents**

Building EdgeMind (5 weeks, small team):
- **Architect agent** designed the tiered analysis system
- **Engineer agents** wrote the code (Node.js, vanilla JS, Python)
- **Code reviewer agents** validated logic (407 tests, 11 suites)
- **Security reviewer agents** audited MQTT ingestion and APIs

What EdgeMind deploys:
- **AWS Bedrock AgentCore** chat agent (Strands SDK)
- **MCP Gateway** auto-generates tools from our REST API
- **Three-tier analysis loop** for continuous factory monitoring

*Agents building agents. That is the story.*

**Visual**: Two-layer diagram. Top layer: "Claude Code" with sub-agents (Architect, Engineer, Reviewer). Arrow down labeled "Built." Bottom layer: "EdgeMind" with its own agents (Chat Agent, Analysis Loop, MCP Gateway). The recursion is the visual hook.

**Speaker notes**: "Here is what makes this story unique. We did not just build a system that uses AI agents. We used AI agents to build it. Claude Code -- an AI coding agent -- orchestrated specialized sub-agents. Architect, engineers, code reviewers, security reviewers. Five weeks from zero to a production dashboard. The system they built deploys its own AI agents on AWS Bedrock AgentCore. Agents building agents."

---

### Slide 5: EdgeMind Architecture

**One Pipeline, Five Minutes to Insight**

```
MQTT Broker (50+ msg/sec)
       |
    [Node.js]  -- topic parsing, tag normalization
       |
    [InfluxDB]  -- time-series storage (5-min window)
       |
    [Tiered AI]  -- Delta detection -> Targeted analysis -> Summaries
       |
    [Dashboard]  -- WebSocket (throttled 1:10)
       |
    [CESMII]  -- publish insights back to UNS as SM Profiles
       |
    [AgentCore]  -- chat agent with MCP Gateway (agents calling your APIs)
```

**Visual**: Vertical flow diagram with icons for each component. Color-coded: blue for data flow, orange for AI, green for outputs.

**Speaker notes**: "One Node.js process handles everything. MQTT data comes in, gets parsed and stored in InfluxDB. The tiered AI system watches for changes. When it detects something, it analyzes and broadcasts to the dashboard. It also publishes findings back to the MQTT broker as CESMII SM Profiles -- intelligence flowing back into the plant's data infrastructure. And there is a chat agent on AgentCore that operators can talk to."

---

### Slide 6: Tiered AI -- 95% Fewer Calls

**The Gatekeeper Pattern**

```
             /\
            /  \        Tier 3: Deep Summary
           / 30m\       Every 30 min, enterprise rotation
          /------\       ~2 calls/hour
         /        \
        / Tier 2:  \     Targeted Analysis
       /  On-Demand \    Only when Tier 1 detects change
      /--------------\   ~4 calls/hour (peak)
     /                \
    /   Tier 1: FREE   \  Delta Detection
   /    Every 2 min     \  No AI call, pure math
  /______________________\ ~30 checks/hour, $0
```

| Before | After |
|--------|-------|
| 120 AI calls/hour | ~6 AI calls/hour |
| $200+/mo AI cost | **$35/mo AI cost** |
| Same insight repeated 95% of the time | Only fires when something changes |

**Visual**: Pyramid diagram. Tier 1 at the base (widest, cheapest). Tier 3 at the top. Side-by-side cost comparison.

**Speaker notes**: "Our first version called the AI every thirty seconds. 120 Bedrock calls per hour. Ninety-five percent of those calls came back saying the exact same thing. We were burning money to hear yesterday's news. So we built a gatekeeper. Tier 1 runs every two minutes, costs nothing. It checks if anything actually changed. If not -- no AI call. This one design decision eliminated ninety-five percent of our AI spend."

---

### Slide 7: Context Pre-Computation

**10 API Round Trips Down to 1**

Before (tool call loop):
```
Prompt -> AI -> tool_use(get_oee) -> result -> AI
  -> tool_use(get_equipment) -> result -> AI
  -> tool_use(get_batch) -> result -> AI -> response

  = 4-10 round trips per analysis
```

After (pre-fetch):
```
Fetch OEE + Equipment + Batch (in parallel)
  -> Single prompt with ALL data embedded
  -> AI -> response

  = 1 round trip
```

**Visual**: Two sequence diagrams side by side. Left: 4+ arrows bouncing back and forth (slow, expensive). Right: 1 arrow (fast, cheap).

**Speaker notes**: "The second optimization. Instead of giving the AI tools and letting it call them one by one -- four to ten round trips -- we fetch all the data ourselves. In parallel. OEE, equipment states, batch status. We stuff it all into one prompt. The AI responds in a single shot. Ten round trips down to one."

---

### Slide 8: Model Cost Optimization

**61x Cheaper for Routine Analysis**

| Use Case | Model | Cost per Call |
|----------|-------|---------------|
| Interactive Q&A (chat) | Claude Sonnet | ~$0.0044 |
| Routine Tier 2/3 analysis | Amazon Nova Lite | ~$0.00007 |
| **Difference** | | **61x cheaper** |

- Nova Lite is Amazon-native -- no Marketplace subscription required
- Switchable via environment variable (`BEDROCK_TIER_MODEL_ID`)
- Safety net: 500,000 daily token budget with automatic circuit breaker

**Visual**: Bar chart comparing costs. Claude bar is tall. Nova bar is barely visible. Label: "61x."

**Speaker notes**: "Routine monitoring does not need the smartest model. We use Amazon Nova Lite for Tier 2 and Tier 3 -- sixty-one times cheaper per call. We keep Claude Sonnet for the interactive chat where operators ask complex questions. And there is a circuit breaker: five hundred thousand tokens per day. Hit the limit, analysis pauses. You never get a surprise bill."

---

### Slide 9: AgentCore Chat -- Ask Your Factory a Question

**Agents Calling Your APIs as Tools**

```
Operator: "What is happening with the filler?"
    |
    v
[AgentCore Runtime]  -- Strands SDK, Python
    |
    v
[MCP Gateway]  -- auto-generated from OpenAPI spec
    |
    v
[EdgeMind REST API]  -- getOEEv2, getEquipmentStates, getBatchStatus
    |
    v
Agent: "Filler on FillingLine01 is showing elevated vibration (6.2 mm/s,
        threshold 5.0). Production rate has dropped from 307 to 285 units/min.
        Recommend immediate bearing inspection."
```

- Agent uses the same APIs the dashboard uses -- exposed as MCP tools
- Bedrock Knowledge Base integration for SOP retrieval
- Streaming responses via SSE

**Visual**: Flow diagram showing the question flowing through AgentCore to MCP Gateway to REST API and back. Highlight that the agent calls YOUR endpoints.

**Speaker notes**: "The chat agent is not a separate system with its own data. It uses the same REST APIs the dashboard uses -- OEE, equipment states, batch status. The MCP Gateway auto-generates tools from our OpenAPI spec. The agent can call any endpoint we expose. Ask it a question, it queries your factory, and gives you a contextual answer."

---

### Slide 10: CESMII -- Intelligence Back to the UNS

**Bidirectional SM Profile Support**

**Consume** (inbound):
- Auto-detect JSON-LD payloads in MQTT stream
- Validate against OPC UA type system (13 types)
- Store validated work orders and profile data

**Publish** (outbound):
- `OEEReportV1` -- OEE calculations as SM Profiles
- `FactoryInsightV1` -- AI-generated insights as SM Profiles
- Topic: `edgemind/insights/{enterprise}`

*The agent's intelligence flows back into the plant's data infrastructure.*

**Visual**: Two arrows. Left arrow (inbound): WorkOrderV1 flowing in. Right arrow (outbound): FactoryInsightV1 and OEEReportV1 flowing out. MQTT broker in the center.

**Speaker notes**: "The agent does not just consume data. It publishes intelligence back to the Unified Namespace as CESMII SM Profile-compliant JSON-LD. Any other system on the UNS can consume our AI analysis. That is the institutional intelligence part -- the knowledge does not stay in one dashboard. It flows back into the plant's data infrastructure."

---

### Slide 11: Demo Time

**Agent Detects What Humans Miss**

- Enterprise B, Site1, FillingLine01
- Bearing degradation simulation
- Vibration ramps: 2.1 mm/s to 8.4 mm/s over 3 minutes
- Production rate drops: 307 to 280 units/min
- Watch for: agent detection, correlation, and recommendation
- Then: ask the chat agent what is happening

*An experienced operator might catch this. A new hire will not.*
*The agent catches it every time.*

**Visual**: Full-screen transition slide. Dark background. "LIVE DEMO" in large text. Subtitle: "Bearing Degradation -- From Data to Action in 3 Minutes."

**Speaker notes**: "Time to show it working. I am going to trigger a bearing failure on a filler. Vibration will ramp up, production rate will drop. The agent will detect it, explain it, and tell maintenance what to do. Then I will ask the chat agent directly. Under three minutes. Every time. Every shift."

---

### Slide 12: Making It Real

**Three Starting Points**

1. **Start with monitoring** (Week 1)
   - Connect your historian/MQTT broker to an agent
   - Read-only. No changes to existing systems. Low risk.

2. **Capture tribal knowledge** (Month 1)
   - Interview your veterans. Record their heuristics.
   - Encode them as agent context.
   - Connect your agent to your CMMS history -- the knowledge is already there.
   - Every operator gets the benefit of 30 years of experience.

3. **Close the loop** (Quarter 1)
   - Agent -> CMMS (automatic work orders)
   - Agent <- CMMS (historical ticket knowledge)
   - Agent -> SCADA (parameter recommendations)
   - Agent -> Operator tablets (real-time guidance)

**The agent is the institutional memory. The human is the decision maker.**

**Visual**: Three columns with a timeline arrow across the bottom. Week 1, Month 1, Quarter 1. Each with an icon: eye, brain, hand.

**Speaker notes**: "Three starting points. Start with monitoring -- read-only, low risk, immediate value. Then capture tribal knowledge -- and remember, you probably already have more than you think. Your CMMS has years of closed tickets. Connect your agent to that history. Then close the loop -- the agent creates new work orders AND references old ones. Connect it to your SCADA, your operator tablets. But remember: the agent is the institutional memory. The human is the decision maker. Always."

---

### Slide 13: By The Numbers

| Metric | Value |
|--------|-------|
| MQTT throughput | 50+ msgs/sec |
| AI calls before optimization | ~120/hour |
| AI calls after optimization | **~6/hour** |
| **Cost reduction** | **95% fewer AI calls** |
| Model cost savings | **61x cheaper** (Nova Lite vs Sonnet) |
| Bedrock round trips | **10 down to 1** |
| Monthly infrastructure | **~$127/mo** |
| Monthly AI cost | **~$35/mo** |
| Time to insight | **~3 minutes** |
| Build time | **5 weeks** |
| Test suites | 11 suites, 407 tests |
| Daily token budget | 500,000 input tokens |

*One prevented downtime event pays for a year of agent infrastructure.*

**Visual**: Clean table on dark background. Bold the numbers that show contrast (before vs after).

**Speaker notes**: "Here is the summary. 120 AI calls per hour down to 6. Sixty-one times cheaper per call. 127 dollars a month for infrastructure. 35 dollars for AI. One prevented downtime event and the whole thing pays for itself for a year."

---

### Slide 14: Q&A

**Questions?**

- **Dashboard**: https://edge-mind.concept-reply-sandbox.com
- **Health**: https://edge-mind.concept-reply-sandbox.com/health
- **GitHub**: Concept-Reply-US/EdgeMind

Built with: Node.js, InfluxDB, AWS Bedrock (Claude Sonnet + Nova Lite), AgentCore (Strands SDK), MCP Gateway, Express, WebSocket, MQTT, CESMII SM Profiles

*Agents building agents. Institutional intelligence that never retires.*

**Visual**: Contact info. QR code to dashboard URL. Company logo.

**Speaker notes**: "The dashboard is live right now. Pull it up on your phone. Ask the chat agent a question. And if you want to talk about how this applies to your operation, come find me after."

---

# SECTION 3: Demo Script (7 Minutes)

## Pre-Demo Checklist

Before starting the demo, verify:

- [ ] Dashboard is live at https://edge-mind.concept-reply-sandbox.com
- [ ] Health check returns OK: `curl https://edge-mind.concept-reply-sandbox.com/health`
- [ ] MQTT broker is connected (dashboard header shows "CONNECTED" indicator)
- [ ] InfluxDB is accepting writes (health check shows `influxdb: connected`)
- [ ] AI analysis is enabled (check `DISABLE_INSIGHTS` is NOT set to `true`)
- [ ] Browser is on the Plant Manager persona view (navigate to `#plant` or click Plant Manager chip)
- [ ] Open a second browser tab with the COO view (`#coo`) for the enterprise-level perspective
- [ ] Terminal ready for curl commands (optional, for manual triggers)

## Fallback Plan

If the live demo fails (MQTT disconnected, Bedrock timeout, etc.):

1. Switch to pre-recorded screenshots or video
2. Walk through the codebase on screen -- show `lib/ai/index.js` tiered architecture
3. Show the demo scenario definition in `lib/demo/scenarios.js` to explain what WOULD happen
4. Run the demo locally if time permits:
   ```bash
   # Start local stack
   docker compose -f docker-compose.local.yml up -d
   npm run dev
   # Open http://localhost:3000
   ```

## Timestamped Demo Flow

### [0:00] Set the Scene

**Action**: Show the dashboard in its normal state.

**Narrate**: "This is EdgeMind running live, connected to the ProveIt! virtual factory broker. Real-time MQTT data streaming in. OEE gauges for three enterprises. Everything is green. This is what normal looks like -- and an experienced operator would glance at this and move on. But what happens when something starts to go wrong slowly enough that you do not notice?"

**Point at**: OEE gauges, live MQTT stream, equipment state indicators.

---

### [0:30] Set the Tribal Knowledge Frame

**Action**: Click on the Equipment panel. Show that filler equipment is RUNNING with normal vibration.

**Narrate**: "Look at the filler on FillingLine01. Running normally. An operator who has been on this line for fifteen years would tell you that this machine has a specific vibration signature. They know what normal sounds like. They would notice when it changes. But what about the operator who started last month?"

**Point at**: Equipment state grid, Enterprise B section.

---

### [1:00] Launch the Scenario

**Action**: Trigger the filler-vibration demo scenario.

**API endpoint**:
```bash
curl -X POST https://edge-mind.concept-reply-sandbox.com/api/demo/scenario/launch \
  -H "Content-Type: application/json" \
  -d '{"scenarioId": "filler-vibration"}'
```

Or use the Demo Control panel in the dashboard UI (navigate to `#demo` persona, click "Filler Vibration Anomaly", click "Launch").

**Narrate**: "I am starting a bearing degradation scenario. Vibration will ramp from 2.1 to 8.4 mm/s over three minutes. Production rate will start dropping at the one-minute mark. An experienced operator might notice. A new hire will not. Let us see what the agent does."

**Point at**: The demo control panel confirmation, or the terminal showing the curl response.

---

### [1:30] Watch the Data Change

**Action**: Switch to the MQTT stream view. Watch for vibration messages appearing.

**Narrate**: "Watch the MQTT stream. Vibration readings for Enterprise B, Site1, fillingline01, filler. The values are climbing. Every 5 seconds, a new reading. This is the kind of slow ramp that gets lost in the noise of fifty messages per second -- unless something is watching for exactly this pattern."

**Point at**: MQTT stream panel, filter for "vibration" if possible.

**What is happening behind the scenes**:
- Demo engine publishes to: `Enterprise B/conceptreply/Site1/fillerproduction/fillingline01/filler/processdata/vibration/level`
- Server strips `conceptreply` namespace, writes to InfluxDB as `vibration_level` measurement
- Values ramp linearly: 2.1 to 8.4 mm/s over 180 seconds, with 0.2 noise

---

### [2:00] Point Out the Ramp

**Action**: If a vibration chart is visible, point at the upward trend. Otherwise, narrate the values increasing in the MQTT stream.

**Narrate**: "See the vibration climbing? Started at 2.1, now past 3. Normal range is 1 to 4 for this type of filler. Approaching the warning threshold. A twenty-year veteran would hear this. A two-month hire is looking at a number on a screen."

---

### [2:30] Explain What the AI is Doing

**Action**: No new action. Fill time while waiting for the AI analysis.

**Narrate**: "Right now, the agent's Tier 1 check is running its delta detection. Pure math -- comparing the current snapshot against the last one. Once the change exceeds five percent, it triggers Tier 2 -- a focused AI analysis. 'Vibration on the filler increased significantly. Investigate.' No generic alert. A targeted analysis of what actually changed."

---

### [3:00] AI Insight Appears

**Action**: Watch the Edge Minder insights panel for a new insight. It should arrive approximately 45 seconds after scenario launch (demo-triggered fast path).

**Narrate**: "There it is. The agent detected the anomaly. Read the insight -- it identifies the specific equipment, the metric, the actual value, the threshold that was breached. And look at the recommendation: immediate bearing inspection on the filler. This is the knowledge that used to live in one person's head. Now it is institutional. Available on every shift. To every operator."

**Point at**: The new insight card in the Edge Minder panel. Read the summary aloud. Highlight the severity badge (should be "high") and the confidence score.

---

### [3:30] Show the Anomaly Details

**Action**: Click on the anomaly to expand it (if the UI supports expansion).

**Narrate**: "Each anomaly includes the reasoning -- not just 'vibration is high' but why the agent thinks it is a bearing degradation. The ramp pattern. The rate of change. The correlation with production rate. This is the kind of analysis that takes a veteran five minutes and a new hire might never make."

**Point at**: The `recommendations` field, the `actual_value` vs `threshold` comparison.

---

### [4:00] Ask the Chat Agent

**Action**: Open the chat panel. Type: "What is happening with the filler?"

**Narrate**: "Now I am going to ask the chat agent directly. This is the Bedrock AgentCore agent we deployed -- Strands SDK, connected to our REST APIs via MCP Gateway. Watch -- it will query OEE, check equipment states, and give us a contextual answer."

**Wait for response. Read it aloud.**

**Narrate**: "That answer came from querying our own factory APIs as tools. The agent is not guessing. It checked the data, reasoned about it, and explained what is happening. That is institutional intelligence -- any operator can ask the question and get the expert-level answer."

---

### [4:30] Inject a Second Anomaly

**Action**: While the vibration scenario is still running, inject an additional anomaly on a different piece of equipment.

**API endpoint**:
```bash
curl -X POST https://edge-mind.concept-reply-sandbox.com/api/demo/inject \
  -H "Content-Type: application/json" \
  -d '{"equipment": "caploader", "anomalyType": "torque", "severity": "moderate", "durationMs": 120000}'
```

**Narrate**: "Now I am injecting a second anomaly -- torque problems on the cap loader downstream. This simulates a cascade: the filler is vibrating, and now the capper is struggling. A veteran would connect these dots immediately. Let us see if the agent does."

---

### [5:00] Show the CESMII Output

**Action**: Navigate to the CESMII panel or show the published SM Profile.

**Narrate**: "Meanwhile, the agent is publishing its findings back to the MQTT broker as CESMII FactoryInsightV1 SM Profiles. This is not just a dashboard feature. The intelligence flows back into the Unified Namespace. Any other system -- another dashboard, a CMMS integration, a different team's analytics tool -- can consume this. The knowledge is institutional because it lives in the data infrastructure, not in one application."

**Point at**: CESMII stats panel showing `profilesPublished` counter incrementing.

---

### [5:30] Switch to COO View

**Action**: Switch to the COO persona view (`#coo`).

**Narrate**: "Switch to the executive view. The COO sees Enterprise B's OEE dropping, a red status indicator, and a summary of what is happening across all three enterprises. Same data, different level of abstraction. The operator gets the detailed bearing recommendation. The executive gets the enterprise impact."

**Point at**: Enterprise comparison view, OEE trend chart showing the dip.

---

### [6:00] Show Token Usage

**Action**: Show the token usage endpoint.

```bash
curl https://edge-mind.concept-reply-sandbox.com/api/agent/token-usage
```

**Narrate**: "And here is the cost story in real time. Check our AI budget -- call count, input tokens, output tokens. That entire analysis -- detecting the anomaly, reasoning about the cause, writing the recommendation, publishing to the UNS, answering my chat question -- all of it cost a fraction of a cent. The circuit breaker has not fired. We are well within budget."

---

### [6:30] Stop the Scenario and Close

**Action**: Stop the running scenario.

**API endpoint**:
```bash
curl -X POST https://edge-mind.concept-reply-sandbox.com/api/demo/scenario/stop
```

Or use the Demo Control panel "Stop" button.

**Narrate**: "That is the demo. In under three minutes, EdgeMind detected a bearing degradation that a new hire would have missed, correlated it with downstream effects, published the finding back to the Unified Namespace, and gave us an actionable recommendation. All for less than a tenth of a cent."

> "That knowledge does not go home at five PM. It does not retire. It does not transfer to the other plant and take everything it knows with it. It is institutional intelligence. And that is the point."

**Point at**: Final insight summary, cost numbers.

---

### [6:30 - 7:00] Transition to Making It Real

**Action**: Return to slides.

**Narrate**: "That is what the agent does. Now let me talk about how you start doing this in your own operation."
