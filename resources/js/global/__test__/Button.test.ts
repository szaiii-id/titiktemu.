import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ButtonFixture from './__fixtures__/ButtonFixture.svelte';

// ============================================================
// MOCK INERTIA
// ============================================================
const mockRouterPost = vi.fn();
const mockRouterPut = vi.fn();
const mockRouterPatch = vi.fn();
const mockRouterDelete = vi.fn();

vi.mock('@inertiajs/svelte', () => ({
    router: {
        post: (...args: any[]) => mockRouterPost(...args),
        put: (...args: any[]) => mockRouterPut(...args),
        patch: (...args: any[]) => mockRouterPatch(...args),
        delete: (...args: any[]) => mockRouterDelete(...args),
        get: vi.fn(),
    },
}));

beforeEach(() => {
    vi.clearAllMocks();
});

// ============================================================
// KATEGORI 1 — RENDERING DASAR & TIPE ELEMEN
// ============================================================

describe('Button.svelte — Rendering Dasar', () => {
    it('merender elemen <button> jika tidak ada href', () => {
        render(ButtonFixture);

        const btn = screen.getByRole('button', { name: /Tombol Saya/i });
        expect(btn.tagName).toBe('BUTTON');
    });

    it('merender elemen <a> jika ada href dan method="get"', () => {
        render(ButtonFixture, {
            props: { href: '/dashboard', method: 'get' },
        });

        const link = screen.getByRole('link', { name: /Tombol Saya/i });
        expect(link.tagName).toBe('A');
        expect(link).toHaveAttribute('href', '/dashboard');
    });

    it('merender elemen <button> jika ada href tapi method bukan "get"', () => {
        render(ButtonFixture, {
            props: { href: '/delete', method: 'post' },
        });

        const btn = screen.getByRole('button', { name: /Tombol Saya/i });
        expect(btn.tagName).toBe('BUTTON');
    });
});

// ============================================================
// KATEGORI 2 — VARIANT & SIZE
// ============================================================

describe('Button.svelte — Variant & Size', () => {
    it('menerapkan class default (primary, md)', () => {
        render(ButtonFixture);
        const btn = screen.getByRole('button', { name: /Tombol Saya/i });

        expect(btn).toHaveClass('bg-pink-dark');
        expect(btn).toHaveClass('px-6');
        expect(btn).toHaveClass('py-3');
    });

    it('menerapkan variant "danger"', () => {
        render(ButtonFixture, { props: { variant: 'danger' } });
        const btn = screen.getByRole('button', { name: /Tombol Saya/i });

        expect(btn).toHaveClass('bg-red-600');
    });

    it('menerapkan size "sm"', () => {
        render(ButtonFixture, { props: { size: 'sm' } });
        const btn = screen.getByRole('button', { name: /Tombol Saya/i });

        expect(btn).toHaveClass('px-4');
        expect(btn).toHaveClass('text-xs');
    });

    it('menerapkan fullWidth', () => {
        render(ButtonFixture, { props: { fullWidth: true } });
        const btn = screen.getByRole('button', { name: /Tombol Saya/i });

        expect(btn).toHaveClass('w-full');
    });
});

// ============================================================
// KATEGORI 3 — STATE (LOADING & DISABLED)
// ============================================================

describe('Button.svelte — State', () => {
    it('merender spinner SVG jika loading = true', () => {
        render(ButtonFixture, { props: { loading: true } });

        const btn = screen.getByRole('button');
        const spinner = btn.querySelector('svg.animate-spin');

        expect(spinner).toBeInTheDocument();
    });

    it('button disabled jika loading = true', () => {
        render(ButtonFixture, { props: { loading: true } });
        expect(screen.getByRole('button')).toBeDisabled();
    });

    it('button disabled jika disabled = true', () => {
        render(ButtonFixture, { props: { disabled: true } });
        expect(screen.getByRole('button')).toBeDisabled();
    });

    it('class disabled:opacity-50 ada di className', () => {
        render(ButtonFixture, { props: { disabled: true } });
        const btn = screen.getByRole('button');
        expect(btn).toHaveClass('disabled:opacity-50');
    });
});

// ============================================================
// KATEGORI 4 — BEHAVIOR (KLIK & ROUTING)
// ============================================================

describe('Button.svelte — Behavior', () => {
    it('memanggil onclick biasa jika tidak ada href', async () => {
        const handleClick = vi.fn();
        render(ButtonFixture, { props: { onclick: handleClick } });

        await fireEvent.click(screen.getByRole('button'));
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('TIDAK memanggil onclick jika disabled = true', async () => {
        const handleClick = vi.fn();
        render(ButtonFixture, {
            props: { disabled: true, onclick: handleClick },
        });

        await fireEvent.click(screen.getByRole('button'));
        expect(handleClick).not.toHaveBeenCalled();
    });

    it('memanggil router.post jika method="post" diklik', async () => {
        render(ButtonFixture, {
            props: { href: '/users', method: 'post' },
        });

        await fireEvent.click(screen.getByRole('button'));

        expect(mockRouterPost).toHaveBeenCalledWith('/users');
    });

    it('memanggil router.delete jika method="delete" diklik', async () => {
        render(ButtonFixture, {
            props: { href: '/users/1', method: 'delete' },
        });

        await fireEvent.click(screen.getByRole('button'));

        expect(mockRouterDelete).toHaveBeenCalledWith('/users/1');
    });

    it('link (<a>) dirender untuk method="get" dan tidak memanggil router', () => {
        render(ButtonFixture, {
            props: { href: '/dashboard', method: 'get' },
        });

        const link = screen.getByRole('link');
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', '/dashboard');
        expect(mockRouterPost).not.toHaveBeenCalled();
        expect(mockRouterDelete).not.toHaveBeenCalled();
    });
});

// ============================================================
// KATEGORI 5 — ATRIBUT TAMBAHAN (REST PROPS)
// ============================================================

describe('Button.svelte — Atribut Tambahan', () => {
    it('meneruskan atribut data-testid ke elemen', () => {
        render(ButtonFixture, {
            props: { 'data-testid': 'my-btn' },
        });

        expect(screen.getByTestId('my-btn')).toBeInTheDocument();
    });

    it('menerapkan atribut type="submit" pada elemen button', () => {
        render(ButtonFixture, {
            props: { type: 'submit' },
        });

        expect(screen.getByRole('button')).toHaveAttribute(
            'type',
            'submit',
        );
    });
});