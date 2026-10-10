// Walking hazards reach the target at 22% of the fall animation.
// Jump hazards reach it at landDelay; sinking starts immediately afterward.
export const fallContactFraction = 0.22;
export const hazardContactDelay = (duration, landDelay = 0) =>
  landDelay || duration * fallContactFraction;
