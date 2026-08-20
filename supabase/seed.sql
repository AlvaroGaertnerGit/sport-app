-- Seed data: reference catalogs only, plus a small representative
-- exercise library to validate the system end to end. No goals seed --
-- `goals.category` is a text+CHECK domain, not a table (see 0004). No
-- movement_patterns/muscle_groups seed -- both are text+CHECK domains
-- baked into the migrations, not rows in a table.

-- Sports ---------------------------------------------------------------
-- "otro" included as an explicit escape hatch (product requirement: users
-- must not be blocked before their sport is added to the catalog) even
-- though it wasn't in this task's literal minimum list.

insert into public.sports (slug, name, default_muscle_groups, icon) values
  ('padel', 'Pádel', array['shoulders', 'core', 'quadriceps', 'forearms'], null),
  ('tennis', 'Tenis', array['shoulders', 'core', 'quadriceps', 'forearms'], null),
  ('football', 'Fútbol', array['quadriceps', 'hamstrings', 'calves', 'core'], null),
  ('running', 'Running', array['quadriceps', 'hamstrings', 'calves'], null),
  ('cycling', 'Ciclismo', array['quadriceps', 'hamstrings', 'calves'], null),
  ('swimming', 'Natación', array['shoulders', 'lats', 'core'], null),
  ('calisthenics', 'Calistenia', array['chest', 'back', 'core', 'shoulders'], null),
  ('strength_training', 'Fuerza', array[]::text[], null),
  ('hiking', 'Senderismo', array['quadriceps', 'hamstrings', 'calves', 'core'], null),
  ('basketball', 'Baloncesto', array['quadriceps', 'hamstrings', 'calves', 'shoulders'], null),
  ('other', 'Otro', array[]::text[], null);

-- Equipment --------------------------------------------------------------
-- No "none" row: an exercise with zero rows in exercise_equipment already
-- means "no equipment needed" -- a placeholder row would be redundant.

insert into public.equipment (slug, name) values
  ('pull_up_bar', 'Barra de dominadas'),
  ('parallel_bars', 'Paralelas'),
  ('resistance_band', 'Banda elástica'),
  ('dumbbells', 'Mancuernas'),
  ('barbell', 'Barra olímpica'),
  ('bench', 'Banco'),
  ('cable_machine', 'Máquina de poleas'),
  ('kettlebell', 'Kettlebell'),
  ('gym_machine', 'Máquina de gimnasio'),
  ('mat', 'Esterilla');

-- Exercises ----------------------------------------------------------
-- A small, representative set (not a full library) covering all 8
-- movement patterns, all 3 difficulty levels, both target_type modes,
-- and a real easier/harder variant chain -- enough to validate the
-- system, not to seed production content. image_url/video_url are left
-- NULL: fabricating URLs here would be inventing data, not seeding it;
-- real media references are a separate, deliberate content task.

