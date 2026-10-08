<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AmicaleRecord extends Model
{
    protected $table = 'amicale_records';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'amount' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }
}
