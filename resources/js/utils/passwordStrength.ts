export type PasswordStrength = {
    level: number;
    label: string;
    color: string;
};

export function calculatePasswordStrength(password: string): PasswordStrength {
    if (!password) {
        return { level: 0, label: '', color: '' };
    }

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score <= 1) return { level: 1, label: 'Lemah', color: 'bg-red-500' };
    if (score === 2) return { level: 2, label: 'Cukup', color: 'bg-yellow-500' };
    if (score === 3) return { level: 3, label: 'Kuat', color: 'bg-green-500' };
    return { level: 4, label: 'Sangat Kuat', color: 'bg-green-600' };
}

export function isPasswordMismatch(password: string, confirmation: string): boolean {
    return confirmation.length > 0 && password !== confirmation;
}

/**
 * Cek kriteria password (untuk checklist UI).
 *
 * @example
 *   const c = checkPasswordCriteria('Abc123!@');
 *   c.minLength  // true
 *   c.hasLetter  // true
 *   c.hasNumber  // true
 *   c.hasSymbol  // true
 */
export function checkPasswordCriteria(password: string): {
    minLength: boolean;
    hasLetter: boolean;
    hasNumber: boolean;
    hasSymbol: boolean;
} {
    return {
        minLength: password.length >= 8,
        hasLetter: /[a-zA-Z]/.test(password),
        hasNumber: /\d/.test(password),
        hasSymbol: /[^a-zA-Z0-9]/.test(password),
    };
}