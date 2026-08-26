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
    return res.status(500).json({
      error: "Server authentication is not configured."
    });
  }

  try {
    const tokenResponse = await fetch(`${apiBase}/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        emailAddress: schoolEmail,
        password
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData?.token) {
      return res.status(502).json({
        error: "School authentication failed."
      });
    }

    const timetableResponse = await fetch(
      `${apiBase}/api/timetable/${encodeURIComponent(email)}`,
      {
        headers: {
          "Authorization": `Bearer ${tokenData.token}`,
          "Accept": "application/json"
        }
      }
    );

    const timetableData = await timetableResponse.json();

    if (!timetableResponse.ok) {
      return res.status(timetableResponse.status).json({
        error: "Unable to retrieve timetable.",
        details: timetableData
      });
    }

    return res.status(200).json(timetableData);

  } catch (error) {
    console.error(error);

    return res.status(502).json({
      error: "Unable to contact the school API."
    });
  }
}