// EDIT GAME WORDING HERE. Save and refresh the browser; no build is needed.
// Use plain text inside double quotes. Escape an inner double quote as \".
// Keep each quoted string on one source line; editor word wrap is fine.
// Keep property names and level numbers unchanged. Placeholders such as {level}
// and {count} are filled by the game: retain them when rewriting their sentences.
// Level layouts, artwork, controls and timing live elsewhere.

// LEVEL INTROS: name, story paragraph, and instruction paragraph for levels 1-10.
export const levelText = {
  1: {
    name: "The Leaking Boat",
    story:
      "The boat has sprung a leak! From this little sandbank, Kojax spots an island in the distance. Perhaps someone will see a signal from its mountain and come for help.",
    lesson:
      "Walk with WASD or the arrow keys. On a touch screen, tap a neighboring cell. Shallow and deep water look alike: experiment, remember, and try again.",
  },
  2: {
    name: "Across the Lagoon",
    story:
      "Leaving the little boat behind, Kojax reaches another stretch of lagoon. A hidden sandbar winds beneath the woolly waves toward the far shore.",
    lesson: "Remember the safe ground and the find the path forward.",
  },
  3: {
    name: "Driftwood Shore",
    story:
      "Land at last! Firm sand and quicksand look alike. Loose pieces of driftwood on the beach create unexpected opportunities.",
    lesson:
      "Kojax discovers that objects can topple when pushed twice. Some create useful bridges; others lead nowhere. Find the right side to push from.",
  },
  4: {
    name: "Beyond the Dunes",
    story:
      "Kojax discovers a spring in his paws. Jumping in the sand is the way to go when safe walking options are rare.",
    lesson:
      "Hold Space and press a direction to jump across one cell. On a touch screen, tap a landing two cells away in a straight line. You can jump over safe or hazardous ground. A standing object blocks a jump.",
  },
  5: {
    name: "Into the Green",
    story:
      "A green clearing hides soft ground. Every palm can fall, but only the right approach opens the way.",
    lesson:
      "Remember the safe ground. A failed step restores every fallen object, and retries are unlimited.",
  },
  6: {
    name: "The Deep Grove",
    story:
      "Tall palms wait among the woolly ferns in a deeper clearing. Take the long way around to find a useful push.",
    lesson:
      "More palms fill this deeper clearing. Try approaching from different sides; the useful push may lead away from the exit.",
  },
  7: {
    name: "The Ember Slopes",
    story:
      "The sleeping volcano is warm beneath its felt crust. Loose stone pillars can become bridges.",
    lesson:
      "Loose basalt pillars can bridge fragile crust. Some pillars are distractions; choose the approach as carefully as the object.",
  },
  8: {
    name: "The Old Crater",
    story:
      "Glowing wool winds through the crater. Remember the stable crust and approach each pillar with care.",
    lesson:
      "Remember the safe ground. A failed step restores every fallen object, and retries are unlimited.",
  },
  9: {
    name: "The Snowline",
    story:
      "Soft snow covers both solid ground and hidden cracks. A broad ice slab could carry Kojax across.",
    lesson:
      "Loose ice slabs can become broad bridges. Every slab can fall, but only a few help you cross.",
  },
  10: {
    name: "The Summit Beacon",
    story:
      "Above the clouds, a giant signal torch waits. One last crossing, and help may finally see him.",
    lesson:
      "Remember the safe ground. A failed step restores every fallen object, and retries are unlimited.",
  },
};

