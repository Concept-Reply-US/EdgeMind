# Anomaly Filtering

Anomaly filtering lets operators define plain-language rules that control how the AI agent detects and reports anomalies. Rules are fed directly into the AI analysis prompt on the next 30-second cycle, giving you real-time control over alert relevance without touching any code.

---

## Table of Contents

- [How to Use Filters](#how-to-use-filters)
- [How Filters Work Internally](#how-filters-work-internally)
- [Example Filter Rules](#example-filter-rules)
- [Limits and Constraints](#limits-and-constraints)
- [Best Practices](#best-practices)
- [Real-Time Sync Across Clients](#real-time-sync-across-clients)
- [See Also](#see-also)

---

## How to Use Filters

Filters are managed from the **AI Agent panel** on the dashboard (the "All Insights" / "Anomalies" card).

### Adding a filter

1. Locate the filter input box at the top of the AI Agent panel. It reads: *"Add filter rule (e.g., 'ignore anomalies below 10% deviation')"*.
2. Type a natural language rule into the input box.
3. Press **Enter** or click the **Add Filter** button.
4. The rule appears as a removable chip below the input.

### Removing a filter

Click the **X** on any active filter chip to remove it. The change takes effect on the next analysis cycle.

### When filters take effect

The AI agent runs its trend analysis every **30 seconds**. After you add or remove a filter, the updated rule set is applied on the very next cycle. In practice, you will see the effect within 30 seconds.

---

## How Filters Work Internally

Understanding what happens behind the scenes helps you write more effective rules.

1. **Storage.** Active filters are stored in server-side state (`factoryState.anomalyFilters`). They are not saved to a database -- they live in memory for the lifetime of the server process.

2. **Prompt injection.** When the AI agent runs its trend analysis, all active filter rules are appended to the system prompt as a numbered list under the heading "User-Defined Anomaly Filter Rules." The AI interprets these as operational constraints on its anomaly reporting.

3. **Broadcast.** When any user adds or removes a filter, the server validates the change and broadcasts the updated filter set to every connected dashboard client via WebSocket. All clients immediately render the same set of active filter chips.

4. **Initial sync.** When a new client connects, the server sends the current filter set as part of the `initial_state` WebSocket message. New clients always see filters that were already active.

### What filters can do

Because filters are natural language instructions to the AI, they can:

- **Suppress alerts** for specific metrics, areas, or severity levels.
- **Raise or lower thresholds** for what the AI considers anomalous.
- **Focus attention** on a particular enterprise, site, or production line.
- **Reclassify severity** -- for example, making a warning-level event critical.
- **Exclude known false positives** -- for example, suppressing humidity alerts in a cleanroom undergoing calibration.

---

## Example Filter Rules

The table below shows practical rules you can type directly into the filter input. Each rule is a plain English sentence -- no special syntax is needed.

| Filter Rule | Effect |
|---|---|
| Ignore temperature variance less than 1% | Suppresses minor temperature fluctuations across all enterprises |
| Only report critical alerts during maintenance windows | Reduces noise during planned downtime so only urgent issues surface |
| Focus on Enterprise B packaging line | Prioritizes alerts from the Enterprise B packaging area over other areas |
| Treat OEE below 60% as critical, not warning | Adjusts the severity classification for low OEE readings |
| Ignore humidity alerts in Site 2 cleanroom | Suppresses known false positives from a specific sensor zone |
| Report all energy consumption anomalies regardless of magnitude | Lowers the threshold for energy-related metrics so even small changes are reported |

---

## Limits and Constraints

| Constraint | Value |
|---|---|
| Maximum active filters | 10 |
| Maximum characters per filter | 200 |
| Filter format | Plain text (no special syntax) |
| Persistence | In-memory only -- cleared on server restart |
| Scope | Shared across all connected clients |
| Validation | Server rejects non-string values, empty strings, and strings over 200 characters |

If you attempt to add an 11th filter, the dashboard displays an alert: *"Maximum 10 filter rules allowed."*

Filters do not persist across server restarts. If the server is restarted (for example, during a deployment), all filters are cleared and must be re-added manually.

---

## Best Practices

**Be specific.** The more context you give the AI, the more accurate the filter behavior.

| Less effective | More effective |
|---|---|
| Ignore temperature | Ignore temperature in Site 3 mixer |
| Suppress low alerts | Suppress low-severity alerts for Enterprise A during shift change |

**Use filters temporarily.** Filters are ideal for short-lived situations: maintenance windows, known sensor calibration, or shift changes. Add the filter before the event starts and remove it when the event ends.

**Review active filters regularly.** Stale filters can hide real problems. After a maintenance window closes or a known issue is resolved, remove the filter so the AI resumes full monitoring.

**Combine filters for focused monitoring.** You can stack multiple filters to create a precise monitoring window. For example:

1. `Focus on Enterprise B packaging line`
2. `Treat OEE below 60% as critical`
3. `Ignore humidity variance less than 5%`

Together, these three filters tell the AI to zero in on Enterprise B packaging, escalate OEE drops, and ignore minor humidity noise -- all at once.

**Coordinate with your team.** Filters are shared across all connected clients. Before adding a filter, make sure other operators on the dashboard are aware. Removing someone else's filter without coordination can re-enable alerts they intentionally suppressed.

---

## Real-Time Sync Across Clients

Anomaly filters are a **shared operational control**, not a per-user setting. Every connected dashboard client sees the same active filters.

- When any user adds a filter, the server broadcasts the updated filter set to all clients immediately.
- When any user removes a filter, the same broadcast occurs.
- When a new client connects, it receives the current filter set as part of its initial state.

This means the entire operations team works from the same view. If a plant manager adds a filter from their workstation, an operator on the factory floor sees that filter appear on their screen within seconds.

There is no per-user filter isolation. If you need to suppress alerts only for your own view, use the enterprise selector dropdown at the top of the dashboard to narrow your scope instead.

---

## See Also

- [[AI-Trend-Analysis]] -- How the AI agent analyzes factory trends every 30 seconds
- [[Module-AI]] -- Technical reference for the `lib/ai/index.js` backend module
