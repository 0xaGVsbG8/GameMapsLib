'use client'
import { useEffect, useState } from "react";
import { AddGameWidget } from "./AddGameWidget";
import { info_type } from "./types";

export default function AdminDashboardPage() {

  const [data, setData] = useState<info_type>()

  const gather_info = async() => {
    const response = await fetch("http://localhost:8000/blog/getGlobalInfo",{
      method:'GET',
      credentials: 'include'
    })
    const data = await response.json() as info_type
    console.log(data)
    setData(data)
  }


  const handleGetGameInfo = async(name: string) => {
    const response = await fetch(`http://localhost:8000/blog/getGameInfo?GameName=${encodeURIComponent(name)}`,{
      method:'GET',
      credentials: 'include'
    })
    const data = await response.json() 
    if(data.map=='not exists'){
      
    }
    console.log(data)
    // setData(data)
  }


  useEffect(()=>{gather_info()},[])
 

    return (

      <div style={{ padding: 32 }}>
        <h1>Admin dashboard</h1>

        <div>
        {data?.games.map((game) => (
          <div id={game+'xd'} key={game}>
            <button onClick={()=>handleGetGameInfo(game)}>{game}</button>
          </div>
        ))}
       </div>

        <AddGameWidget />
      </div>
    );

}
