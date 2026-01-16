<?php
/**
 * Auto-Git API Wrapper
 * Handles deployment requests from the AQA Groups Manager
 * Executes auto_git.py to automate git operations
 */

header('Content-Type: application/json');

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

// Get the request data
$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['groupes']) || !isset($input['inscrip'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing files data']);
    exit;
}

$projectDir = dirname(__FILE__);

try {
    // Write groupes.html
    if (file_put_contents($projectDir . '/groupes.html', $input['groupes']) === false) {
        throw new Exception('Failed to write groupes.html');
    }
    
    // Write inscription.html
    if (file_put_contents($projectDir . '/inscription.html', $input['inscrip']) === false) {
        throw new Exception('Failed to write inscription.html');
    }
    
    // Execute auto_git.py
    $pythonPath = 'python'; // or 'python3' depending on your system
    $pyScript = $projectDir . '/auto_git.py';
    
    $output = [];
    $returnVar = 0;
    
    // Run the Python script
    exec("cd \"$projectDir\" && $pythonPath auto_git.py", $output, $returnVar);
    
    if ($returnVar !== 0) {
        throw new Exception('Git operation failed: ' . implode("\n", $output));
    }
    
    echo json_encode([
        'success' => true, 
        'message' => 'Deployment successful',
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>
