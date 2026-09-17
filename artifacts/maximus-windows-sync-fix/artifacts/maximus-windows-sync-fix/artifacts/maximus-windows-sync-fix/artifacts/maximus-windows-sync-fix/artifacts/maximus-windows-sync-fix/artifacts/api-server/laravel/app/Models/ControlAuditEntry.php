<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ControlAuditEntry extends Model
{
    protected $table = 'control_audit_entries';

    public $incrementing = false;

    public $timestamps = false;

    protected $keyType = 'string';

    protected $guarded = [];

    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }
}