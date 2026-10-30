<?php

namespace Database\Seeders;

use App\Models\Plan;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class PlanSeeder extends Seeder
{
    public function run(): void
    {
        $freeRole = Role::where('name', 'free')->where('guard_name', 'web')->first();
        $proRole = Role::where('name', 'pro')->where('guard_name', 'web')->first();

        $plans = [
            [
                'slug' => 'free-maker',
                'name' => 'Free Maker Plan',
                'description' => '3B devre kurulumu, kapalı çevrim simülasyon ve başlangıç AI kredisi ile ücretsiz Maker planı.',
                'role_id' => $freeRole?->id,
                'whop_plan_id' => null,
                'price' => 0.00,
                'price_suffix' => '/month',
                'currency' => 'USD',
                'monthly_points' => 250.0000,
                'bonus_points' => 0.0000,
                'features' => [
                    '250 Başlangıç AI Kredisi',
                    '25 Kayıtlı 3B Çalışma Alanı',
                    '5 Açık Çalışma Grubu',
                    'Arduino Uno, ESP32 & Jetson Nano Simülasyonu',
                ],
                'cta_text' => 'Ücretsiz Başla',
                'is_highlighted' => false,
                'is_active' => true,
                'sort_order' => 1,
            ],
            [
                'slug' => 'pro-robotics',
                'name' => 'Pro Robotics & AI Architect',
                'description' => 'Sınırsız 3B çalışma alanı, yüksek AI ajan tur limiti ve aylık 2.500 AI kredisi içeren profesyonel plan.',
                'role_id' => $proRole?->id,
                'whop_plan_id' => 'plan_nebius_pro_monthly',
                'price' => 19.00,
                'price_suffix' => '/month',
                'currency' => 'USD',
                'monthly_points' => 2500.0000,
                'bonus_points' => 500.0000,
                'features' => [
                    'Aylık 2.500 + 500 Hoşgeldin AI Kredisi',
                    'Sınırsız 3B Çalışma Alanı & Açık Grup',
                    '10 Turlu Flownie Code Mode & Search Mode Ajanı',
                    'Günlük 200 Tavily Canlı Datasheet Sentezi',
                ],
                'cta_text' => 'Pro Plana Geç',
                'is_highlighted' => true,
                'is_active' => true,
                'sort_order' => 2,
            ],
        ];

        foreach ($plans as $planData) {
            Plan::updateOrCreate(
                ['slug' => $planData['slug']],
                $planData
            );
        }
    }
}
