<?php
/**
 * Wireframe Feedback API
 *
 * Tiny SQLite-backed comment store for the wireframe review widget.
 * Sits behind the site's basic auth; no auth of its own.
 *
 * Endpoints (all JSON):
 *   GET  api.php?action=list            -> { ok, comments: [...] }
 *   POST api.php?action=create  {page_id, block_key, block_index, snippet, rel_x, rel_y, author, color, body}
 *   POST api.php?action=reply   {parent_id, author, color, body}
 *   POST api.php?action=status  {id, status: open|resolved, author}
 */

$config = require __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function out($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

function fail($msg, $code = 400) {
    out(['ok' => false, 'error' => $msg], $code);
}

// --- DB bootstrap -----------------------------------------------------------

$dataDir = __DIR__ . '/data';
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0775, true);
}
// Guard file so a directory listing or direct hit on /data shows nothing useful
if (!file_exists($dataDir . '/index.php')) {
    file_put_contents($dataDir . '/index.php', "<?php http_response_code(403);\n");
}

try {
    $db = new PDO('sqlite:' . $dataDir . '/' . $config['db_file']);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->exec('PRAGMA journal_mode = WAL');
    $db->exec('CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        page_id TEXT NOT NULL,
        block_key TEXT,
        block_index INTEGER,
        snippet TEXT,
        rel_x REAL,
        rel_y REAL,
        author TEXT NOT NULL,
        color TEXT,
        body TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT "open",
        parent_id INTEGER,
        ip TEXT,
        created_at TEXT NOT NULL,
        resolved_at TEXT,
        resolved_by TEXT
    )');
    $db->exec('CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT)');
} catch (Exception $e) {
    fail('Storage unavailable', 500);
}

// --- Helpers ----------------------------------------------------------------

function jsonBody() {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (!is_array($data)) fail('Invalid JSON body');
    return $data;
}

function clean($v, $max) {
    $v = trim((string)$v);
    // strip control chars except newline/tab
    $v = preg_replace('/[^\P{C}\n\t]+/u', '', $v);
    return mb_substr($v, 0, $max);
}

function clientIp() {
    return $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown';
}

function throttle($db) {
    $stmt = $db->prepare("SELECT COUNT(*) FROM comments WHERE ip = ? AND created_at > datetime('now', '-60 seconds')");
    $stmt->execute([clientIp()]);
    if ((int)$stmt->fetchColumn() >= 20) {
        fail('Slow down a little. Try again in a minute.', 429);
    }
}

// Best-effort email ping via Resend. Never blocks or fails the request.
function maybeNotify($db, $config, $comment) {
    if (empty($config['resend_api_key']) || empty($config['notify_to'])) return;
    try {
        $row = $db->query("SELECT v FROM meta WHERE k = 'last_notify'")->fetchColumn();
        $last = $row ? strtotime($row) : 0;
        if (time() - $last < $config['notify_min_interval']) return;

        $db->prepare("INSERT INTO meta (k, v) VALUES ('last_notify', datetime('now'))
                      ON CONFLICT(k) DO UPDATE SET v = datetime('now')")->execute();

        $openCount = (int)$db->query("SELECT COUNT(*) FROM comments WHERE status = 'open' AND parent_id IS NULL")->fetchColumn();
        $subject = ($config['project_name'] ?? 'Wireframes') . ': new feedback from ' . $comment['author'];
        $link = $config['site_url'] . '#' . $comment['page_id'];
        $html = '<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;color:#222">'
              . '<p><b>' . htmlspecialchars($comment['author']) . '</b> left feedback on <b>'
              . htmlspecialchars($comment['page_id']) . '</b>:</p>'
              . '<blockquote style="margin:8px 0;padding:8px 12px;border-left:3px solid #FE5812;background:#f7f7f7">'
              . nl2br(htmlspecialchars($comment['body'])) . '</blockquote>'
              . '<p>' . $openCount . ' open item' . ($openCount === 1 ? '' : 's') . ' total. '
              . '<a href="' . htmlspecialchars($link) . '">Open the wireframes</a></p></div>';

        $ch = curl_init('https://api.resend.com/emails');
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 5,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $config['resend_api_key'],
                'Content-Type: application/json',
            ],
            CURLOPT_POSTFIELDS => json_encode([
                'from' => $config['notify_from'],
                'to' => [$config['notify_to']],
                'subject' => $subject,
                'html' => $html,
            ]),
        ]);
        curl_exec($ch);
        curl_close($ch);
    } catch (Exception $e) {
        // never let notification failures surface to the client
    }
}

// --- Router -----------------------------------------------------------------

