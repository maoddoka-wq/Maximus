<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PresenceItem extends Model
{
    protected $table = 'presence_items';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }
}