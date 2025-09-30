const { google } = require("googleapis");

let cachedReviews = null;
let lastFetched = 0;

exports.handler = async function(event, context) {
  try {
    // If cached reviews exist and are fresh (< 1 hour old), return them
    const now = Date.now();
    if (cachedReviews && (now - lastFetched < 1000 * 60 * 60)) {
      return {
        statusCode: 200,
        body: JSON.stringify(cachedReviews, null, 2),
      };
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.CLIENT_ID,
      process.env.CLIENT_SECRET,
      "https://developers.google.com/oauthplayground" // redirect URI
    );

    // use your refresh token
    oauth2Client.setCredentials({
      refresh_token: process.env.REFRESH_TOKEN,
    });

    // Get your accounts
    const accountResp = await google.mybusinessaccountmanagement({
      version: "v1",
      auth: oauth2Client,
    }).accounts.list();

    if (!accountResp.data.accounts || !accountResp.data.accounts.length) {
      throw new Error("No accounts found in Google My Business API");
    }

    const accountId = accountResp.data.accounts[0].name; // e.g. "accounts/123456789"

    // Get your locations
    const myBusiness = google.mybusinessbusinessinformation({
      version: "v1",
      auth: oauth2Client,
    });

    const locations = await myBusiness.accounts.locations.list({
      parent: accountId,
    });

    if (!locations.data.locations || !locations.data.locations.length) {
      throw new Error("No locations found for this account");
    }

    const locationId = locations.data.locations[0].name; // "accounts/.../locations/..."

    // Fetch reviews
    const reviewsResp = await myBusiness.accounts.locations.reviews.list({
      parent: locationId,
    });

    // Cache results in memory
    cachedReviews = reviewsResp.data;
    lastFetched = now;

    return {
      statusCode: 200,
      body: JSON.stringify(cachedReviews, null, 2),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
