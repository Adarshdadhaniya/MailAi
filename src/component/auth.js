import { createUserWithEmailAndPassword,signInWithPopup,signOut } from "firebase/auth";
import { Auth,provider } from "../config/firebase";
import { useState } from "react";

export const AuthComponent = () =>{
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // console. log(auth ?. currentUser ?. email);
  const signIn = async () => {
    await createUserWithEmailAndPassword(Auth, email, password);
  };
const signInwithgoogle=async()=>{
  await signInWithPopup(Auth,provider);
}
const logout=async()=>{
  await signOut(Auth);
}
  return (
    <>
      <input
        placeholder="Email..."
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        placeholder="Password..."
        type="password"
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={signIn}>Sign In</button>
      <button onClick={signInwithgoogle}>Sign in with Google</button>
      <button onClick={logout}>Log Out</button>
    </>
  );
}
