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

  // Ideally restrict this to accounts you're authorised to access.
  // For example, during testing:
  if (email.toLowerCase() !== process.env.SCHOOL_EMAIL.toLowerCase()) {
    return res.status(403).json({
      error: "This timetable is not available."
    });
  }

  const emailAddress = process.env.SCHOOL_EMAIL;
  const password = process.env.SCHOOL_PASSWORD;
  const apiBase = process.env.SCHOOL_API_BASE;

  if (!emailAddress || !password || !apiBase) {
    console.error("Required environment variables are missing.");

    return res.status(500).json({
      error: "Server authentication is not configured."
    });
  }

  try {
    // 1. Get a fresh JWT
    const tokenResponse = await fetch(`${apiBase}/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        emailAddress,
        password
      })
    });

    if (!tokenResponse.ok) {
      console.error(
        `School authentication returned HTTP ${tokenResponse.status}`
      );

      return res.status(502).json({
        error: "School authentication failed."
      });
    }

    const tokenData = await tokenResponse.json();
    const token = tokenData?.token;

    if (!token) {
      return res.status(502).json({
        error: "School API did not return a token."
      });
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json"
    };

    // 2. Get all required data server-side
    const [
      timetableResponse,
      bellTimesResponse,
      startDateResponse,
      profileResponse
    ] = await Promise.all([
      fetch(
        `${apiBase}/timetable/${encodeURIComponent(email)}`,
        { headers }
      ),

      fetch(`${apiBase}/timetable/bell-times`, { headers }),

      fetch(`${apiBase}/timetable/settings/start-date`, { headers }),

      fetch(
        `${apiBase}/user/${encodeURIComponent(email)}`,
        { headers }
      )
    ]);

    if (!timetableResponse.ok) {
      const details = await timetableResponse.text();

      console.error(
        `Timetable API returned HTTP ${timetableResponse.status}:`,
        details
      );

      return res.status(timetableResponse.status).json({
        error: "Unable to retrieve timetable."
      });
    }

    const timetable = await timetableResponse.json();

    const bellTimes = bellTimesResponse.ok
      ? await bellTimesResponse.json()
      : null;

    const startDate = startDateResponse.ok
      ? await startDateResponse.json()
      : null;

    const profile = profileResponse.ok
      ? await profileResponse.json()
      : null;

    // 3. Send clean data to browser
    return res.status(200).json({
      timetable,
      bellTimes,
      startDate,
      profile
    });

  } catch (error) {
    console.error(
      "Timetable request error:",
      error instanceof Error ? error.message : "Unknown error"
    );

    return res.status(502).json({
      error: "Unable to contact the school API."
    });
  }
}