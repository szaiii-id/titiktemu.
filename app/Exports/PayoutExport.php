<?php

namespace App\Exports;

use App\Models\Payout;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class PayoutExport implements FromCollection, WithHeadings, WithMapping
{
    protected $startDate;
    protected $endDate;

    public function __construct($startDate, $endDate)
    {
        $this->startDate = $startDate;
        $this->endDate = $endDate;
    }

    public function collection(): Collection
    {
        return Payout::with(['mitra:id,name'])
            ->whereBetween('created_at', [$this->startDate . ' 00:00:00', $this->endDate . ' 23:59:59'])
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function headings(): array
    {
        return ['ID Payout', 'Kode', 'Nama Mitra', 'Tanggal Request', 'Jumlah', 'Status'];
    }

    public function map($payout): array
    {
        return [
            $payout->id,
            $payout->kode,
            $payout->mitra->name ?? '-',
            $payout->created_at->format('Y-m-d'),
            $payout->jumlah,
            is_object($payout->status) ? $payout->status->value : $payout->status,
        ];
    }
}