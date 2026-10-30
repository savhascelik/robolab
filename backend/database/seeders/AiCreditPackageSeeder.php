<?php

namespace Database\Seeders;

use App\Models\AiCreditPackage;
use Illuminate\Database\Seeder;

class AiCreditPackageSeeder extends Seeder
{
    public function run(): void
    {
        $packages = [
            [
                'name' => 'Starter Maker Pack',
                'slug' => 'starter-500',
                'credits' => 500,
                'bonus_credits' => 0,
                'price_usd' => 5.00,
                'whop_product_id' => 'prod_nebius_starter_500',
                'whop_plan_id' => 'plan_nebius_starter_500',
                'whop_checkout_url' => 'https://whop.com/checkout/plan_nebius_starter_500/',
                'is_popular' => false,
                'is_active' => true,
                'sort_order' => 1,
                'description' => 'Hızlı devre sentezi, pin doğrulama ve gömülü C++ kod üretimi için başlangıç paketi.',
                'features' => [
                    '500 AI Devre & Ajan Kredisi',
                    'Flownie Search Mode + CircuitSDK Code Mode',
                    'Tavily Canlı Datasheet Sentezi',
                    'Süresiz Geçerli (Purchased Bucket)',
                ],
            ],
            [
                'name' => 'Maker Pro Credit Pack',
                'slug' => 'maker-2000',
                'credits' => 2000,
                'bonus_credits' => 300,
                'price_usd' => 15.00,
                'whop_product_id' => 'prod_nebius_maker_2000',
                'whop_plan_id' => 'plan_nebius_maker_2000',
                'whop_checkout_url' => 'https://whop.com/checkout/plan_nebius_maker_2000/',
                'is_popular' => true,
                'is_active' => true,
                'sort_order' => 2,
                'description' => 'En çok tercih edilen paket: 2.000 Kredi + 300 Hediye Kredi ile çok turlu robotik ve Jetson Nano projeleri.',
                'features' => [
                    '2.000 Satın Alınan + 300 Bonus AI Kredisi (Toplam 2.300)',
                    'Çok Turlu Otonom Devre Tasarım Ajanı',
                    'NVIDIA Nemotron-70B & Gemini 2.5 Desteği',
                    'Öncelikli Elektriksel Topoloji Doğrulama',
                ],
            ],
            [
                'name' => 'Robotics Lab Credit Pack',
                'slug' => 'robotics-6000',
                'credits' => 6000,
                'bonus_credits' => 1500,
                'price_usd' => 39.00,
                'whop_product_id' => 'prod_nebius_robotics_6000',
                'whop_plan_id' => 'plan_nebius_robotics_6000',
                'whop_checkout_url' => 'https://whop.com/checkout/plan_nebius_robotics_6000/',
                'is_popular' => false,
                'is_active' => true,
                'sort_order' => 3,
                'description' => 'Takımlar, laboratuvarlar ve yoğun otonom donanım testi yapan geliştiriciler için yüksek kapasiteli paket.',
                'features' => [
                    '6.000 Satın Alınan + 1.500 Bonus AI Kredisi (Toplam 7.500)',
                    'Tüm AI Modellerinde Tam Kapasite',
                    'Sınırsız Özel 3B Sensör & Datasheet Sentezi',
                    'Açık Çalışma Gruplarında Tam Paylaşım',
                ],
            ],
        ];

        foreach ($packages as $pkg) {
            AiCreditPackage::updateOrCreate(
                ['slug' => $pkg['slug']],
                $pkg
            );
        }
    }
}
