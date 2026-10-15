import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import Password from '../Password.svelte';

// ============================================================
// MOCK INERTIA — Lengkap dengan page.url & page.props.auth
// ============================================================

const mockPut = vi.fn();
const mockPost = vi.fn();

let mockPageProps: {
    flash?: {
        status?: string | null;
        error?: string | null;
    };
    auth?: {
        user?: {
            id: number;
            name: string;
            username: string | null;
            email: string;
            role: string;
        } | null;
    };
} = {
    flash: {},
    auth: {
        user: {
            id: 1,
            name: 'Mitra Sejahtera',
            username: 'mitrasejahtera',
            email: 'mitra@example.com',
            role: 'mitra',
        },
    },
};

let mockPageUrl = '/mitra/password';

vi.mock('@inertiajs/svelte', () => ({
    router: {
        put: (...args: unknown[]) => mockPut(...args),
        post: (...args: unknown[]) => mockPost(...args),
    },
    page: {
        get props() {
            return mockPageProps;
        },
        get url() {
            return mockPageUrl;
        },
        get component() {
            return 'Mitra/Password';
        },
    },
    inertia: () => ({
        update: () => {},
        destroy: () => {},
    }),
}));

// ============================================================
// HELPER — Selector via ID
// ============================================================

const getOldPasswordInput = () =>
    document.getElementById('old_password') as HTMLInputElement;

const getPasswordInput = () =>
    document.getElementById('password') as HTMLInputElement;

const getPasswordConfirmationInput = () =>
    document.getElementById('password_confirmation') as HTMLInputElement;

const getSubmitButton = () =>
    screen.getByRole('button', { name: /^Simpan Password Baru$/i });

const getForm = () =>
    getSubmitButton().closest('form') as HTMLFormElement;

// ============================================================
// SETUP & TEARDOWN
// ============================================================

beforeEach(() => {
    mockPut.mockClear();
    mockPost.mockClear();
    mockPageUrl = '/mitra/password';
    mockPageProps = {
        flash: {},
        auth: {
            user: {
                id: 1,
                name: 'Mitra Sejahtera',
                username: 'mitrasejahtera',
                email: 'mitra@example.com',
                role: 'mitra',
            },
        },
    };
});

afterEach(() => {
    vi.clearAllMocks();
});

// ============================================================
// KATEGORI 1 — UI CONTRACT
// ============================================================

describe('Mitra/Password.svelte — UI Contract', () => {
    it('menampilkan heading "Ganti Password"', () => {
        render(Password);
        const headings = screen.getAllByRole('heading', { name: /Ganti Password/i });
        expect(headings.length).toBeGreaterThan(0);
    });

    it('menampilkan field password lama', () => {
        render(Password);
        expect(screen.getByLabelText(/^Password Lama/i)).toBeInTheDocument();
    });

    it('menampilkan field password baru', () => {
        render(Password);
        expect(screen.getByLabelText(/^Password Baru/i)).toBeInTheDocument();
    });

    it('menampilkan field konfirmasi password baru', () => {
        render(Password);
        expect(
            screen.getByLabelText(/^Konfirmasi Password Baru/i)
        ).toBeInTheDocument();
    });

    it('menampilkan tombol submit "Simpan Password Baru"', () => {
        render(Password);
        expect(getSubmitButton()).toBeInTheDocument();
    });

    it('menampilkan tombol "Batal"', () => {
        render(Password);
        expect(screen.getByRole('link', { name: /^Batal$/i })).toBeInTheDocument();
    });

    it('tombol Batal punya href ke /mitra/dashboard', () => {
        render(Password);
        const link = screen.getByRole('link', { name: /^Batal$/i });
        expect(link).toHaveAttribute('href', '/mitra/dashboard');
    });
});

// ============================================================
// KATEGORI 2 — UI CONTRACT: Info User Card
// ============================================================

describe('Mitra/Password.svelte — Info User Card', () => {
    it('menampilkan nama user dari page.props.auth.user', () => {
        render(Password);
        const elements = screen.getAllByText('Mitra Sejahtera');
        expect(elements.length).toBeGreaterThan(0);
    });

    it('menampilkan username dengan @ prefix', () => {
        render(Password);
        const elements = screen.getAllByText(/@mitrasejahtera/i);
        expect(elements.length).toBeGreaterThan(0);
    });

    it('menampilkan email user', () => {
        render(Password);
        const elements = screen.getAllByText(/mitra@example\.com/i);
        expect(elements.length).toBeGreaterThan(0);
    });

    it('menampilkan badge "KEAMANAN AKUN"', () => {
        render(Password);
        expect(screen.getByText(/KEAMANAN AKUN/i)).toBeInTheDocument();
    });

    it('avatar user menampilkan huruf pertama nama', () => {
        render(Password);
        const avatars = screen.getAllByText('M');
        expect(avatars.length).toBeGreaterThan(0);
    });
});

