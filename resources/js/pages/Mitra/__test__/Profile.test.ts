import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import Profile from '../Profile.svelte';

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
            id: 1,
            name: 'Mitra Sejahtera',
            username: 'mitrasejahtera',
            email: 'mitra@example.com',
            role: 'mitra',
        },
    },
};

let mockPageUrl = '/mitra/profile';

vi.mock('@inertiajs/svelte', () => ({
    router: {
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
            return 'Mitra/Profile';
        },
    },
    inertia: () => ({
        update: () => {},
        destroy: () => {},
    }),
}));

// ============================================================
// MOCK ImageUploader — test fokus ke Profile.svelte, bukan ImageUploader
// ============================================================

vi.mock('@/global/ImageUploader.svelte', () => ({
    default: () => null,
}));

// ============================================================
// PROPS DEFAULT
// ============================================================

const defaultProfile = {
    id: 10,
    nama_penyedia_usaha: 'PT Mitra Jaya',
    nomor_identitas: '1234567890',
    alamat: 'Jl. Merdeka No. 1',
    telepon: '08123456789',
    provinsi: 'Bali',
    kota: 'Denpasar',
    kode_pos: '80119',
    logo: null,
    deskripsi: 'Usaha travel terpercaya',
};

// ============================================================
// HELPER — Selector via ID
// ============================================================

const getInput = (id: string) =>
    document.getElementById(id) as HTMLInputElement | null;

const getTextarea = (id: string) =>
    document.getElementById(id) as HTMLTextAreaElement | null;

const getSubmitButton = () =>
    screen.getByRole('button', { name: /Simpan Perubahan/i });

const getForm = () =>
    getSubmitButton().closest('form') as HTMLFormElement;

// ============================================================
// SETUP & TEARDOWN
// ============================================================

