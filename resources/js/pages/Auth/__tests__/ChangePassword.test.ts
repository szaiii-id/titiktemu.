import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import ChangePassword from '../ChangePassword.svelte';

// ============================================================
// MOCK INERTIA
// ============================================================

const mockPut = vi.fn();
const mockPost = vi.fn();

let mockPageProps: {
    flash?: {
        status?: string | null;
        error?: string | null;
    };
} = {
    flash: {},
};

vi.mock('@inertiajs/svelte', () => ({
    router: {
        put: (...args: unknown[]) => mockPut(...args),
        post: (...args: unknown[]) => mockPost(...args),
    },
    page: {
        get props() {
            return mockPageProps;
        },
    },
    inertia: () => ({
        update: () => {},
        destroy: () => {},
    }),
}));

// ============================================================
// HELPER — Selector via ID (Robust, tidak ambigu)
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
    mockPageProps = { flash: {} };
});

afterEach(() => {
    vi.clearAllMocks();
});

// ============================================================
// KATEGORI 1 — UI CONTRACT (Mode Normal)
// ============================================================

describe('ChangePassword.svelte — UI Contract (Mode Normal)', () => {
    const normalProps = { mustChangePassword: false };

    it('menampilkan heading "Ganti Password"', () => {
        render(ChangePassword, { props: normalProps });
        expect(
            screen.getByRole('heading', { name: /Ganti Password/i })
        ).toBeInTheDocument();
    });

    it('menampilkan field password lama', () => {
        render(ChangePassword, { props: normalProps });
        expect(screen.getByLabelText(/^Password Lama/i)).toBeInTheDocument();
    });

    it('menampilkan field password baru', () => {
        render(ChangePassword, { props: normalProps });
        expect(screen.getByLabelText(/^Password Baru/i)).toBeInTheDocument();
    });

    it('menampilkan field konfirmasi password baru', () => {
        render(ChangePassword, { props: normalProps });
        expect(
            screen.getByLabelText(/^Konfirmasi Password Baru/i)
        ).toBeInTheDocument();
    });

    it('menampilkan tombol submit "Simpan Password Baru"', () => {
        render(ChangePassword, { props: normalProps });
        expect(getSubmitButton()).toBeInTheDocument();
    });

    it('menampilkan tombol logout', () => {
        render(ChangePassword, { props: normalProps });
        expect(
            screen.getByRole('button', { name: /Keluar dari akun/i })
        ).toBeInTheDocument();
    });

    it('TIDAK menampilkan flash "Wajib Ganti Password"', () => {
        render(ChangePassword, { props: normalProps });
        expect(
            screen.queryByText(/^Wajib Ganti Password$/i)
        ).not.toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 2 — UI CONTRACT (Mode Wajib Ganti)
// ============================================================

describe('ChangePassword.svelte — UI Contract (Mode Wajib Ganti)', () => {
    const forcedProps = { mustChangePassword: true };

    it('menampilkan heading "Ganti Password"', () => {
        render(ChangePassword, { props: forcedProps });
        expect(
            screen.getByRole('heading', { name: /Ganti Password/i })
        ).toBeInTheDocument();
    });

    it('TIDAK menampilkan field password lama', () => {
        render(ChangePassword, { props: forcedProps });
        expect(screen.queryByLabelText(/^Password Lama/i)).not.toBeInTheDocument();
    });

    it('menampilkan field password baru', () => {
        render(ChangePassword, { props: forcedProps });
        expect(screen.getByLabelText(/^Password Baru/i)).toBeInTheDocument();
    });

    it('menampilkan field konfirmasi password baru', () => {
        render(ChangePassword, { props: forcedProps });
        expect(
            screen.getByLabelText(/^Konfirmasi Password Baru/i)
        ).toBeInTheDocument();
    });

    it('menampilkan flash "Wajib Ganti Password"', () => {
        render(ChangePassword, { props: forcedProps });
        expect(screen.getByText(/^Wajib Ganti Password$/i)).toBeInTheDocument();
    });

    it('menampilkan pesan "login ulang" di flash wajib ganti', () => {
        render(ChangePassword, { props: forcedProps });
        expect(screen.getByText(/login ulang/i)).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 3 — EQUIVALENCE: Toggle Password
// ============================================================

describe('ChangePassword.svelte — Toggle Password (Mode Normal)', () => {
    const normalProps = { mustChangePassword: false };

    it('semua input bertipe password secara default', () => {
        render(ChangePassword, { props: normalProps });

        expect(getOldPasswordInput().type).toBe('password');
        expect(getPasswordInput().type).toBe('password');
        expect(getPasswordConfirmationInput().type).toBe('password');
    });

    it('toggle password lama mengubah type-nya saja', async () => {
        render(ChangePassword, { props: normalProps });
        const toggles = screen.getAllByLabelText(/Tampilkan password/i);

        await fireEvent.click(toggles[0]);

        expect(getOldPasswordInput().type).toBe('text');
        expect(getPasswordInput().type).toBe('password');
        expect(getPasswordConfirmationInput().type).toBe('password');
    });

    it('toggle password baru mengubah type-nya saja', async () => {
        render(ChangePassword, { props: normalProps });
        const toggles = screen.getAllByLabelText(/Tampilkan password/i);

        await fireEvent.click(toggles[1]);

        expect(getPasswordInput().type).toBe('text');
        expect(getOldPasswordInput().type).toBe('password');
        expect(getPasswordConfirmationInput().type).toBe('password');
    });

    it('toggle konfirmasi mengubah type-nya saja', async () => {
        render(ChangePassword, { props: normalProps });
        const toggles = screen.getAllByLabelText(/Tampilkan password/i);

        await fireEvent.click(toggles[2]);

        expect(getPasswordConfirmationInput().type).toBe('text');
        expect(getPasswordInput().type).toBe('password');
        expect(getOldPasswordInput().type).toBe('password');
    });

    it('aria-label toggle berubah sesuai state', async () => {
        render(ChangePassword, { props: normalProps });
        const toggles = screen.getAllByLabelText(/Tampilkan password/i);

        expect(toggles[1]).toHaveAttribute('aria-label', 'Tampilkan password');

        await fireEvent.click(toggles[1]);

        const hideToggles = screen.getAllByLabelText(/Sembunyikan password/i);
        expect(hideToggles.length).toBeGreaterThan(0);
    });
});

describe('ChangePassword.svelte — Toggle Password (Mode Wajib Ganti)', () => {
    const forcedProps = { mustChangePassword: true };

    it('hanya ada 2 toggle (password baru + konfirmasi)', () => {
        render(ChangePassword, { props: forcedProps });
        const toggles = screen.getAllByLabelText(/Tampilkan password/i);
        expect(toggles).toHaveLength(2);
    });

    it('toggle pertama untuk password baru', async () => {
        render(ChangePassword, { props: forcedProps });
        const toggles = screen.getAllByLabelText(/Tampilkan password/i);

        await fireEvent.click(toggles[0]);

        expect(getPasswordInput().type).toBe('text');
        expect(getPasswordConfirmationInput().type).toBe('password');
    });
});

// ============================================================
// KATEGORI 4 — BEHAVIORAL: Form Submit
// ============================================================

describe('ChangePassword.svelte — Form Submit (Mode Normal)', () => {
    const normalProps = { mustChangePassword: false };

    it('submit mengirim old_password + password + password_confirmation', async () => {
        render(ChangePassword, { props: normalProps });

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
            '/change-password',
            {
                old_password: 'OldPass123!',
                password: 'NewPass456!',
                password_confirmation: 'NewPass456!',
            },
            expect.objectContaining({
                onError: expect.any(Function),
                onFinish: expect.any(Function),
            }),
        );
    });

    it('submit TIDAK memanggil router.post', async () => {
        render(ChangePassword, { props: normalProps });

        await fireEvent.submit(getForm());

        expect(mockPost).not.toHaveBeenCalled();
    });
});

describe('ChangePassword.svelte — Form Submit (Mode Wajib Ganti)', () => {
    const forcedProps = { mustChangePassword: true };

    it('submit TIDAK mengirim old_password', async () => {
        render(ChangePassword, { props: forcedProps });

        await fireEvent.input(getPasswordInput(), {
            target: { value: 'NewPass456!' },
        });
        await fireEvent.input(getPasswordConfirmationInput(), {
            target: { value: 'NewPass456!' },
        });

        await fireEvent.submit(getForm());

        expect(mockPut).toHaveBeenCalledTimes(1);
        const [, payload] = mockPut.mock.calls[0];

        expect(payload).toHaveProperty('password', 'NewPass456!');
        expect(payload).toHaveProperty('password_confirmation', 'NewPass456!');
        expect(payload).not.toHaveProperty('old_password');
    });
});

// ============================================================
// KATEGORI 5 — EQUIVALENCE: Validasi Konfirmasi
// ============================================================

describe('ChangePassword.svelte — Validasi Konfirmasi', () => {
    const normalProps = { mustChangePassword: false };

    it('menampilkan peringatan jika konfirmasi tidak cocok', async () => {
        render(ChangePassword, { props: normalProps });

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
        render(ChangePassword, { props: normalProps });

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
        render(ChangePassword, { props: normalProps });

        await fireEvent.input(getPasswordInput(), {
            target: { value: 'password123' },
        });

        expect(
            screen.queryByText(/Konfirmasi password tidak cocok/i)
        ).not.toBeInTheDocument();
    });

    it('tombol submit disabled saat password tidak cocok', async () => {
        render(ChangePassword, { props: normalProps });

        await fireEvent.input(getPasswordInput(), {
            target: { value: 'password123' },
        });
        await fireEvent.input(getPasswordConfirmationInput(), {
            target: { value: 'password456' },
        });

        expect(getSubmitButton()).toBeDisabled();
    });

    it('tombol submit enabled saat password cocok', async () => {
        render(ChangePassword, { props: normalProps });

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
// KATEGORI 6 — BEHAVIORAL: Indikator Kekuatan Password
// ============================================================

describe('ChangePassword.svelte — Indikator Kekuatan Password', () => {
    const normalProps = { mustChangePassword: false };

    it('tidak menampilkan indikator saat password kosong', () => {
        render(ChangePassword, { props: normalProps });
        expect(
            screen.queryByText(/^(Lemah|Cukup|Kuat|Sangat Kuat)$/i)
        ).not.toBeInTheDocument();
    });

    it('menampilkan "Lemah" untuk password pendek', async () => {
        render(ChangePassword, { props: normalProps });
        await fireEvent.input(getPasswordInput(), {
            target: { value: 'abc' },
        });
        expect(screen.getByText(/^Lemah$/i)).toBeInTheDocument();
    });

    it('menampilkan "Sangat Kuat" untuk password lengkap', async () => {
        render(ChangePassword, { props: normalProps });
        await fireEvent.input(getPasswordInput(), {
            target: { value: 'Abcdefgh123!' },
        });
        expect(screen.getByText(/^Sangat Kuat$/i)).toBeInTheDocument();
    });

    it('indikator berubah saat password diubah', async () => {
        render(ChangePassword, { props: normalProps });

        await fireEvent.input(getPasswordInput(), {
            target: { value: 'abc' },
        });
        expect(screen.getByText(/^Lemah$/i)).toBeInTheDocument();

        await fireEvent.input(getPasswordInput(), {
            target: { value: 'Abcdefgh123!' },
        });
        expect(screen.getByText(/^Sangat Kuat$/i)).toBeInTheDocument();
        expect(screen.queryByText(/^Lemah$/i)).not.toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 7 — NEGATIVE PATH: Error Handling
// ============================================================

describe('ChangePassword.svelte — Error Handling', () => {
    const normalProps = { mustChangePassword: false };

    it('menampilkan error old_password setelah onError', async () => {
        render(ChangePassword, { props: normalProps });

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
        render(ChangePassword, { props: normalProps });

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
        render(ChangePassword, { props: normalProps });

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

    it('errors direset setiap kali submit ulang', async () => {
        render(ChangePassword, { props: normalProps });

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
// KATEGORI 8 — BVA: Processing State
// ============================================================

describe('ChangePassword.svelte — Processing State', () => {
    const normalProps = { mustChangePassword: false };

    it('tombol disabled saat processing', async () => {
        render(ChangePassword, { props: normalProps });

        await fireEvent.submit(getForm());

        const button = screen.getByRole('button', { name: /^Menyimpan/i });
        expect(button).toBeDisabled();
    });

    it('tombol menampilkan "Menyimpan..." saat processing', async () => {
        render(ChangePassword, { props: normalProps });

        await fireEvent.submit(getForm());

        await waitFor(() => {
            expect(screen.getByText(/Menyimpan/i)).toBeInTheDocument();
        });
    });

    it('tombol enabled kembali setelah onFinish', async () => {
        render(ChangePassword, { props: normalProps });

        await fireEvent.submit(getForm());

        const [, , options] = mockPut.mock.calls[0];
        options.onFinish();

        await waitFor(() => {
            expect(getSubmitButton()).not.toBeDisabled();
        });
    });

    it('tombol tidak disabled dalam kondisi default', () => {
        render(ChangePassword, { props: normalProps });
        expect(getSubmitButton()).not.toBeDisabled();
    });
});

// ============================================================
// KATEGORI 9 — EDGE CASE: Flash Message & Logout
// ============================================================

describe('ChangePassword.svelte — Flash Message', () => {
    const normalProps = { mustChangePassword: false };

    it('menampilkan flash status jika ada', () => {
        mockPageProps.flash = { status: 'Password berhasil diubah.' };
        render(ChangePassword, { props: normalProps });
        expect(
            screen.getByText('Password berhasil diubah.')
        ).toBeInTheDocument();
    });

    it('tidak menampilkan flash status jika kosong', () => {
        mockPageProps.flash = {};
        render(ChangePassword, { props: normalProps });
        expect(document.querySelector('.bg-green-50')).not.toBeInTheDocument();
    });

    it('menampilkan flash error jika ada', () => {
        mockPageProps.flash = { error: 'Sesi Anda telah berakhir.' };
        render(ChangePassword, { props: normalProps });
        expect(
            screen.getByText('Sesi Anda telah berakhir.')
        ).toBeInTheDocument();
    });

    it('tidak menampilkan flash error jika kosong', () => {
        mockPageProps.flash = {};
        render(ChangePassword, { props: normalProps });
        expect(document.querySelector('.bg-red-50')).not.toBeInTheDocument();
    });

    it('flash status dan error bisa tampil bersamaan', () => {
        mockPageProps.flash = {
            status: 'Password berhasil diubah.',
            error: 'Silakan login ulang.',
        };
        render(ChangePassword, { props: normalProps });

        expect(
            screen.getByText('Password berhasil diubah.')
        ).toBeInTheDocument();
        expect(
            screen.getByText('Silakan login ulang.')
        ).toBeInTheDocument();
    });
});

describe('ChangePassword.svelte — Logout', () => {
    const normalProps = { mustChangePassword: false };

    it('klik tombol logout memanggil router.post("/logout")', async () => {
        render(ChangePassword, { props: normalProps });

        const logoutButton = screen.getByRole('button', {
            name: /Keluar dari akun/i,
        });
        await fireEvent.click(logoutButton);

        expect(mockPost).toHaveBeenCalledTimes(1);
        expect(mockPost).toHaveBeenCalledWith('/logout');
    });

    it('logout tidak memanggil router.put', async () => {
        render(ChangePassword, { props: normalProps });

        const logoutButton = screen.getByRole('button', {
            name: /Keluar dari akun/i,
        });
        await fireEvent.click(logoutButton);

        expect(mockPut).not.toHaveBeenCalled();
    });
});

// ============================================================
// KATEGORI 10 — EQUIVALENCE: Props Behavior
// ============================================================

describe('ChangePassword.svelte — Props Behavior', () => {
    it('default mustChangePassword = false → tampilkan password lama', () => {
        render(ChangePassword);
        expect(screen.getByLabelText(/^Password Lama/i)).toBeInTheDocument();
    });

    it('mustChangePassword = false eksplisit → tampilkan password lama', () => {
        render(ChangePassword, { props: { mustChangePassword: false } });
        expect(screen.getByLabelText(/^Password Lama/i)).toBeInTheDocument();
    });

    it('mustChangePassword = true → sembunyikan password lama', () => {
        render(ChangePassword, { props: { mustChangePassword: true } });
        expect(screen.queryByLabelText(/^Password Lama/i)).not.toBeInTheDocument();
    });

    it('mustChangePassword = true → tampilkan flash wajib ganti', () => {
        render(ChangePassword, { props: { mustChangePassword: true } });
        expect(screen.getByText(/^Wajib Ganti Password$/i)).toBeInTheDocument();
    });
});