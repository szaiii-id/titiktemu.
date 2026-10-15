import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import UserCreate from '../Create.svelte';

// ============================================================
// MOCK INERTIA
// ============================================================

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
            id: 99,
            name: 'Admin Current',
            username: 'admin',
            email: 'admin@example.com',
            role: 'admin',
        },
    },
};

let mockPageUrl = '/admin/users/create';

vi.mock('@inertiajs/svelte', () => ({
    router: {
        post: (...args: unknown[]) => mockPost(...args),
        get: vi.fn(),
        put: vi.fn(),
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
            return 'Admin/Users/Create';
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
    screen.getByRole('button', { name: /^Buat User$/i });

const getForm = () =>
    getSubmitButton().closest('form') as HTMLFormElement;

/**
 * Klik tombol pilih role (Admin / Mitra) di Step 1.
 *
 * Menggunakan selector h3 karena text "Admin" / "Mitra" muncul di
 * multiple tempat (card role + tombol submit "Buat Akun Admin/Mitra").
 */
const clickRoleButton = async (roleName: 'Admin' | 'Mitra') => {
    const buttons = screen.getAllByRole('button');
    const button = buttons.find(
        (btn) => btn.querySelector('h3')?.textContent?.trim() === roleName,
    );

    if (!button) {
        throw new Error(`Tombol role "${roleName}" tidak ditemukan`);
    }

    await fireEvent.click(button);
};

// ============================================================
// SETUP & TEARDOWN
// ============================================================

beforeEach(() => {
    mockPost.mockClear();
    mockPageUrl = '/admin/users/create';
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
// KATEGORI 1 — STEP 1: PILIH ROLE (UI CONTRACT)
// ============================================================

describe('Admin/Users/Create.svelte — Step 1: Pilih Role', () => {
    it('menampilkan heading "Pilih Role User"', () => {
        render(UserCreate);
        expect(
            screen.getByRole('heading', { name: /Pilih Role User/i })
        ).toBeInTheDocument();
    });

    it('menampilkan card pilihan "Admin"', () => {
        render(UserCreate);
        const buttons = screen.getAllByRole('button');
        const adminCard = buttons.find(
            (btn) => btn.querySelector('h3')?.textContent?.trim() === 'Admin',
        );
        expect(adminCard).toBeInTheDocument();
    });

    it('menampilkan card pilihan "Mitra"', () => {
        render(UserCreate);
        const buttons = screen.getAllByRole('button');
        const mitraCard = buttons.find(
            (btn) => btn.querySelector('h3')?.textContent?.trim() === 'Mitra',
        );
        expect(mitraCard).toBeInTheDocument();
    });

    it('menampilkan info "Client tidak bisa dibuat di sini"', () => {
        render(UserCreate);
        expect(
            screen.getByText(/Client tidak bisa dibuat di sini/i)
        ).toBeInTheDocument();
    });

    it('menampilkan breadcrumb "Kembali ke Daftar User"', () => {
        render(UserCreate);
        expect(
            screen.getByRole('link', { name: /Kembali ke Daftar User/i })
        ).toBeInTheDocument();
    });

    it('breadcrumb punya href ke /admin/users', () => {
        render(UserCreate);
        const link = screen.getByRole('link', { name: /Kembali ke Daftar User/i });
        expect(link).toHaveAttribute('href', '/admin/users');
    });

it('menampilkan stepper dengan step 1 aktif', () => {
    render(UserCreate);

    // Pakai exact match untuk membedakan label stepper dari heading
    expect(screen.getByText(/^Pilih Role$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Isi Data$/i)).toBeInTheDocument();
});

    it('TIDAK menampilkan form di step 1', () => {
        render(UserCreate);
        expect(document.getElementById('name')).not.toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 2 — STEP 2: PILIH ADMIN
// ============================================================

describe('Admin/Users/Create.svelte — Step 2: Admin', () => {
    const goToAdmin = async () => {
        render(UserCreate);
        await clickRoleButton('Admin');
    };

    it('pilih admin menampilkan form', async () => {
        await goToAdmin();
        expect(document.getElementById('name')).toBeInTheDocument();
    });

    it('heading berubah jadi "Buat Akun Admin"', async () => {
        await goToAdmin();
        expect(
            screen.getByRole('heading', { name: /Buat Akun Admin/i })
        ).toBeInTheDocument();
    });

    it('menampilkan field nama, email, username, password', async () => {
        await goToAdmin();
        expect(getInput('name')).toBeInTheDocument();
        expect(getInput('email')).toBeInTheDocument();
        expect(getInput('username')).toBeInTheDocument();
        expect(getInput('password')).toBeInTheDocument();
    });

    it('TIDAK menampilkan field data usaha (karena admin)', async () => {
        await goToAdmin();
        expect(document.getElementById('nama_penyedia_usaha')).not.toBeInTheDocument();
        expect(document.getElementById('nomor_identitas')).not.toBeInTheDocument();
    });

    it('menampilkan tombol "Ganti Role"', async () => {
        await goToAdmin();
        expect(
            screen.getByRole('button', { name: /Ganti Role/i })
        ).toBeInTheDocument();
    });

    it('tombol "Ganti Role" kembali ke step 1', async () => {
        await goToAdmin();
        await fireEvent.click(screen.getByRole('button', { name: /Ganti Role/i }));

        expect(
            screen.getByRole('heading', { name: /Pilih Role User/i })
        ).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 3 — STEP 2: PILIH MITRA
// ============================================================

describe('Admin/Users/Create.svelte — Step 2: Mitra', () => {
    const goToMitra = async () => {
        render(UserCreate);
        await clickRoleButton('Mitra');
    };

    it('pilih mitra menampilkan form', async () => {
        await goToMitra();
        expect(document.getElementById('name')).toBeInTheDocument();
    });

    it('heading berubah jadi "Buat Akun Mitra"', async () => {
        await goToMitra();
        expect(
            screen.getByRole('heading', { name: /Buat Akun Mitra/i })
        ).toBeInTheDocument();
    });

    it('menampilkan field data usaha', async () => {
        await goToMitra();
        expect(getInput('nama_penyedia_usaha')).toBeInTheDocument();
        expect(getInput('nomor_identitas')).toBeInTheDocument();
        expect(getInput('telepon')).toBeInTheDocument();
        expect(getTextarea('alamat')).toBeInTheDocument();
    });

    it('menampilkan field provinsi, kota, kode_pos', async () => {
        await goToMitra();
        expect(getInput('provinsi')).toBeInTheDocument();
        expect(getInput('kota')).toBeInTheDocument();
        expect(getInput('kode_pos')).toBeInTheDocument();
    });

    it('menampilkan field deskripsi usaha', async () => {
        await goToMitra();
        expect(getTextarea('deskripsi')).toBeInTheDocument();
    });

    it('menampilkan section "Data Usaha"', async () => {
        await goToMitra();
        expect(screen.getByText(/Data Usaha/i)).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 4 — FORM SUBMIT: ADMIN
// ============================================================

describe('Admin/Users/Create.svelte — Form Submit: Admin', () => {
    it('submit form admin memanggil router.post dengan payload benar', async () => {
        render(UserCreate);
        await clickRoleButton('Admin');

        await fireEvent.input(getInput('name'), {
            target: { value: 'New Admin' },
        });
        await fireEvent.input(getInput('email'), {
            target: { value: 'newadmin@example.com' },
        });
        await fireEvent.input(getInput('username'), {
            target: { value: 'newadmin' },
        });
        await fireEvent.input(getInput('password'), {
            target: { value: 'Password123!' },
        });

        await fireEvent.submit(getForm());

        expect(mockPost).toHaveBeenCalledTimes(1);
        expect(mockPost).toHaveBeenCalledWith(
            '/admin/users',
            {
                role: 'admin',
                name: 'New Admin',
                username: 'newadmin',
                email: 'newadmin@example.com',
                password: 'Password123!',
            },
            expect.objectContaining({
                onError: expect.any(Function),
                onFinish: expect.any(Function),
            }),
        );
    });

    it('submit form admin TIDAK mengirim field mitra', async () => {
        render(UserCreate);
        await clickRoleButton('Admin');
        await fireEvent.submit(getForm());

        const [, payload] = mockPost.mock.calls[0];
        expect(payload).not.toHaveProperty('nama_penyedia_usaha');
        expect(payload).not.toHaveProperty('nomor_identitas');
        expect(payload).not.toHaveProperty('alamat');
    });

    it('username kosong → null di payload', async () => {
        render(UserCreate);
        await clickRoleButton('Admin');

        await fireEvent.input(getInput('name'), {
            target: { value: 'Admin' },
        });
        await fireEvent.input(getInput('email'), {
            target: { value: 'admin@example.com' },
        });

        await fireEvent.submit(getForm());

        const [, payload] = mockPost.mock.calls[0];
        expect(payload.username).toBeNull();
    });

    it('password kosong → null di payload', async () => {
        render(UserCreate);
        await clickRoleButton('Admin');

        await fireEvent.input(getInput('name'), {
            target: { value: 'Admin' },
        });
        await fireEvent.input(getInput('email'), {
            target: { value: 'admin@example.com' },
        });

        await fireEvent.submit(getForm());

        const [, payload] = mockPost.mock.calls[0];
        expect(payload.password).toBeNull();
    });
});

// ============================================================
// KATEGORI 5 — FORM SUBMIT: MITRA
// ============================================================

describe('Admin/Users/Create.svelte — Form Submit: Mitra', () => {
    it('submit form mitra memanggil router.post dengan payload lengkap', async () => {
        render(UserCreate);
        await clickRoleButton('Mitra');

        await fireEvent.input(getInput('name'), {
            target: { value: 'New Mitra' },
        });
        await fireEvent.input(getInput('email'), {
            target: { value: 'newmitra@example.com' },
        });
        await fireEvent.input(getInput('nama_penyedia_usaha'), {
            target: { value: 'PT Mitra Jaya' },
        });
        await fireEvent.input(getInput('nomor_identitas'), {
            target: { value: '1234567890' },
        });
        await fireEvent.input(getInput('telepon'), {
            target: { value: '08123456789' },
        });

        await fireEvent.submit(getForm());

        expect(mockPost).toHaveBeenCalledWith(
            '/admin/users',
            expect.objectContaining({
                role: 'mitra',
                name: 'New Mitra',
                email: 'newmitra@example.com',
                nama_penyedia_usaha: 'PT Mitra Jaya',
                nomor_identitas: '1234567890',
                telepon: '08123456789',
            }),
            expect.any(Object),
        );
    });

    it('field mitra kosong → null di payload', async () => {
        render(UserCreate);
        await clickRoleButton('Mitra');

        await fireEvent.input(getInput('name'), {
            target: { value: 'Mitra' },
        });
        await fireEvent.input(getInput('email'), {
            target: { value: 'mitra@example.com' },
        });

        await fireEvent.submit(getForm());

        const [, payload] = mockPost.mock.calls[0];
        expect(payload.nama_penyedia_usaha).toBeNull();
        expect(payload.nomor_identitas).toBeNull();
        expect(payload.alamat).toBeNull();
        expect(payload.telepon).toBeNull();
    });
});

// ============================================================
// KATEGORI 6 — PASSWORD TOGGLE & GENERATE
// ============================================================

describe('Admin/Users/Create.svelte — Password Toggle & Generate', () => {
    beforeEach(async () => {
        render(UserCreate);
        await clickRoleButton('Admin');
    });

    it('password bertipe password secara default', () => {
        expect(getInput('password').type).toBe('password');
    });

    it('toggle password mengubah type ke text', async () => {
        const toggle = screen.getByLabelText(/Toggle password/i);
        await fireEvent.click(toggle);
        expect(getInput('password').type).toBe('text');
    });

    it('toggle password 2x kembali ke password', async () => {
        const toggle = screen.getByLabelText(/Toggle password/i);
        await fireEvent.click(toggle);
        await fireEvent.click(toggle);
        expect(getInput('password').type).toBe('password');
    });

    it('klik "Generate" mengisi field password', async () => {
        const generateBtn = screen.getByRole('button', { name: /^Generate$/i });
        await fireEvent.click(generateBtn);

        expect(getInput('password').value.length).toBeGreaterThan(0);
    });

    it('password hasil generate minimal 12 karakter', async () => {
        const generateBtn = screen.getByRole('button', { name: /^Generate$/i });
        await fireEvent.click(generateBtn);

        expect(getInput('password').value.length).toBeGreaterThanOrEqual(12);
    });

    it('password hasil generate otomatis menampilkan password', async () => {
        const generateBtn = screen.getByRole('button', { name: /^Generate$/i });
        await fireEvent.click(generateBtn);

        expect(getInput('password').type).toBe('text');
    });
});

// ============================================================
// KATEGORI 7 — NEGATIVE PATH: Error Handling
// ============================================================

describe('Admin/Users/Create.svelte — Error Handling', () => {
    it('menampilkan error per field setelah onError', async () => {
        render(UserCreate);
        await clickRoleButton('Admin');

        await fireEvent.submit(getForm());

        const [, , options] = mockPost.mock.calls[0];
        options.onError({
            name: 'Nama wajib diisi.',
            email: 'Email sudah digunakan.',
            username: 'Username sudah dipakai.',
        });

        await waitFor(() => {
            expect(screen.getByText('Nama wajib diisi.')).toBeInTheDocument();
            expect(screen.getByText('Email sudah digunakan.')).toBeInTheDocument();
            expect(screen.getByText('Username sudah dipakai.')).toBeInTheDocument();
        });
    });

    it('menampilkan alert "Terdapat N kesalahan" saat ada error', async () => {
        render(UserCreate);
        await clickRoleButton('Admin');

        await fireEvent.submit(getForm());

        const [, , options] = mockPost.mock.calls[0];
        options.onError({
            name: 'Error 1',
            email: 'Error 2',
        });

        await waitFor(() => {
            expect(
                screen.getByText(/Terdapat 2 kesalahan pada form/i)
            ).toBeInTheDocument();
        });
    });

    it('errors direset setiap kali submit ulang', async () => {
        render(UserCreate);
        await clickRoleButton('Admin');

        await fireEvent.submit(getForm());
        const [, , options1] = mockPost.mock.calls[0];
        options1.onError({ name: 'Error lama.' });

        await waitFor(() => {
            expect(screen.getByText('Error lama.')).toBeInTheDocument();
        });

        await fireEvent.submit(getForm());

        expect(screen.queryByText('Error lama.')).not.toBeInTheDocument();
    });

    it('klik "Ganti Role" menghapus errors', async () => {
        render(UserCreate);
        await clickRoleButton('Admin');

        await fireEvent.submit(getForm());
        const [, , options] = mockPost.mock.calls[0];
        options.onError({ name: 'Error.' });

        await waitFor(() => {
            expect(screen.getByText('Error.')).toBeInTheDocument();
        });

        await fireEvent.click(screen.getByRole('button', { name: /Ganti Role/i }));

        expect(screen.queryByText('Error.')).not.toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 8 — BVA: Processing State
// ============================================================

describe('Admin/Users/Create.svelte — Processing State', () => {
    it('tombol submit menampilkan "Menyimpan..." saat processing', async () => {
        render(UserCreate);
        await clickRoleButton('Admin');

        await fireEvent.submit(getForm());

        await waitFor(() => {
            expect(screen.getByText(/Menyimpan/i)).toBeInTheDocument();
        });
    });

    it('tombol submit disabled saat processing', async () => {
        render(UserCreate);
        await clickRoleButton('Admin');

        await fireEvent.submit(getForm());

        const button = screen.getByRole('button', { name: /Menyimpan/i });
        expect(button).toBeDisabled();
    });

    it('setelah onFinish, tombol submit enabled kembali', async () => {
        render(UserCreate);
        await clickRoleButton('Admin');

        await fireEvent.submit(getForm());

        const [, , options] = mockPost.mock.calls[0];
        options.onFinish();

        await waitFor(() => {
            expect(getSubmitButton()).not.toBeDisabled();
        });
    });
});

// ============================================================
// KATEGORI 9 — UI CONTRACT: Field Attributes
// ============================================================

describe('Admin/Users/Create.svelte — Field Attributes', () => {
    beforeEach(async () => {
        render(UserCreate);
        await clickRoleButton('Admin');
    });

    it('field nama bertipe text', () => {
        expect(getInput('name').type).toBe('text');
    });

    it('field email bertipe email', () => {
        expect(getInput('email').type).toBe('email');
    });

    it('field nama required', () => {
        expect(getInput('name').required).toBe(true);
    });

    it('field email required', () => {
        expect(getInput('email').required).toBe(true);
    });

    it('field username TIDAK required (opsional)', () => {
        expect(getInput('username').required).toBe(false);
    });

    it('field password TIDAK required (opsional, auto-generate)', () => {
        expect(getInput('password').required).toBe(false);
    });

    it('field username punya placeholder yang jelas', () => {
        expect(getInput('username').placeholder).toBe('username unik');
    });
});

// ============================================================
// KATEGORI 10 — UI CONTRACT: Route & Menu
// ============================================================

describe('Admin/Users/Create.svelte — Route & Menu', () => {
    it('menu item "Manajemen User" ada di sidebar', () => {
        render(UserCreate);
        const menuLink = screen.getByRole('link', { name: /^Manajemen User$/i });
        expect(menuLink).toHaveAttribute('href', '/admin/users');
    });

    it('menu item "Dashboard" ada di sidebar', () => {
        render(UserCreate);
        const menuLink = screen.getByRole('link', { name: /^Dashboard$/i });
        expect(menuLink).toHaveAttribute('href', '/admin/dashboard');
    });

    it('menu item "Daftar Client" ada di sidebar', () => {
        render(UserCreate);
        const menuLink = screen.getByRole('link', { name: /^Daftar Client$/i });
        expect(menuLink).toHaveAttribute('href', '/admin/clients');
    });
});

// ============================================================
// KATEGORI 11 — FLASH MESSAGE
// ============================================================

describe('Admin/Users/Create.svelte — Flash Message', () => {
    it('flash status tersedia di props', () => {
        mockPageProps.flash = { status: 'User berhasil dibuat.' };
        render(UserCreate);
        expect(mockPageProps.flash.status).toBe('User berhasil dibuat.');
    });

    it('tidak menampilkan flash jika kosong', () => {
        mockPageProps.flash = {};
        render(UserCreate);
        expect(document.querySelector('.bg-green-50')).not.toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 12 — EDGE CASES
// ============================================================

describe('Admin/Users/Create.svelte — Edge Cases', () => {
    it('handle email dengan subdomain', async () => {
        render(UserCreate);
        await clickRoleButton('Admin');

        await fireEvent.input(getInput('email'), {
            target: { value: 'user@mail.example.com' },
        });

        expect(getInput('email').value).toBe('user@mail.example.com');
    });

    it('handle nama panjang', async () => {
        render(UserCreate);
        await clickRoleButton('Admin');

        const longName = 'a'.repeat(100);
        await fireEvent.input(getInput('name'), {
            target: { value: longName },
        });

        expect(getInput('name').value).toBe(longName);
    });

    it('pilih admin lalu ganti ke mitra menampilkan field mitra', async () => {
        render(UserCreate);

        // Pilih admin dulu
        await clickRoleButton('Admin');
        expect(document.getElementById('nama_penyedia_usaha')).not.toBeInTheDocument();

        // Ganti role ke mitra
        await fireEvent.click(screen.getByRole('button', { name: /Ganti Role/i }));
        await clickRoleButton('Mitra');

        expect(document.getElementById('nama_penyedia_usaha')).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 13 — STEPPER NAVIGATION
// ============================================================

describe('Admin/Users/Create.svelte — Stepper Navigation', () => {
    it('step 1 tampil saat pertama render', () => {
        render(UserCreate);
        expect(
            screen.getByRole('heading', { name: /Pilih Role User/i })
        ).toBeInTheDocument();
    });

    it('setelah pilih role, pindah ke step 2', async () => {
        render(UserCreate);
        await clickRoleButton('Admin');

        expect(
            screen.queryByRole('heading', { name: /Pilih Role User/i })
        ).not.toBeInTheDocument();
        expect(document.getElementById('name')).toBeInTheDocument();
    });

    it('tombol "Kembali" kembali ke step 1', async () => {
        render(UserCreate);
        await clickRoleButton('Admin');

        const kembaliBtn = screen.getByRole('button', { name: /^Kembali$/i });
        await fireEvent.click(kembaliBtn);

        expect(
            screen.getByRole('heading', { name: /Pilih Role User/i })
        ).toBeInTheDocument();
    });
});