export const Colors = {
  background: '#191210',
  surface: '#594136',
  surfaceAlt: '#594136',
  tabBar: '#0C0908',
  accent: '#C9BF69',
  text: '#FEFFEA',
  textMuted: '#cfcfcf',
  textSubtle: '#FEFFEA',
  textPlaceholder: '#718096',
  danger: '#ff6b6b',
  info: '#6bcfff',
  success: '#4ade80',
} as const;

// Fixed order — never cycled or reassigned — so each category keeps the same
// color everywhere and adjacent slices stay distinguishable (colorblind-safe
// pairing depends on this order, validated with scripts/validate_palette.js).
export const ExpenseCategories = [
  'Food',
  'Transportation',
  'Housing',
  'Entertainment',
  'Shopping',
  'Health',
  'Utilities',
  'Other',
] as const;

export type ExpenseCategory = (typeof ExpenseCategories)[number];

export const CategoryColors: Record<ExpenseCategory, string> = {
  Food: '#3987e5',
  Transportation: '#d95926',
  Housing: '#199e70',
  Entertainment: '#c98500',
  Shopping: '#d55181',
  Health: '#008300',
  Utilities: '#9085e9',
  Other: '#e66767',
};
