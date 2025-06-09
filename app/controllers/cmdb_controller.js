// cmdbController.js
// CMDB service offering table controller (using ServiceNow-managed OAuth token)

const axios = require('axios');

const cmdbController = {
  getServiceOfferings: async (req, res) => {
    try {
      // 1. Read optional query parameters from the request
      //    e.g. ?active=true&sysparm_limit=20
      const { active, limit, offset, fields } = req.query;

      // 2. Ensure required env vars exist
      const instance = process.env.SN_INSTANCE; 
      // e.g. 'dfe.service-now.com'
      const clientId = process.env.SN_OAUTH_CLIENT_ID;
      const clientSecret = process.env.SN_OAUTH_CLIENT_SECRET;
      if (!instance) {
        throw new Error('Missing SN_INSTANCE environment variable');
      }
      if (!clientId || !clientSecret) {
        throw new Error('Missing SN_OAUTH_CLIENT_ID or SN_OAUTH_CLIENT_SECRET environment variable');
      }

      // 3. Obtain an OAuth access token from ServiceNow (Client Credentials flow)
      const tokenUrl = `https://${instance}/oauth_token.do`;
      const tokenResponse = await axios.post(
        tokenUrl,
        'grant_type=client_credentials',
        {
          auth: {
            username: clientId,
            password: clientSecret,
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
          },
        }
      );

      const accessToken = tokenResponse.data.access_token;
      if (!accessToken) {
        throw new Error('No access token received from ServiceNow');
      }

      // 4. Build the base URL for the ServiceNow Table API
      const baseUrl = `https://${instance}/api/now/table/service_offering`;

      // 5. Construct a sysparm_query string if needed
      let sysparmQuery = '';
      if (typeof active !== 'undefined') {
        // This will filter by the "active" field in ServiceNow
        sysparmQuery = `active=${active}`;
      }

      // 6. Build the query parameters object
      const params = {};
      if (sysparmQuery) {
        params.sysparm_query = sysparmQuery;
      }
      if (limit) {
        params.sysparm_limit = limit;
      }
      if (offset) {
        params.sysparm_offset = offset;
      }
      if (fields) {
        // e.g. fields='sys_id,name,short_description'
        params.sysparm_fields = fields;
      }

      // 7. Make the GET request to ServiceNow Table API with Bearer token
      const response = await axios.get(baseUrl, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        params,
      });

      // 8. Forward the JSON payload to the client
      //    ServiceNow always wraps results in a "result" array
      return res.status(200).json({
        ok: true,
        total: response.data.result.length,
        results: response.data.result,
      });
    } catch (err) {
      console.error('Error fetching Service Offerings:', err.message);

      // If we got a response from ServiceNow but it was an error code,
      // forward that status and message.
      if (err.response) {
        const status = err.response.status;
        const body = err.response.data;
        return res.status(status).json({
          ok: false,
          error: body.error || body,
        });
      }

      // Otherwise, send a 500
      return res.status(500).json({
        ok: false,
        error: err.message,
      });
    }
  },
};

module.exports = cmdbController;
