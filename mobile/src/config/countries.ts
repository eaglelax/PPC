export type Country = {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
};

export const ORANGE_MONEY_COUNTRIES: Country[] = [
  { code: 'BF', name: 'Burkina Faso', dialCode: '+226', flag: 'BF' },
  { code: 'CI', name: "Cote d'Ivoire", dialCode: '+225', flag: 'CI' },
  { code: 'SN', name: 'Senegal', dialCode: '+221', flag: 'SN' },
  { code: 'ML', name: 'Mali', dialCode: '+223', flag: 'ML' },
  { code: 'GN', name: 'Guinee', dialCode: '+224', flag: 'GN' },
  { code: 'CM', name: 'Cameroun', dialCode: '+237', flag: 'CM' },
  { code: 'NE', name: 'Niger', dialCode: '+227', flag: 'NE' },
];

export const DEFAULT_COUNTRY = ORANGE_MONEY_COUNTRIES[0]; // Burkina Faso
