<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Laporan Harian Trip</title>
    <style>
        @page { margin: 40px; }
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11px; color: #333; }
        .header { border-bottom: 3px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px; }
        .header-table { width: 100%; border: none; }
        .header-table td { border: none; padding: 0; vertical-align: bottom; }
        .company-name { font-size: 24px; font-weight: 900; color: #2563eb; margin: 0; }
        .report-title { font-size: 16px; font-weight: bold; color: #1f2937; margin: 5px 0 0 0; }
        .report-period { font-size: 11px; color: #6b7280; text-align: right; margin: 0; }
        .summary-container { width: 100%; margin-bottom: 25px; border-spacing: 10px 0; border-collapse: separate; }
        .summary-card { background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; text-align: center; width: 33%; }
        .summary-label { font-size: 10px; text-transform: uppercase; color: #6b7280; margin: 0 0 5px 0; }
        .summary-value { font-size: 16px; font-weight: 900; color: #111827; margin: 0; }
        .table-title { font-size: 12px; font-weight: bold; color: #374151; margin-bottom: 10px; text-transform: uppercase; }
        .data-table { width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; }
        .data-table th, .data-table td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; }
        .data-table th { background-color: #2563eb; color: #ffffff; font-weight: bold; font-size: 10px; text-transform: uppercase; text-align: left; }
        .data-table tr:nth-child(even) { background-color: #f9fafb; }
        .badge { display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 9px; font-weight: bold; text-transform: uppercase; }
        .badge-success { background-color: #d1fae5; color: #065f46; }
        .badge-warning { background-color: #fef3c7; color: #92400e; }
        .footer { margin-top: 30px; text-align: right; font-size: 9px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <table class="header-table">
            <tr>
                <td>
                    <h1 class="company-name">TITIKTEMU.</h1>
                    <p class="report-title">Laporan Harian Trip</p>
                </td>
                <td style="text-align: right;">
                    <p class="report-period">Periode:</p>
                    <p class="report-period" style="font-weight: bold; color: #1f2937;">
                        {{ \Carbon\Carbon::parse($startDate)->translatedFormat('d F Y') }} - 
                        {{ \Carbon\Carbon::parse($endDate)->translatedFormat('d F Y') }}
                    </p>
                </td>
            </tr>
        </table>
    </div>

    <table class="summary-container">
        <tr>
            <td class="summary-card">
                <p class="summary-label">Total Laporan</p>
                <p class="summary-value">{{ $data['total_reports'] }}</p>
            </td>
            <td class="summary-card">
                <p class="summary-label">Menunggu Verifikasi</p>
                <p class="summary-value" style="color: #d97706;">{{ $data['pending_verify'] }}</p>
            </td>
            <td class="summary-card">
                <p class="summary-label">Terverifikasi</p>
                <p class="summary-value" style="color: #059669;">{{ $data['verified'] }}</p>
            </td>
        </tr>
    </table>

    <p class="table-title">Rincian Laporan Harian</p>
    <table class="data-table">
        <thead>
            <tr>
                <th>Kode Trip</th>
                <th>Mitra</th>
                <th style="text-align: center;">Hari Ke-</th>
                <th>Tanggal</th>
                <th style="text-align: center;">Status</th>
                <th>Catatan</th>
            </tr>
        </thead>
        <tbody>
            @forelse($data['reports'] as $r)
            <tr>
                <td style="font-weight: bold; color: #374151;">{{ $r['trip_kode'] }}</td>
                <td>{{ $r['mitra'] }}</td>
                <td style="text-align: center;">{{ $r['hari_ke'] }}</td>
                <td>{{ \Carbon\Carbon::parse($r['tanggal'])->translatedFormat('d M Y') }}</td>
                <td style="text-align: center;">
                    @php
                        $status = strtolower($r['status']);
                        $badgeClass = $status === 'verified' ? 'badge-success' : 'badge-warning';
                    @endphp
                    <span class="badge {{ $badgeClass }}">{{ $r['status'] }}</span>
                </td>
                <td>{{ \Illuminate\Support\Str::limit($r['catatan'], 50) }}</td>
            </tr>
            @empty
            <tr>
                <td colspan="6" style="text-align: center; color: #9ca3af; padding: 20px;">Tidak ada laporan pada periode ini.</td>
            </tr>
            @endforelse
        </tbody>
    </table>

    <div class="footer">
        Dicetak pada: {{ now()->translatedFormat('d F Y, H:i') }} WITA<br>
        Laporan ini dibuat secara otomatis oleh sistem Titiktemu.
    </div>
</body>
</html>