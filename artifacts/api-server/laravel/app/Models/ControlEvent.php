<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ControlEvent extends Model
{
    protected $table = 'control_events';

    public $incrementing = false;

    public $timestamps = false;

    protected $keyType = 'string';

    protected $guarded = [];

    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }
}