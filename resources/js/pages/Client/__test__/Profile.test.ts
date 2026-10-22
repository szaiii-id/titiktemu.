import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import Profile from '../Profile.svelte';
import type { User, UserRole } from '@/types';

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
            name: 'Budi Santoso',
            username: 'budisantoso',
            email: 'budi@example.com',
            role: 'client',
        },
    },
};

let mockPageUrl = '/client/dashboard';

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
            return 'Client/Profile';
        },
    },
    inertia: () => ({
        update: () => {},
        destroy: () => {},
    }),
}));

// ============================================================
// PROPS DEFAULT
// ------------------------------------------------------------
// `satisfies Pick<User, ...>` + `role: 'client' as const`
// membuat TS meng-infer `role` sebagai literal `'client'`
// (subtype dari UserRole), bukan `string` — fix 53 error.
// ============================================================

const defaultUser = {
    id: 1,
    name: 'Budi Santoso',
    username: 'budisantoso',
    email: 'budi@example.com',
    role: 'client' as const, // ✅ kunci fix: literal, bukan string
} satisfies Pick<User, 'id' | 'name' | 'username' | 'email' | 'role'>;

// ============================================================
// HELPER — Selector via ID (Robust, tidak ambigu)
// ============================================================

const getNameInput = () =>
    document.getElementById('name') as HTMLInputElement;

const getUsernameInput = () =>
    document.getElementById('username') as HTMLInputElement;

const getEmailInput = () =>
    document.getElementById('email') as HTMLInputElement;

const getSubmitButton = () =>
    screen.getByRole('button', { name: /^Simpan Perubahan$/i });

const getResetButton = () =>
    screen.getByRole('button', { name: /^Reset$/i });

const getForm = () =>
    getSubmitButton().closest('form') as HTMLFormElement;

/**
 * Helper: ambil preview h2 di card header (bukan topbar).
 * Preview name ada di <h2> di dalam profile card.
 */
const getPreviewName = (): string => {
    const h2 = document.querySelector('h2.text-2xl');
    return h2?.textContent?.trim() ?? '';
};

/**
 * Helper: ambil preview username di card header (bukan topbar).
 * Preview username ada di <p> dengan class truncate di profile card.
 */
const getPreviewUsername = (): string => {
    const paragraphs = document.querySelectorAll('p');
    for (const p of Array.from(paragraphs)) {
        const text = p.textContent?.trim() ?? '';
        if (text.startsWith('@') && p.classList.contains('text-white/80')) {
            return text;
        }
    }
    return '';
};

/**
 * Helper: ambil avatar besar di preview card (bukan topbar).
 * Avatar preview ada di div dengan class "w-20 h-20 rounded-3xl".
 */
const getPreviewAvatar = (): string => {
    const avatar = document.querySelector('div.w-20.h-20.rounded-3xl');
    return avatar?.textContent?.trim() ?? '';
};

// ============================================================
// SETUP & TEARDOWN
// ============================================================

beforeEach(() => {
    mockPut.mockClear();
    mockPost.mockClear();
    mockPageUrl = '/client/dashboard';
    mockPageProps = {
        flash: {},
        auth: {
            user: defaultUser,
        },
    };
});

afterEach(() => {
    vi.clearAllMocks();
});

// ============================================================
// KATEGORI 1 — UI CONTRACT
// ============================================================