// ============================================================
// KATEGORI 3 — BEHAVIORAL: Toggle Password
// ============================================================

describe('Mitra/Password.svelte — Toggle Password', () => {
    it('semua input bertipe password secara default', () => {
        render(Password);
        expect(getOldPasswordInput().type).toBe('password');
        expect(getPasswordInput().type).toBe('password');
        expect(getPasswordConfirmationInput().type).toBe('password');
    });

    it('toggle password lama mengubah type-nya saja', async () => {
        render(Password);
        const toggles = screen.getAllByLabelText(/Toggle password/i);

        await fireEvent.click(toggles[0]);

        expect(getOldPasswordInput().type).toBe('text');
        expect(getPasswordInput().type).toBe('password');
        expect(getPasswordConfirmationInput().type).toBe('password');
    });

    it('toggle password baru mengubah type-nya saja', async () => {
        render(Password);
        const toggles = screen.getAllByLabelText(/Toggle password/i);

        await fireEvent.click(toggles[1]);

        expect(getPasswordInput().type).toBe('text');
        expect(getOldPasswordInput().type).toBe('password');
        expect(getPasswordConfirmationInput().type).toBe('password');
    });

    it('toggle konfirmasi mengubah type-nya saja', async () => {
        render(Password);
        const toggles = screen.getAllByLabelText(/Toggle password/i);

        await fireEvent.click(toggles[2]);

        expect(getPasswordConfirmationInput().type).toBe('text');
        expect(getPasswordInput().type).toBe('password');
        expect(getOldPasswordInput().type).toBe('password');
    });
});

// ============================================================
// KATEGORI 4 — BEHAVIORAL: Strength Indicator
// ============================================================

describe('Mitra/Password.svelte — Strength Indicator', () => {
    it('tidak menampilkan strength bar saat password kosong', () => {
        render(Password);
        expect(
            screen.queryByText(/^(Lemah|Cukup|Kuat|Sangat Kuat)$/i)
        ).not.toBeInTheDocument();
    });

    it('menampilkan strength bar saat password diisi', async () => {
        render(Password);
        await fireEvent.input(getPasswordInput(), {
            target: { value: 'abc' },
        });

        await waitFor(() => {
            expect(screen.getByText(/^Lemah$/i)).toBeInTheDocument();
        });
    });

    it('menampilkan "Sangat Kuat" untuk password lengkap', async () => {
        render(Password);
        await fireEvent.input(getPasswordInput(), {
            target: { value: 'Abcdefgh123!' },
        });

        await waitFor(() => {
            expect(screen.getByText(/^Sangat Kuat$/i)).toBeInTheDocument();
        });
    });
});

// ============================================================
// KATEGORI 5 — BEHAVIORAL: Password Criteria Checklist
// ============================================================

describe('Mitra/Password.svelte — Password Criteria Checklist', () => {
    it('tidak menampilkan checklist saat password kosong', () => {
        render(Password);
        expect(screen.queryByText(/Min\. 8 karakter/i)).not.toBeInTheDocument();
    });

    it('menampilkan checklist saat password diisi', async () => {
        render(Password);
        await fireEvent.input(getPasswordInput(), {
            target: { value: 'abc' },
        });

        await waitFor(() => {
            expect(screen.getByText(/Min\. 8 karakter/i)).toBeInTheDocument();
            expect(screen.getByText(/^Huruf$/i)).toBeInTheDocument();
            expect(screen.getByText(/^Angka$/i)).toBeInTheDocument();
            expect(screen.getByText(/^Simbol$/i)).toBeInTheDocument();
        });
    });

    it('kriteria "Min. 8 karakter" terpenuhi saat password >= 8', async () => {
        render(Password);
        await fireEvent.input(getPasswordInput(), {
            target: { value: 'abcdefgh' },
        });

        await waitFor(() => {
            expect(screen.getByText(/Min\. 8 karakter/i)).toBeInTheDocument();
        });
    });

    it('kriteria "Huruf" terpenuhi saat password ada huruf', async () => {
        render(Password);
        await fireEvent.input(getPasswordInput(), {
            target: { value: 'abc' },
        });

        await waitFor(() => {
            expect(screen.getByText(/^Huruf$/i)).toBeInTheDocument();
        });
    });

    it('kriteria "Angka" terpenuhi saat password ada angka', async () => {
        render(Password);
        await fireEvent.input(getPasswordInput(), {
            target: { value: '123' },
        });

        await waitFor(() => {
            expect(screen.getByText(/^Angka$/i)).toBeInTheDocument();
        });
    });

    it('kriteria "Simbol" terpenuhi saat password ada simbol', async () => {
        render(Password);
        await fireEvent.input(getPasswordInput(), {
            target: { value: '!@#' },
        });

        await waitFor(() => {
            expect(screen.getByText(/^Simbol$/i)).toBeInTheDocument();
        });
    });
});

