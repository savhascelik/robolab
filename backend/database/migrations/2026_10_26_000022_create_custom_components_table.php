<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('custom_components', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('study_group_id')->nullable()->constrained('study_groups')->nullOnDelete();
            $table->string('part_number', 80)->index();
            $table->string('name', 160);
            $table->string('slug', 190)->unique();
            $table->string('category', 64)->default('sensor')->index();
            $table->string('visibility', 24)->default('public')->index(); // private, group, public
            $table->json('pinout');
            $table->json('electrical_specs');
            $table->json('internal_dipoles');
            $table->json('mesh_recipe');
            $table->string('datasheet_url')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('custom_components');
    }
};
