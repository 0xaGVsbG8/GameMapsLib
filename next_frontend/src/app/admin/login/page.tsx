'use client'
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiUrl } from "../api";
import "./login.css";

// export const metadata: Metadata = {
//   title: "Admin login",
// };





export default function AdminLoginPage() {
  const router = useRouter();
  const username = useRef<HTMLInputElement>(null);
  const passwd = useRef<HTMLInputElement>(null);
  const [backend_response,set_backend_response] = useState<string>('')


  const handleSubmit = async(e: React.FormEvent<HTMLFormElement>) => {
    set_backend_response('')
    e.preventDefault()
    if(!username.current?.value || !passwd.current?.value){return}

    const response = await fetch(apiUrl("/blog/auth-user"), {
      method:'POST',
      headers: {
        "Content-Type": "application/json",
      },
      credentials: 'include',
      body: JSON.stringify({
        username: username.current?.value,
        password: passwd.current?.value,
      }),
    })

    if(response.status==401){
      set_backend_response('Incorrect credentials')
      return
    }

    router.replace("/admin/dashboard");
  }


  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Log in to admin dashboard</h1>
        {/* <p>Sign in to manage maps and dashboard settings.</p> */}

        <div className="login-field">
          <label htmlFor="username">Username</label>
          <input
            ref={username}
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            placeholder="Enter username"
          />
        </div>

        <div className="login-field">
          <label htmlFor="password">Password</label>
          <input
            ref={passwd}
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter password"
          />
        </div>

        <div>{backend_response}</div>

        <button className="login-submit" type="submit">
          Sign in
        </button>
      </form>
    </div>
  );
}
