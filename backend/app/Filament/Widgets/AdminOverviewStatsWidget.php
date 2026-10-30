<?php

namespace App\Filament\Widgets;

use App\Models\AiCreditBalance;
use App\Models\AiCreditOrder;
use App\Models\AiCreditUsage;
use App\Models\AiModel;
use App\Models\CircuitScenario;
use App\Models\User;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class AdminOverviewStatsWidget extends BaseWidget
{
    protected static ?int $sort = 1;

    protected function getStats(): array
    {
        $totalUsers = User::count();
        $totalScenarios = CircuitScenario::count();
        $activeModels = AiModel::where('is_active', true)->count();
        $totalCreditsInCirculation = (float) AiCreditBalance::sum('promotional_credits')
            + (float) AiCreditBalance::sum('purchased_credits');
        $paidOrdersCount = AiCreditOrder::where('status', 'completed')->count();
        $paidOrdersRevenue = (float) AiCreditOrder::where('status', 'completed')->sum('price_paid_usd');
        $totalAiCalls = AiCreditUsage::count();

        return [
            Stat::make('Kayıtlı Kullanıcılar', (string) $totalUsers)
                ->description("{$totalScenarios} kayıtlı 3B devre senaryosu"),
            Stat::make('Kayıtlı Devre Senaryoları', (string) $totalScenarios)
                ->description("{$activeModels} aktif AI modeli bağlı"),
            Stat::make('Dolaşımdaki AI Kredisi', number_format($totalCreditsInCirculation, 1) . ' Kredi')
                ->description("{$totalAiCalls} toplam AI çıkarım çağrısı"),
            Stat::make('Kredi Satış Geliri', '$' . number_format($paidOrdersRevenue, 2))
                ->description("{$paidOrdersCount} tamamlanan kredi siparişi"),
        ];
    }
}
