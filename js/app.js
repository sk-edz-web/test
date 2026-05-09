import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, onValue, set, onChildAdded, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// TODO: PASTE YOUR FIREBASE CONFIG HERE
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
const storage = getStorage(app);

document.addEventListener('DOMContentLoaded', () => {
    
    const myIp = localStorage.getItem('sonic_user_ip');
    if(!myIp && !window.location.pathname.includes('index')) { window.location.href = 'index.html'; return; }
    const safeMyIp = myIp ? myIp.replace(/\./g, '_') : '';
    
    const path = window.location.pathname;

    // ==========================================
    // MODULE 1: DASHBOARD LOGIC
    // ==========================================
    if(path.includes('dashboard') || path === '/' || path === '') {
        document.getElementById('myIpDisplay').innerText = myIp;

        // 1. Connection Hub Add Target
        document.getElementById('toggleAddIp').addEventListener('click', () => {
            const box = document.getElementById('addIpBox');
            box.style.display = box.style.display === 'none' ? 'block' : 'none';
        });

        document.getElementById('saveIpBtn').addEventListener('click', () => {
            const targetIp = document.getElementById('targetIpInput').value.trim();
            if(targetIp) {
                set(push(ref(db, `users/${safeMyIp}/hub`)), { ip: targetIp });
                document.getElementById('targetIpInput').value = '';
                document.getElementById('addIpBox').style.display = 'none';
            }
        });

        // 2. Render Hub & Interactions
        const hubList = document.getElementById('hubList');
        const inspectModal = document.getElementById('inspectModal');
        const inspectIpText = document.getElementById('inspectIpText');
        
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
                    
                    // JOIN LOGIC
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

                    // INSPECT EASTER EGG LOGIC
                    div.querySelector('.inspectBtn').onclick = () => {
                        inspectIpText.innerText = data.ip;
                        inspectModal.style.display = 'flex';
                        
                        // Easter Egg logic
                        let clicks = 0;
                        inspectIpText.onclick = () => {
                            clicks++;
                            if(clicks === 3) {
                                clicks = 0;
                                const pwd = prompt("SYSTEM OVERRIDE: Enter Admin Code");
                                if(pwd === "5023") {
                                    alert("🔓 ACCESS GRANTED: Admin Mode Unlocked.");
                                    inspectIpText.style.color = "#ff4757"; // Turns red on hack
                                } else {
                                    alert("Access Denied.");
                                }
                            }
                            // Reset clicks after 2 seconds
                            setTimeout(() => clicks = 0, 2000);
                        };
                    };
                    hubList.appendChild(div);
                });
            } else { hubList.innerHTML = '<p style="color:gray; font-size:12px; text-align:center;">No targets added.</p>'; }
        });

        document.getElementById('closeInspectBtn').onclick = () => inspectModal.style.display = 'none';

        // 3. Incoming Request Logic
        const reqModal = document.getElementById('requestModal');
        let pendingReqSafeIp = null;
        let pendingReqRawIp = null;

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

        // Dashboard Background Visualizer (Dummy aesthetic)
        const canvas = document.getElementById('visualizer');
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

    // ==========================================
    // MODULE 2: JOIN / COMMUNICATION ROOM LOGIC
    // ==========================================
    else if(path.includes('join')) {
        const urlParams = new URLSearchParams(window.location.search);
        const targetIp = urlParams.get('target');
        if(!targetIp) { window.location.href = 'dashboard.html'; return; }
        
        const targetSafeIp = targetIp.replace(/\./g, '_');
        document.getElementById('targetIpTitle').innerText = targetIp;

        // Unique Room ID based on IPs sorted
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
            chatBox.scrollTop = chatBox.scrollHeight;
        });

        sendChatBtn.onclick = () => {
            if(chatInput.value.trim()) {
                push(ref(db, `chats/${roomId}`), { type: 'text', sender: myIp, text: chatInput.value });
                chatInput.value = '';
            }
        };

        // --- B. HOLD TO TALK (VOICE MESSAGE) ---
        const pttBtn = document.getElementById('pttBtn');
        let mediaRecorder, audioChunks = [], isRecording = false;

        pttBtn.addEventListener('mousedown', async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                mediaRecorder.ondataavailable = e => { if(e.data.size > 0) audioChunks.push(e.data); };
                mediaRecorder.onstop = async () => {
                    pttBtn.innerText = '⏳ Sending...'; pttBtn.style.color = 'gray';
                    const blob = new Blob(audioChunks, { type: 'audio/wav' }); audioChunks = [];
                    const sRef = storageRef(storage, `voice_msgs/${roomId}/${Date.now()}.wav`);
                    await uploadBytes(sRef, blob);
                    const url = await getDownloadURL(sRef);
                    push(ref(db, `chats/${roomId}`), { type: 'audio', sender: myIp, url: url });
                    pttBtn.innerText = '🎤 Hold to Talk'; pttBtn.style.color = '#f39c12';
                    stream.getTracks().forEach(t => t.stop());
                };
                mediaRecorder.start(); isRecording = true;
                pttBtn.innerText = '🔴 Recording...'; pttBtn.style.background = 'rgba(243, 156, 18, 0.2)';
            } catch(err) { alert('Mic access required for Voice Notes.'); }
        });

        pttBtn.addEventListener('mouseup', () => {
            if(isRecording) { mediaRecorder.stop(); isRecording = false; pttBtn.style.background = 'transparent'; }
        });

        // --- C. WEBRTC LIVE CALL SIGNALING ---
        const startCallBtn = document.getElementById('startCallBtn');
        const endCallBtn = document.getElementById('endCallBtn');
        const callStatus = document.getElementById('callStatus');
        const localAudio = document.getElementById('localAudio');
        const remoteAudio = document.getElementById('remoteAudio');
        
        let peerConnection;
        let localStream;
        const servers = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
        const callRef = ref(db, `calls/${roomId}`);

        async function initWebRTC() {
            localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            localAudio.srcObject = localStream;
            peerConnection = new RTCPeerConnection(servers);
            
            localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
            peerConnection.ontrack = (event) => { remoteAudio.srcObject = event.streams[0]; };
            
            peerConnection.onicecandidate = (event) => {
                if (event.candidate) { push(ref(db, `calls/${roomId}/candidates/${safeMyIp}`), event.candidate.toJSON()); }
            };
            startCallVisualizer(localStream); // Start visuals
        }

        // Caller clicks "Start Call"
        startCallBtn.onclick = async () => {
            startCallBtn.style.display = 'none'; endCallBtn.style.display = 'block';
            callStatus.innerText = "Calling..."; callStatus.style.color = "#f39c12";
            await initWebRTC();
            
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            await set(ref(db, `calls/${roomId}/offer`), { type: offer.type, sdp: offer.sdp, from: safeMyIp });
        };

        // Listen for Offers (Receiver logic)
        onValue(ref(db, `calls/${roomId}/offer`), async (snap) => {
            if(snap.exists() && snap.val().from !== safeMyIp) {
                const offer = snap.val();
                startCallBtn.style.display = 'none'; endCallBtn.style.display = 'block';
                callStatus.innerText = "Incoming Call... Auto-Answering..."; callStatus.style.color = "#00ffcc";
                
                await initWebRTC();
                await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                await set(ref(db, `calls/${roomId}/answer`), { type: answer.type, sdp: answer.sdp, from: safeMyIp });
                callStatus.innerText = "Call Connected 🟢";
            }
        });

        // Listen for Answers (Caller logic)
        onValue(ref(db, `calls/${roomId}/answer`), async (snap) => {
            if(snap.exists() && snap.val().from !== safeMyIp && peerConnection) {
                const answer = snap.val();
                if(!peerConnection.currentRemoteDescription) {
                    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
                    callStatus.innerText = "Call Connected 🟢"; callStatus.style.color = "#00ffcc";
                }
            }
        });

        // Listen for ICE Candidates
        onChildAdded(ref(db, `calls/${roomId}/candidates`), (snap) => {
            if(snap.key !== safeMyIp && peerConnection) {
                snap.forEach(candidateSnap => {
                    peerConnection.addIceCandidate(new RTCIceCandidate(candidateSnap.val()));
                });
            }
        });

        // Hang Up
        endCallBtn.onclick = () => {
            if(peerConnection) peerConnection.close();
            if(localStream) localStream.getTracks().forEach(t => t.stop());
            remove(callRef); // Clear call data in DB
            startCallBtn.style.display = 'block'; endCallBtn.style.display = 'none';
            callStatus.innerText = "Standby..."; callStatus.style.color = "gray";
        };

        // Delete call data if someone else deletes it (remote hangup)
        onValue(callRef, (snap) => {
            if(!snap.exists() && endCallBtn.style.display === 'block') {
                if(peerConnection) peerConnection.close();
                if(localStream) localStream.getTracks().forEach(t => t.stop());
                startCallBtn.style.display = 'block'; endCallBtn.style.display = 'none';
                callStatus.innerText = "Call Ended."; callStatus.style.color = "gray";
            }
        });

        // Call Visualizer
        function startCallVisualizer(stream) {
            const canvas = document.getElementById('liveCallVisualizer');
            const ctx = canvas.getContext('2d');
            canvas.width = canvas.parentElement.clientWidth; canvas.height = canvas.parentElement.clientHeight;
            
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const analyser = audioCtx.createAnalyser();
            audioCtx.createMediaStreamSource(stream).connect(analyser);
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            
            function draw() {
                if(endCallBtn.style.display === 'none') return; // Stop if call ends
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