"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Monitor,
  MonitorOff,
  PhoneOff,
  Maximize2,
  Minimize2,
  MessageSquare,
  X,
  Send,
  Loader2,
  Copy,
  Check,
  ShieldCheck,
  AlertCircle,
  Users,
} from "lucide-react";

interface NativeWebRtcRoomProps {
  roomName: string;
  roomUrl?: string;
  displayName?: string;
  isAdmin?: boolean;
  onLeave?: () => void;
}

interface ChatMessage {
  id: string;
  senderName: string;
  text: string;
  time: string;
  isMe: boolean;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
  iceCandidatePoolSize: 10,
};

export function NativeWebRtcRoom({
  roomName,
  displayName,
  isAdmin = false,
  onLeave,
}: NativeWebRtcRoomProps) {
  const cleanRoom = (roomName || "questedge-room").toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  const senderRole = isAdmin ? "interviewer" : "candidate";
  const myName = displayName || (isAdmin ? "Interviewer" : "Candidate");

  // Media state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Connection state
  const [connectionStatus, setConnectionStatus] = useState<
    "initializing" | "waiting" | "connecting" | "connected" | "disconnected" | "error"
  >("initializing");
  const [remoteParticipantName, setRemoteParticipantName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Chat & UI state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // WebRTC refs
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastSeqRef = useRef<number>(0);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const isInitiatorRef = useRef<boolean>(isAdmin);
  const hasOfferedRef = useRef<boolean>(false);
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  // Ensure remote video element plays whenever remoteStream updates
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  // Ensure local video element plays whenever localStream updates
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream]);

  // 1. Send signal helper
  const sendSignal = useCallback(
    async (type: string, payload: any) => {
      try {
        await fetch(`/api/v2/assessment-take/video/${cleanRoom}/signal`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sender: senderRole,
            type,
            payload,
          }),
        });
      } catch (err) {
        console.warn("[WebRTC] Signal send error:", err);
      }
    },
    [cleanRoom, senderRole]
  );

  // 2. Initialize PeerConnection
  const createPeerConnection = useCallback(() => {
    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    // Attach local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Remote track listener - robust unified plan handling
    pc.ontrack = (event) => {
      let stream = event.streams && event.streams[0];
      if (!stream) {
        if (!remoteStreamRef.current) {
          remoteStreamRef.current = new MediaStream();
        }
        remoteStreamRef.current.addTrack(event.track);
        stream = remoteStreamRef.current;
      } else {
        remoteStreamRef.current = stream;
      }
      setRemoteStream(stream);
      setConnectionStatus("connected");
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        remoteVideoRef.current.play().catch(() => {});
      }
    };

    // ICE Candidate handler with batching to avoid request flooding
    const candidateQueue: any[] = [];
    let candidateTimer: NodeJS.Timeout | null = null;

    pc.onicecandidate = (event) => {
      if (event.candidate && event.candidate.candidate) {
        candidateQueue.push(event.candidate.toJSON());
        if (candidateTimer) clearTimeout(candidateTimer);
        candidateTimer = setTimeout(() => {
          if (candidateQueue.length > 0) {
            const batch = [...candidateQueue];
            candidateQueue.length = 0;
            sendSignal("candidates", batch);
          }
        }, 120);
      }
    };

    // Connection state listeners
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === "connected") {
        setConnectionStatus("connected");
      } else if (state === "connecting") {
        setConnectionStatus((curr) => (curr === "connected" ? "connected" : "connecting"));
      } else if (state === "disconnected" || state === "closed") {
        setConnectionStatus("disconnected");
      } else if (state === "failed") {
        pc.restartIce();
      }
    };

    pc.oniceconnectionstatechange = () => {
      const iceState = pc.iceConnectionState;
      if (iceState === "connected" || iceState === "completed") {
        setConnectionStatus("connected");
      } else if (iceState === "failed") {
        pc.restartIce();
      }
    };

    return pc;
  }, [sendSignal]);

  // 3. Initiate Offer (Caller)
  const makeOffer = useCallback(
    async (force = false) => {
      const pc = pcRef.current;
      if (!pc) return;
      if (hasOfferedRef.current && !force) return;
      try {
        hasOfferedRef.current = true;
        setConnectionStatus("connecting");
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await pc.setLocalDescription(offer);
        await sendSignal("offer", { sdp: offer.sdp, type: offer.type, name: myName });
      } catch (err: any) {
        console.error("[WebRTC] Failed to create offer:", err);
        hasOfferedRef.current = false;
      }
    },
    [sendSignal, myName]
  );

  // 4. Handle Received Signals
  const handleSignalMessage = useCallback(
    async (msg: { type: string; payload: any; sender: string }) => {
      let pc = pcRef.current;
      if (!pc) {
        pc = createPeerConnection();
      }

      switch (msg.type) {
        case "ready": {
          if (msg.payload?.name) {
            setRemoteParticipantName(msg.payload.name);
          }
          if (isInitiatorRef.current) {
            // Fresh offer for the newly connected peer
            await makeOffer(true);
          } else {
            // Echo ready back
            sendSignal("ready", { name: myName });
          }
          break;
        }

        case "offer": {
          if (isInitiatorRef.current) return; // Only candidate processes offer
          try {
            if (msg.payload?.name) setRemoteParticipantName(msg.payload.name);
            setConnectionStatus("connecting");
            await pc.setRemoteDescription(new RTCSessionDescription(msg.payload));

            // Drain any pending ICE candidates
            while (pendingCandidatesRef.current.length > 0) {
              const cand = pendingCandidatesRef.current.shift();
              if (cand) await pc.addIceCandidate(new RTCIceCandidate(cand));
            }

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await sendSignal("answer", { sdp: answer.sdp, type: answer.type, name: myName });
          } catch (err) {
            console.error("[WebRTC] Failed to handle offer:", err);
          }
          break;
        }

        case "answer": {
          if (!isInitiatorRef.current) return;
          try {
            if (msg.payload?.name) setRemoteParticipantName(msg.payload.name);
            if (pc.signalingState === "have-local-offer") {
              await pc.setRemoteDescription(new RTCSessionDescription(msg.payload));
              while (pendingCandidatesRef.current.length > 0) {
                const cand = pendingCandidatesRef.current.shift();
                if (cand) await pc.addIceCandidate(new RTCIceCandidate(cand));
              }
            }
          } catch (err) {
            console.error("[WebRTC] Failed to handle answer:", err);
          }
          break;
        }

        case "candidates":
        case "candidate": {
          const list = Array.isArray(msg.payload) ? msg.payload : [msg.payload];
          for (const item of list) {
            if (!item || !item.candidate) continue;
            try {
              const cand = new RTCIceCandidate(item);
              if (pc.remoteDescription && pc.remoteDescription.type) {
                await pc.addIceCandidate(cand);
              } else {
                pendingCandidatesRef.current.push(item);
              }
            } catch (err) {
              // Silently skip duplicate or invalid candidates
            }
          }
          break;
        }

        case "chat": {
          const chatData = msg.payload;
          setChatMessages((prev) => [
            ...prev,
            {
              id: `${Date.now()}_${Math.random()}`,
              senderName: chatData.senderName || "Guest",
              text: chatData.text,
              time: chatData.time || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              isMe: false,
            },
          ]);
          if (!isChatOpen) {
            setUnreadCount((c) => c + 1);
          }
          break;
        }

        case "bye": {
          setConnectionStatus("disconnected");
          setRemoteStream(null);
          remoteStreamRef.current = null;
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
          }
          hasOfferedRef.current = false;
          break;
        }
      }
    },
    [createPeerConnection, isChatOpen, makeOffer, myName, sendSignal]
  );

  // 5. Polling signaling server
  useEffect(() => {
    let isCancelled = false;
    let backoffCount = 0;

    const pollSignals = async () => {
      if (isCancelled) return;
      if (backoffCount > 0) {
        backoffCount--;
        return;
      }
      try {
        const res = await fetch(
          `/api/v2/assessment-take/video/${cleanRoom}/signal?sender=${senderRole}&since=${lastSeqRef.current}`
        );
        if (res.status === 429) {
          // If server throttled, back off for 2 ticks to cool down
          backoffCount = 2;
          return;
        }
        if (res.ok) {
          const data = await res.json();
          if (data.messages && Array.isArray(data.messages)) {
            for (const msg of data.messages) {
              if (msg.id > lastSeqRef.current) {
                lastSeqRef.current = msg.id;
              }
              await handleSignalMessage(msg);
            }
          }
        }
      } catch (err) {
        // Silently retry
      }
    };

    const intervalMs = connectionStatus === "connected" ? 3500 : 1200;
    pollingTimerRef.current = setInterval(pollSignals, intervalMs);

    return () => {
      isCancelled = true;
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    };
  }, [cleanRoom, connectionStatus, handleSignalMessage, senderRole]);

  // 6. Acquire Local Camera and Mic
  useEffect(() => {
    let stream: MediaStream | null = null;

    async function startMedia() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        localStreamRef.current = stream;
        setLocalStream(stream);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }

        // Initialize PeerConnection with local tracks
        createPeerConnection();

        // Announce presence
        setConnectionStatus("waiting");
        sendSignal("ready", { name: myName });

        // If interviewer, wait 800ms then make initial offer
        if (isInitiatorRef.current) {
          setTimeout(() => {
            makeOffer();
          }, 800);
        }
      } catch (err: any) {
        console.error("[WebRTC] Media access error:", err);
        setErrorMessage(
          err.name === "NotAllowedError"
            ? "Camera and microphone access was denied. Please allow permissions in your browser bar."
            : "Could not access camera/microphone: " + err.message
        );
        setConnectionStatus("error");
      }
    }

    startMedia();

    return () => {
      sendSignal("bye", {});
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
    };
  }, [createPeerConnection, makeOffer, myName, sendSignal]);

  // Toggle Mute Audio
  const toggleMute = () => {
    if (!localStream) return;
    const newMuted = !isMuted;
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = !newMuted;
    });
    setIsMuted(newMuted);
  };

  // Toggle Video / Camera
  const toggleVideo = () => {
    if (!localStream) return;
    const newVideoOff = !isVideoOff;
    localStream.getVideoTracks().forEach((track) => {
      track.enabled = !newVideoOff;
    });
    setIsVideoOff(newVideoOff);
  };

  // Toggle Screen Sharing
  const toggleScreenShare = async () => {
    const pc = pcRef.current;
    if (!pc || !localStream) return;

    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
        const screenTrack = screenStream.getVideoTracks()[0];

        const videoSender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (videoSender) {
          await videoSender.replaceTrack(screenTrack);
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
          localVideoRef.current.play().catch(() => {});
        }

        screenTrack.onended = () => {
          revertToCamera();
        };

        setIsScreenSharing(true);
      } catch (err) {
        console.warn("[WebRTC] Screen share cancelled or failed:", err);
      }
    } else {
      revertToCamera();
    }
  };

  const revertToCamera = async () => {
    const pc = pcRef.current;
    if (!pc || !localStream) return;

    const cameraTrack = localStream.getVideoTracks()[0];
    const videoSender = pc.getSenders().find((s) => s.track?.kind === "video");
    if (videoSender && cameraTrack) {
      await videoSender.replaceTrack(cameraTrack);
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    }
    setIsScreenSharing(false);
  };

  // Send In-Call Chat Message
  const sendChatMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const textToSend = inputText.trim();

    sendSignal("chat", {
      senderName: myName,
      text: textToSend,
      time: timeStr,
    });

    setChatMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}_me`,
        senderName: myName,
        text: textToSend,
        time: timeStr,
        isMe: true,
      },
    ]);

    setInputText("");
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const copyCandidateLink = () => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex-1 min-h-[520px] bg-slate-950 rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-slate-800 select-none"
    >
      {/* ── Top Bar Status Badges ──────────────────────────────── */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          {connectionStatus === "connected" ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 backdrop-blur-md border border-slate-700/60 text-[11px] text-emerald-400 font-semibold shadow-lg">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              HD P2P Encrypted • Live
            </div>
          ) : connectionStatus === "connecting" ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 backdrop-blur-md border border-sky-700/60 text-[11px] text-sky-400 font-semibold shadow-lg">
              <Loader2 className="h-3 w-3 animate-spin text-sky-400" />
              Establishing Peer Connection...
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 backdrop-blur-md border border-amber-600/60 text-[11px] text-amber-300 font-semibold shadow-lg">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
              Waiting for {isAdmin ? "Candidate" : "Interviewer"}...
            </div>
          )}
        </div>

        {remoteParticipantName && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-800 text-xs text-slate-300 font-medium">
            <Users className="h-3.5 w-3.5 text-indigo-400" />
            {remoteParticipantName}
          </div>
        )}
      </div>

      {/* ── Main Video Area (Remote or Waiting Radar) ──────────── */}
      <div className="relative flex-1 w-full h-full bg-slate-950 flex items-center justify-center overflow-hidden">
        {/* Remote Video element */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            connectionStatus === "connected" ? "opacity-100" : "opacity-0 absolute pointer-events-none"
          }`}
        />

        {/* Waiting / Radar Screen */}
        {connectionStatus !== "connected" && connectionStatus !== "error" && (
          <div className="flex flex-col items-center justify-center p-8 text-center max-w-sm space-y-5 z-10">
            <div className="relative flex items-center justify-center">
              <div className="absolute h-24 w-24 rounded-full bg-sky-500/10 animate-ping" />
              <div className="h-20 w-20 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center shadow-xl shadow-sky-600/30">
                <VideoIcon className="h-9 w-9" />
              </div>
            </div>

            <div>
              <h3 className="text-white font-bold text-lg">
                {connectionStatus === "connecting"
                  ? "Connecting to Peer..."
                  : isAdmin
                  ? "Waiting for Candidate to Join"
                  : "Waiting for Interviewer..."}
              </h3>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                {isAdmin
                  ? "Share the interview link with the candidate. As soon as they open it, you will connect automatically."
                  : "The interviewer has been notified. Please make sure your camera and microphone are ready."}
              </p>
            </div>

            {isAdmin && (
              <button
                onClick={copyCandidateLink}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sky-400 text-xs font-semibold rounded-xl shadow transition-colors"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Link Copied!" : "Copy Candidate Link"}
              </button>
            )}
          </div>
        )}

        {/* Error Overlay */}
        {connectionStatus === "error" && (
          <div className="flex flex-col items-center justify-center p-8 text-center max-w-md space-y-4 z-10">
            <div className="h-14 w-14 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <AlertCircle className="h-8 w-8" />
            </div>
            <h3 className="text-white font-bold text-lg">Hardware Access Error</h3>
            <p className="text-slate-400 text-xs leading-relaxed">{errorMessage}</p>
          </div>
        )}

        {/* ── Picture-in-Picture Local Video ──────────────────── */}
        <div className="absolute bottom-20 right-4 z-20 w-40 sm:w-48 aspect-video rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-700/80 bg-slate-900 group">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transition-opacity ${
              isVideoOff ? "opacity-0" : "opacity-100"
            }`}
            style={{ transform: isScreenSharing ? "none" : "scaleX(-1)" }}
          />
          {isVideoOff && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-slate-400 text-xs space-y-1">
              <VideoOff className="h-6 w-6 text-slate-500" />
              <span className="text-[10px]">Camera Off</span>
            </div>
          )}
          <div className="absolute bottom-1.5 left-2 px-2 py-0.5 rounded bg-slate-950/80 backdrop-blur-md text-[10px] text-slate-200 font-semibold truncate max-w-[120px]">
            {myName} (You)
          </div>
        </div>

        {/* ── Sliding Chat Drawer ─────────────────────────────── */}
        {isChatOpen && (
          <div className="absolute top-0 right-0 bottom-16 w-80 max-w-full bg-slate-900/95 backdrop-blur-xl border-l border-slate-800 z-30 flex flex-col shadow-2xl">
            {/* Header */}
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-xs">
                <MessageSquare className="h-4 w-4 text-sky-400" />
                In-Call Meeting Chat
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs">
              {chatMessages.length === 0 ? (
                <div className="text-center text-slate-500 pt-10 text-[11px]">
                  No messages yet. Send a link, code snippet, or note to everyone in the room.
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.isMe ? "items-end" : "items-start"}`}
                  >
                    <div className="text-[10px] text-slate-400 mb-0.5 px-1">
                      {msg.isMe ? "You" : msg.senderName} • {msg.time}
                    </div>
                    <div
                      className={`px-3 py-2 rounded-2xl max-w-[85%] break-words leading-relaxed ${
                        msg.isMe
                          ? "bg-sky-600 text-white rounded-br-none"
                          : "bg-slate-800 text-slate-200 rounded-bl-none"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input */}
            <form onSubmit={sendChatMessage} className="p-3 border-t border-slate-800 flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="p-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white rounded-xl transition-all"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* ── Floating Controls Bar ──────────────────────────────── */}
      <div className="h-16 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 flex items-center justify-between px-4 sm:px-6 z-20">
        {/* Left: Branding & Status */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span className="font-semibold text-slate-300">QuestEdge WebRTC</span>
        </div>

        {/* Center: Controls Pill */}
        <div className="flex items-center gap-2 mx-auto">
          {/* Mute Mic */}
          <button
            onClick={toggleMute}
            title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
            className={`p-3 rounded-2xl transition-all shadow-md ${
              isMuted
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30"
                : "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700/60"
            }`}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>

          {/* Video Toggle */}
          <button
            onClick={toggleVideo}
            title={isVideoOff ? "Turn Camera On" : "Turn Camera Off"}
            className={`p-3 rounded-2xl transition-all shadow-md ${
              isVideoOff
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30"
                : "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700/60"
            }`}
          >
            {isVideoOff ? <VideoOff className="h-5 w-5" /> : <VideoIcon className="h-5 w-5" />}
          </button>

          {/* Screen Share */}
          <button
            onClick={toggleScreenShare}
            title={isScreenSharing ? "Stop Sharing Screen" : "Share Screen"}
            className={`p-3 rounded-2xl transition-all shadow-md ${
              isScreenSharing
                ? "bg-sky-500 text-white shadow-sky-500/30 hover:bg-sky-600"
                : "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700/60"
            }`}
          >
            {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
          </button>

          {/* Chat Toggle */}
          <button
            onClick={() => {
              setIsChatOpen(!isChatOpen);
              setUnreadCount(0);
            }}
            title="Meeting Chat"
            className="relative p-3 rounded-2xl bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700/60 transition-all shadow-md"
          >
            <MessageSquare className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-sky-500 text-white font-bold text-[10px] flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            className="p-3 rounded-2xl bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700/60 transition-all shadow-md hidden sm:block"
          >
            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </button>

          {/* Leave Call */}
          <button
            onClick={() => {
              sendSignal("bye", {});
              if (onLeave) onLeave();
            }}
            title="Leave Interview"
            className="p-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-lg shadow-rose-600/30 flex items-center gap-2"
          >
            <PhoneOff className="h-5 w-5" />
            <span className="text-xs font-bold hidden sm:inline">Leave</span>
          </button>
        </div>

        {/* Right: Security Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span>Peer-to-Peer</span>
        </div>
      </div>
    </div>
  );
}
