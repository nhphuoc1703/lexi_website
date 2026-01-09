import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// for real-time functionalities (e.g. real-time notifications)
// import { io } from "socket.io-client";
import { useSocket } from "../context/SocketContext.js";
import logo from '../assets/lexi_web_icon.png';
import { FaUserPlus, FaBell, FaSignOutAlt, FaPhone } from "react-icons/fa";
import "../Styling/main.css";

export function Main() {
    // load in user from sign in page - after user have logged in/signed up with a valid account
    const user = JSON.parse(localStorage.getItem("user"))
    // navigate back to login/sign up page if someone tries to go to main manually
    const navigate = useNavigate();
    useEffect(() => {
        if (!localStorage.getItem("token")) {
            navigate("/"); // back to login
        }
    }, [navigate]);
    // fetching contacts of a user to show in the contacts box
    useEffect(() => {
        async function fetchContacts() {
            try {
                const token = localStorage.getItem("token");
                if (!token) return;

                const res = await fetch(`http://localhost:5000/api/friends/${user.id}`, {
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                });

                const data = await res.json();
                setContacts(data);

            } catch (err) {
                console.error("Error loading contacts:", err);
            }
        }

        fetchContacts();
    }, [user]);
    // function for when user sends a friend request
    async function sendFriendRequest() {
        try {
            const token = localStorage.getItem("token");
            const senderId = user.id;

            const res = await fetch("http://localhost:5000/api/friend-requests/send", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    senderId,
                    receiverQuery: friendInput,
                }),
            });
            if (!res.ok) {
                setAlertMsg("Something went wrong.");
                return;
            }
            const data = await res.json();
            // setAlertMsg(data.message || data.error);
            if (data.success) {
                setFriendInput("");
            }
        } catch (err) {
            setAlertMsg("Error sending request");
        }
    }
    // fetching incoming friend requests
    useEffect(() => {
        async function fetchIncomingRequests() {
            try {
                const token = localStorage.getItem("token");
                const res = await fetch(`http://localhost:5000/api/friend-requests/incoming/${user.id}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                const data = await res.json();
                // Normalize shape
                const normalized = data.map(req => ({
                    id: req.id,
                    username: req.username,
                    senderId: req.senderId || null
                }));
                setFriendRequests(normalized);
            } catch (err) {
                console.error("Error loading incoming requests:", err);
            }
        }

        fetchIncomingRequests();
    }, [user]);
    // functions to accept friend requests
    async function acceptRequest(requestId) {
        const token = localStorage.getItem("token");

        const res = await fetch("http://localhost:5000/api/friend-requests/accept", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ requestId }),
        });

        const data = await res.json();
        alert("Friend added!");

        // Re-fetch requests + contacts
        window.location.reload();
    }
    // function to decline friend requests
    async function declineRequest(requestId) {
        const token = localStorage.getItem("token");

        await fetch("http://localhost:5000/api/friend-requests/decline", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ requestId }),
        });

        alert("Request declined.");
        window.location.reload();
    }
    // function to start call - navigate to video-call.js:
    function startCall(contact) {
        const socket = socketRef.current;
        if (!socket || !socket.connected) {
            console.error("Socket not connected");
            return;
        }
        console.log("Calling:", contact);

        // This will eventually trigger:
        // - createOffer()
        // - send offer over WebSocket
        // - open call UI
        
        // socket.emit("call_user", {
        socket.emit("ring_user", {
            from: user.id,
            to: contact.id,
            username: user.display_name || user.username
        });
        // we don't want to navigate straight to /video_call right away anymore, only after callee accept the call
        // navigate("/video_call", { state: { contact, isCaller: true }})
    }
    // function to accept call
    function acceptCall() {
        if (!incomingCall) {
            console.warn("Accept clicked before offer arrived");
            return;
        }
        const socket = socketRef.current;
        socket.emit("accept_call", {
            from: user.id,
            to: incomingCall.from
        });
        navigate("/video_call", { 
            state: { 
                contact: { id: incomingCall.from, username: incomingCall.username },
                isCaller: false,
                // incomingOffer: incomingCall.
                incomingOffer: offerForVideoCall
            }
        });
        setIncomingCall(null);
    }
    // function to decline call
    function declineCall() {
        if (!incomingCall) return;
        const socket = socketRef.current;
        if (!socket) {
            console.error("Socket not connected");
            return;
        }
        socket.emit("end_call", { 
            to: incomingCall.from, 
            from: user.id 
        });
        setIncomingCall(null);
    }
    // =========== variables for storing elements on the webpage and functions to set them, and their default ================
    const [inputVolume, setInputVolume] = useState(50); // default to 50% for now, should just be whatever user put last login later
    const [outputVolume, setOutputVolume] = useState(50); // default to 50% for now, should just be whatever user put last login later
    const [showAccount, setShowAccount] = useState(false);
    const [contacts, setContacts] = useState([]);
    const [selectedProfile, setSelectedProfile] = useState(null);
    // specifically for the left panel popup 
    const [showMenu, setShowMenu] = useState(false);
    const [closeMenu, setCloseMenu] = useState(false);
    // specifically for the add friend button, and its popup
    const [showAddFriend, setShowAddFriend] = useState(false);
    const [friendInput, setFriendInput] = useState("");
    const [alertMsg, setAlertMsg] = useState("");
    // specifically for the friends notification button, and its popup
    const [showNotifications, setShowNotifications] = useState(false);
    const [friendRequests, setFriendRequests] = useState([]);
    // specifically for real-time functionalities (e.g. real-time notifications)
    // const [socket, setSocket] = useState(null);
    // specifically for incoming calls
    const [incomingCall, setIncomingCall] = useState(null);
    const [offerForVideoCall, setOfferForVideoCall] = useState(null);
    // import the shared socket.io from App.js
    const socketRef = useSocket();
    // updating real-time notifications
    useEffect(() => {
        // const s = io("http://localhost:5000");
        const s = socketRef.current;
        if (!s) return;
        // register this user with server
        // s.emit("register", user.id);
        // s.on("connect", () => {
        //     console.log("Connected to websocket:", s.id);
        //     s.emit("register", user.id);
        // });
        s.on("new_friend_request", (data) => {
            // instantly update friendRequests list
            setFriendRequests(prev => [...prev, {
                id: data.requestId,
                username: data.username,
                senderId: data.senderId
            }]);
        });
        s.on("incoming_call", (payload) => {
            console.log("Incoming call:", payload);
            // if (payload.offer) {
            //     // This is the REAL WebRTC offer
            //     setOfferForVideoCall(payload.offer);
            //     return;
            // }
            // // This is only for the pop up
            // setIncomingCall(payload);
            if (payload.type === "ring") {
                // UI popup
                console.log("main.js incoming_call received!");
                setIncomingCall(payload);
                return;
            }

            // if (payload.type === "offer") {
            //     // Store WebRTC offer until the call screen loads
            //     console.log("Storing incoming WebRTC offer");
            //     setOfferForVideoCall(payload.offer);
            //     return;
            // }
        });
        s.on("call_accepted", ({ from }) => {
            s.off("incoming_call");
            navigate("/video_call", {
                state: { isCaller: true, contact: { id: from } }
            });
        });
        // setSocket(s);
        return () => {
            // s.disconnect();
            s.off("new_friend_request");
            s.off("incoming_call");
            s.off("call_accepted");
        };
    }, [socketRef.current]);
    // Function to update slider CSS variable dynamically
    const handleSliderChange = (e, setter) => {
        const value = e.target.value;
        setter(value);
        e.target.style.setProperty('--value', `${value}%`);
    };
    return (
        <div className="Page">
            <div className="header">
                <img src={logo} alt="logo" className="main-btn" onClick={() => setShowMenu(true)}/>        
                <div className="search_bar">
                    <input type="text" placeholder="Let's find your partner-in-chat"/>
                </div>
                <div className="header_controls">
                    <button className="add_friend_btn" onClick={() => setShowAddFriend(true)}>
                        {/* + Add friend */}
                        <FaUserPlus size={18}/>
                    </button>
                    <button className="notif_btn" onClick={() => setShowNotifications(true)}>
                        {/* Notif */}
                        <FaBell size={18}/>
                    </button>
                </div>
            </div>
            <div className="settings_box">
                <div className="profile">
                    {/* includes a profile picture button for mic and input audio setting */}
                    <div className="my_account" onClick={() => setShowAccount(true)}>
                        {/* e.g. email, password,  */}
                        {/* <button onClick={() => setShowAccount(true)}>My account</button> */}
                        <div className="profile_image_container">
                            <img className="profile_image" src="https://via.placeholder.com/60" alt="Profile"/>
                            <span className="status_dot online"></span>
                        </div>
                        <div className="user_info">
                            <h4 className="display_name">{user?.display_name}</h4>
                            <p className="username">@{user?.username}</p>
                        </div>
                        <button className="account_btn">btn</button>
                    </div>
                    <div className="audio_settings">
                        <h3>Audio settings</h3>
                        <div className="mic_control">
                            <label htmlFor="input_volume">Input volume</label>
                            <div className="slider_container">
                                <input
                                    type="range"
                                    id="input_volume"
                                    min="0"
                                    max="100"
                                    value={inputVolume}
                                    onChange={(e) => handleSliderChange(e, setInputVolume)}
                                />
                                <span className="volume_tooltip" style={{left: `${inputVolume}%`}}>{inputVolume}%</span>
                            </div>
                        </div>
                        <div className="output_control">
                            <label htmlFor="output_volume">Output volume</label>
                            <div className="slider_container">
                                <input
                                    type="range"
                                    id="output_volume"
                                    min="0"
                                    max="100"
                                    value={outputVolume}
                                    onChange={(e) => handleSliderChange(e, setOutputVolume)}
                                />
                                <span className="volume_tooltip" style={{left: `${outputVolume}%`}}>{outputVolume}%</span>
                            </div>
                        </div>
                        <div className="output_selection">
                            <label htmlFor="output_device">Output device</label>
                            <select id="output_device">
                                <option>Default speaker</option>
                                <option>External speaker</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className="profile_setting">
                    {/* e.g. display name, username, pronouns */}
                </div>
                <div className="video_setting">
                    {/* e.g. , video input device, video quality, background? */}
                    <h3>Video settings</h3>
                    <label htmlFor="camera">camera</label>
                    <select id="camera">
                        <option>Default camera</option>
                        <option>External camera</option>
                    </select>
                    <label htmlFor="resolution">Resolution</label>
                    <select id="resolution">
                        <option>720p</option>
                        <option>1080p</option>
                        <option>4K</option>
                    </select>
                </div>
            </div>
            <div className="contacts_box">
                {/* list of added friends */}
                {contacts.length === 0 ? (
                    <p className="no_contacts">Go make new friends! We'll show them here once your friend list starts to build up!</p>
                ) : (
                    <div className="contacts_list">
                        {contacts.map((c, index) => (
                            <div className="contact_item" key={index} onClick={() => setSelectedProfile(c)}>
                                <p>{c.display_name}</p>
                                {/* <span className={`contact_status ${c.status}`}></span>  - we can't use this for now because I need to update the database with status, and have the app constantly tracking user status*/}
                                <button className="call_btn" onClick={(e) => {
                                    e.stopPropagation();
                                    startCall(c);
                                }}><FaPhone size={18}/></button> 
                                <span className={`contact_status offline`}></span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div className="profiles_box">
                {/* a specific friend's profile preview */}
                {!selectedProfile ? (
                    <p className="no_profile">Select a contact to view their profile</p>
                ) : (
                    <div className="profile_details">
                        <img
                            src={selectedProfile.profile_picture || "/default_profile.png"}
                            alt="Profile"
                            className="contact_profile_image"
                        />

                        <h2 className="profile_displayname">{selectedProfile.display_name}</h2>
                        <p className="profile_username">@{selectedProfile.username}</p>
                        <button className="profile_call_btn" onClick={() => startCall(selectedProfile)}>Call</button>
                        <div className="profile_status_wrapper">
                            {/* placeholder for status for now until database and status tracking is set up */}
                            {/* <span className={`status_dot ${selectedProfile.status}`}></span>
                            <span className="status_label">{selectedProfile.status}</span> */}
                            <span className={`status_dot offline`}></span>
                            <span className="status_label">offline</span>
                        </div>
                    </div>
                )}
            </div>
            {/* account popup */}
            {showAccount && (
                <div className="account_popup" onClick={() => setShowAccount(false)}> {/* prevent closing when clicking inside */}
                    <div className="popup_content" onClick={(e) => e.stopPropagation()}>  
                        <h3>My Account</h3>
                        <p>Email: {user?.email}</p>
                        <p>Password: ••••••••</p>
                        <button onClick={() => setShowAccount(false)}>Close</button>
                    </div>
                </div>
            )}
            {/* left slide panel popup for logging out and other elements */}
            {showMenu && (
                <div className="side_menu_overlay" onClick={() => {
                    setCloseMenu(true);
                    setTimeout(() => {
                        setShowMenu(false);
                        setCloseMenu(false);
                    }, 250)
                }}>
                    <div className={`side_menu ${closeMenu ? "close" : ""}`} onClick={(e) => e.stopPropagation()}>
                        <button className="logout_btn" onClick={() => {
                            localStorage.removeItem("token");
                            localStorage.removeItem("user");
                            navigate("/sign_in");
                        }}><FaSignOutAlt size={15}/> Log out</button>
                    </div>
                </div>
            )}
            {/* pop up for the add friend button */}
            {showAddFriend && (
                <div className="add_friend_popup" onClick={() => setShowAddFriend(false)}>
                    <div className="add_friend_content" onClick={(e) => e.stopPropagation()}>
                        <h3>Add a Friend</h3>
                        <p>You can add a friend with their username</p>
                        <input 
                            type="text"
                            className="add_friend_input"
                            placeholder="@username or email"
                            value={friendInput}
                            onChange={(e) => setFriendInput(e.target.value)}
                        />
                        <button 
                            className="add_friend_submit"
                            onClick={() => {
                                // placeholder alert for now...
                                // alert("Feature coming soon! (UI is ready)");
                                // setFriendInput("");
                                // setShowAddFriend(false);
                                sendFriendRequest()
                            }}
                        >
                            Send Request
                        </button>
                        <p>{alertMsg}</p>
                        <button 
                            className="add_friend_close"
                            onClick={() => setShowAddFriend(false)}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
            {/* popup for incoming friend requests button */}
            {showNotifications && (
                <div className="add_friend_popup" onClick={() => setShowNotifications(false)}>
                    <div className="add_friend_content" onClick={(e) => e.stopPropagation()}>
                        <h3>Friend Requests</h3>
                        {friendRequests.length === 0 ? (
                            <p>No new requests</p>
                        ) : (
                            friendRequests.map((req, i) => (
                                <div key={i} style={{ 
                                    display: "flex", 
                                    justifyContent: "space-between",
                                    margin: "10px 0"
                                }}>
                                    <span>@{req.username}</span>
                                    <div>
                                        <button className="add_friend_submit" onClick={() => acceptRequest(req.id)}>Accept</button>
                                        <button className="add_friend_close" onClick={() => declineRequest(req.id)} style={{ marginLeft: "10px" }}>Decline</button>
                                    </div>
                                </div>
                            ))
                        )}
                        <button className="add_friend_close" onClick={() => setShowNotifications(false)}>
                            Close
                        </button>
                    </div>
                </div>
            )}
            {/* popup for incoming call from contacts */}
            {incomingCall && (
                <div className="incoming_call_popup" onClick={() => setIncomingCall(null)}>
                    <div className="incoming_call_content" onClick={(e) => e.stopPropagation()}>
                        <h3>Incoming Call</h3>
                        <p>@{incomingCall.username}</p>
                        <div className="incoming_call_buttons">
                            <button className="accept_call_btn" onClick={acceptCall}>
                                <FaPhone size={15}/>
                            </button>

                            <button className="decline_call_btn" onClick={declineCall}>
                                <FaPhone size={15} style={ {transform: "rotate(135deg)"} }/>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}