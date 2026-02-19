export const SLEEPING_AGENT_MESSAGES = [
  "The AI is taking a power nap. Data collection continues.",
  "Agent on coffee break. Factory still running smoothly.",
  "Currently in 'observe mode' - watching, not chatting.",
  "The copilot stepped out. Left the autopilot on.",
  "Shhh... the neural networks are dreaming of electric sheep.",
  "Agent is meditating on your data. Silently.",
  "Taking a byte out of downtime. Analysis paused.",
  "The AI went to grab a byte to eat. Back soon.",
  "Running in stealth mode. All sensors, no chatter.",
  "Copilot is AFK. Factory keeps on trucking.",
  "Brain on standby. Eyes still on the sensors.",
  "The algorithm is touching grass. Data still flowing.",
  "Agent is buffering... just kidding, insights are off.",
  "Currently vibing in low-power mode.",
  "The AI took a personal day. Machines don't judge."
]

export const WS_URL = (() => {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return window.location.hostname === 'localhost'
    ? 'ws://localhost:3000/ws'
    : `${wsProtocol}//${window.location.host}/ws`
})()

export const PERSONA_DEFAULTS: Record<string, string> = {
  coo: 'coo-dashboard',
  plant: 'plant-line-status',
  demo: 'demo-scenarios'
}
