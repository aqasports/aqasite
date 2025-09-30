const { google } = require("googleapis");

exports.handler = async function(event, context) {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.CLIENT_ID,
      process.env.CLIENT_SECRET,
      "https://developers.google.com/oauthplayground" // redirect URI
    );

    // use your refresh token
    oauth2Client.setCredentials({
      refresh_token: process.env.REFRESH_TOKEN,
    });

    const myBusiness = google.mybusinessbusinessinformation({
      version: "v1",
      auth: oauth2Client,
    });

    // Get your accountId first by calling accounts.list()
    const accounts = await google.mybusinessaccountmanagement({
      version: "v1",
      auth: oauth2Client,
    }).accounts.list();

    const accountId = accounts.data.accounts[0].name; // e.g. "accounts/123456789"

    // Get your locationId
    const locations = await myBusiness.accounts.locations.list({
      parent: accountId,
    });

    const locationId = locations.data.locations[0].name; 
    // e.g. "accounts/123456789/locations/987654321"

    // Fetch reviews
    const reviews = await myBusiness.accounts.locations.reviews.list({
      parent: locationId,
    });

    return {
      statusCode: 200,
      body: JSON.stringify(reviews.data, null, 2),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
