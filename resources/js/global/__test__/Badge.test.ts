import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Badge from '../Badge.svelte';

// ============================================================
// MOCK @/utils/enums
// ============================================================
// Kita mem-mock fungsi-fungsi ini agar test fokus ke logika Badge
// (bagaimana ia merender), bukan ke mapping status yang panjang.

vi.mock('@/utils/enums', () => ({
    bookingStatusLabel: (val: string) => `Label Booking: ${val}`,
    bookingStatusBadge: (val: string) => `class-booking-${val}`,

    tripStatusLabel: (val: string) => `Label Trip: ${val}`,
    tripStatusBadge: (val: string) => `class-trip-${val}`,

    dailyReportStatusLabel: (val: string) => `Label Report: ${val}`,
    dailyReportStatusBadge: (val: string) => `class-report-${val}`,

    payoutStatusLabel: (val: string) => `Label Payout: ${val}`,
    payoutStatusBadge: (val: string) => `class-payout-${val}`,

    packageStatusLabel: (val: string) => `Label Package: ${val}`,
    packageStatusBadge: (val: string) => `class-package-${val}`,

    packageKategoriLabel: (val: string) => `Label Kategori: ${val}`,
    packageKategoriBadge: (val: string) => `class-kategori-${val}`,

    tripMitraRoleLabel: (val: string) => `Label Role: ${val}`,
    tripMitraRoleBadge: (val: string) => `class-role-${val}`,

    packageFacilityTipeLabel: (val: string) => `Label Fasilitas: ${val}`,
    packageFacilityTipeBadge: (val: string) => `class-fasilitas-${val}`,

    packageDayCostKategoriLabel: (val: string) => `Label Biaya: ${val}`,
    packageDayCostKategoriBadge: (val: string) => `class-biaya-${val}`,
}));

// ============================================================
// KATEGORI 1 — RENDERING DASAR & PROPS STANDALONE
// ============================================================

describe('Badge.svelte — Standalone Props (Label & Class)', () => {
    it('merender label yang diberikan secara langsung', () => {
        render(Badge, { props: { label: 'Terkonfirmasi' } });
        expect(screen.getByText('Terkonfirmasi')).toBeInTheDocument();
    });

    it('menerapkan custom class dari props', () => {
        render(Badge, {
            props: {
                label: 'Custom',
                class: 'bg-red-500 text-white',
            },
        });

        const badge = screen.getByText('Custom');
        expect(badge).toHaveClass('bg-red-500');
        expect(badge).toHaveClass('text-white');
    });

    it('menerapkan class dasar (base classes) secara default', () => {
        render(Badge, { props: { label: 'Test' } });

        const badge = screen.getByText('Test');
        expect(badge).toHaveClass('inline-flex');
        expect(badge).toHaveClass('rounded-full');
        expect(badge).toHaveClass('font-extrabold');
    });

    it('mengabaikan label jika variant & value terisi', () => {
        render(Badge, {
            props: {
                label: 'Hanya Label',
                variant: 'booking_status',
                value: 'confirmed',
            },
        });

        // Karena variant & value terisi, label harus di-resolve dari variant
        // (Bukan "Hanya Label")
        expect(screen.queryByText('Hanya Label')).not.toBeInTheDocument();
        expect(screen.getByText('Label Booking: confirmed')).toBeInTheDocument();
    });
});

// ============================================================
// KATEGORI 2 — RESOLVE VARIANT & VALUE
// ============================================================

