<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('datasheet_caches', function (Blueprint $table) {
            $table->id();
            $table->string('part_key', 100)->unique(); // Normalized uppercase part identifier e.g. MPU6050
            $table->string('query_text', 255);
            $table->json('tavily_results');
            $table->json('synthesized_schema')->nullable();
            $table->string('source_url', 500)->nullable();
            $table->unsignedInteger('hits_count')->default(0);
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('datasheet_caches');
    }
};
