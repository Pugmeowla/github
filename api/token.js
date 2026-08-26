export default async function handler(req,res){
  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://pugmeowla.github.io"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  if(req.method==="OPTIONS"){
    return res.status(204).end();
  }

 

  if(req.method!=="GET"){
    return res.status(405).json({error:"Method not allowed"});
  }

  const emailAddress=process.env.SCHOOL_EMAIL;
  const password=process.env.SCHOOL_PASSWORD;
  const apiBase=process.env.SCHOOL_API_BASE;

  if(!emailAddress||!password||!apiBase){
    console.error("Required environment variables are missing.");
    return res.status(500).json({
      error:"Server authentication is not configured."
    });
  }

  try{
    const response=await fetch(`${apiBase}/token`,{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        Accept:"application/json"
      },
      body:JSON.stringify({
        emailAddress,
        password
      })
    });

    if(!response.ok){
      console.error(`School API returned HTTP ${response.status}`);
      return res.status(response.status).json({
        error:"School authentication failed."
      });
    }

    const data=await response.json();
    const token=data?.token;

    if(!token){
      console.error("School API response did not contain a token.");
      return res.status(502).json({
        error:"School API did not return a token."
      });
    }

    return res.status(200).json({
      token,
      type:"Bearer"
    });

  }catch(error){
    console.error(
      "Token request error:",
      error instanceof Error?error.message:"Unknown error"
    );

    return res.status(502).json({
      error:"Unable to contact the school API."
    });
  }
}