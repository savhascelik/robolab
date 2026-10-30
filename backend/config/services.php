<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'nebius' => [
        'base_url' => env('NEBIUS_BASE_URL', 'https://api.tokenfactory.nebius.com/v1'),
        'api_key' => env('NEBIUS_API_KEY', ''),
    ],

    'whop' => [
        'webhook_secret' => env('WHOP_WEBHOOK_SECRET', ''),
        'environment' => env('WHOP_ENVIRONMENT', 'production'),
        'app_id' => env('WHOP_APP_ID', ''),
    ],

];