// ============================================================
// KATEGORI 6 — EQUIVALENCE: Validasi Konfirmasi
// ============================================================

describe('Mitra/Password.svelte — Validasi Konfirmasi', () => {
    it('menampilkan peringatan jika konfirmasi tidak cocok', async () => {
        render(Password);

        await fireEvent.input(getPasswordInput(), {
            target: { value: 'password123' },
        });
        await fireEvent.input(getPasswordConfirmationInput(), {
            target: { value: 'password456' },
        });

        expect(
            screen.getByText(/Konfirmasi password tidak cocok/i)
        ).toBeInTheDocument();
    });

    it('tidak menampilkan peringatan jika konfirmasi cocok', async () => {
        render(Password);

        await fireEvent.input(getPasswordInput(), {
            target: { value: 'password123' },
        });
        await fireEvent.input(getPasswordConfirmationInput(), {
            target: { value: 'password123' },
        });

        expect(
            screen.queryByText(/Konfirmasi password tidak cocok/i)
        ).not.toBeInTheDocument();
    });

    it('tidak menampilkan peringatan jika konfirmasi masih kosong', async () => {
        render(Password);

        await fireEvent.input(getPasswordInput(), {
            target: { value: 'password123' },
        });

        expect(
            screen.queryByText(/Konfirmasi password tidak cocok/i)
        ).not.toBeInTheDocument();
    });

    it('tombol submit disabled saat password tidak cocok', async () => {
        render(Password);

        await fireEvent.input(getPasswordInput(), {
            target: { value: 'password123' },
        });
        await fireEvent.input(getPasswordConfirmationInput(), {
            target: { value: 'password456' },
        });

        expect(getSubmitButton()).toBeDisabled();
    });

    it('tombol submit enabled saat password cocok', async () => {
        render(Password);

        await fireEvent.input(getPasswordInput(), {
            target: { value: 'password123' },
        });
        await fireEvent.input(getPasswordConfirmationInput(), {
            target: { value: 'password123' },
        });

        expect(getSubmitButton()).not.toBeDisabled();
    });
});

// ============================================================
// KATEGORI 7 — BEHAVIORAL: Form Submit
// ============================================================

describe('Mitra/Password.svelte — Form Submit', () => {
    it('submit memanggil router.put dengan payload lengkap', async () => {
        render(Password);

        await fireEvent.input(getOldPasswordInput(), {
            target: { value: 'OldPass123!' },
        });
        await fireEvent.input(getPasswordInput(), {
            target: { value: 'NewPass456!' },
        });
        await fireEvent.input(getPasswordConfirmationInput(), {
            target: { value: 'NewPass456!' },
        });

        await fireEvent.submit(getForm());

        expect(mockPut).toHaveBeenCalledTimes(1);
        expect(mockPut).toHaveBeenCalledWith(
            '/mitra/password',
            {
                old_password: 'OldPass123!',
                password: 'NewPass456!',
                password_confirmation: 'NewPass456!',
            },
            expect.objectContaining({
                onError: expect.any(Function),
                onSuccess: expect.any(Function),
                onFinish: expect.any(Function),
            }),
        );
    });

    it('submit TIDAK memanggil router.post', async () => {
        render(Password);

        await fireEvent.submit(getForm());

        expect(mockPost).not.toHaveBeenCalled();
    });
});

// ============================================================
// KATEGORI 8 — BEHAVIORAL: onSuccess Clear Form
// ============================================================

describe('Mitra/Password.svelte — onSuccess Clear Form', () => {
    it('onSuccess mengosongkan semua field password', async () => {
        render(Password);

        await fireEvent.input(getOldPasswordInput(), {
            target: { value: 'OldPass123!' },
        });
        await fireEvent.input(getPasswordInput(), {
            target: { value: 'NewPass456!' },
        });
        await fireEvent.input(getPasswordConfirmationInput(), {
            target: { value: 'NewPass456!' },
        });

        await fireEvent.submit(getForm());

        const [, , options] = mockPut.mock.calls[0];
        options.onSuccess();

        await waitFor(() => {
            expect(getOldPasswordInput().value).toBe('');
            expect(getPasswordInput().value).toBe('');
            expect(getPasswordConfirmationInput().value).toBe('');
        });
    });
});

// ============================================================
// KATEGORI 9 — NEGATIVE PATH: Error Handling
// ============================================================

