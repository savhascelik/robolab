<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('study_groups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->string('name', 150);
            $table->string('slug', 170)->unique();
            $table->text('description')->nullable();
            $table->string('invite_code', 24)->unique();
            $table->boolean('is_public')->default(false);
            $table->timestamps();
        });

        Schema::create('study_group_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('study_group_id')->constrained('study_groups')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('member_role', 32)->default('member'); // owner, moderator, member
            $table->timestamp('joined_at')->nullable();
            $table->timestamps();

            $table->unique(['study_group_id', 'user_id'], 'study_group_member_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('study_group_members');
        Schema::dropIfExists('study_groups');
    }
};
