export interface ConfigOption {
  value: string;
  label: string;
}

export const COMMUNITIES: ConfigOption[] = [
  { value: 'madrid', label: 'Comunidad de Madrid' },
  { value: 'cataluna', label: 'Cataluña' },
  { value: 'andalucia', label: 'Andalucía' },
  { value: 'valenciana', label: 'C. Valenciana' },
  { value: 'galicia', label: 'Galicia' },
  { value: 'euskadi', label: 'País Vasco' },
  { value: 'castilla-leon', label: 'Castilla y León' },
  { value: 'castilla-lamancha', label: 'Castilla-La Mancha' },
  { value: 'aragon', label: 'Aragón' },
  { value: 'canarias', label: 'Canarias' },
  { value: 'extremadura', label: 'Extremadura' },
  { value: 'murcia', label: 'Murcia' },
  { value: 'asturias', label: 'Asturias' },
  { value: 'cantabria', label: 'Cantabria' },
  { value: 'rioja', label: 'La Rioja' },
  { value: 'navarra', label: 'Navarra' },
  { value: 'baleares', label: 'Baleares' },
  { value: 'ceuta', label: 'Ceuta' },
  { value: 'melilla', label: 'Melilla' }
];

export const STAGES: ConfigOption[] = [
  { value: 'infantil', label: 'Educación Infantil' },
  { value: 'primaria', label: 'Educación Primaria' },
  { value: 'secundaria', label: 'ESO' },
  { value: 'bachillerato', label: 'Bachillerato' }
];

export const CLASSROOM_TYPES: ConfigOption[] = [
  { value: 'regular', label: 'Ordinaria' },
  { value: 'gym', label: 'Gimnasio' },
  { value: 'music', label: 'Aula de Música' },
  { value: 'lab', label: 'Laboratorio' },
  { value: 'it', label: 'Aula de Informática' },
  { value: 'support', label: 'Apoyo' }
];

export const TEACHER_TYPES: ConfigOption[] = [
  { value: 'definitivo', label: 'Definitivo / Generalista' },
  { value: 'especialista', label: 'Especialista / Interino' }
];
