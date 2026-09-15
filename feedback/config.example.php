<?php
/**
 * Copy to config.php and adjust. Two REQUIRED steps:
 *
 * 1. Generate a fresh random token for db_file (defense in depth if the
 *    /feedback/data/ deny rule is ever missing from the web server):
 *      php -r 'echo bin2hex(random_bytes(8)), PHP_EOL;'
 *    Don't rename the file once comments exist.
 *
 * 2. Set project_name and site_url for your deployment.
 *
 * Email pings are optional: set resend_api_key to enable. New-comment
 * notifications are digest-throttled (max one email per notify_min_interval),
 * so a chatty reviewer can't flood the inbox.
 */
return [
    'db_file' => 'feedback-CHANGE-ME.sqlite',

    'project_name' => 'Client Wireframes',

    'resend_api_key' => null,
    'notify_from' => 'notifications@example.com',
    'notify_to' => 'you@example.com',
    'notify_min_interval' => 3600, // seconds between email pings

    'site_url' => 'https://example.com/clients/project/',
];