describe('Badge.svelte — Resolve Variant & Value', () => {
    it('resolve booking_status', () => {
        render(Badge, {
            props: { variant: 'booking_status', value: 'pending' },
        });

        const badge = screen.getByText('Label Booking: pending');
        expect(badge).toHaveClass('class-booking-pending');
    });

    it('resolve trip_status', () => {
        render(Badge, {
            props: { variant: 'trip_status', value: 'active' },
        });

        const badge = screen.getByText('Label Trip: active');
        expect(badge).toHaveClass('class-trip-active');
    });

    it('resolve daily_report_status', () => {
        render(Badge, {
            props: { variant: 'daily_report_status', value: 'approved' },
        });

        const badge = screen.getByText('Label Report: approved');
        expect(badge).toHaveClass('class-report-approved');
    });

    it('resolve payout_status', () => {
        render(Badge, {
            props: { variant: 'payout_status', value: 'paid' },
        });

        const badge = screen.getByText('Label Payout: paid');
        expect(badge).toHaveClass('class-payout-paid');
    });

    it('resolve package_status', () => {
        render(Badge, {
            props: { variant: 'package_status', value: 'draft' },
        });

        const badge = screen.getByText('Label Package: draft');
        expect(badge).toHaveClass('class-package-draft');
    });

    it('resolve package_kategori', () => {
        render(Badge, {
            props: { variant: 'package_kategori', value: 'open_trip' },
        });

        const badge = screen.getByText('Label Kategori: open_trip');
        expect(badge).toHaveClass('class-kategori-open_trip');
    });

    it('resolve trip_mitra_role', () => {
        render(Badge, {
            props: { variant: 'trip_mitra_role', value: 'leader' },
        });

        const badge = screen.getByText('Label Role: leader');
        expect(badge).toHaveClass('class-role-leader');
    });

    it('resolve package_facility_tipe', () => {
        render(Badge, {
            props: { variant: 'package_facility_tipe', value: 'include' },
        });

        const badge = screen.getByText('Label Fasilitas: include');
        expect(badge).toHaveClass('class-fasilitas-include');
    });

    it('resolve package_day_cost_kategori', () => {
        render(Badge, {
            props: { variant: 'package_day_cost_kategori', value: 'transport' },
        });

        const badge = screen.getByText('Label Biaya: transport');
        expect(badge).toHaveClass('class-biaya-transport');
    });
});

// ============================================================
// KATEGORI 3 — SIZE
// ============================================================

describe('Badge.svelte — Size', () => {
    it('default size "md" menghasilkan padding & text tertentu', () => {
        render(Badge, { props: { label: 'Md' } });

        const badge = screen.getByText('Md');
        expect(badge).toHaveClass('px-3');
        expect(badge).toHaveClass('py-1.5');
        expect(badge).toHaveClass('text-[11px]');
    });

    it('size "sm" menghasilkan padding & text lebih kecil', () => {
        render(Badge, { props: { label: 'Sm', size: 'sm' } });

        const badge = screen.getByText('Sm');
        expect(badge).toHaveClass('px-2');
        expect(badge).toHaveClass('py-0.5');
        expect(badge).toHaveClass('text-[10px]');
    });
});

// ============================================================
// KATEGORI 4 — ICON
// ============================================================

describe('Badge.svelte — Icon', () => {
    it('TIDAK merender icon jika icon = null (default)', () => {
        render(Badge, { props: { label: 'No Icon' } });

        const badge = screen.getByText('No Icon');
        const svg = badge.querySelector('svg');
        expect(svg).not.toBeInTheDocument();
    });

    it('merender icon "check" dengan path yang benar', () => {
        render(Badge, { props: { label: 'Check', icon: 'check' } });

        const badge = screen.getByText('Check');
        const svg = badge.querySelector('svg');
        const path = svg?.querySelector('path');

        expect(svg).toBeInTheDocument();
        expect(path).toHaveAttribute('d', 'M5 13l4 4L19 7');
    });

    it('merender icon "clock" dengan path yang benar', () => {
        render(Badge, { props: { label: 'Clock', icon: 'clock' } });

        const badge = screen.getByText('Clock');
        const svg = badge.querySelector('svg');
        const path = svg?.querySelector('path');

        expect(path).toHaveAttribute(
            'd',
            'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
        );
    });

    it('merender icon "x" dengan path yang benar', () => {
        render(Badge, { props: { label: 'X', icon: 'x' } });

        const badge = screen.getByText('X');
        const svg = badge.querySelector('svg');
        const path = svg?.querySelector('path');

        expect(path).toHaveAttribute('d', 'M6 18L18 6M6 6l12 12');
    });

    it('merender icon "warning" dengan path yang benar', () => {
        render(Badge, { props: { label: 'Warning', icon: 'warning' } });

        const badge = screen.getByText('Warning');
        const svg = badge.querySelector('svg');
        const path = svg?.querySelector('path');

        expect(path).toHaveAttribute(
            'd',
            'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
        );
    });
});