describe('Profile.svelte — UI Contract', () => {
    it('menampilkan heading "Profile Saya"', () => {
        render(Profile, { props: { user: defaultUser } });
        const headings = screen.getAllByText(/Profile Saya/i);
        expect(headings.length).toBeGreaterThan(0);
    });

    it('menampilkan field name', () => {
        render(Profile, { props: { user: defaultUser } });
        expect(getNameInput()).toBeInTheDocument();
    });

    it('menampilkan field username', () => {
        render(Profile, { props: { user: defaultUser } });
        expect(getUsernameInput()).toBeInTheDocument();
    });

    it('menampilkan field email (readonly, disabled)', () => {
        render(Profile, { props: { user: defaultUser } });
        const email = getEmailInput();
        expect(email).toBeInTheDocument();
        expect(email.readOnly).toBe(true);
        expect(email.disabled).toBe(true);
    });

    it('menampilkan tombol submit "Simpan Perubahan"', () => {
        render(Profile, { props: { user: defaultUser } });
        expect(getSubmitButton()).toBeInTheDocument();
    });

    it('menampilkan tombol "Reset"', () => {
        render(Profile, { props: { user: defaultUser } });
        expect(getResetButton()).toBeInTheDocument();
    });

    it('menampilkan label "CLIENT" di badge role', () => {
        render(Profile, { props: { user: defaultUser } });
        expect(screen.getByText(/^CLIENT$/i)).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 2 — DATA INITIALIZATION (dari props)
// ============================================================

describe('Profile.svelte — Data Initialization', () => {
    it('field name terisi dari props.user.name', () => {
        render(Profile, { props: { user: defaultUser } });
        expect(getNameInput().value).toBe('Budi Santoso');
    });

    it('field username terisi dari props.user.username', () => {
        render(Profile, { props: { user: defaultUser } });
        expect(getUsernameInput().value).toBe('budisantoso');
    });

    it('field email terisi dari props.user.email', () => {
        render(Profile, { props: { user: defaultUser } });
        expect(getEmailInput().value).toBe('budi@example.com');
    });

    it('username = null dari props → field kosong', () => {
        render(Profile, {
            props: {
                user: { ...defaultUser, username: null as string | null },
            },
        });
        expect(getUsernameInput().value).toBe('');
    });

    it('avatar menampilkan huruf pertama dari name', () => {
        render(Profile, { props: { user: defaultUser } });
        const avatars = screen.getAllByText('B');
        expect(avatars.length).toBeGreaterThan(0);
    });

    it('avatar menampilkan "?" kalau name kosong', () => {
        render(Profile, {
            props: { user: { ...defaultUser, name: '' } },
        });
        const avatars = screen.getAllByText('?');
        expect(avatars.length).toBeGreaterThan(0);
    });

    it('preview name di card header dari form.name', () => {
        render(Profile, { props: { user: defaultUser } });
        expect(getPreviewName()).toBe('Budi Santoso');
    });

    it('preview username pakai @ prefix', () => {
        render(Profile, { props: { user: defaultUser } });
        expect(getPreviewUsername()).toBe('@budisantoso');
    });

    it('preview username fallback ke "username" kalau kosong', () => {
        render(Profile, {
            props: {
                user: { ...defaultUser, username: null as string | null },
            },
        });
        expect(getPreviewUsername()).toBe('@username');
    });
});

// ============================================================
// KATEGORI 3 — BVA: hasChanges
// ============================================================

describe('Profile.svelte — hasChanges (Button State)', () => {
    it('tombol submit disabled saat form tidak berubah', () => {
        render(Profile, { props: { user: defaultUser } });
        expect(getSubmitButton()).toBeDisabled();
    });

    it('tombol reset disabled saat form tidak berubah', () => {
        render(Profile, { props: { user: defaultUser } });
        expect(getResetButton()).toBeDisabled();
    });

    it('tombol submit enabled saat name diubah', async () => {
        render(Profile, { props: { user: defaultUser } });
        await fireEvent.input(getNameInput(), {
            target: { value: 'Nama Baru' },
        });
        expect(getSubmitButton()).not.toBeDisabled();
    });

    it('tombol submit enabled saat username diubah', async () => {
        render(Profile, { props: { user: defaultUser } });
        await fireEvent.input(getUsernameInput(), {
            target: { value: 'username-baru' },
        });
        expect(getSubmitButton()).not.toBeDisabled();
    });

    it('tombol reset enabled saat form berubah', async () => {
        render(Profile, { props: { user: defaultUser } });
        await fireEvent.input(getNameInput(), {
            target: { value: 'Nama Baru' },
        });
        expect(getResetButton()).not.toBeDisabled();
    });

    it('tombol submit disabled kembali saat perubahan di-revert', async () => {
        render(Profile, { props: { user: defaultUser } });

        await fireEvent.input(getNameInput(), {
            target: { value: 'Nama Baru' },
        });
        expect(getSubmitButton()).not.toBeDisabled();

        await fireEvent.input(getNameInput(), {
            target: { value: 'Budi Santoso' },
        });
        expect(getSubmitButton()).toBeDisabled();
    });

    it('username null → kosong dianggap sama (tidak hasChanges)', () => {
        render(Profile, {
            props: {
                user: { ...defaultUser, username: null as string | null },
            },
        });
        expect(getSubmitButton()).toBeDisabled();
    });
});

// ============================================================
// KATEGORI 4 — BEHAVIORAL: Form Submit
// ============================================================

describe('Profile.svelte — Form Submit', () => {
    it('submit memanggil router.put dengan payload name + username', async () => {
        render(Profile, { props: { user: defaultUser } });

        await fireEvent.input(getNameInput(), {
            target: { value: 'Nama Baru' },
        });
        await fireEvent.input(getUsernameInput(), {
            target: { value: 'username-baru' },
        });

        await fireEvent.submit(getForm());

        expect(mockPut).toHaveBeenCalledTimes(1);
        expect(mockPut).toHaveBeenCalledWith(
            '/client/profile',
            {
                name: 'Nama Baru',
                username: 'username-baru',
            },
            expect.objectContaining({
                preserveScroll: true,
                onError: expect.any(Function),
                onFinish: expect.any(Function),
            }),
        );
    });

    it('submit TIDAK dipanggil kalau tidak ada perubahan', async () => {
        render(Profile, { props: { user: defaultUser } });

        await fireEvent.submit(getForm());

        expect(mockPut).not.toHaveBeenCalled();
    });

    it('submit dengan hanya name diubah → tetap kirim username juga', async () => {
        render(Profile, { props: { user: defaultUser } });

        await fireEvent.input(getNameInput(), {
            target: { value: 'Nama Baru' },
        });

        await fireEvent.submit(getForm());

        expect(mockPut).toHaveBeenCalledWith(
            '/client/profile',
            {
                name: 'Nama Baru',
                username: 'budisantoso',
            },
            expect.any(Object),
        );
    });

    it('submit TIDAK mengirim email (readonly)', async () => {
        render(Profile, { props: { user: defaultUser } });

        await fireEvent.input(getNameInput(), {
            target: { value: 'Nama Baru' },
        });

        await fireEvent.submit(getForm());

        const [, payload] = mockPut.mock.calls[0];
        expect(payload).not.toHaveProperty('email');
    });
});

// ============================================================
// KATEGORI 5 — BEHAVIORAL: Reset Form
// ============================================================

describe('Profile.svelte — Reset Form', () => {
    it('reset mengembalikan name ke nilai awal', async () => {
        render(Profile, { props: { user: defaultUser } });

        await fireEvent.input(getNameInput(), {
            target: { value: 'Nama Baru' },
        });
        expect(getNameInput().value).toBe('Nama Baru');

        await fireEvent.click(getResetButton());

        expect(getNameInput().value).toBe('Budi Santoso');
    });

    it('reset mengembalikan username ke nilai awal', async () => {
        render(Profile, { props: { user: defaultUser } });

        await fireEvent.input(getUsernameInput(), {
            target: { value: 'username-baru' },
        });

        await fireEvent.click(getResetButton());

        expect(getUsernameInput().value).toBe('budisantoso');
    });

    it('reset menyembunyikan error', async () => {
        render(Profile, { props: { user: defaultUser } });

        await fireEvent.input(getNameInput(), {
            target: { value: 'Nama Baru' },
        });
        await fireEvent.submit(getForm());

        const [, , options] = mockPut.mock.calls[0];
        options.onError({ name: 'Nama wajib diisi.' });

        await waitFor(() => {
            expect(screen.getByText('Nama wajib diisi.')).toBeInTheDocument();
        });

        await fireEvent.click(getResetButton());

        expect(screen.queryByText('Nama wajib diisi.')).not.toBeInTheDocument();
    });

    it('reset dengan username null mengembalikan ke string kosong', async () => {
        render(Profile, {
            props: {
                user: { ...defaultUser, username: null as string | null },
            },
        });

        await fireEvent.input(getUsernameInput(), {
            target: { value: 'username-baru' },
        });
        await fireEvent.click(getResetButton());

        expect(getUsernameInput().value).toBe('');
    });

    it('setelah reset, tombol submit disabled lagi', async () => {
        render(Profile, { props: { user: defaultUser } });

        await fireEvent.input(getNameInput(), {
            target: { value: 'Nama Baru' },
        });
        expect(getSubmitButton()).not.toBeDisabled();

        await fireEvent.click(getResetButton());

        expect(getSubmitButton()).toBeDisabled();
    });
});

// ============================================================
// KATEGORI 6 — NEGATIVE PATH: Error Handling
// ============================================================

describe('Profile.svelte — Error Handling', () => {
    it('menampilkan error name setelah onError', async () => {
        render(Profile, { props: { user: defaultUser } });

        await fireEvent.input(getNameInput(), {
            target: { value: 'Nama Baru' },
        });
        await fireEvent.submit(getForm());

        const [, , options] = mockPut.mock.calls[0];
        options.onError({ name: 'Nama wajib diisi.' });

        await waitFor(() => {
            expect(screen.getByText('Nama wajib diisi.')).toBeInTheDocument();
        });
    });

    it('menampilkan error username setelah onError', async () => {
        render(Profile, { props: { user: defaultUser } });

        await fireEvent.input(getUsernameInput(), {
            target: { value: 'username-baru' },
        });
        await fireEvent.submit(getForm());

        const [, , options] = mockPut.mock.calls[0];
        options.onError({ username: 'Username sudah dipakai.' });

        await waitFor(() => {
            expect(
                screen.getByText('Username sudah dipakai.'),
            ).toBeInTheDocument();
        });
    });

    it('menampilkan alert "Terdapat N kesalahan" saat ada error', async () => {
        render(Profile, { props: { user: defaultUser } });

        await fireEvent.input(getNameInput(), {
            target: { value: 'Nama Baru' },
        });
        await fireEvent.submit(getForm());

        const [, , options] = mockPut.mock.calls[0];
        options.onError({
            name: 'Nama wajib diisi.',
            username: 'Username sudah dipakai.',
        });

        await waitFor(() => {
            expect(
                screen.getByText(/Terdapat 2 kesalahan pada form/i),
            ).toBeInTheDocument();
        });
    });

    it('error nama dan username bisa tampil bersamaan', async () => {
        render(Profile, { props: { user: defaultUser } });

        await fireEvent.input(getNameInput(), {
            target: { value: 'Nama Baru' },
        });
        await fireEvent.submit(getForm());

        const [, , options] = mockPut.mock.calls[0];
        options.onError({
            name: 'Nama wajib diisi.',
            username: 'Username sudah dipakai.',
        });

        await waitFor(() => {
            expect(screen.getByText('Nama wajib diisi.')).toBeInTheDocument();
            expect(
                screen.getByText('Username sudah dipakai.'),
            ).toBeInTheDocument();
        });
    });

    it('errors direset setiap kali submit ulang', async () => {
        render(Profile, { props: { user: defaultUser } });

        await fireEvent.input(getNameInput(), {
            target: { value: 'Nama Baru' },
        });
        await fireEvent.submit(getForm());

        const [, , options1] = mockPut.mock.calls[0];
        options1.onError({ name: 'Error lama.' });

        await waitFor(() => {
            expect(screen.getByText('Error lama.')).toBeInTheDocument();
        });

        await fireEvent.submit(getForm());

        expect(screen.queryByText('Error lama.')).not.toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 7 — BVA: Processing State
// ============================================================

describe('Profile.svelte — Processing State', () => {
    it('tombol submit menampilkan "Menyimpan..." saat processing', async () => {
        render(Profile, { props: { user: defaultUser } });

        await fireEvent.input(getNameInput(), {
            target: { value: 'Nama Baru' },
        });
        await fireEvent.submit(getForm());

        await waitFor(() => {
            expect(screen.getByText(/Menyimpan/i)).toBeInTheDocument();
        });
    });

    it('tombol submit disabled saat processing', async () => {
        render(Profile, { props: { user: defaultUser } });

        await fireEvent.input(getNameInput(), {
            target: { value: 'Nama Baru' },
        });
        await fireEvent.submit(getForm());

        const button = screen.getByRole('button', { name: /Menyimpan/i });
        expect(button).toBeDisabled();
    });

    it('tombol reset disabled saat processing', async () => {
        render(Profile, { props: { user: defaultUser } });

        await fireEvent.input(getNameInput(), {
            target: { value: 'Nama Baru' },
        });
        await fireEvent.submit(getForm());

        expect(getResetButton()).toBeDisabled();
    });

    it('setelah onFinish, tombol submit enabled kembali', async () => {
        render(Profile, { props: { user: defaultUser } });

        await fireEvent.input(getNameInput(), {
            target: { value: 'Nama Baru' },
        });
        await fireEvent.submit(getForm());

        const [, , options] = mockPut.mock.calls[0];
        options.onFinish();

        await waitFor(() => {
            expect(getSubmitButton()).not.toBeDisabled();
        });
    });
});

// ============================================================
// KATEGORI 8 — EDGE CASE: Flash Message
// ============================================================

describe('Profile.svelte — Flash Message', () => {
    it('menampilkan flash status jika ada', () => {
        mockPageProps.flash = { status: 'Profile berhasil diperbarui.' };
        render(Profile, { props: { user: defaultUser } });
        expect(
            screen.getByText('Profile berhasil diperbarui.'),
        ).toBeInTheDocument();
    });

    it('tidak menampilkan flash status jika kosong', () => {
        mockPageProps.flash = {};
        render(Profile, { props: { user: defaultUser } });
        expect(document.querySelector('.bg-green-50')).not.toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 9 — UI CONTRACT: Email Read-Only
// ============================================================

describe('Profile.svelte — Email Read-Only', () => {
    it('email input memiliki atribut readonly', () => {
        render(Profile, { props: { user: defaultUser } });
        expect(getEmailInput().readOnly).toBe(true);
    });

    it('email input memiliki atribut disabled', () => {
        render(Profile, { props: { user: defaultUser } });
        expect(getEmailInput().disabled).toBe(true);
    });

    it('email input memiliki text informasi "tidak dapat diubah"', () => {
        render(Profile, { props: { user: defaultUser } });
        const infoTexts = screen.getAllByText(/Email tidak dapat diubah/i);
        expect(infoTexts.length).toBeGreaterThan(0);
    });

    it('email input TIDAK bisa diubah karena readonly + disabled', () => {
        render(Profile, { props: { user: defaultUser } });

        const email = getEmailInput();

        expect(email.readOnly).toBe(true);
        expect(email.disabled).toBe(true);
        expect(email.value).toBe('budi@example.com');
    });
});

// ============================================================
// KATEGORI 10 — UI CONTRACT: Avatar & Preview
// ============================================================

describe('Profile.svelte — Avatar & Preview', () => {
    it('avatar menampilkan huruf pertama dari name (uppercase)', () => {
        render(Profile, {
            props: { user: { ...defaultUser, name: 'andi' } },
        });
        const avatars = screen.getAllByText('A');
        expect(avatars.length).toBeGreaterThan(0);
    });

    it('avatar update saat name diubah di form', async () => {
        render(Profile, { props: { user: defaultUser } });

        expect(screen.getAllByText('B').length).toBeGreaterThan(0);

        await fireEvent.input(getNameInput(), {
            target: { value: 'Zulkifli' },
        });

        await waitFor(() => {
            expect(screen.getAllByText('Z').length).toBeGreaterThan(0);
        });
    });

    it('preview username update saat username diubah', async () => {
        render(Profile, { props: { user: defaultUser } });

        await fireEvent.input(getUsernameInput(), {
            target: { value: 'username-baru' },
        });

        await waitFor(() => {
            expect(getPreviewUsername()).toBe('@username-baru');
        });
    });

    it('preview name fallback ke "Client" kalau kosong', async () => {
        render(Profile, { props: { user: defaultUser } });

        await fireEvent.input(getNameInput(), {
            target: { value: '' },
        });

        await waitFor(() => {
            expect(getPreviewName()).toBe('Client');
        });
    });
});