beforeEach(() => {
    mockPost.mockClear();
    mockPageUrl = '/mitra/profile';
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

describe('Mitra/Profile.svelte — UI Contract', () => {
    it('menampilkan heading "Profile Usaha"', () => {
        render(Profile, { props: { profile: defaultProfile } });
        const headings = screen.getAllByRole('heading', { name: /Profile Usaha/i });
        expect(headings.length).toBeGreaterThan(0);
    });

    it('menampilkan field nama_penyedia_usaha', () => {
        render(Profile, { props: { profile: defaultProfile } });
        expect(getInput('nama_penyedia_usaha')).toBeInTheDocument();
    });

    it('menampilkan field nomor_identitas', () => {
        render(Profile, { props: { profile: defaultProfile } });
        expect(getInput('nomor_identitas')).toBeInTheDocument();
    });

    it('menampilkan field alamat', () => {
        render(Profile, { props: { profile: defaultProfile } });
        expect(getTextarea('alamat')).toBeInTheDocument();
    });

    it('menampilkan field telepon', () => {
        render(Profile, { props: { profile: defaultProfile } });
        expect(getInput('telepon')).toBeInTheDocument();
    });

    it('menampilkan field provinsi', () => {
        render(Profile, { props: { profile: defaultProfile } });
        expect(getInput('provinsi')).toBeInTheDocument();
    });

    it('menampilkan field kota', () => {
        render(Profile, { props: { profile: defaultProfile } });
        expect(getInput('kota')).toBeInTheDocument();
    });

    it('menampilkan field kode_pos', () => {
        render(Profile, { props: { profile: defaultProfile } });
        expect(getInput('kode_pos')).toBeInTheDocument();
    });

    it('menampilkan field deskripsi', () => {
        render(Profile, { props: { profile: defaultProfile } });
        expect(getTextarea('deskripsi')).toBeInTheDocument();
    });

    it('menampilkan tombol submit "Simpan Perubahan"', () => {
        render(Profile, { props: { profile: defaultProfile } });
        expect(getSubmitButton()).toBeInTheDocument();
    });

    it('menampilkan tombol "Batal"', () => {
        render(Profile, { props: { profile: defaultProfile } });
        expect(screen.getByRole('link', { name: /Batal/i })).toBeInTheDocument();
    });

    it('tombol Batal punya href ke /mitra/dashboard', () => {
        render(Profile, { props: { profile: defaultProfile } });
        const link = screen.getByRole('link', { name: /Batal/i });
        expect(link).toHaveAttribute('href', '/mitra/dashboard');
    });

    it('menampilkan badge "MITRA"', () => {
        render(Profile, { props: { profile: defaultProfile } });
        expect(screen.getByText(/^MITRA$/i)).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 2 — DATA INITIALIZATION
// ============================================================

describe('Mitra/Profile.svelte — Data Initialization', () => {
    it('field nama_penyedia_usaha terisi dari profile', () => {
        render(Profile, { props: { profile: defaultProfile } });
        expect(getInput('nama_penyedia_usaha')!.value).toBe('PT Mitra Jaya');
    });

    it('field nomor_identitas terisi dari profile', () => {
        render(Profile, { props: { profile: defaultProfile } });
        expect(getInput('nomor_identitas')!.value).toBe('1234567890');
    });

    it('field alamat terisi dari profile', () => {
        render(Profile, { props: { profile: defaultProfile } });
        expect(getTextarea('alamat')!.value).toBe('Jl. Merdeka No. 1');
    });

    it('field telepon terisi dari profile', () => {
        render(Profile, { props: { profile: defaultProfile } });
        expect(getInput('telepon')!.value).toBe('08123456789');
    });

    it('field provinsi terisi dari profile', () => {
        render(Profile, { props: { profile: defaultProfile } });
        expect(getInput('provinsi')!.value).toBe('Bali');
    });

    it('field kota terisi dari profile', () => {
        render(Profile, { props: { profile: defaultProfile } });
        expect(getInput('kota')!.value).toBe('Denpasar');
    });

    it('field kode_pos terisi dari profile', () => {
        render(Profile, { props: { profile: defaultProfile } });
        expect(getInput('kode_pos')!.value).toBe('80119');
    });

    it('field deskripsi terisi dari profile', () => {
        render(Profile, { props: { profile: defaultProfile } });
        expect(getTextarea('deskripsi')!.value).toBe('Usaha travel terpercaya');
    });

    it('field kosong kalau profile null', () => {
        render(Profile, { props: { profile: null } });
        expect(getInput('nama_penyedia_usaha')!.value).toBe('');
        expect(getInput('nomor_identitas')!.value).toBe('');
        expect(getTextarea('alamat')!.value).toBe('');
    });

    it('field kosong kalau field profile null', () => {
        render(Profile, {
            props: {
                profile: {
                    ...defaultProfile,
                    nama_penyedia_usaha: null,
                    alamat: null,
                },
            },
        });
        expect(getInput('nama_penyedia_usaha')!.value).toBe('');
        expect(getTextarea('alamat')!.value).toBe('');
    });
});

// ============================================================
// KATEGORI 3 — INFO CARD
// ============================================================

describe('Mitra/Profile.svelte — Info Card', () => {
    it('menampilkan nama usaha dari form', () => {
        render(Profile, { props: { profile: defaultProfile } });
        // Muncul 2x: di h2 (data-testid) + input value
        const elements = screen.getAllByText('PT Mitra Jaya');
        expect(elements.length).toBeGreaterThan(0);
    });

    it('menampilkan email user', () => {
        render(Profile, { props: { profile: defaultProfile } });
        const elements = screen.getAllByText(/mitra@example\.com/i);
        expect(elements.length).toBeGreaterThan(0);
    });

    it('menampilkan info format logo', () => {
        render(Profile, { props: { profile: defaultProfile } });
        expect(
            screen.getByText(/Logo disarankan rasio 1:1/i)
        ).toBeInTheDocument();
    });

    it('preview name fallback ke user.name kalau form kosong', () => {
        render(Profile, {
            props: {
                profile: { ...defaultProfile, nama_penyedia_usaha: null },
            },
        });
        const elements = screen.getAllByText('Mitra Sejahtera');
        expect(elements.length).toBeGreaterThan(0);
    });
});

// ============================================================
// KATEGORI 4 — ERROR HANDLING
// ============================================================

describe('Mitra/Profile.svelte — Error Handling', () => {
    it('menampilkan error nama_penyedia_usaha setelah onError', async () => {
        render(Profile, { props: { profile: defaultProfile } });

        await fireEvent.submit(getForm());

        const [, , options] = mockPost.mock.calls[0];
        options.onError({ nama_penyedia_usaha: 'Nama usaha terlalu panjang.' });

        await waitFor(() => {
            expect(
                screen.getByText('Nama usaha terlalu panjang.')
            ).toBeInTheDocument();
        });
    });

    it('menampilkan error logo setelah onError', async () => {
        render(Profile, { props: { profile: defaultProfile } });

        await fireEvent.submit(getForm());

        const [, , options] = mockPost.mock.calls[0];
        options.onError({ logo: 'Format logo tidak valid.' });

        await waitFor(() => {
            expect(
                screen.getByText('Format logo tidak valid.')
            ).toBeInTheDocument();
        });
    });

    it('menampilkan error telepon setelah onError', async () => {
        render(Profile, { props: { profile: defaultProfile } });

        await fireEvent.submit(getForm());

        const [, , options] = mockPost.mock.calls[0];
        options.onError({ telepon: 'Format telepon tidak valid.' });

        await waitFor(() => {
            expect(
                screen.getByText('Format telepon tidak valid.')
            ).toBeInTheDocument();
        });
    });

    it('menampilkan alert "Terdapat N kesalahan" saat ada error', async () => {
        render(Profile, { props: { profile: defaultProfile } });

        await fireEvent.submit(getForm());

        const [, , options] = mockPost.mock.calls[0];
        options.onError({
            nama_penyedia_usaha: 'Error 1',
            alamat: 'Error 2',
            telepon: 'Error 3',
        });

        await waitFor(() => {
            expect(
                screen.getByText(/Terdapat 3 kesalahan pada form/i)
            ).toBeInTheDocument();
        });
    });

    it('errors direset setiap kali submit ulang', async () => {
        render(Profile, { props: { profile: defaultProfile } });

        await fireEvent.submit(getForm());
        const [, , options1] = mockPost.mock.calls[0];
        options1.onError({ alamat: 'Error lama.' });

        await waitFor(() => {
            expect(screen.getByText('Error lama.')).toBeInTheDocument();
        });

        await fireEvent.submit(getForm());

        await waitFor(() => {
            expect(screen.queryByText('Error lama.')).not.toBeInTheDocument();
        });
    });
});

// ============================================================
// KATEGORI 5 — FORM SUBMIT
// ============================================================

describe('Mitra/Profile.svelte — Form Submit', () => {
    it('submit memanggil router.post ke /mitra/profile', async () => {
        render(Profile, { props: { profile: defaultProfile } });

        await fireEvent.submit(getForm());

        expect(mockPost).toHaveBeenCalledTimes(1);

        const [url, formData, options] = mockPost.mock.calls[0];
        expect(url).toBe('/mitra/profile');
        expect(formData).toBeInstanceOf(FormData);
        expect(options).toHaveProperty('forceFormData', true);
    });

    it('FormData berisi _method=PUT', async () => {
        render(Profile, { props: { profile: defaultProfile } });

        await fireEvent.submit(getForm());

        const [, formData] = mockPost.mock.calls[0];
        expect(formData.get('_method')).toBe('PUT');
    });

    it('FormData berisi semua field form', async () => {
        render(Profile, { props: { profile: defaultProfile } });

        await fireEvent.submit(getForm());

        const [, formData] = mockPost.mock.calls[0];
        expect(formData.get('nama_penyedia_usaha')).toBe('PT Mitra Jaya');
        expect(formData.get('nomor_identitas')).toBe('1234567890');
        expect(formData.get('alamat')).toBe('Jl. Merdeka No. 1');
        expect(formData.get('telepon')).toBe('08123456789');
        expect(formData.get('provinsi')).toBe('Bali');
        expect(formData.get('kota')).toBe('Denpasar');
        expect(formData.get('kode_pos')).toBe('80119');
        expect(formData.get('deskripsi')).toBe('Usaha travel terpercaya');
    });

    it('FormData TIDAK berisi logo kalau tidak upload', async () => {
        render(Profile, { props: { profile: defaultProfile } });

        await fireEvent.submit(getForm());

        const [, formData] = mockPost.mock.calls[0];
        expect(formData.get('logo')).toBeNull();
    });

    it('submit dengan onError dan onFinish handler', async () => {
        render(Profile, { props: { profile: defaultProfile } });

        await fireEvent.submit(getForm());

        const [, , options] = mockPost.mock.calls[0];
        expect(options.onError).toBeInstanceOf(Function);
        expect(options.onFinish).toBeInstanceOf(Function);
    });
});

// ============================================================
// KATEGORI 6 — PROCESSING STATE
// ============================================================

describe('Mitra/Profile.svelte — Processing State', () => {
    it('tombol submit menampilkan "Menyimpan..." saat processing', async () => {
        render(Profile, { props: { profile: defaultProfile } });

        await fireEvent.submit(getForm());

        await waitFor(() => {
            expect(screen.getByText(/Menyimpan/i)).toBeInTheDocument();
        });
    });

    it('tombol submit disabled saat processing', async () => {
        render(Profile, { props: { profile: defaultProfile } });

        await fireEvent.submit(getForm());

        const button = await screen.findByRole('button', { name: /Menyimpan/i });
        expect(button).toBeDisabled();
    });

    it('setelah onFinish, tombol submit enabled kembali', async () => {
        render(Profile, { props: { profile: defaultProfile } });

        await fireEvent.submit(getForm());

        const [, , options] = mockPost.mock.calls[0];
        options.onFinish();

        await waitFor(() => {
            expect(getSubmitButton()).not.toBeDisabled();
        });
    });
});

// ============================================================
// KATEGORI 7 — FLASH MESSAGE
// ============================================================
// NOTE: Profile.svelte versi ini TIDAK render flash message.
// Flash message ditangani oleh layout atau parent component.
// Test tetap ada untuk dokumentasi, tapi SKIP.
// ============================================================

describe.skip('Mitra/Profile.svelte — Flash Message', () => {
    it('menampilkan flash status jika ada', () => {
        // SKIP: Profile.svelte tidak render flash status.
        // Flash message biasanya ditangani di DashboardLayout atau Toast.
    });

    it('tidak menampilkan flash status jika kosong', () => {
        // SKIP: tidak ada flash element untuk dicek.
    });
});

// ============================================================
// KATEGORI 8 — INPUT ATTRIBUTES
// ============================================================

describe('Mitra/Profile.svelte — Input Attributes', () => {
    it('textarea alamat punya rows attribute', () => {
        render(Profile, { props: { profile: defaultProfile } });
        const textarea = getTextarea('alamat');
        expect(textarea).toHaveAttribute('rows', '2');
    });

    it('textarea deskripsi punya rows attribute', () => {
        render(Profile, { props: { profile: defaultProfile } });
        const textarea = getTextarea('deskripsi');
        expect(textarea).toHaveAttribute('rows', '3');
    });

    it('input nama_penyedia_usaha bertipe text', () => {
        render(Profile, { props: { profile: defaultProfile } });
        expect(getInput('nama_penyedia_usaha')!.type).toBe('text');
    });

    it('input telepon bertipe text', () => {
        render(Profile, { props: { profile: defaultProfile } });
        expect(getInput('telepon')!.type).toBe('text');
    });
});