export type Country = {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
};

export const ORANGE_MONEY_COUNTRIES: Country[] = [
  { code: 'BF', name: 'Burkina Faso', dialCode: '+226', flag: '\u{1F1E7}\u{1F1EB}' },
  { code: 'CI', name: "Cote d'Ivoire", dialCode: '+225', flag: '\u{1F1E8}\u{1F1EE}' },
  { code: 'SN', name: 'Senegal', dialCode: '+221', flag: '\u{1F1F8}\u{1F1F3}' },
  { code: 'ML', name: 'Mali', dialCode: '+223', flag: '\u{1F1F2}\u{1F1F1}' },
  { code: 'GN', name: 'Guinee', dialCode: '+224', flag: '\u{1F1EC}\u{1F1F3}' },
  { code: 'CM', name: 'Cameroun', dialCode: '+237', flag: '\u{1F1E8}\u{1F1F2}' },
  { code: 'NE', name: 'Niger', dialCode: '+227', flag: '\u{1F1F3}\u{1F1EA}' },
];

export const DEFAULT_COUNTRY = ORANGE_MONEY_COUNTRIES[0]; // Burkina Faso
