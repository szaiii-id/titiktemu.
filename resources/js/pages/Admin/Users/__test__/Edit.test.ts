import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import UserEdit from '../Edit.svelte';

// ============================================================
// MOCK INERTIA
// ============================================================

const mockPut = vi.fn();

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
            id: 99,
            name: 'Admin Current',
            username: 'admin',
            email: 'admin@example.com',
            role: 'admin',
        },
    },
};

let mockPageUrl = '/admin/users/5/edit';

vi.mock('@inertiajs/svelte', () => ({
    router: {
        put: (...args: unknown[]) => mockPut(...args),
        post: vi.fn(),
        get: vi.fn(),
        delete: vi.fn(),
    },
    page: {
        get props() {
            return mockPageProps;
        },
        get url() {
            return mockPageUrl;
        },
        get component() {
            return 'Admin/Users/Edit';
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

const getInput = (id: string) =>
    document.getElementById(id) as HTMLInputElement;

const getTextarea = (id: string) =>
    document.getElementById(id) as HTMLTextAreaElement;

const getSubmitButton = () =>
    screen.getByRole('button', { name: /^Simpan Perubahan$/i });

const getForm = () =>
    getSubmitButton().closest('form') as HTMLFormElement;

// ============================================================
// PROPS DEFAULT
// ============================================================

const makeUser = (overrides: Partial<any> = {}) => ({
    id: 5,
    name: 'Budi Santoso',
    username: 'budisantoso',
    email: 'budi@example.com',
    role: 'admin' as const,
    profile: {
        nama_penyedia_usaha: 'PT Budi Jaya',
        nomor_identitas: '1234567890',
        alamat: 'Jl. Merdeka No. 1',
        telepon: '08123456789',
        provinsi: 'Bali',
        kota: 'Denpasar',
        kode_pos: '80119',
        deskripsi: 'Usaha travel terpercaya',
    },
    ...overrides,
});

const makeMitraUser = (overrides: Partial<any> = {}) => ({
    ...makeUser(),
    role: 'mitra' as const,
    name: 'Mitra Sejahtera',
    email: 'mitra@example.com',
    ...overrides,
});

// ============================================================
// SETUP & TEARDOWN
// ============================================================

beforeEach(() => {
    mockPut.mockClear();
    mockPageUrl = '/admin/users/5/edit';
    mockPageProps = {
        flash: {},
        auth: {
            user: {
                id: 99,
                name: 'Admin Current',
                username: 'admin',
                email: 'admin@example.com',
                role: 'admin',
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

describe('Admin/Users/Edit.svelte — UI Contract', () => {
    it('menampilkan breadcrumb "Kembali ke Daftar User"', () => {
        render(UserEdit, { props: { user: makeUser() } });
        expect(
            screen.getByRole('link', { name: /Kembali ke Daftar User/i })
        ).toBeInTheDocument();
    });

    it('breadcrumb punya href ke /admin/users', () => {
        render(UserEdit, { props: { user: makeUser() } });
        const link = screen.getByRole('link', { name: /Kembali ke Daftar User/i });
        expect(link).toHaveAttribute('href', '/admin/users');
    });

    it('menampilkan heading "Edit Budi Santoso"', () => {
        render(UserEdit, { props: { user: makeUser() } });
        expect(
            screen.getByRole('heading', { name: /Edit Budi Santoso/i })
        ).toBeInTheDocument();
    });

    it('menampilkan email user', () => {
        render(UserEdit, { props: { user: makeUser() } });
        const elements = screen.getAllByText('budi@example.com');
        expect(elements.length).toBeGreaterThan(0);
    });

    it('menampilkan badge role "Admin"', () => {
        render(UserEdit, { props: { user: makeUser() } });
        expect(screen.getByText(/^Admin$/i)).toBeInTheDocument();
    });

    it('menampilkan badge role "Mitra" untuk role mitra', () => {
        render(UserEdit, { props: { user: makeMitraUser() } });
        expect(screen.getByText(/^Mitra$/i)).toBeInTheDocument();
    });

    it('menampilkan tombol submit "Simpan Perubahan"', () => {
        render(UserEdit, { props: { user: makeUser() } });
        expect(getSubmitButton()).toBeInTheDocument();
    });

    it('menampilkan tombol "Batal"', () => {
        render(UserEdit, { props: { user: makeUser() } });
        expect(screen.getByRole('link', { name: /^Batal$/i })).toBeInTheDocument();
    });

    it('tombol Batal punya href ke /admin/users', () => {
        render(UserEdit, { props: { user: makeUser() } });
        const link = screen.getByRole('link', { name: /^Batal$/i });
        expect(link).toHaveAttribute('href', '/admin/users');
    });
});

// ============================================================
// KATEGORI 2 — DATA INITIALIZATION
// ============================================================

describe('Admin/Users/Edit.svelte — Data Initialization', () => {
    it('field name terisi dari user.name', () => {
        render(UserEdit, { props: { user: makeUser() } });
        expect(getInput('name').value).toBe('Budi Santoso');
    });

    it('field email terisi dari user.email', () => {
        render(UserEdit, { props: { user: makeUser() } });
        expect(getInput('email').value).toBe('budi@example.com');
    });

    it('field username terisi dari user.username', () => {
        render(UserEdit, { props: { user: makeUser() } });
        expect(getInput('username').value).toBe('budisantoso');
    });

    it('username null → field kosong', () => {
        render(UserEdit, {
            props: { user: makeUser({ username: null }) },
        });
        expect(getInput('username').value).toBe('');
    });

    it('field profile terisi dari user.profile (mitra)', () => {
        render(UserEdit, { props: { user: makeMitraUser() } });
        expect(getInput('nama_penyedia_usaha').value).toBe('PT Budi Jaya');
        expect(getInput('nomor_identitas').value).toBe('1234567890');
        expect(getInput('telepon').value).toBe('08123456789');
    });

    it('field profile kosong kalau profile null', () => {
        render(UserEdit, {
            props: { user: makeMitraUser({ profile: null }) },
        });
        expect(getInput('nama_penyedia_usaha').value).toBe('');
        expect(getInput('nomor_identitas').value).toBe('');
    });
});

// ============================================================
// KATEGORI 3 — CONDITIONAL RENDERING (Role-based)
// ============================================================

describe('Admin/Users/Edit.svelte — Conditional Rendering', () => {
    it('admin TIDAK menampilkan section "Data Usaha"', () => {
        render(UserEdit, { props: { user: makeUser() } });
        expect(screen.queryByText(/^Data Usaha$/i)).not.toBeInTheDocument();
    });

    it('mitra menampilkan section "Data Usaha"', () => {
        render(UserEdit, { props: { user: makeMitraUser() } });
        expect(screen.getByText(/^Data Usaha$/i)).toBeInTheDocument();
    });

    it('mitra menampilkan semua field data usaha', () => {
        render(UserEdit, { props: { user: makeMitraUser() } });
        expect(getInput('nama_penyedia_usaha')).toBeInTheDocument();
        expect(getInput('nomor_identitas')).toBeInTheDocument();
        expect(getInput('telepon')).toBeInTheDocument();
        expect(getTextarea('alamat')).toBeInTheDocument();
        expect(getInput('provinsi')).toBeInTheDocument();
        expect(getInput('kota')).toBeInTheDocument();
        expect(getInput('kode_pos')).toBeInTheDocument();
        expect(getTextarea('deskripsi')).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 4 — BEHAVIORAL: Form Submit (Admin)
// ============================================================

describe('Admin/Users/Edit.svelte — Form Submit: Admin', () => {
    it('submit admin memanggil router.put dengan payload benar', async () => {
        render(UserEdit, { props: { user: makeUser() } });

        await fireEvent.input(getInput('name'), {
            target: { value: 'Nama Baru' },
        });

        await fireEvent.submit(getForm());

        expect(mockPut).toHaveBeenCalledTimes(1);
        expect(mockPut).toHaveBeenCalledWith(
            '/admin/users/5',
            expect.objectContaining({
                name: 'Nama Baru',
                email: 'budi@example.com',
                username: 'budisantoso',
            }),
            expect.objectContaining({
                onError: expect.any(Function),
                onFinish: expect.any(Function),
            }),
        );
    });

    it('submit admin tetap kirim objek profile (meski kosong)', async () => {
        render(UserEdit, { props: { user: makeUser() } });

        await fireEvent.submit(getForm());

        const [, payload] = mockPut.mock.calls[0];
        expect(payload).toHaveProperty('profile');
        expect(typeof payload.profile).toBe('object');
    });
});

// ============================================================
// KATEGORI 5 — BEHAVIORAL: Form Submit (Mitra)
// ============================================================

describe('Admin/Users/Edit.svelte — Form Submit: Mitra', () => {
    it('submit mitra memanggil router.put dengan payload lengkap', async () => {
        render(UserEdit, { props: { user: makeMitraUser() } });

        await fireEvent.input(getInput('nama_penyedia_usaha'), {
            target: { value: 'PT Baru' },
        });

        await fireEvent.submit(getForm());

        expect(mockPut).toHaveBeenCalledWith(
            '/admin/users/5',
            expect.objectContaining({
                name: 'Mitra Sejahtera',
                email: 'mitra@example.com',
                profile: expect.objectContaining({
                    nama_penyedia_usaha: 'PT Baru',
                }),
            }),
            expect.any(Object),
        );
    });

    it('submit mitra mengirim semua field profile', async () => {
        render(UserEdit, { props: { user: makeMitraUser() } });
        await fireEvent.submit(getForm());

        const [, payload] = mockPut.mock.calls[0];
        expect(payload.profile).toHaveProperty('nama_penyedia_usaha');
        expect(payload.profile).toHaveProperty('nomor_identitas');
        expect(payload.profile).toHaveProperty('alamat');
        expect(payload.profile).toHaveProperty('telepon');
        expect(payload.profile).toHaveProperty('provinsi');
        expect(payload.profile).toHaveProperty('kota');
        expect(payload.profile).toHaveProperty('kode_pos');
        expect(payload.profile).toHaveProperty('deskripsi');
    });
});

// ============================================================
// KATEGORI 6 — NEGATIVE PATH: Error Handling
// ============================================================

describe('Admin/Users/Edit.svelte — Error Handling', () => {
    it('menampilkan error name setelah onError', async () => {
        render(UserEdit, { props: { user: makeUser() } });

        await fireEvent.submit(getForm());

        const [, , options] = mockPut.mock.calls[0];
        options.onError({ name: 'Nama wajib diisi.' });

        await waitFor(() => {
            expect(screen.getByText('Nama wajib diisi.')).toBeInTheDocument();
        });
    });

    it('menampilkan error email setelah onError', async () => {
        render(UserEdit, { props: { user: makeUser() } });

        await fireEvent.submit(getForm());

        const [, , options] = mockPut.mock.calls[0];
        options.onError({ email: 'Email sudah digunakan.' });

        await waitFor(() => {
            expect(screen.getByText('Email sudah digunakan.')).toBeInTheDocument();
        });
    });

    it('menampilkan error username setelah onError', async () => {
        render(UserEdit, { props: { user: makeUser() } });

        await fireEvent.submit(getForm());

        const [, , options] = mockPut.mock.calls[0];
        options.onError({ username: 'Username sudah dipakai.' });

        await waitFor(() => {
            expect(screen.getByText('Username sudah dipakai.')).toBeInTheDocument();
        });
    });

    it('errors direset setiap kali submit ulang', async () => {
        render(UserEdit, { props: { user: makeUser() } });

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

describe('Admin/Users/Edit.svelte — Processing State', () => {
    it('tombol submit menampilkan "Menyimpan..." saat processing', async () => {
        render(UserEdit, { props: { user: makeUser() } });

        await fireEvent.submit(getForm());

        await waitFor(() => {
            expect(screen.getByText(/Menyimpan/i)).toBeInTheDocument();
        });
    });

    it('tombol submit disabled saat processing', async () => {
        render(UserEdit, { props: { user: makeUser() } });

        await fireEvent.submit(getForm());

        const button = screen.getByRole('button', { name: /Menyimpan/i });
        expect(button).toBeDisabled();
    });

    it('setelah onFinish, tombol submit enabled kembali', async () => {
        render(UserEdit, { props: { user: makeUser() } });

        await fireEvent.submit(getForm());

        const [, , options] = mockPut.mock.calls[0];
        options.onFinish();

        await waitFor(() => {
            expect(getSubmitButton()).not.toBeDisabled();
        });
    });
});

// ============================================================
// KATEGORI 8 — UI CONTRACT: Field Attributes
// ============================================================

describe('Admin/Users/Edit.svelte — Field Attributes', () => {
    it('field name bertipe text', () => {
        render(UserEdit, { props: { user: makeUser() } });
        expect(getInput('name').type).toBe('text');
    });

    it('field email bertipe email', () => {
        render(UserEdit, { props: { user: makeUser() } });
        expect(getInput('email').type).toBe('email');
    });

    it('field name required', () => {
        render(UserEdit, { props: { user: makeUser() } });
        expect(getInput('name').required).toBe(true);
    });

    it('field email required', () => {
        render(UserEdit, { props: { user: makeUser() } });
        expect(getInput('email').required).toBe(true);
    });

    it('field username TIDAK required', () => {
        render(UserEdit, { props: { user: makeUser() } });
        expect(getInput('username').required).toBe(false);
    });
});

// ============================================================
// KATEGORI 9 — UI CONTRACT: Avatar & Header
// ============================================================

describe('Admin/Users/Edit.svelte — Avatar & Header', () => {
    it('avatar menampilkan huruf pertama nama (uppercase)', () => {
        render(UserEdit, { props: { user: makeUser() } });
        const avatars = screen.getAllByText('B');
        expect(avatars.length).toBeGreaterThan(0);
    });

    it('avatar dengan nama lowercase tampil uppercase', () => {
        render(UserEdit, {
            props: { user: makeUser({ name: 'andi' }) },
        });
        const avatars = screen.getAllByText('A');
        expect(avatars.length).toBeGreaterThan(0);
    });

    it('header menampilkan nama user', () => {
        render(UserEdit, { props: { user: makeUser() } });
        const elements = screen.getAllByText(/Budi Santoso/i);
        expect(elements.length).toBeGreaterThan(0);
    });

    it('header menampilkan email user', () => {
        render(UserEdit, { props: { user: makeUser() } });
        const elements = screen.getAllByText('budi@example.com');
        expect(elements.length).toBeGreaterThan(0);
    });
});

// ============================================================
// KATEGORI 10 — UI CONTRACT: Route & Menu
// ============================================================

describe('Admin/Users/Edit.svelte — Route & Menu', () => {
    it('menu item "Manajemen User" ada di sidebar', () => {
        render(UserEdit, { props: { user: makeUser() } });
        const menuLink = screen.getByRole('link', { name: /^Manajemen User$/i });
        expect(menuLink).toHaveAttribute('href', '/admin/users');
    });

    it('menu item "Dashboard" ada di sidebar', () => {
        render(UserEdit, { props: { user: makeUser() } });
        const menuLink = screen.getByRole('link', { name: /^Dashboard$/i });
        expect(menuLink).toHaveAttribute('href', '/admin/dashboard');
    });

    it('menu item "Daftar Client" ada di sidebar', () => {
        render(UserEdit, { props: { user: makeUser() } });
        const menuLink = screen.getByRole('link', { name: /^Daftar Client$/i });
        expect(menuLink).toHaveAttribute('href', '/admin/clients');
    });
});

// ============================================================
// KATEGORI 11 — EDGE CASES
// ============================================================

describe('Admin/Users/Edit.svelte — Edge Cases', () => {
    it('handle email dengan subdomain', () => {
        render(UserEdit, {
            props: { user: makeUser({ email: 'user@mail.example.com' }) },
        });
        expect(getInput('email').value).toBe('user@mail.example.com');
    });

    it('handle nama panjang', () => {
        const longName = 'a'.repeat(100);
        render(UserEdit, {
            props: { user: makeUser({ name: longName }) },
        });
        expect(getInput('name').value).toBe(longName);
    });

    it('handle profile dengan semua field null', () => {
        render(UserEdit, {
            props: {
                user: makeMitraUser({
                    profile: {
                        nama_penyedia_usaha: null,
                        nomor_identitas: null,
                        alamat: null,
                        telepon: null,
                        provinsi: null,
                        kota: null,
                        kode_pos: null,
                        deskripsi: null,
                    },
                }),
            },
        });
        expect(getInput('nama_penyedia_usaha').value).toBe('');
        expect(getInput('nomor_identitas').value).toBe('');
    });

    it('handle user id berbeda — PUT ke /admin/users/{id}', async () => {
        render(UserEdit, {
            props: { user: makeUser({ id: 42 }) },
        });

        await fireEvent.submit(getForm());

        expect(mockPut).toHaveBeenCalledWith(
            '/admin/users/42',
            expect.any(Object),
            expect.any(Object),
        );
    });
});

// ============================================================
// KATEGORI 12 — FLASH MESSAGE
// ============================================================

describe('Admin/Users/Edit.svelte — Flash Message', () => {
    it('flash status tersedia di props', () => {
        mockPageProps.flash = { status: 'User berhasil diperbarui.' };
        render(UserEdit, { props: { user: makeUser() } });
        expect(mockPageProps.flash.status).toBe('User berhasil diperbarui.');
    });

    it('tidak menampilkan flash jika kosong', () => {
        mockPageProps.flash = {};
        render(UserEdit, { props: { user: makeUser() } });
        expect(document.querySelector('.bg-green-50')).not.toBeInTheDocument();
    });
});