export function playMode(value) { return ['ranked', 'scrims', 'practice', 'trainer', 'mirror'].includes(value) ? value : 'ranked'; }
