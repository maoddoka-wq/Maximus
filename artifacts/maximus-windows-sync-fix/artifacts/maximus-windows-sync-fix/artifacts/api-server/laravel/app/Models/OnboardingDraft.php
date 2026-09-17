<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OnboardingDraft extends Model
{
    protected $table = 'onboarding_drafts';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'description',
        'proposal',
        'status',
        'company_id',
        'request_id',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'proposal' => 'array',
            'expires_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }
}