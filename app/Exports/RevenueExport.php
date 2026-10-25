<?php

namespace App\Exports;

use App\Models\Booking;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class RevenueExport implements FromCollection, WithHeadings, WithMapping
{
    protected string $startDate;

    protected string $endDate;

    public function __construct(string $startDate, string $endDate)
    {
        $this->startDate = $startDate;
        $this->endDate = $endDate;
    }

    /**
     * @return Collection<int, Booking>
     */
    public function collection(): Collection
    {
        return Booking::with(['client:id,name', 'package:id,nama'])
            ->whereIn('status', ['confirmed', 'completed'])
            ->whereBetween('created_at', [$this->startDate.' 00:00:00', $this->endDate.' 23:59:59'])
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function headings(): array
    {
        return ['Kode Booking', 'Tanggal', 'Nama Client', 'Paket', 'Total Harga', 'Status'];
    }

    /**
     * @param  Booking  $booking
     * @return array<int, mixed>
     */
    public function map($booking): array
    {
        return [
            $booking->kode,
            $booking->created_at->format('Y-m-d'),
            $booking->client->name ?? '-',
            $booking->package->nama ?? '-',
            $booking->total_harga,
            $booking->status->value, // ✅ FIX: Hapus is_object(), langsung ambil value Enum
        ];
    }
}
