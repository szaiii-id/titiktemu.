<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Manifest Trip - {{ $trip->kode }}</title>
    <style>
        body { font-family: sans-serif; font-size: 12px; color: #333; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
        .header h1 { margin: 0; font-size: 20px; }
        .header p { margin: 5px 0 0; color: #666; }
        
        .section-title { font-size: 14px; font-weight: bold; background-color: #f3f4f6; padding: 8px; margin-top: 20px; margin-bottom: 10px; border-left: 4px solid #ec4899; }
        
        .info-table { width: 100%; margin-bottom: 20px; }
        .info-table td { padding: 5px; vertical-align: top; }
        .info-table td:first-child { font-weight: bold; width: 150px; }
        
        .data-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .data-table th, .data-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .data-table th { background-color: #f9fafb; font-weight: bold; }
        .data-table tr:nth-child(even) { background-color: #f9fafb; }
        
        .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; color: white; }
        .badge-success { background-color: #10b981; }
        .badge-warning { background-color: #f59e0b; }
        .badge-danger { background-color: #ef4444; }
        
        .footer { margin-top: 30px; text-align: right; font-size: 10px; color: #888; }
    </style>
</head>
<body>

    <!-- Header -->
    <div class="header">
        <h1>TITIKTEMU TRAVEL</h1>
        <p>Manifest Peserta & Itinerary Perjalanan</p>
    </div>

    <!-- Info Trip -->
    <div class="section-title">Informasi Perjalanan</div>
    <table class="info-table">
        <tr>
            <td>Kode Trip</td>
            <td>: {{ $trip->kode }}</td>
        </tr>
        <tr>
            <td>Nama Paket</td>
            <td>: {{ $trip->package->nama ?? 'Paket Dihapus' }}</td>
        </tr>
        <tr>
            <td>Tanggal</td>
            <td>: {{ $trip->tanggal_mulai->format('d M Y') }} s/d {{ $trip->tanggal_selesai->format('d M Y') }}</td>
        </tr>
        <tr>
            <td>Status Trip</td>
            <td>: {{ strtoupper($trip->status->value ?? $trip->status) }}</td>
        </tr>
        <tr>
            <td>Mitra Bertugas</td>
            <td>: 
                @foreach($trip->mitras as $tm)
                    {{ $tm->mitra->name }} ({{ ucfirst($tm->role->value) }})
                    @if(!$loop->last), @endif
                @endforeach
            </td>
        </tr>
    </table>

    <!-- Manifest Peserta -->
    <div class="section-title">Daftar Peserta (Manifest)</div>
    <table class="data-table">
        <thead>
            <tr>
                <th width="5%">No</th>
                <th width="30%">Nama Peserta</th>
                <th width="10%">Umur</th>
                <th width="25%">No. HP</th>
                <th width="30%">Catatan Khusus</th>
            </tr>
        </thead>
        <tbody>
            @forelse($trip->booking->participants as $index => $p)
                <tr>
                    <td>{{ $index + 1 }}</td>
                    <td>{{ $p->nama }}</td>
                    <td>{{ $p->umur ?? '-' }}</td>
                    <td>{{ $p->no_hp ?? '-' }}</td>
                    <td>{{ $p->catatan ?? '-' }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="5" style="text-align: center;">Tidak ada peserta terdaftar.</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <!-- Itinerary & Laporan Harian -->
    <div class="section-title">Itinerary & Laporan Harian</div>
    @foreach($trip->days as $day)
        <table class="data-table" style="margin-bottom: 15px;">
            <thead>
                <tr>
                    <th colspan="2" style="background-color: #e5e7eb;">
                        Hari ke-{{ $day->hari_ke }} ({{ $day->tanggal->format('d M Y') }})
                    </th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td width="20%" style="font-weight: bold;">Kegiatan</td>
                    <td>{{ $day->judul }}</td>
                </tr>
                <tr>
                    <td style="font-weight: bold;">Deskripsi</td>
                    <td>{{ $day->deskripsi ?? '-' }}</td>
                </tr>
                <tr>
                    <td style="font-weight: bold;">Status Laporan</td>
                    <td>
                        @if($day->dailyReports->isEmpty())
                            <span class="badge badge-warning">Belum ada laporan</span>
                        @else
                            @php $report = $day->dailyReports->first(); @endphp
                            @if($report->status === 'verified')
                                <span class="badge badge-success">Terverifikasi</span>
                            @else
                                <span class="badge badge-warning">Menunggu Verifikasi</span>
                            @endif
                            <br>
                            <span style="font-size: 10px; color: #555;">Catatan Mitra: {{ $report->catatan ?? '-' }}</span>
                        @endif
                    </td>
                </tr>
            </tbody>
        </table>
    @endforeach

    <!-- Footer -->
    <div class="footer">
        Dicetak pada: {{ now()->translatedFormat('d F Y, H:i') }} WITA
    </div>

</body>
</html>