$action = $_GET['action'] ?? '';

if ($action === 'list' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $rows = $db->query('SELECT id, page_id, block_key, block_index, snippet, rel_x, rel_y,
                               author, color, body, status, parent_id, created_at, resolved_at, resolved_by
                        FROM comments ORDER BY id ASC')->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as &$r) {
        $r['id'] = (int)$r['id'];
        $r['block_index'] = $r['block_index'] === null ? null : (int)$r['block_index'];
        $r['parent_id'] = $r['parent_id'] === null ? null : (int)$r['parent_id'];
        $r['rel_x'] = $r['rel_x'] === null ? null : (float)$r['rel_x'];
        $r['rel_y'] = $r['rel_y'] === null ? null : (float)$r['rel_y'];
    }
    out(['ok' => true, 'comments' => $rows]);
}

if ($action === 'create' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    throttle($db);
    $b = jsonBody();
    $pageId = clean($b['page_id'] ?? '', 120);
    $author = clean($b['author'] ?? '', 80);
    $body   = clean($b['body'] ?? '', 5000);
    if ($pageId === '' || $author === '' || $body === '') fail('page_id, author, and body are required');

    $stmt = $db->prepare('INSERT INTO comments
        (page_id, block_key, block_index, snippet, rel_x, rel_y, author, color, body, ip, created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?, datetime("now"))');
    $stmt->execute([
        $pageId,
        clean($b['block_key'] ?? '', 60) ?: null,
        isset($b['block_index']) && is_numeric($b['block_index']) ? (int)$b['block_index'] : null,
        clean($b['snippet'] ?? '', 160) ?: null,
        isset($b['rel_x']) && is_numeric($b['rel_x']) ? max(0, min(1, (float)$b['rel_x'])) : null,
        isset($b['rel_y']) && is_numeric($b['rel_y']) ? max(0, min(1, (float)$b['rel_y'])) : null,
        $author,
        clean($b['color'] ?? '', 20) ?: null,
        $body,
        clientIp(),
    ]);
    $id = (int)$db->lastInsertId();
    maybeNotify($db, $config, ['author' => $author, 'page_id' => $pageId, 'body' => $body]);
    $row = $db->query('SELECT * FROM comments WHERE id = ' . $id)->fetch(PDO::FETCH_ASSOC);
    out(['ok' => true, 'id' => $id, 'created_at' => $row['created_at']]);
}

if ($action === 'reply' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    throttle($db);
    $b = jsonBody();
    $parentId = (int)($b['parent_id'] ?? 0);
    $author = clean($b['author'] ?? '', 80);
    $body   = clean($b['body'] ?? '', 5000);
    if (!$parentId || $author === '' || $body === '') fail('parent_id, author, and body are required');

    $stmt = $db->prepare('SELECT page_id FROM comments WHERE id = ? AND parent_id IS NULL');
    $stmt->execute([$parentId]);
    $pageId = $stmt->fetchColumn();
    if ($pageId === false) fail('Parent comment not found', 404);

    $stmt = $db->prepare('INSERT INTO comments (page_id, author, color, body, parent_id, ip, created_at)
                          VALUES (?,?,?,?,?,?, datetime("now"))');
    $stmt->execute([$pageId, $author, clean($b['color'] ?? '', 20) ?: null, $body, $parentId, clientIp()]);
    $id = (int)$db->lastInsertId();
    $row = $db->query('SELECT created_at FROM comments WHERE id = ' . $id)->fetch(PDO::FETCH_ASSOC);
    out(['ok' => true, 'id' => $id, 'created_at' => $row['created_at']]);
}

if ($action === 'status' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $b = jsonBody();
    $id = (int)($b['id'] ?? 0);
    $status = ($b['status'] ?? '') === 'resolved' ? 'resolved' : 'open';
    $author = clean($b['author'] ?? '', 80);
    if (!$id) fail('id is required');

    $stmt = $db->prepare('SELECT id FROM comments WHERE id = ? AND parent_id IS NULL');
    $stmt->execute([$id]);
    if ($stmt->fetchColumn() === false) fail('Comment not found', 404);

    if ($status === 'resolved') {
        $stmt = $db->prepare("UPDATE comments SET status = 'resolved', resolved_at = datetime('now'), resolved_by = ? WHERE id = ?");
        $stmt->execute([$author ?: null, $id]);
    } else {
        $stmt = $db->prepare("UPDATE comments SET status = 'open', resolved_at = NULL, resolved_by = NULL WHERE id = ?");
        $stmt->execute([$id]);
    }
    out(['ok' => true]);
}

fail('Unknown action', 404);
