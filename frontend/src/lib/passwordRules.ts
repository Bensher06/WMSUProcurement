export type PwRules = {
  length: boolean;
  uppercase: boolean;
  number: boolean;
};

export const evaluatePassword = (pw: string): PwRules => ({
  length: pw.length >= 8,
  uppercase: /[A-Z]/.test(pw),
  number: /\d/.test(pw),
});
