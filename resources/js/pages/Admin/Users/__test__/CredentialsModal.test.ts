import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import CredentialsModal from '../CredentialsModal.svelte';

// ============================================================
// MOCK CLIPBOARD API
// ============================================================

const mockWriteText = vi.fn();

beforeEach(() => {
    mockWriteText.mockReset();
    mockWriteText.mockResolvedValue(undefined);

    Object.defineProperty(navigator, 'clipboard', {
        value: {
            writeText: mockWriteText,
        },
        writable: true,
        configurable: true,
    });
});

afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
});

// ============================================================
// PROPS DEFAULT
// ============================================================

const defaultCredentials = {
    role: 'admin',
    name: 'Budi Santoso',
    email: 'budi@example.com',
    username: 'budisantoso',
    password: 'SecretPass123!',
};

// ============================================================
// KATEGORI 1 — CONDITIONAL RENDERING
// ============================================================

describe('CredentialsModal.svelte — Conditional Rendering', () => {
    it('TIDAK render modal saat open = false', () => {
        render(CredentialsModal, {
            props: { open: false, credentials: defaultCredentials },
        });
        expect(screen.queryByText(/Kredensial User/i)).not.toBeInTheDocument();
    });

    it('TIDAK render modal saat credentials = null', () => {
        render(CredentialsModal, {
            props: { open: true, credentials: null },
        });
        expect(screen.queryByText(/Kredensial User/i)).not.toBeInTheDocument();
    });

    it('TIDAK render modal saat open = false DAN credentials = null', () => {
        render(CredentialsModal, {
            props: { open: false, credentials: null },
        });
        expect(screen.queryByText(/Kredensial User/i)).not.toBeInTheDocument();
    });

    it('render modal saat open = true DAN credentials ada', () => {
        render(CredentialsModal, {
            props: { open: true, credentials: defaultCredentials },
        });
        expect(screen.getByText(/Kredensial User/i)).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 2 — UI CONTRACT
// ============================================================

describe('CredentialsModal.svelte — UI Contract', () => {
    beforeEach(() => {
        render(CredentialsModal, {
            props: { open: true, credentials: defaultCredentials },
        });
    });

    it('menampilkan heading "Kredensial User"', () => {
        expect(screen.getByRole('heading', { name: /Kredensial User/i })).toBeInTheDocument();
    });

    it('menampilkan subtitle info "di luar aplikasi"', () => {
        expect(screen.getByText(/di luar aplikasi/i)).toBeInTheDocument();
    });

    it('menampilkan warning "Password hanya muncul 1x"', () => {
        expect(screen.getByText(/Password hanya muncul 1x/i)).toBeInTheDocument();
    });

    it('menampilkan warning "Salin sekarang"', () => {
        expect(screen.getByText(/Salin sekarang/i)).toBeInTheDocument();
    });

    it('menampilkan tombol "Salin Semua"', () => {
        expect(screen.getByRole('button', { name: /Salin Semua/i })).toBeInTheDocument();
    });

    it('menampilkan tombol "Tutup"', () => {
        expect(screen.getByRole('button', { name: /^Tutup$/i })).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 3 — CREDENTIALS DATA DISPLAY
// ============================================================

describe('CredentialsModal.svelte — Credentials Display', () => {
    beforeEach(() => {
        render(CredentialsModal, {
            props: { open: true, credentials: defaultCredentials },
        });
    });

    it('menampilkan label dan nilai Role', () => {
        expect(screen.getByText(/^Role$/i)).toBeInTheDocument();
        expect(screen.getByText('admin')).toBeInTheDocument();
    });

    it('menampilkan label dan nilai Nama', () => {
        expect(screen.getByText(/^Nama$/i)).toBeInTheDocument();
        expect(screen.getByText('Budi Santoso')).toBeInTheDocument();
    });

    it('menampilkan label dan nilai Email', () => {
        expect(screen.getByText(/^Email$/i)).toBeInTheDocument();
        expect(screen.getByText('budi@example.com')).toBeInTheDocument();
    });

    it('menampilkan label dan nilai Username', () => {
        expect(screen.getByText(/^Username$/i)).toBeInTheDocument();
        expect(screen.getByText('budisantoso')).toBeInTheDocument();
    });

    it('menampilkan label dan nilai Password', () => {
        expect(screen.getByText(/^Password$/i)).toBeInTheDocument();
        expect(screen.getByText('SecretPass123!')).toBeInTheDocument();
    });

    it('role menggunakan text-transform capitalize', () => {
        const roleElement = screen.getByText('admin');
        expect(roleElement).toHaveClass('capitalize');
    });
});

// ============================================================
// KATEGORI 4 — USERNAME NULL
// ============================================================

describe('CredentialsModal.svelte — Username Null', () => {
    it('TIDAK menampilkan row Username kalau username = null', () => {
        render(CredentialsModal, {
            props: {
                open: true,
                credentials: { ...defaultCredentials, username: null },
            },
        });
        expect(screen.queryByText(/^Username$/i)).not.toBeInTheDocument();
    });

    it('TIDAK ada tombol salin username kalau username = null', () => {
        render(CredentialsModal, {
            props: {
                open: true,
                credentials: { ...defaultCredentials, username: null },
            },
        });
        expect(screen.queryByLabelText(/Salin username/i)).not.toBeInTheDocument();
    });

    it('tombol salin email tetap ada kalau username null', () => {
        render(CredentialsModal, {
            props: {
                open: true,
                credentials: { ...defaultCredentials, username: null },
            },
        });
        expect(screen.getByLabelText(/Salin email/i)).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 5 — COPY TO CLIPBOARD
// ============================================================

describe('CredentialsModal.svelte — Copy to Clipboard', () => {
    beforeEach(() => {
        render(CredentialsModal, {
            props: { open: true, credentials: defaultCredentials },
        });
    });

    it('tombol salin email memanggil clipboard.writeText dengan email', async () => {
        const btn = screen.getByLabelText(/Salin email/i);
        await fireEvent.click(btn);

        expect(mockWriteText).toHaveBeenCalledWith('budi@example.com');
    });

    it('tombol salin username memanggil clipboard.writeText dengan username', async () => {
        const btn = screen.getByLabelText(/Salin username/i);
        await fireEvent.click(btn);

        expect(mockWriteText).toHaveBeenCalledWith('budisantoso');
    });

    it('tombol salin password memanggil clipboard.writeText dengan password', async () => {
        const btn = screen.getByLabelText(/Salin password/i);
        await fireEvent.click(btn);

        expect(mockWriteText).toHaveBeenCalledWith('SecretPass123!');
    });

    it('tombol "Salin Semua" memanggil clipboard dengan semua credentials', async () => {
        const btn = screen.getByRole('button', { name: /Salin Semua/i });
        await fireEvent.click(btn);

        expect(mockWriteText).toHaveBeenCalledTimes(1);

        const clipboardText = mockWriteText.mock.calls[0][0];
        expect(clipboardText).toContain('Role: admin');
        expect(clipboardText).toContain('Nama: Budi Santoso');
        expect(clipboardText).toContain('Email: budi@example.com');
        expect(clipboardText).toContain('Username: budisantoso');
        expect(clipboardText).toContain('Password: SecretPass123!');
    });

    it('tombol "Salin Semua" pakai newline sebagai separator', async () => {
        const btn = screen.getByRole('button', { name: /Salin Semua/i });
        await fireEvent.click(btn);

        const clipboardText = mockWriteText.mock.calls[0][0];
        expect(clipboardText.split('\n').length).toBe(5);
    });

    it('tombol "Salin Semua" pakai "-" kalau username null', async () => {
        document.body.innerHTML = '';
        render(CredentialsModal, {
            props: {
                open: true,
                credentials: { ...defaultCredentials, username: null },
            },
        });

        const btn = screen.getByRole('button', { name: /Salin Semua/i });
        await fireEvent.click(btn);

        const clipboardText = mockWriteText.mock.calls[0][0];
        expect(clipboardText).toContain('Username: -');
    });
});

// ============================================================
// KATEGORI 6 — COPY FEEDBACK STATE
// ============================================================

describe('CredentialsModal.svelte — Copy Feedback State', () => {
    it('tombol "Salin Semua" berubah jadi "Tersalin!" setelah klik', async () => {
        render(CredentialsModal, {
            props: { open: true, credentials: defaultCredentials },
        });

        const btn = screen.getByRole('button', { name: /Salin Semua/i });
        await fireEvent.click(btn);

        await waitFor(() => {
            expect(
                screen.getByRole('button', { name: /Tersalin!/i })
            ).toBeInTheDocument();
        });
    });

    it('tombol "Tersalin!" kembali ke "Salin Semua" setelah 2 detik', async () => {
        vi.useFakeTimers();

        render(CredentialsModal, {
            props: { open: true, credentials: defaultCredentials },
        });

        const btn = screen.getByRole('button', { name: /Salin Semua/i });
        await fireEvent.click(btn);

        await waitFor(() => {
            expect(
                screen.getByRole('button', { name: /Tersalin!/i })
            ).toBeInTheDocument();
        });

        vi.advanceTimersByTime(2000);

        await waitFor(() => {
            expect(
                screen.getByRole('button', { name: /Salin Semua/i })
            ).toBeInTheDocument();
        });
    });
});

// ============================================================
// KATEGORI 7 — CLOSE BEHAVIOR
// ============================================================

describe('CredentialsModal.svelte — Close Behavior', () => {
    it('klik tombol "Tutup" memanggil close (open = false)', async () => {
        render(CredentialsModal, {
            props: { open: true, credentials: defaultCredentials },
        });

        const closeBtn = screen.getByRole('button', { name: /^Tutup$/i });
        await fireEvent.click(closeBtn);

        await waitFor(() => {
            expect(screen.queryByText(/Kredensial User/i)).not.toBeInTheDocument();
        });
    });

    it('klik backdrop menutup modal', async () => {
        render(CredentialsModal, {
            props: { open: true, credentials: defaultCredentials },
        });

        const backdrop = screen.getByLabelText(/Tutup modal/i);
        await fireEvent.click(backdrop);

        await waitFor(() => {
            expect(screen.queryByText(/Kredensial User/i)).not.toBeInTheDocument();
        });
    });
});

// ============================================================
// KATEGORI 8 — ACCESSIBILITY
// ============================================================

describe('CredentialsModal.svelte — Accessibility', () => {
    beforeEach(() => {
        render(CredentialsModal, {
            props: { open: true, credentials: defaultCredentials },
        });
    });

    it('backdrop punya type="button" dan aria-label', () => {
        const backdrop = screen.getByLabelText(/Tutup modal/i);

        // ✅ FIX: <button> semantic — cek type="button" (bukan role="button")
        expect(backdrop).toHaveAttribute('type', 'button');
        expect(backdrop).toHaveAttribute('aria-label', 'Tutup modal');

        // Bonus: cek tag name = BUTTON
        expect(backdrop.tagName).toBe('BUTTON');
    });

    it('tombol salin email punya aria-label', () => {
        expect(screen.getByLabelText(/Salin email/i)).toBeInTheDocument();
    });

    it('tombol salin username punya aria-label', () => {
        expect(screen.getByLabelText(/Salin username/i)).toBeInTheDocument();
    });

    it('tombol salin password punya aria-label', () => {
        expect(screen.getByLabelText(/Salin password/i)).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 9 — EDGE CASES
// ============================================================

describe('CredentialsModal.svelte — Edge Cases', () => {
    it('handle credentials dengan email panjang', () => {
        render(CredentialsModal, {
            props: {
                open: true,
                credentials: {
                    ...defaultCredentials,
                    email: 'verylongemailaddress@subdomain.example.com',
                },
            },
        });
        expect(
            screen.getByText('verylongemailaddress@subdomain.example.com')
        ).toBeInTheDocument();
    });

    it('handle credentials dengan name panjang', () => {
        const longName = 'a'.repeat(100);
        render(CredentialsModal, {
            props: {
                open: true,
                credentials: { ...defaultCredentials, name: longName },
            },
        });
        expect(screen.getByText(longName)).toBeInTheDocument();
    });

    it('handle password dengan karakter khusus', () => {
        render(CredentialsModal, {
            props: {
                open: true,
                credentials: {
                    ...defaultCredentials,
                    password: '!@#$%^&*()_+{}|:"<>?',
                },
            },
        });
        expect(screen.getByText('!@#$%^&*()_+{}|:"<>?')).toBeInTheDocument();
    });

    it('handle role mitra', () => {
        render(CredentialsModal, {
            props: {
                open: true,
                credentials: { ...defaultCredentials, role: 'mitra' },
            },
        });
        expect(screen.getByText('mitra')).toBeInTheDocument();
    });

    it('handle role admin', () => {
        render(CredentialsModal, {
            props: {
                open: true,
                credentials: { ...defaultCredentials, role: 'admin' },
            },
        });
        expect(screen.getByText('admin')).toBeInTheDocument();
    });
});