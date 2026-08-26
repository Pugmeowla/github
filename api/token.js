export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const email = process.env.SCHOOL_EMAIL;
  const password = process.env.SCHOOL_PASSWORD;
  const apiBase = process.env.SCHOOL_API_BASE;

  if (!email || !password || !apiBase) {
    console.error("Required server environment variables are missing.");

    return res.status(500).json({
      error: "Server authentication is not configured."
    });
  }

  try {
    const response = await fetch(`${apiBase}/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        email,
        password
      })
    });

    const contentType =
      response.headers.get("content-type") || "";

    const body = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      console.error(
        "School token request failed:",
        response.status
      );

      return res.status(response.status).json({
        error: "School authentication failed."
      });
    }

    /*
     * IMPORTANT:
     *
     * At this stage we deliberately do NOT return the
     * school's JWT to the browser.
     *
     * We are only testing that Vercel can authenticate
     * against the school API.
     */

    const token =
      body?.token ||
      body?.access_token ||
      body?.accessToken;

    if (!token) {
      console.error(
        "School API returned a successful response but no token."
      );

      return res.status(502).json({
        error: "School API did not return a token."
      });
    }

    /*
     * Decode the JWT payload only on the server.
     * This lets us verify that it is a JWT and inspect
     * its expiration without exposing it.
     */

    let expiresAt = null;

    try {
      const parts = token.split(".");

      if (parts.length === 3) {
        const payload = JSON.parse(
          Buffer.from(parts[1], "base64url").toString("utf8")
        );

        if (typeof payload.exp === "number") {
          expiresAt = new Date(
            payload.exp * 1000
          ).toISOString();
        }
      }
    } catch {
      // Token may not be a standard JWT.
      // Authentication itself still succeeded.
    }

    return res.status(200).json({
      success: true,
      authenticated: true,
      expiresAt
    });

  } catch (error) {
    console.error(
      "Token generator error:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    return res.status(502).json({
      error: "Unable to contact the school API."
    });
  }
}