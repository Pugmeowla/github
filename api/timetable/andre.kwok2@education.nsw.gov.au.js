export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const email = req.query.email;

  if (!email) {
    return res.status(400).json({
      error: "Email is required."
    });
  }

  const schoolEmail = process.env.SCHOOL_EMAIL;
  const password = process.env.SCHOOL_PASSWORD;
  const apiBase = process.env.SCHOOL_API_BASE;

  if (!schoolEmail || !password || !apiBase) {
    console.error("School API environment variables are missing.");

    return res.status(500).json({
      error: "Server authentication is not configured."
    });
  }

  try {
    // --------------------------------------------------
    // 1. Get a fresh JWT from the school API
    // --------------------------------------------------

    const tokenResponse = await fetch(`${apiBase}/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        emailAddress: schoolEmail,
        password: password
      })
    });

    if (!tokenResponse.ok) {
      console.error(
        `School authentication failed: HTTP ${tokenResponse.status}`
      );

      return res.status(502).json({
        error: "School authentication failed."
      });
    }

    const tokenData = await tokenResponse.json();
    const token = tokenData?.token;

    if (!token) {
      console.error("School API did not return a token.");

      return res.status(502).json({
        error: "School API did not return a token."
      });
    }

    // --------------------------------------------------
    // 2. Use the JWT SERVER-SIDE
    // --------------------------------------------------

    const timetableResponse = await fetch(
      `${apiBase}/api/timetable/${encodeURIComponent(email)}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json"
        }
      }
    );

    if (!timetableResponse.ok) {
      console.error(
        `Timetable API returned HTTP ${timetableResponse.status}`
      );

      return res.status(timetableResponse.status).json({
        error: "Unable to retrieve timetable."
      });
    }

    // --------------------------------------------------
    // 3. Return timetable to the browser
    // --------------------------------------------------

    const timetable = await timetableResponse.json();

    return res.status(200).json(timetable);

  } catch (error) {
    console.error(
      "Timetable request failed:",
      error instanceof Error ? error.message : "Unknown error"
    );

    return res.status(502).json({
      error: "Unable to contact the school API."
    });
  }
}