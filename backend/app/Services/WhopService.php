<?php

namespace App\Services;

use App\Models\AiCreditOrder;
use App\Models\AiCreditPackage;
use App\Models\User;

class WhopService
{
    private string $webhookSecret;
    private string $frontendUrl;

    public function __construct()
    {
        $configuredSecret = trim((string) config('services.whop.webhook_secret', ''));
        if ($configuredSecret === '' && ! app()->environment('production')) {
            $configuredSecret = 'whop_test_secret_2026';
        }
        $this->webhookSecret = $configuredSecret;
        $this->frontendUrl = rtrim((string) config('app.frontend_url', env('FRONTEND_URL', 'http://127.0.0.1:5173')), '/');
    }

    /**
     * Build a Whop checkout URL for an AI credit package purchase.
     */
    public function createCreditCheckoutUrl(AiCreditPackage $package, User $user, AiCreditOrder $order): string
    {
        $baseCheckout = $package->whop_checkout_url
            ?: ($package->whop_plan_id
                ? "https://whop.com/checkout/{$package->whop_plan_id}/"
                : "https://whop.com/checkout/plan_{$package->slug}/");

        $queryParams = http_build_query([
            'email' => $user->email,
            'd2c' => 'true',
            'redirect_url' => "{$this->frontendUrl}/workbench?whop_order={$order->order_number}&payment=success",
            'metadata' => [
                'type' => 'ai_credit_topup',
                'order_number' => $order->order_number,
                'order_id' => $order->id,
                'user_id' => $user->id,
                'user_email' => $user->email,
                'package_id' => $package->id,
                'package_slug' => $package->slug,
                'credits' => (float) $package->credits,
                'bonus_credits' => (float) $package->bonus_credits,
            ],
        ]);

        $separator = str_contains($baseCheckout, '?') ? '&' : '?';

        return "{$baseCheckout}{$separator}{$queryParams}";
    }

    /**
     * Verify Whop HMAC-SHA256 webhook signature (supports Standard Webhooks v1,<base64> and hex HMAC).
     */
    public function verifyWebhookSignature(string $rawPayload, ?string $signatureHeader, ?string $webhookId = null, ?string $webhookTimestamp = null): bool
    {
        if (empty($signatureHeader) || $this->webhookSecret === '') {
            return false;
        }

        if (app()->environment('production') && $this->webhookSecret === 'whop_test_secret_2026') {
            return false;
        }

        // 1. Standard Webhooks v1,<base64> signature when webhook-id and webhook-timestamp are present
        if ($webhookId && $webhookTimestamp && str_contains($signatureHeader, 'v1,')) {
            $signedContent = "{$webhookId}.{$webhookTimestamp}.{$rawPayload}";
            $secretKey = str_starts_with($this->webhookSecret, 'whsec_')
                ? base64_decode(substr($this->webhookSecret, 6))
                : $this->webhookSecret;

            $expectedBase64 = 'v1,' . base64_encode(hash_hmac('sha256', $signedContent, $secretKey, true));
            if (hash_equals($expectedBase64, trim($signatureHeader))) {
                return true;
            }
        }

        // 2. Direct hex HMAC-SHA256 signature
        $cleanHeader = preg_replace('/^sha256=/', '', trim($signatureHeader));
        $expectedHex = hash_hmac('sha256', $rawPayload, $this->webhookSecret);

        return hash_equals($expectedHex, (string) $cleanHeader);
    }

    public function generateTestSignature(string $rawPayload): string
    {
        return hash_hmac('sha256', $rawPayload, $this->webhookSecret);
    }
}
