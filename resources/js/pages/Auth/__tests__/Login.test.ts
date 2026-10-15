import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import Login from '../Login.svelte';

// ============================================================
// MOCK INERTIA
// ============================================================
// Kita mock:
//   - router.post  → spy untuk verifikasi payload
//   - page.props   → reactive untuk test flash & retry_after
//   - inertia      → directive no-op untuk `use:inertia`
// ============================================================

const mockPost = vi.fn();

// State reaktif untuk page.props (bisa diubah per test)
let mockPageProps: {
    flash?: {
        status?: string | null;
        error?: string | null;
        retry_after?: number | null;
    };
} = {
    flash: {},
};

vi.mock('@inertiajs/svelte', () => ({
    router: {
        post: (...args: unknown[]) => mockPost(...args),
    },
    page: {
        get props() {
            return mockPageProps;
        },
    },
    // Svelte action signature: (node, params) => ({ update, destroy })
    inertia: () => ({
        update: () => {},
        destroy: () => {},
    }),
}));

// ============================================================
// SETUP & TEARDOWN
// ============================================================

beforeEach(() => {
    mockPost.mockClear();
    mockPageProps = { flash: {} };
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

// ============================================================
// KATEGORI 1 — UI CONTRACT (element & accessibility)
// ============================================================

describe('Login.svelte — UI Contract', () => {
    it('menampilkan field identitas', () => {
        render(Login);
        expect(screen.getByLabelText(/Username atau Email/i)).toBeInTheDocument();
    });

    it('menampilkan field password', () => {
        render(Login);
        expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    });

    it('menampilkan checkbox "Ingat saya"', () => {
        render(Login);
        expect(screen.getByLabelText(/Ingat saya/i)).toBeInTheDocument();
    });

    it('menampilkan link lupa password', () => {
        render(Login);
        expect(screen.getByText(/Lupa password\?/i)).toBeInTheDocument();
    });

    it('menampilkan link daftar', () => {
        render(Login);
        expect(screen.getByText(/Daftar sekarang/i)).toBeInTheDocument();
    });

    it('menampilkan tombol submit "Masuk ke Sistem"', () => {
        render(Login);
        expect(screen.getByRole('button', { name: /Masuk ke Sistem/i })).toBeInTheDocument();
    });

    it('menampilkan tombol login with Google', () => {
        render(Login);
        const link = screen.getByRole('link', { name: /Login with Google/i });
        expect(link).toHaveAttribute('href', '/auth/google');
    });

    it('menampilkan tombol kembali ke beranda', () => {
        render(Login);
        const link = screen.getByRole('link', { name: /Kembali/i });
        expect(link).toHaveAttribute('href', '/');
    });
});

// ============================================================
// KATEGORI 2 — EQUIVALENCE PARTITIONING: Toggle Password
// ============================================================

describe('Login.svelte — Toggle Password', () => {
    it('password type = "password" secara default', () => {
        render(Login);
        const input = screen.getByLabelText(/^Password$/i) as HTMLInputElement;
        expect(input.type).toBe('password');
    });

    it('password type = "text" setelah klik toggle', async () => {
        render(Login);
        const input = screen.getByLabelText(/^Password$/i) as HTMLInputElement;
        const toggle = screen.getByLabelText(/Tampilkan password/i);

        await fireEvent.click(toggle);

        expect(input.type).toBe('text');
    });

    it('password kembali type = "password" setelah klik 2x', async () => {
        render(Login);
        const input = screen.getByLabelText(/^Password$/i) as HTMLInputElement;

        await fireEvent.click(screen.getByLabelText(/Tampilkan password/i));
        await fireEvent.click(screen.getByLabelText(/Sembunyikan password/i));

        expect(input.type).toBe('password');
    });

    it('aria-label toggle berubah sesuai state', async () => {
        render(Login);

        // Awal: "Tampilkan password"
        expect(screen.getByLabelText(/Tampilkan password/i)).toBeInTheDocument();

        // Setelah klik: "Sembunyikan password"
        await fireEvent.click(screen.getByLabelText(/Tampilkan password/i));
        expect(screen.getByLabelText(/Sembunyikan password/i)).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 3 — BEHAVIORAL / MOCKING: Form Submit
// ============================================================

describe('Login.svelte — Form Submit', () => {
    it('submit form memanggil router.post dengan payload benar', async () => {
        render(Login);

        const identitas = screen.getByLabelText(/Username atau Email/i) as HTMLInputElement;
        const password = screen.getByLabelText(/^Password$/i) as HTMLInputElement;

        await fireEvent.input(identitas, { target: { value: 'budi@example.com' } });
        await fireEvent.input(password, { target: { value: 'password123' } });

        const form = screen.getByRole('button', { name: /Masuk ke Sistem/i }).closest('form')!;
        await fireEvent.submit(form);

        expect(mockPost).toHaveBeenCalledTimes(1);
        expect(mockPost).toHaveBeenCalledWith(
            '/login',
            {
                identitas: 'budi@example.com',
                password: 'password123',
                remember: false,
            },
            expect.objectContaining({
                onError: expect.any(Function),
                onFinish: expect.any(Function),
            }),
        );
    });

    it('submit dengan remember = true mengirim remember: true', async () => {
        render(Login);

        const identitas = screen.getByLabelText(/Username atau Email/i) as HTMLInputElement;
        const password = screen.getByLabelText(/^Password$/i) as HTMLInputElement;
        const remember = screen.getByLabelText(/Ingat saya/i) as HTMLInputElement;

        await fireEvent.input(identitas, { target: { value: 'budi@example.com' } });
        await fireEvent.input(password, { target: { value: 'password123' } });
        await fireEvent.click(remember);

        const form = screen.getByRole('button', { name: /Masuk ke Sistem/i }).closest('form')!;
        await fireEvent.submit(form);

        expect(mockPost).toHaveBeenCalledWith(
            '/login',
            expect.objectContaining({ remember: true }),
            expect.any(Object),
        );
    });

    it('submit dengan identitas & password kosong tetap memanggil router.post', async () => {
        // Karena `required` di HTML5, form submit tidak akan jalan lewat browser.
        // Tapi di test, kita paksa submit — komponen tetap passing state kosong.
        render(Login);

        const form = screen.getByRole('button', { name: /Masuk ke Sistem/i }).closest('form')!;
        await fireEvent.submit(form);

        expect(mockPost).toHaveBeenCalledWith(
            '/login',
            {
                identitas: '',
                password: '',
                remember: false,
            },
            expect.any(Object),
        );
    });
});

// ============================================================
// KATEGORI 4 — NEGATIVE PATH: Error Handling
// ============================================================

describe('Login.svelte — Error Handling', () => {
    it('menampilkan error identitas setelah onError dipanggil', async () => {
        render(Login);

        const identitas = screen.getByLabelText(/Username atau Email/i) as HTMLInputElement;
        const password = screen.getByLabelText(/^Password$/i) as HTMLInputElement;

        await fireEvent.input(identitas, { target: { value: 'wrong@example.com' } });
        await fireEvent.input(password, { target: { value: 'wrong' } });

        const form = screen.getByRole('button', { name: /Masuk ke Sistem/i }).closest('form')!;
        await fireEvent.submit(form);

        // Ambil onError dari mock call pertama
        const [, , options] = mockPost.mock.calls[0];
        options.onError({ identitas: 'Kredensial tidak cocok.' });

        await waitFor(() => {
            expect(screen.getByText('Kredensial tidak cocok.')).toBeInTheDocument();
        });
    });

    it('menampilkan error password setelah onError dipanggil', async () => {
        render(Login);

        const form = screen.getByRole('button', { name: /Masuk ke Sistem/i }).closest('form')!;
        await fireEvent.submit(form);

        const [, , options] = mockPost.mock.calls[0];
        options.onError({ password: 'Password wajib diisi.' });

        await waitFor(() => {
            expect(screen.getByText('Password wajib diisi.')).toBeInTheDocument();
        });
    });

    it('errors direset setiap kali submit ulang', async () => {
        render(Login);

        const form = screen.getByRole('button', { name: /Masuk ke Sistem/i }).closest('form')!;

        // Submit pertama → error
        await fireEvent.submit(form);
        const [, , options1] = mockPost.mock.calls[0];
        options1.onError({ identitas: 'Error pertama' });

        await waitFor(() => {
            expect(screen.getByText('Error pertama')).toBeInTheDocument();
        });

        // Submit kedua → errors di-reset dulu
        await fireEvent.submit(form);

        // Setelah submit kedua, error lama harus hilang (sebelum onError dipanggil)
        expect(screen.queryByText('Error pertama')).not.toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 5 — BVA: Processing State
// ============================================================

describe('Login.svelte — Processing State', () => {
    it('tombol disabled saat processing = true', async () => {
        render(Login);

        const form = screen.getByRole('button', { name: /Masuk ke Sistem/i }).closest('form')!;
        await fireEvent.submit(form);

        // Setelah submit, processing = true (belum onFinish)
        const button = screen.getByRole('button', { name: /Memproses/i });
        expect(button).toBeDisabled();
    });

    it('tombol menampilkan spinner saat processing', async () => {
        render(Login);

        const form = screen.getByRole('button', { name: /Masuk ke Sistem/i }).closest('form')!;
        await fireEvent.submit(form);

        await waitFor(() => {
            expect(screen.getByText(/Memproses/i)).toBeInTheDocument();
        });
    });

    it('tombol enabled kembali setelah onFinish', async () => {
        render(Login);

        const form = screen.getByRole('button', { name: /Masuk ke Sistem/i }).closest('form')!;
        await fireEvent.submit(form);

        const [, , options] = mockPost.mock.calls[0];
        options.onFinish();

        await waitFor(() => {
            const button = screen.getByRole('button', { name: /Masuk ke Sistem/i });
            expect(button).not.toBeDisabled();
        });
    });
});

// ============================================================
// KATEGORI 6 — EDGE CASE: Flash Message
// ============================================================

describe('Login.svelte — Flash Message', () => {
    it('menampilkan flash status jika ada', () => {
        mockPageProps.flash = { status: 'Password berhasil diubah.' };

        render(Login);

        expect(screen.getByText('Password berhasil diubah.')).toBeInTheDocument();
    });

    it('tidak menampilkan flash status jika kosong', () => {
        mockPageProps.flash = {};

        render(Login);

        // Cari elemen dengan class bg-green-50 (flash sukses)
        const successFlash = document.querySelector('.bg-green-50');
        expect(successFlash).not.toBeInTheDocument();
    });

    it('menampilkan flash error jika ada', () => {
        mockPageProps.flash = { error: 'Anda tidak memiliki hak akses.' };

        render(Login);

        expect(screen.getByText('Anda tidak memiliki hak akses.')).toBeInTheDocument();
    });

    it('tidak menampilkan flash error jika kosong', () => {
        mockPageProps.flash = {};

        render(Login);

        const errorFlash = document.querySelector('.bg-red-50');
        expect(errorFlash).not.toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 7 — BVA: Countdown (retry_after)
// ============================================================

describe('Login.svelte — Countdown (Rate Limiter)', () => {
    it('tombol menampilkan "Tunggu N detik" jika retry_after > 0', async () => {
        mockPageProps.flash = { retry_after: 30 };

        render(Login);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Tunggu 30 detik/i })).toBeInTheDocument();
        });
    });

    it('tombol disabled saat countdown aktif', async () => {
        mockPageProps.flash = { retry_after: 30 };

        render(Login);

        await waitFor(() => {
            const button = screen.getByRole('button', { name: /Tunggu/i });
            expect(button).toBeDisabled();
        });
    });

    it('countdown berkurang setiap detik', async () => {
        mockPageProps.flash = { retry_after: 3 };

        render(Login);

        // Detik awal
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Tunggu 3 detik/i })).toBeInTheDocument();
        });

        // Advance 1 detik
        vi.advanceTimersByTime(1000);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Tunggu 2 detik/i })).toBeInTheDocument();
        });
    });

    it('tidak menampilkan countdown jika retry_after = 0', () => {
        mockPageProps.flash = { retry_after: 0 };

        render(Login);

        expect(screen.queryByText(/Tunggu/i)).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Masuk ke Sistem/i })).toBeInTheDocument();
    });

    it('tidak menampilkan countdown jika retry_after = null', () => {
        mockPageProps.flash = { retry_after: null };

        render(Login);

        expect(screen.queryByText(/Tunggu/i)).not.toBeInTheDocument();
    });

    it('tombol enabled kembali setelah countdown selesai', async () => {
        mockPageProps.flash = { retry_after: 2 };

        render(Login);

        // Advance 2 detik + sedikit buffer
        vi.advanceTimersByTime(2100);

        await waitFor(() => {
            const button = screen.getByRole('button', { name: /Masuk ke Sistem/i });
            expect(button).not.toBeDisabled();
        });
    });
});