// MENUS, BUTTONS, LOADING SCREEN, ACCESSIBILITY LABELS AND STATUS MESSAGES.
export const text = {
  app: {
    title: "Kojax' Adventure",
    eyebrow: "KOJAX' ADVENTURE",
    loadingTitle: "Unpacking a little world…",
    loadingSubtitle: "Felt, wool, and a little courage",
  },
  intro: {
    practice: "PRACTICE CROSSING",
    savingUnavailable:
      "Saving is unavailable in this browser. You can still play this session.",
  },
  buttons: {
    begin: "Begin the adventure",
    enter: "Enter the scene",
    newJourney: "Start a new journey",
    back: "Back to the adventure",
    next: "Follow the trail →",
    watch: "Watch the balloons",
    newAdventure: "A new adventure",
    startAgain: "Start again",
    keepJourney: "Keep this journey",
    closeRestart: "Keep exploring",
    restartCrossing: "Restart crossing",
    restartGame: "Restart game",
    reload: "Reload",
    reloadGame: "Reload game",
    openGame: "Open game",
  },
  help: {
    title: "A little field guide",
    walk: "WASD or arrows to walk. Tap a neighboring cell on touch screen.",
    push: "Press a direction twice, or tap an adjacent object twice, to push it away from Kojax. Moving away cancels the first push. Approach from any of its four sides. Every object can topple when there is room. Only some make useful bridges; try approaching from a different side.",
    jump: "Jump by holding Space and pressing a direction, or tapping a landing two cells away. You can jump over safe or hazardous ground, but not through standing objects.",
    jumpLocked: "Jumping will be learned later in the journey.",
    shortcuts:
      "R then a direction pushes; J then a direction jumps when learned. Escape cancels a selected action.",
    hazards:
      "Footprints fade. Hidden hazards return Kojax to the entrance and restore every bridge. Retries are unlimited.",
  },
  progress: {
    practice: "PRACTICE COMPLETE",
    eyebrow: "A LITTLE FURTHER FROM THE SHORE",
    crossed: "{level} crossed",
    practiceAttempts: "practice attempts",
    totalAttempts: "total attempts",
    practiceSteps: "practice steps",
    totalSteps: "total steps",
    savingFailed:
      "Progress could not be saved. Keep this tab open to continue.",
  },
  ending: {
    eyebrow: "A SIGNAL. A SKY FULL OF FRIENDS.",
    title: "Homeward, Kojax.",
    description:
      "The giant torch glows above the clouds. Friends arrive in patchwork balloons, and Kojax leaps aboard for the journey home.",
    attempts: "attempts",
    practiceAttempts: "attempts in practice",
    steps: "steps",
  },
  restart: {
    title: "Take another run?",
    description:
      "Restart this crossing to return to its entrance. Your steps stay counted and another attempt is added. Restart the game for a fresh score from the leaking boat.",
    confirmTitle: "A new journey?",
    confirmDescription:
      "This clears the saved campaign and starts at the leaking boat.",
  },
  errors: {
    fullscreenTitle: "Fullscreen unavailable here",
    fullscreenDescription:
      "Keep playing in this window, or try the fullscreen button in your regular browser.",
    assetTitle: "A piece of the world could not load.",
    assetDescription: "Check your connection and reload to try again.",
    bootTitle: "The adventure could not start.",
    bootDescription:
      "Reload to retry, or open the game from its website address.",
  },
  accessibility: {
    movementArea: "Movement area",
    score: "Score",
    attempts: "Attempts",
    steps: "Steps",
    controls: "Game controls",
    enterFullscreen: "Enter fullscreen",
    exitFullscreen: "Exit fullscreen",
    help: "Field guide",
    board: "{level}, {size} by {size} movement area",
    cell: "Row {row}, column {column}",
    character: "Kojax",
    entrance: "entrance",
    exit: "exit",
    scene: "{biome}, made of felt and wool",
    map: "A handmade island rising from lagoon to snowy summit",
    stations: "{count} completed stations. Kojax is at {level}.",
    completed: "{level} completed",
  },
  status: {
    fall: "The ground gave way. Back to the entrance; bridges restored.",
    rooted: "This one stays fixed.",
    object:
      "Kojax braces against the object. Press toward it again to push; no hurry.",
    bridge: "A new bridge.",
    edge: "The scene ends here.",
    blocked: "There is no space for that move.",
    "no-jump": "Kojax has not learned to jump yet.",
    walk: "Walk across the neighboring ground.",
    success: "A sure-footed step.",
    chooseCell: "Choose a neighboring cell or a landing two cells away.",
    choosePush: "Choose a direction to push.",
    chooseJump: "Choose a direction to jump.",
  },
};

export const biomeText = {
  water: "The lagoon",
  beach: "The shore",
  jungle: "The jungle",
  lava: "The volcano",
  snow: "The summit",
};
