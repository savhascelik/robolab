<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Default OpenAI-Compatible / Cloudflare AI Gateway Configuration
    |--------------------------------------------------------------------------
    */
    'default_provider' => env('AI_DEFAULT_PROVIDER', 'nebius'),

    'nebius' => [
        'base_url' => env('NEBIUS_BASE_URL', 'https://api.tokenfactory.nebius.com/v1'),
        'api_key' => env('NEBIUS_API_KEY', ''),
        'default_model' => env('NEBIUS_DEFAULT_MODEL', 'nvidia/nemotron-3-super-120b-a12b'),
        'fast_model' => env('NEBIUS_FAST_MODEL', 'Qwen/Qwen3-30B-A3B-Instruct-2507'),
    ],

    'cloudflare_gateway' => [
        'enabled' => (bool) env('CF_AIG_ENABLED', false),
        'base_url' => env('CF_AIG_BASE_URL', ''),
        'token' => env('CF_AIG_TOKEN', ''),
    ],

    'openai' => [
        'base_url' => env('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
        'api_key' => env('OPENAI_API_KEY', ''),
    ],

    'tavily' => [
        'base_url' => env('TAVILY_BASE_URL', 'https://api.tavily.com'),
        'api_key' => env('TAVILY_API_KEY', ''),
        'cache_ttl_hours' => (int) env('TAVILY_CACHE_TTL_HOURS', 720), // 30 days default
    ],

    /*
    |--------------------------------------------------------------------------
    | Config-Cache Safe Provider API Key Lookup Map (for Dokploy / Production)
    |--------------------------------------------------------------------------
    */
    'env_keys' => [
        'NEBIUS_API_KEY' => env('NEBIUS_API_KEY', ''),
        'OPENAI_API_KEY' => env('OPENAI_API_KEY', ''),
        'GEMINI_API_KEY' => env('GEMINI_API_KEY', ''),
        'OPENROUTER_API_KEY' => env('OPENROUTER_API_KEY', ''),
        'ANTHROPIC_API_KEY' => env('ANTHROPIC_API_KEY', ''),
        'TAVILY_API_KEY' => env('TAVILY_API_KEY', ''),
    ],
];
