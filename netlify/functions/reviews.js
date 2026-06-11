// netlify/functions/reviews.js - DEBUG VERSION
const https = require('https');

function httpsRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

let cachedReviews = null;
let lastFetched = 0;
const CACHE_DURATION = 3600000; // 1 hour

exports.handler = async function(event, context) {
  const allowedOrigins = [
    'https://aqasports.pro',
    'https://www.aqasports.pro',
    'https://aqasports.com',
    'https://www.aqasports.com',
    'https://aqasuivi.netlify.app'
  ];
  const requestOrigin = event.headers.origin || event.headers.Origin || '';
  const corsOrigin = allowedOrigins.includes(requestOrigin)
    ? requestOrigin
    : (requestOrigin.startsWith('http://localhost:') || requestOrigin.startsWith('http://127.0.0.1:')
        ? requestOrigin
        : allowedOrigins[0]);

  const headers = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // DEBUG: Log environment variables (without exposing full values)
  console.log('DEBUG: Checking environment variables...');
  console.log('PLACE_ID exists:', !!process.env.PLACE_ID);
  console.log('PLACE_ID length:', process.env.PLACE_ID?.length || 0);
  console.log('API_KEY exists:', !!process.env.GOOGLE_MAPS_API_KEY);
  console.log('API_KEY length:', process.env.GOOGLE_MAPS_API_KEY?.length || 0);

  try {
    const now = Date.now();
    
    // Return cached reviews if fresh
    if (cachedReviews && (now - lastFetched < CACHE_DURATION)) {
      console.log('Returning cached reviews');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          cached: true,
          source: 'cache',
          reviews: cachedReviews,
          timestamp: lastFetched
        })
      };
    }

    // Validate environment variables
    if (!process.env.PLACE_ID) {
      throw new Error('PLACE_ID environment variable not set in Netlify');
    }
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      throw new Error('GOOGLE_MAPS_API_KEY environment variable not set in Netlify');
    }

    console.log('Fetching fresh reviews from Google Places API...');

    const placeId = process.env.PLACE_ID;
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    const path = `/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=name,rating,reviews,user_ratings_total&key=${apiKey}&language=fr`;
    
    console.log('Making request to Google Places API...');

    const options = {
      hostname: 'maps.googleapis.com',
      path: path,
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    };

    const data = await httpsRequest(options);

    console.log('Google API Response Status:', data.status);

    if (data.status === 'REQUEST_DENIED') {
      throw new Error(`Google API: ${data.error_message || 'Request denied - check API key and restrictions'}`);
    }

    if (data.status === 'INVALID_REQUEST') {
      throw new Error(`Google API: ${data.error_message || 'Invalid request - check Place ID format'}`);
    }

    if (data.status !== 'OK') {
      throw new Error(`Google API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
    }

    const result = data.result;
    
    if (!result) {
      throw new Error('No result returned from Google API');
    }

    console.log('Successfully fetched reviews:', result.reviews?.length || 0, 'reviews');
    
    // Transform reviews to match our format
    const transformedReviews = {
      averageRating: result.rating || 0,
      totalReviews: result.user_ratings_total || 0,
      placeName: result.name || 'AQA Swimming Pool',
      reviews: (result.reviews || []).map(review => ({
        authorName: review.author_name,
        authorInitial: review.author_name.charAt(0).toUpperCase(),
        rating: review.rating,
        text: review.text,
        relativeTime: review.relative_time_description,
        profilePhotoUrl: review.profile_photo_url,
        time: review.time
      }))
    };

    // Calculate rating distribution
    const distribution = [0, 0, 0, 0, 0];
    transformedReviews.reviews.forEach(r => {
      if (r.rating >= 1 && r.rating <= 5) {
        distribution[r.rating - 1]++;
      }
    });
    transformedReviews.ratingDistribution = distribution;

    // Cache the results
    cachedReviews = transformedReviews;
    lastFetched = now;

    console.log('Successfully cached reviews');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        cached: false,
        source: 'google_api',
        reviews: transformedReviews,
        timestamp: now,
        debug: {
          totalReviews: transformedReviews.totalReviews,
          avgRating: transformedReviews.averageRating,
          reviewCount: transformedReviews.reviews.length
        }
      })
    };

  } catch (error) {
    console.error('ERROR:', error.message);
    console.error('Full error:', error);
    
    // Return error details for debugging
    return {
      statusCode: 200, // Still return 200 to avoid frontend errors
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        source: 'error_fallback',
        reviews: getMockReviews(),
        debug: {
          errorType: error.name,
          errorMessage: error.message,
          hasPlaceId: !!process.env.PLACE_ID,
          hasApiKey: !!process.env.GOOGLE_MAPS_API_KEY
        }
      })
    };
  }
};

function getMockReviews() {
  return {
    averageRating: 4.9,
    totalReviews: 524,
    placeName: 'AQA Swimming Pool (Mock Data)',
    ratingDistribution: [2, 3, 10, 42, 467],
    reviews: [
      {
        authorName: "Sarah M.",
        authorInitial: "S",
        rating: 5,
        text: "Une expérience incroyable! Les coachs sont professionnels et attentifs. J'ai progressé bien plus vite que je ne l'aurais imaginé.",
        relativeTime: "il y a 2 jours",
        time: Date.now() - 172800000
      },
      {
        authorName: "Mohamed K.",
        authorInitial: "M",
        rating: 5,
        text: "Excellent rapport qualité-prix! Les horaires sont flexibles et les piscines sont toujours propres.",
        relativeTime: "il y a 5 jours",
        time: Date.now() - 432000000
      },
      {
        authorName: "Leila B.",
        authorInitial: "L",
        rating: 5,
        text: "J'avais peur de l'eau depuis toujours. Grâce à l'équipe AQA, j'ai vaincu ma phobie et maintenant je nage régulièrement.",
        relativeTime: "il y a 1 semaine",
        time: Date.now() - 604800000
      }
    ]
  };
}