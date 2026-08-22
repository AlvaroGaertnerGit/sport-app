// Gym machines not already placed in another category file (chest-press-
// machine and pec-deck live in chest.mjs; hack-squat/adductor/abductor/
// seated-calf-raise/leg-press-calf-raise/donkey-calf-raise live in
// legs.mjs; machine-row/reverse-fly-machine live in back.mjs/shoulders.mjs;
// machine-shoulder-press lives in shoulders.mjs; machine-triceps-extension
// lives in arms.mjs -- grouped by muscle, not equipment, to avoid a
// second axis of categorization for the same exercises).
export default [
  {
    slug: "assisted-pull-up-machine",
    name: "Assisted Pull-Up Machine",
    difficulty: "beginner",
    pattern: "pull",
    primary: ["lats", "back"],
    secondary: ["biceps"],
    equipment: ["gym_machine"],
    instructions: "De rodillas en la plataforma con contrapeso, tira hasta que la barbilla supere la barra.",
    mistakes: "Depender del contrapeso máximo en vez de progresar reduciéndolo con el tiempo.",
  },
  {
    slug: "assisted-dip-machine",
    name: "Assisted Dip Machine",
    difficulty: "beginner",
    pattern: "push",
    primary: ["chest", "triceps"],
    secondary: ["shoulders"],
    equipment: ["gym_machine"],
    instructions: "De rodillas en la plataforma con contrapeso, desciende hasta 90° de codo y empuja de vuelta arriba.",
    mistakes: "Bajar en exceso comprometiendo el hombro.",
  },
  {
    slug: "ab-crunch-machine",
    name: "Ab Crunch Machine",
    difficulty: "beginner",
    pattern: "core",
    primary: ["core"],
    secondary: [],
    equipment: ["gym_machine"],
    instructions: "Sentado con el torso apoyado en el cojín, flexiona el tronco contrayendo el abdomen.",
    mistakes: "Tirar con los brazos en vez de flexionar con el abdomen.",
  },
  {
    slug: "smith-machine-squat",
    name: "Smith Machine Squat",
    difficulty: "beginner",
    pattern: "squat",
    primary: ["quadriceps", "glutes"],
    secondary: ["hamstrings"],
    equipment: ["gym_machine"],
    instructions: "Con la barra guiada sobre los trapecios, desciende hasta muslos paralelos al suelo y empuja de vuelta.",
    mistakes: "Colocar los pies demasiado cerca de la trayectoria vertical de la barra.",
  },
  {
    slug: "smith-machine-bench-press",
    name: "Smith Machine Bench Press",
    difficulty: "beginner",
    pattern: "push",
    primary: ["chest"],
    secondary: ["triceps", "shoulders"],
    equipment: ["gym_machine", "bench"],
    instructions: "Tumbado en el banco bajo la barra guiada, baja hasta el pecho y empuja a extensión completa.",
    mistakes: "Colocar el banco fuera de la trayectoria vertical de la barra.",
  },
];
