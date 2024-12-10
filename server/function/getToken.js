import { config } from "dotenv";
import queryString from 'querystring'

config()

const client_id = process.env.SPOTIFY_CLIENT_TOKEN
const client_secret = process.env.SPOTIFY_SECRET_TOKEN
const refresh_token = process.env.SPOTIFY_REFRESH_TOKEN


const getToken = async() => {
    const basic = Buffer.from(`${client_id}:${client_secret}`).toString("base64")
    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: "POST",
        headers: {
            "Authorization": `Basic ${basic}`,
            "Content-Type": "application/x-www-form-urlencoded",
     
        },
        body: queryString.stringify({
            grant_type: 'refresh_token',
            refresh_token
        })
    })

    if(!response.ok) throw new Error('Error lah') 
    
    const data = await response.json()
    return data.access_token
}


export default getToken