insert into public.exercises (slug, name, difficulty, movement_pattern, primary_muscles, secondary_muscles, instructions, common_mistakes) values
  ('push-up', 'Flexiones', 'beginner', 'push',
    array['chest', 'triceps'], array['shoulders', 'core'],
    'Manos a la anchura de hombros, cuerpo en línea recta desde cabeza a talones. Baja el pecho hasta casi tocar el suelo y empuja de vuelta arriba.',
    'Cadera caída o elevada; codos completamente abiertos a 90°; recorrido parcial.'),
  ('incline-push-up', 'Flexiones inclinadas', 'beginner', 'push',
    array['chest', 'triceps'], array['shoulders', 'core'],
    'Igual que la flexión estándar, con las manos apoyadas en una superficie elevada (banco) para reducir la carga.',
    'Superficie demasiado alta, reduciendo el rango de movimiento útil.'),
  ('bench-press', 'Press de banca', 'intermediate', 'push',
    array['chest'], array['triceps', 'shoulders'],
    'Tumbado en el banco, barra a la altura del pecho, empuja hasta extensión completa de brazos sin bloquear violentamente el codo.',
    'Rebote de la barra en el pecho; arqueo lumbar excesivo; agarre asimétrico.'),
  ('dip', 'Fondos en paralelas', 'intermediate', 'push',
    array['chest', 'triceps'], array['shoulders'],
    'Sujeto en paralelas, baja controlando hasta 90° de flexión de codo y empuja de vuelta arriba.',
    'Bajar en exceso comprometiendo el hombro; balanceo del cuerpo para generar impulso.'),
  ('assisted-pull-up', 'Dominada asistida', 'beginner', 'pull',
    array['lats', 'back'], array['biceps', 'forearms'],
    'Con banda elástica o máquina asistida, realiza el patrón completo de dominada con ayuda reduciendo el peso corporal a mover.',
    'Apoyarse solo en la banda sin activar la espalda; recorrido parcial.'),
  ('pull-up', 'Dominadas', 'intermediate', 'pull',
    array['lats', 'back'], array['biceps', 'forearms'],
    'Colgado de la barra en agarre prono, tira hasta que la barbilla supere la barra, baja con control hasta extensión completa.',
    'Balanceo (kipping) no intencionado; recorrido parcial; agarre demasiado ancho.'),
  ('weighted-pull-up', 'Dominada lastrada', 'advanced', 'pull',
    array['lats', 'back'], array['biceps', 'forearms'],
    'Igual que la dominada estándar, con peso adicional (cinturón de lastre o mancuerna sujeta).',
    'Añadir peso antes de dominar el patrón sin lastre con buena técnica.'),
  ('bodyweight-squat', 'Sentadilla con peso corporal', 'beginner', 'squat',
    array['quadriceps', 'glutes'], array['hamstrings', 'core'],
    'Pies a la anchura de hombros, baja la cadera hacia atrás y abajo manteniendo el pecho erguido, hasta muslos paralelos al suelo o más.',
    'Rodillas colapsando hacia dentro; talones despegados del suelo.'),
  ('barbell-back-squat', 'Sentadilla trasera con barra', 'intermediate', 'squat',
    array['quadriceps', 'glutes'], array['hamstrings', 'core'],
    'Barra apoyada en la parte alta de la espalda, desciende con control hasta profundidad completa y sube empujando el suelo.',
    'Pérdida de la curvatura lumbar neutra; profundidad insuficiente.'),
  ('deadlift', 'Peso muerto', 'intermediate', 'hinge',
    array['hamstrings', 'glutes'], array['back', 'forearms'],
    'Barra pegada a las espinillas, bisagra de cadera manteniendo la espalda neutra, levanta extendiendo cadera y rodillas a la vez.',
    'Redondear la espalda baja; la barra se aleja del cuerpo durante el levantamiento.'),
  ('kettlebell-swing', 'Swing con kettlebell', 'beginner', 'hinge',
    array['hamstrings', 'glutes'], array['core', 'shoulders'],
    'Bisagra de cadera explosiva para proyectar la kettlebell hasta la altura del pecho, sin usar los brazos para levantarla.',
    'Convertirlo en una sentadilla en vez de una bisagra de cadera; usar los hombros para "levantar" el peso.'),
  ('farmers-carry', 'Farmer''s carry', 'beginner', 'carry',
    array['forearms', 'core'], array['shoulders', 'quadriceps'],
    'Sujeta una mancuerna pesada en cada mano y camina manteniendo el torso erguido y el core activado.',
    'Inclinación lateral del torso hacia el lado más débil; pasos demasiado cortos o largos.'),
  ('plank', 'Plancha', 'beginner', 'core',
    array['core'], array['shoulders'],
    'Apoyo en antebrazos y puntas de los pies, cuerpo en línea recta, mantén la posición sin dejar caer la cadera.',
    'Cadera elevada o caída; retener la respiración durante toda la serie.'),
  ('russian-twist', 'Giro ruso', 'beginner', 'rotation',
    array['core'], array[]::text[],
    'Sentado con el tronco inclinado hacia atrás y pies elevados, gira el tronco de lado a lado de forma controlada.',
    'Mover solo los brazos en vez de rotar el tronco; velocidad excesiva sin control.'),
  ('walking-lunge', 'Zancada caminando', 'beginner', 'locomotion',
    array['quadriceps', 'glutes'], array['hamstrings', 'core'],
    'Da un paso largo hacia delante bajando la rodilla trasera casi hasta el suelo, y continúa alternando piernas al avanzar.',
    'Paso demasiado corto, sobrecargando la rodilla delantera; torso inclinado hacia delante.');

-- Variant chain (self-FK), set after insert to avoid ordering issues.
update public.exercises set easier_variant_id = (select id from public.exercises where slug = 'incline-push-up')
  where slug = 'push-up';
update public.exercises set easier_variant_id = (select id from public.exercises where slug = 'assisted-pull-up'),
                            harder_variant_id = (select id from public.exercises where slug = 'weighted-pull-up')
  where slug = 'pull-up';
update public.exercises set harder_variant_id = (select id from public.exercises where slug = 'pull-up')
  where slug = 'assisted-pull-up';
update public.exercises set easier_variant_id = (select id from public.exercises where slug = 'pull-up')
  where slug = 'weighted-pull-up';
update public.exercises set harder_variant_id = (select id from public.exercises where slug = 'push-up')
  where slug = 'incline-push-up';
update public.exercises set easier_variant_id = (select id from public.exercises where slug = 'bodyweight-squat')
  where slug = 'barbell-back-squat';
update public.exercises set harder_variant_id = (select id from public.exercises where slug = 'barbell-back-squat')
  where slug = 'bodyweight-squat';

-- exercise_equipment links
insert into public.exercise_equipment (exercise_id, equipment_slug)
select e.id, x.equipment_slug
from (values
  ('incline-push-up', 'bench'),
  ('bench-press', 'barbell'),
  ('bench-press', 'bench'),
  ('dip', 'parallel_bars'),
  ('assisted-pull-up', 'pull_up_bar'),
  ('assisted-pull-up', 'resistance_band'),
  ('pull-up', 'pull_up_bar'),
  ('weighted-pull-up', 'pull_up_bar'),
  ('barbell-back-squat', 'barbell'),
  ('deadlift', 'barbell'),
  ('kettlebell-swing', 'kettlebell'),
  ('farmers-carry', 'dumbbells'),
  ('plank', 'mat'),
  ('russian-twist', 'mat')
) as x(exercise_slug, equipment_slug)
join public.exercises e on e.slug = x.exercise_slug;
