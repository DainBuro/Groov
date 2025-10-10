const TYPES = {
  authService: Symbol.for('authService'),
  authRepository: Symbol.for('authRepository'),
  danceMoveService: Symbol.for('danceMoveService'),
  danceMoveRepository: Symbol.for('danceMoveRepository'),
  danceSequenceService: Symbol.for('danceSequenceService'),
  danceSequenceRepository: Symbol.for('danceSequenceRepository'),
  movesOfSequenceService: Symbol.for('movesOfSequenceService'),
  movesOfSequenceRepository: Symbol.for('movesOfSequenceRepository'),
  eventService: Symbol.for('eventService'),
  eventRepository: Symbol.for('eventRepository'),
  database: Symbol.for('database')
};

export { TYPES };
