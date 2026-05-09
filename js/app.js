import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, onValue, set, onChildAdded, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// TODO: PASTE YOUR FIREBASE CONFIG HERE (Storage theva illa)
const firebaseConfig = {
    apiKey: "AIzaSyAx-cKzYBpXNVykmSBO6BpV0Nd-632P7yI",
  authDomain: "ipa-b7eb7.firebaseapp.com",
  databaseURL: "https://ipa-b7eb7-default-rtdb.firebaseio.com",
  projectId: "ipa-b7eb7",
  storageBucket: "ipa-b7eb7.firebasestorage.app",
  messagingSenderId: "921604312691",
  appId: "1:921604312691:web:5bc28a372276be1d612406",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

document.addEventListener('DOMContentLoaded', () => {
    
    const myIp = localStorage.getItem('sonic_user_ip');
    if(!myIp && !window.location.pathname.includes('index')) { window.location.href = 'index.html'; return; }
    const safeMyIp = myIp ? myIp.replace(/\./g, '_') : '';
    
    const path = window.location.pathname;

    // ==========================================
    // MODULE 1: DASHBOARD LOGIC
    // ==========================================
    if(path.includes('dashboard') || path === '/' || path === '') {
        const myIpDisplay = document.getElementById('myIpDisplay');
        if(myIpDisplay) myIpDisplay.innerText = myIp;

        document.getElementById('toggleAddIp')?.addEventListener('click', () => {
            const box = document.getElementById('addIpBox');
            box.style.display = box.style.display === 'none' ? 'block' : 'none';
        });

        document.getElementById('saveIpBtn')?.addEventListener('click', () => {
            const targetIp = document.getElementById('targetIpInput').value.trim();
            if(targetIp) {
                set(push(ref(db, `users/${safeMyIp}/hub`)), { ip: targetIp });
                document.getElementById('targetIpInput').value = '';
                document.getElementById('addIpBox').style.display = 'none';
            }
        });

        const hubList = document.getElementById('hubList');
        const inspectModal = document.getElementById('inspectModal');
        const inspectIpText = document.getElementById('inspectIpText');
        
        if(hubList) {
            onValue(ref(db, `users/${safeMyIp}/hub`), (snap) => {
                hubList.innerHTML = '';
                if(snap.exists()) {
                    snap.forEach(child => {
                        const data = child.val();
                        const targetSafeIp = data.ip.replace(/\./g, '_');
                        
                        const div = document.createElement('div');
                        div.className = 'conn-item';
                        div.innerHTML = `
                            <div class="conn-info"><span>IP: <b style="color:#fff">${data.ip}</b></span><span>📶</span></div>
                            <div class="conn-actions">
                                <button class="btn outline inspectBtn">Inspect</button>
                                <button class="btn primary joinBtn">Join</button>
                            </div>
                        `;
                        
                        div.querySelector('.joinBtn').onclick = () => {
                            const btn = div.querySelector('.joinBtn');
                            btn.innerText = 'Requesting...';
                            const reqRef = ref(db, `users/${targetSafeIp}/requests/${safeMyIp}`);
                            set(reqRef, { status: 'pending', from: myIp });
                            
                            onValue(reqRef, (resSnap) => {
                                if(resSnap.exists() && resSnap.val().status === 'accepted') {
                                    remove(reqRef);
                                    window.location.href = `join.html?target=${data.ip}`;
                                } else if(resSnap.exists() && resSnap.val().status === 'declined') {
                                    alert('Request Declined.');
                                    btn.innerText = 'Join';
                                    remove(reqRef);
                                }
                            });
                        };

                        div.querySelector('.inspectBtn').onclick = () => {
                            inspectIpText.innerText = data.ip;
                            inspectModal.style.display = 'flex';
                            
                            let clicks = 0;
                            inspectIpText.onclick = () => {
                                clicks++;
                                if(clicks === 3) {
                                    clicks = 0;
                                    const pwd = prompt("SYSTEM OVERRIDE: Enter Admin Code");
                                    if(pwd === "5023") {
                                        alert("🔓 ACCESS GRANTED: Admin Mode Unlocked.");
                                        inspectIpText.style.color = "#ff4757"; 
                                    } else {
                                        alert("Access Denied.");
                                    }
                                }
                                setTimeout(() => clicks = 0, 2000);
                            };
                        };
                        hubList.appendChild(div);
                    });
                } else { hubList.innerHTML = '<p style="color:gray; font-size:12px; text-align:center;">No targets added.</p>'; }
            });
        }

        if(document.getElementById('closeInspectBtn')) {
            document.getElementById('closeInspectBtn').onclick = () => inspectModal.style.display = 'none';
        }

        const reqModal = document.getElementById('requestModal');
        let pendingReqSafeIp = null;
        let pendingReqRawIp = null;

        if(reqModal) {
            onChildAdded(ref(db, `users/${safeMyIp}/requests`), (data) => {
                if(data.val().status === 'pending') {
                    pendingReqSafeIp = data.key;
                    pendingReqRawIp = data.val().from;
                    document.getElementById('reqIp').innerText = pendingReqRawIp;
                    reqModal.style.display = 'flex';
                }
            });

            document.getElementById('declineBtn').onclick = () => {
                set(ref(db, `users/${safeMyIp}/requests/${pendingReqSafeIp}/status`), 'declined');
                reqModal.style.display = 'none';
            };

            document.getElementById('acceptBtn').onclick = () => {
                set(ref(db, `users/${safeMyIp}/requests/${pendingReqSafeIp}/status`), 'accepted');
                window.location.href = `join.html?target=${pendingReqRawIp}`;
            };
        }

        const canvas = document.getElementById('visualizer');
        if(canvas) {
            const ctx = canvas.getContext('2d');
            const resize = () => { canvas.width = canvas.parentElement.clientWidth; canvas.height = canvas.parentElement.clientHeight; };
            window.addEventListener('resize', resize); resize();
            function drawBgWave() {
                requestAnimationFrame(drawBgWave);
                ctx.fillStyle = 'rgba(10, 12, 16, 0.2)'; ctx.fillRect(0,0,canvas.width,canvas.height);
                for(let i=0; i<30; i++) {
                    const h = Math.random() * 50 + 10;
                    ctx.fillStyle = `rgba(0, 255, 204, ${Math.random()*0.5})`;
                    ctx.fillRect(i*(canvas.width/30), (canvas.height-h)/2, (canvas.width/30)-2, h);
                }
            }
            drawBgWave();
        }
    }

    // ==========================================
    // MODULE 2: JOIN / COMMUNICATION ROOM LOGIC
    // ==========================================
    else if(path.includes('join')) {
        const urlParams = new URLSearchParams(window.location.search);
        const targetIp = urlParams.get('target');
        if(!targetIp) { window.location.href = 'dashboard.html'; return; }
        
        const targetSafeIp = targetIp.replace(/\./g, '_');
        document.getElementById('targetIpTitle').innerText = targetIp;

        const sorted = [safeMyIp, targetSafeIp].sort();
        const roomId = `room_${sorted[0]}_${sorted[1]}`;

        // --- A. TEXT CHAT ---
        const chatBox = document.getElementById('chatBox');
        const chatInput = document.getElementById('chatInput');
        const sendChatBtn = document.getElementById('sendChatBtn');

        onChildAdded(ref(db, `chats/${roomId}`), (data) => {
            const msg = data.val();
            const isMine = msg.sender === myIp;
            const div = document.createElement('div');
            div.className = `chat-msg ${isMine ? 'msg-mine' : 'msg-theirs'}`;
            
            if(msg.type === 'text') {
                div.innerHTML = `<b>${isMine ? 'You' : msg.sender}:</b><br>${msg.text}`;
            } else if (msg.type === 'audio') {
                div.innerHTML = `<b>${isMine ? 'You' : msg.sender}:</b><br><audio controls class="audio-msg" src="${msg.url}"></audio>`;
            }
            
            chatBox.appendChild(div);
            chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
        });

        sendChatBtn.onclick = () => {
            if(chatInput.value.trim()) {
                push(ref(db, `chats/${roomId}`), { type: 'text', sender: myIp, text: chatInput.value });
                chatInput.value = '';
            }
        };

        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendChatBtn.click();
        });

        // --- B. HOLD TO TALK (AUDIO -> BASE64 -> FIREBASE DB) ---
        const pttBtn = document.getElementById('pttBtn');
        let mediaRecorder, audioChunks = [], isRecording = false;

        const startRecording = async (e) => {
            if(e) e.preventDefault();
            if(isRecording) return;
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                mediaRecorder.ondataavailable = e => { if(e.data.size > 0) audioChunks.push(e.data); };
                mediaRecorder.onstop = () => {
                    pttBtn.innerText = '⏳ Processing...'; pttBtn.style.color = 'gray';
                    const blob = new Blob(audioChunks, { type: 'audio/webm' }); // webm is lighter than wav
                    audioChunks = [];
                    
                    const reader = new FileReader();
                    reader.readAsDataURL(blob);
                    reader.onloadend = () => {
                        const base64Audio = reader.result;
                        push(ref(db, `chats/${roomId}`), { type: 'audio', sender: myIp, url: base64Audio })
                            .then(() => {
                                pttBtn.innerText = '🎤 Hold to Talk'; pttBtn.style.color = '#f39c12';
                            })
                            .catch((err) => {
                                console.error(err);
                                alert("Failed to send message.");
                                pttBtn.innerText = '🎤 Hold to Talk'; pttBtn.style.color = '#f39c12';
                            });
                        stream.getTracks().forEach(t => t.stop());
                    };
                };
                mediaRecorder.start(); isRecording = true;
                pttBtn.innerText = '🔴 Recording...'; pttBtn.style.background = 'rgba(243, 156, 18, 0.2)';
            } catch(err) { alert('Mic access required for Voice Notes.'); }
        };

        const stopRecording = (e) => {
            if(e) e.preventDefault();
            if(isRecording && mediaRecorder.state !== 'inactive') { 
                mediaRecorder.stop(); isRecording = false; pttBtn.style.background = 'transparent'; 
            }
        };

        pttBtn.addEventListener('mousedown', startRecording);
        pttBtn.addEventListener('touchstart', startRecording, {passive: false});
        window.addEventListener('mouseup', stopRecording);
        pttBtn.addEventListener('touchend', stopRecording, {passive: false});
        pttBtn.addEventListener('mouseleave', stopRecording);

        // --- C. WEBRTC LIVE CALL SIGNALING (AUDIO FIX IMPLEMENTED) ---
        const startCallBtn = document.getElementById('startCallBtn');
        const endCallBtn = document.getElementById('endCallBtn');
        const callStatus = document.getElementById('callStatus');
        const localAudio = document.getElementById('localAudio');
        const remoteAudio = document.getElementById('remoteAudio');
        
        // Essential mobile bypass tags
        remoteAudio.autoplay = true;
        remoteAudio.playsInline = true; 

        let peerConnection;
        let localStream;
        let pendingCandidates = [];
        const servers = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] };
        const callRef = ref(db, `calls/${roomId}`);

        async function initWebRTC() {
            // Echo cancellation and noise suppression enabled
            localStream = await navigator.mediaDevices.getUserMedia({ 
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, 
                video: false 
            });
            
            localAudio.srcObject = localStream;
            localAudio.muted = true; // IMPORTANT: Prevents hearing your own echo

            peerConnection = new RTCPeerConnection(servers);
            localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
            
            peerConnection.ontrack = (event) => { 
                console.log("Remote track received!");
                if (remoteAudio.srcObject !== event.streams[0]) {
                    remoteAudio.srcObject = event.streams[0];
                    remoteAudio.muted = false; // Force unmute
                    remoteAudio.volume = 1.0;  // Force max volume
                    
                    // Force playback to bypass browser restrictions
                    remoteAudio.play().then(() => {
                        console.log("Audio playing successfully.");
                    }).catch(e => {
                        console.error("Browser blocked auto-play:", e);
                        // Fallback user interaction trick
                        const forcePlayBtn = document.createElement('button');
                        forcePlayBtn.innerText = "🔇 Tap to Unmute Call";
                        forcePlayBtn.className = "btn primary full-width";
                        forcePlayBtn.style.background = "#ff4757";
                        forcePlayBtn.onclick = () => { remoteAudio.play(); forcePlayBtn.remove(); };
                        document.getElementById('chatBox').appendChild(forcePlayBtn);
                    });
                }
            };
            
            peerConnection.onicecandidate = (event) => {
                if (event.candidate) { push(ref(db, `calls/${roomId}/candidates/${safeMyIp}`), event.candidate.toJSON()); }
            };
            startCallVisualizer(localStream); 
        }

        // Caller Side
        startCallBtn.onclick = async () => {
            startCallBtn.style.display = 'none'; endCallBtn.style.display = 'block';
            callStatus.innerText = "Calling..."; callStatus.style.color = "#f39c12";
            
            // Clean up old call data before starting new one
            await remove(callRef);
            
            await initWebRTC();
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            await set(ref(db, `calls/${roomId}/offer`), { type: offer.type, sdp: offer.sdp, from: safeMyIp });
        };

        // Receiver Side (Handling Offer)
        onValue(ref(db, `calls/${roomId}/offer`), async (snap) => {
            if(snap.exists() && snap.val().from !== safeMyIp) {
                const offer = snap.val();
                startCallBtn.style.display = 'none'; endCallBtn.style.display = 'block';
                callStatus.innerText = "Connecting... (Auto-Answer)"; callStatus.style.color = "#00ffcc";
                
                await initWebRTC();
                await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                await set(ref(db, `calls/${roomId}/answer`), { type: answer.type, sdp: answer.sdp, from: safeMyIp });
                callStatus.innerText = "Call Connected 🟢";
                
                pendingCandidates.forEach(c => peerConnection.addIceCandidate(new RTCIceCandidate(c)));
                pendingCandidates = [];
            }
        });

        // Caller Side (Handling Answer)
        onValue(ref(db, `calls/${roomId}/answer`), async (snap) => {
            if(snap.exists() && snap.val().from !== safeMyIp && peerConnection) {
                const answer = snap.val();
                if(!peerConnection.currentRemoteDescription) {
                    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
                    callStatus.innerText = "Call Connected 🟢"; callStatus.style.color = "#00ffcc";
                    
                    pendingCandidates.forEach(c => peerConnection.addIceCandidate(new RTCIceCandidate(c)));
                    pendingCandidates = [];
                }
            }
        });

        // ICE Candidate Sync
        onChildAdded(ref(db, `calls/${roomId}/candidates`), (snap) => {
            if(snap.key !== safeMyIp) {
                snap.forEach(child => {
                    const candidate = new RTCIceCandidate(child.val());
                    if(peerConnection && peerConnection.remoteDescription) {
                        peerConnection.addIceCandidate(candidate).catch(e => console.log("ICE Error:", e));
                    } else {
                        pendingCandidates.push(candidate);
                    }
                });
            }
        });

        // Hang Up Logic
        const hangUpCall = () => {
            if(peerConnection) peerConnection.close();
            if(localStream) localStream.getTracks().forEach(t => t.stop());
            remove(callRef); 
            startCallBtn.style.display = 'block'; endCallBtn.style.display = 'none';
            callStatus.innerText = "Standby..."; callStatus.style.color = "gray";
            const ctx = document.getElementById('liveCallVisualizer').getContext('2d');
            ctx.clearRect(0,0, 300, 300);
        };

        endCallBtn.onclick = hangUpCall;

        onValue(callRef, (snap) => {
            if(!snap.exists() && endCallBtn.style.display === 'block') {
                if(peerConnection) peerConnection.close();
                if(localStream) localStream.getTracks().forEach(t => t.stop());
                startCallBtn.style.display = 'block'; endCallBtn.style.display = 'none';
                callStatus.innerText = "Call Ended by remote node."; callStatus.style.color = "gray";
                const ctx = document.getElementById('liveCallVisualizer').getContext('2d');
                ctx.clearRect(0,0, 300, 300);
            }
        });

        function startCallVisualizer(stream) {
            const canvas = document.getElementById('liveCallVisualizer');
            const ctx = canvas.getContext('2d');
            canvas.width = canvas.parentElement.clientWidth; canvas.height = canvas.parentElement.clientHeight;
            
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const analyser = audioCtx.createAnalyser();
            audioCtx.createMediaStreamSource(stream).connect(analyser);
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            
            function draw() {
                if(endCallBtn.style.display === 'none') return; 
                requestAnimationFrame(draw);
                analyser.getByteFrequencyData(dataArray);
                ctx.fillStyle = '#000'; ctx.fillRect(0,0,canvas.width,canvas.height);
                
                let sum = 0; for(let i=0; i<dataArray.length; i++) sum += dataArray[i];
                let avg = sum / dataArray.length;
                
                ctx.beginPath();
                ctx.arc(canvas.width/2, canvas.height/2, 20 + avg, 0, 2*Math.PI);
                ctx.fillStyle = `rgba(0, 255, 204, ${avg/100})`;
                ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#00ffcc'; ctx.stroke();
            }
            draw();
        }
    }

    // ==========================================
    // MODULE 3: SETTINGS LOGIC
    // ==========================================
    else if(path.includes('settings')) {
        document.getElementById('deleteDataBtn').addEventListener('click', () => {
            if(confirm("DANGER: This deletes your IP node and resets storage. Proceed?")) {
                localStorage.removeItem('sonic_user_ip');
                window.location.href = 'index.html';
            }
        });
    }
});
