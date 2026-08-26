export default async function handler(req,res){
  if(req.method!=="GET")
    return res.status(405).json({error:"Method not allowed"});

  const email=process.env.SCHOOL_EMAIL;
  const password=process.env.SCHOOL_PASSWORD;
  const apiBase=process.env.SCHOOL_API_BASE;

  if(!email||!password||!apiBase)
    return res.status(500).json({error:"Server authentication is not configured."});

  try{
    const auth=await fetch(`${apiBase}/token`,{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "Accept":"application/json"
      },
      body:JSON.stringify({
        emailAddress:email,
        password
      })
    });

    if(!auth.ok)
      return res.status(502).json({error:"School authentication failed."});

    const data=await auth.json();
    const token=data?.token;

    if(!token)
      return res.status(502).json({error:"School API did not return a token."});

    const headers={
      Authorization:`Bearer ${token}`,
      Accept:"application/json"
    };

    const [
      timetableResponse,
      bellTimesResponse,
      startDateResponse,
      profileResponse
    ]=await Promise.all([
      fetch(`${apiBase}/timetable/${encodeURIComponent(email)}`,{headers}),
      fetch(`${apiBase}/timetable/bell-times`,{headers}),
      fetch(`${apiBase}/timetable/settings/start-date`,{headers}),
      fetch(`${apiBase}/user/${encodeURIComponent(email)}`,{headers})
    ]);

    if(!timetableResponse.ok){
      const details=await timetableResponse.text();
      console.error("Timetable API:",timetableResponse.status,details);
      return res.status(timetableResponse.status).json({
        error:"Unable to retrieve timetable.",
        status:timetableResponse.status
      });
    }

    res.status(200).json({
      timetable:await timetableResponse.json(),
      bellTimes:bellTimesResponse.ok?await bellTimesResponse.json():null,
      startDate:startDateResponse.ok?await startDateResponse.json():null,
      profile:profileResponse.ok?await profileResponse.json():null
    });

  }catch(error){
    console.error(error);
    res.status(502).json({error:"Unable to contact the school API."});
  }
}