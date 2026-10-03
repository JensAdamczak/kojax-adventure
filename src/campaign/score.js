// Use only earlier crossings plus the live crossing: a completed result may
// already be saved when the map opens, and must not be counted twice.
export function journeyScore(results, index, state, practice = false) {
  return (practice ? [] : results.slice(0, index)).concat(state).reduce(
    (sum, r) => ({
      attempts: sum.attempts + r.attempts,
      steps: sum.steps + r.steps,
    }),
    { attempts: 0, steps: 0 },
  );
}
export function restartedCrossing(level, state) {
  return {
    pos: [...level.start],
    attempts: state.attempts + 1,
    steps: state.steps,
    fallen: [],
    won: false,
  };
}