describe('Mitra/Password.svelte — Error Handling', () => {
    it('menampilkan error old_password setelah onError', async () => {
        render(Password);

        await fireEvent.submit(getForm());

        const [, , options] = mockPut.mock.calls[0];
        options.onError({ old_password: 'Password lama tidak sesuai.' });

        await waitFor(() => {
            expect(
                screen.getByText('Password lama tidak sesuai.')
            ).toBeInTheDocument();
        });
    });

    it('menampilkan error password setelah onError', async () => {
        render(Password);

        await fireEvent.submit(getForm());

        const [, , options] = mockPut.mock.calls[0];
        options.onError({ password: 'Password minimal 8 karakter.' });

        await waitFor(() => {
            expect(
                screen.getByText('Password minimal 8 karakter.')
            ).toBeInTheDocument();
        });
    });

    it('menampilkan error password_confirmation setelah onError', async () => {
        render(Password);

        await fireEvent.submit(getForm());

        const [, , options] = mockPut.mock.calls[0];
        options.onError({
            password_confirmation: 'Konfirmasi password tidak cocok.',
        });

        await waitFor(() => {
            expect(
                screen.getByText('Konfirmasi password tidak cocok.')
            ).toBeInTheDocument();
        });
    });

    it('menampilkan alert "Terdapat N kesalahan" saat ada error', async () => {
        render(Password);

        await fireEvent.submit(getForm());

        const [, , options] = mockPut.mock.calls[0];
        options.onError({
            old_password: 'Password lama tidak sesuai.',
            password: 'Password minimal 8 karakter.',
        });

        await waitFor(() => {
            expect(
                screen.getByText(/Terdapat 2 kesalahan pada form/i)
            ).toBeInTheDocument();
        });
    });

    it('errors direset setiap kali submit ulang', async () => {
        render(Password);

        await fireEvent.submit(getForm());
        const [, , options1] = mockPut.mock.calls[0];
        options1.onError({ old_password: 'Error lama.' });

        await waitFor(() => {
            expect(screen.getByText('Error lama.')).toBeInTheDocument();
        });

        await fireEvent.submit(getForm());

        expect(screen.queryByText('Error lama.')).not.toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 10 — BVA: Processing State
// ============================================================

describe('Mitra/Password.svelte — Processing State', () => {
    it('tombol submit menampilkan "Menyimpan..." saat processing', async () => {
        render(Password);

        await fireEvent.submit(getForm());

        await waitFor(() => {
            expect(screen.getByText(/Menyimpan/i)).toBeInTheDocument();
        });
    });

    it('tombol submit disabled saat processing', async () => {
        render(Password);

        await fireEvent.submit(getForm());

        const button = screen.getByRole('button', { name: /Menyimpan/i });
        expect(button).toBeDisabled();
    });

    it('setelah onFinish, tombol submit enabled kembali', async () => {
        render(Password);

        await fireEvent.submit(getForm());

        const [, , options] = mockPut.mock.calls[0];
        options.onFinish();

        await waitFor(() => {
            expect(getSubmitButton()).not.toBeDisabled();
        });
    });
});

// ============================================================
// KATEGORI 11 — EDGE CASE: Flash Message
// ============================================================

describe('Mitra/Password.svelte — Flash Message', () => {
    it('menampilkan flash status jika ada', () => {
        mockPageProps.flash = { status: 'Password berhasil diubah.' };
        render(Password);
        expect(
            screen.getByText('Password berhasil diubah.')
        ).toBeInTheDocument();
    });

    it('tidak menampilkan flash status jika kosong', () => {
        mockPageProps.flash = {};
        render(Password);
        expect(document.querySelector('.bg-green-50')).not.toBeInTheDocument();
    });

    it('tidak menampilkan error alert jika errors kosong', () => {
        render(Password);
        // Alert "Terdapat N kesalahan" tidak muncul saat tidak ada error
        expect(
            screen.queryByText(/Terdapat \d+ kesalahan/i)
        ).not.toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 12 — UI CONTRACT: Attribute Input
// ============================================================

describe('Mitra/Password.svelte — Input Attributes', () => {
    it('password lama memiliki autocomplete="current-password"', () => {
        render(Password);
        expect(getOldPasswordInput()).toHaveAttribute(
            'autocomplete',
            'current-password'
        );
    });

    it('password baru memiliki autocomplete="new-password"', () => {
        render(Password);
        expect(getPasswordInput()).toHaveAttribute(
            'autocomplete',
            'new-password'
        );
    });

    it('konfirmasi password memiliki autocomplete="new-password"', () => {
        render(Password);
        expect(getPasswordConfirmationInput()).toHaveAttribute(
            'autocomplete',
            'new-password'
        );
    });

    it('semua input password wajib diisi (required)', () => {
        render(Password);
        expect(getOldPasswordInput().required).toBe(true);
        expect(getPasswordInput().required).toBe(true);
        expect(getPasswordConfirmationInput().required).toBe(true);
    });
});