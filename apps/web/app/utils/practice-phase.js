const PHASES = {
  rejoin: "Can't see you, rejoin the code",
  setup: 'Getting ready',
  lobby: 'Waiting for you to join',
  starting: 'Opening your room',
  headstart: 'Head start',
  round: 'Round live',
  over: 'Match over',
};

export function phaseLabel(session) {
  const phase = session?.phase;
  if (phase === 'wait') {
    if (session.role === 'bot_it') return 'Waiting for you on the concrete';
    if (session.role === 'you_it') return 'Waiting for you on the table';
    return 'Waiting for you to get in position';
  }
  return PHASES[phase] || 'Match running';
}
