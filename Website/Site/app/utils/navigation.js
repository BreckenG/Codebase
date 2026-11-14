export function playMode(value) { return ['ranked', 'scrims', 'practice', 'trainer', 'mirror', 'autoref'].includes(value) ? value : 'ranked'; }
