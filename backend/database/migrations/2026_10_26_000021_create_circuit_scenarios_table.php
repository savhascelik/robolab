<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('circuit_scenarios', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('study_group_id')->nullable()->constrained('study_groups')->nullOnDelete();
            $table->foreignId('remixed_from_id')->nullable()->constrained('circuit_scenarios')->nullOnDelete();
            $table->string('title', 160);
            $table->string('slug', 190)->unique();
            $table->text('summary')->nullable();
            $table->string('board_type', 64)->default('arduino_uno')->index();
            $table->string('visibility', 24)->default('private')->index(); // private, group, public
            $table->json('scenario_data'); // CircuitScenarioSchema v2 (boards, components, connections, code, custom_components)
            $table->unsignedInteger('forks_count')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('circuit_scenarios');
    }
};
