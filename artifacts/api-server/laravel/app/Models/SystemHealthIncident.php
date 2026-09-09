<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SystemHealthIncident extends Model
{
    protected $table = 'system_health_incidents';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'details' => 'array',
            'occurrence_count' => 'integer',
            'first_seen_at' => 'datetime',
            'last_seen_at' => 'datetime',
            'resolved_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }
}