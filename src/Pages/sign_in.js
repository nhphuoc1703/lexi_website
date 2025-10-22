import React, { useState } from "react"
import "../Styling/sign_in.css"
import logo from '../assets/Lexi_logo.png';
import paint_drooling_effect from '../assets/paint_drooling_effect.png'
export function Sign_in() {
    const [action, setAction] = useState("Sign Up")
    return (
        // <>
        //     <h1>This is sign_in page</h1>
        // </>
        <div className="page">
            <img src={logo} alt="logo" className="logo-top-left"/>        
            <div className="container">
                <div className="header">
                    <div className="text">{action}</div>
                    <div className="underline"></div>
                    {/* <img src={paint_drooling_effect} alt="paint_drooling_effect" className="paint_drooling_effect"/> */}
                </div>
                <div className="inputs">
                    {action==="Login"?<div></div>:<div className="input">
                        {/* <img src={user_icon} alt=""/> */}
                        <input type="text" placeholder="Username"/>
                    </div>}
                    <div className="input">
                        {/* <img src={email_icon} alt=""/> */}
                        <input type="email" placeholder="Email"/>
                    </div>
                    <div className="input">
                        {/* <img src={password_icon} alt=""/> */}
                        <input type="password" placeholder="Password"/>
                    </div>
                </div>
                {action==="Sign Up"?<div></div>:<div className="forgot-password">Forgot password? <span>click here</span></div>}
                <div className="submit-container">
                    <div className={action==="Login"?"submit gray":"submit"} onClick={()=>{setAction("Sign Up")}}>Sign up</div>
                    <div className={action==="Sign Up"?"submit gray":"submit"}onClick={()=>{setAction("Login")}}>Login</div>
                </div>
            </div>
        </div>
    )
}