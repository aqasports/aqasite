// api/members.js
// Express Router adapter for AQA Sports Academy Member Area
// Delegates all calls directly to the Netlify Serverless Function to prevent code duplication

const express = require('express');
const router = express.Router();
const netlifyMembers = require('../netlify/functions/members');

// Middleware to adapt Express req/res to Netlify event/context
async function delegateToNetlify(req, res) {
  // Construct the Netlify event object
  const event = {
    path: req.originalUrl,
    httpMethod: req.method,
    headers: req.headers,
    queryStringParameters: req.query || {},
    body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {})
  };

  try {
    const result = await netlifyMembers.handler(event, {});
    
    // Set headers
    if (result.headers) {
      Object.keys(result.headers).forEach(key => {
        res.setHeader(key, result.headers[key]);
      });
    }
    
    // Send response
    res.status(result.statusCode || 200).send(result.body || '');
  } catch (error) {
    console.error('Failed delegating to Netlify members handler:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Delegate all paths starting with /member or /admin/members
router.all('/member/*', delegateToNetlify);
router.all('/admin/members*', delegateToNetlify);

module.exports = router;
