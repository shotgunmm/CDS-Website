<?php
/**
 * CDS staging review portal — feedback widget config.
 * Kit source: ~/Documents/Staff/cowork/wireframe-feedback-widget/
 *
 * The random suffix on db_file is defense in depth for the case where the
 * web server's deny rule on /feedback/data/ goes missing. The deny rule is
 * the real protection — see the deploy notes.
 */
return [
    'db_file' => 'feedback-d2684cde980bfc6c.sqlite',

    'project_name' => 'CDS Website',

    'resend_api_key' => null,
    'notify_from' => 'notifications@propagate.team',
    'notify_to' => 'dmckenna@propagate.team',
    'notify_min_interval' => 3600,

    'site_url' => 'https://cds.shieldssgf.dev/HTML/',
];
