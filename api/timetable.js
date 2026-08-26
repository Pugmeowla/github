let cachedToken = null;
let tokenExpiresAt = 0;

const API_BASE =
  process.env.SCHOOL_API_BASE ||
  "https://intranet.nbscmanlys-h.schools.nsw.edu.au/api";

async function generateToken() {
  const response = await fetch(`${API_BASE}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({
      emailAddress: process.env.SCHOOL_EMAIL,
      password: process.env.SCHOOL_PASSWORD
    })
  });

  if (!response.ok) {
    throw new Error(
      `School authentication failed with HTTP ${response.status}`
    );
  }

  const data = await response.json();

  if (!data.token) {
    throw new Error("School API did not return a token.");
  }

  /*
   * Decode the JWT payload to get its expiration time.
   * We don't verify the signature here because we're only
   * using the expiration timestamp to decide when to refresh.
   */
  try {
    const payload = JSON.parse(
      Buffer.from(
        data.token.split(".")[1],
        "base64url"
      ).toString("utf8")
    );

    if (typeof payload.exp !== "number") {
      throw new Error("JWT has no expiration timestamp.");
    }

    tokenExpiresAt = payload.exp * 1000;
  } catch {
    throw new Error("Unable to read JWT expiration.");
  }

  cachedToken = data.token;

  return cachedToken;
}

async function getToken() {
  /*
   * Refresh five minutes before expiration.
   * This prevents a request from starting with a token
   * that expires while the request is being processed.
   */
  const refreshBuffer = 5 * 60 * 1000;

  if (
    cachedToken &&
    Date.now() < tokenExpiresAt - refreshBuffer
  ) {
    return cachedToken;
  }

  return await generateToken();
}

export default async function handler(req, res) {
  try {
    /*
     * The Vercel route is:
     *
     * /api/timetable
     *
     * For now, we'll test one specific school API endpoint.
     */

    const token = await getToken();

    /*
     * CHANGE THIS to the actual timetable endpoint
     * from your existing HTML.
     */
    const timetableEndpoint = "/timetable";

    const response = await fetch(
      `${API_BASE}${timetableEndpoint}`,
      {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`
        }
      }
    );

    const contentType =
      response.headers.get("content-type") || "";

    const data = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      console.error(
        `School timetable API returned HTTP ${response.status}`
      );

      return res.status(response.status).json({
        error: "School timetable API request failed."
      });
    }

    return res.status(200).json(data);

  } catch (error) {
    console.error(
      "Timetable proxy error:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    return res.status(500).json({
      error: "Unable to retrieve timetable."
    });
  }
}