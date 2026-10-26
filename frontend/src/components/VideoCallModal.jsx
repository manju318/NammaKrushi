import React, { useState, useEffect, useRef } from 'react';
import { callService } from '../services/callService';
import {
  Video,
  Mic,
  MicOff,
  VideoOff,
  PhoneOff,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Maximize2
} from 'lucide-react';

export default function VideoCallModal({ session, currentUser, onClose }) {
  const [callStatus, setCallStatus] = useState(session?.status || 'connecting');
  const [micMuted, setMicMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [iceServers, setIceServers] = useState([
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnRef = useRef(null);
  const localStreamRef = useRef(null);
  const pollTimerRef = useRef(null);

  const isFarmer = currentUser?.role === 'farmer' || session?.farmer_id === currentUser?.id;
  const otherPartyName = isFarmer ? session?.buyer_name : session?.farmer_name;

  useEffect(() => {
    let isMounted = true;

    const startWebRTC = async () => {
      try {
        // Fetch STUN config
        const cfgRes = await callService.getWebRTCConfig();
        if (cfgRes.success && cfgRes.data.iceServers) {
          setIceServers(cfgRes.data.iceServers);
        }

        // Request camera and microphone stream
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (!isMounted) return;

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Initialize RTCPeerConnection
        const pc = new RTCPeerConnection({
          iceServers: cfgRes.data?.iceServers || iceServers,
        });
        peerConnRef.current = pc;

        // Add local tracks to peer connection
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        // Handle remote stream
        pc.ontrack = (event) => {
          if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

        // Handle local ICE candidates
        pc.onicecandidate = async (event) => {
          if (event.candidate) {
            try {
              await callService.sendSignal(session.session_id, {
                ice_candidate: event.candidate.toJSON(),
              });
            } catch (err) {
              console.error('Failed to send ICE candidate:', err);
            }
          }
        };

        pc.onconnectionstatechange = () => {
          if (isMounted) {
            if (pc.connectionState === 'connected') {
              setCallStatus('in_progress');
            } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
              setCallStatus('disconnected');
            }
          }
        };

        // If Buyer (Caller): Create SDP Offer
        if (!isFarmer) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await callService.sendSignal(session.session_id, {
            sdp_offer: offer.sdp,
          });
        }

        // Signaling Polling Loop
        pollTimerRef.current = setInterval(async () => {
          try {
            const pollRes = await callService.pollCall(session.session_id);
            if (!pollRes.success) return;
            const currentSession = pollRes.data.session;

            if (currentSession.status === 'ended' || currentSession.status === 'declined') {
              setCallStatus(currentSession.status);
              clearInterval(pollTimerRef.current);
              return;
            }

            // Farmer received offer: generate answer
            if (isFarmer && currentSession.sdp_offer && !pc.currentRemoteDescription) {
              await pc.setRemoteDescription(
                new RTCSessionDescription({ type: 'offer', sdp: currentSession.sdp_offer })
              );
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              await callService.sendSignal(session.session_id, { sdp_answer: answer.sdp });
              setCallStatus('in_progress');
            }

            // Buyer received answer: set remote description
            if (!isFarmer && currentSession.sdp_answer && !pc.currentRemoteDescription) {
              await pc.setRemoteDescription(
                new RTCSessionDescription({ type: 'answer', sdp: currentSession.sdp_answer })
              );
              setCallStatus('in_progress');
            }

            // Apply ICE candidates
            if (currentSession.ice_candidates && currentSession.ice_candidates.length > 0) {
              for (const cand of currentSession.ice_candidates) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(cand));
                } catch (e) {
                  // candidate may already be added
                }
              }
            }
          } catch (e) {
            console.error('Signaling poll error:', e);
          }
        }, 1500);

      } catch (err) {
        console.error('WebRTC initialization failed:', err);
        if (isMounted) {
          setErrorMsg(
            err.name === 'NotAllowedError'
              ? 'Camera or microphone access denied. Please grant device permissions to start video inspection.'
              : `Media hardware error: ${err.message}`
          );
        }
      }
    };

    startWebRTC();

    return () => {
      isMounted = false;
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (peerConnRef.current) {
        peerConnRef.current.close();
      }
    };
  }, [session.session_id, isFarmer]);

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoOff(!videoTrack.enabled);
      }
    }
  };

  const handleHangup = async () => {
    try {
      await callService.endCall(session.session_id);
    } catch (e) {
      console.error(e);
    } finally {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl overflow-hidden shadow-2xl w-full max-w-4xl flex flex-col h-[85vh] max-h-[720px]">
        {/* Header Bar */}
        <div className="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-forest-600/30 text-forest-400 border border-forest-500/30 flex items-center justify-center">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">Live Produce Inspection</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-forest-500/20 text-forest-300 border border-forest-500/30">
                  <ShieldCheck className="w-3 h-3" /> WebRTC Authenticated
                </span>
              </div>
              <span className="text-xs text-slate-400">
                Crop: <strong className="text-slate-200">{session?.product_name}</strong> • With:{' '}
                <strong className="text-slate-200">{otherPartyName}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5 ${
                callStatus === 'in_progress'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : callStatus === 'ended' || callStatus === 'declined'
                  ? 'bg-red-500/20 text-red-300'
                  : 'bg-amber-500/20 text-amber-300'
              }`}
            >
              {callStatus === 'in_progress' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live Stream
                </>
              ) : callStatus === 'ended' ? (
                'Call Ended'
              ) : callStatus === 'declined' ? (
                'Call Declined'
              ) : (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" /> Connecting Peer...
                </>
              )}
            </span>
          </div>
        </div>

        {/* Video Viewport Container */}
        <div className="relative flex-1 bg-slate-950 overflow-hidden flex items-center justify-center">
          {errorMsg ? (
            <div className="p-6 text-center max-w-md space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-red-300">Media Device Notice</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{errorMsg}</p>
              <button
                onClick={onClose}
                className="mt-3 px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
              >
                Close Window
              </button>
            </div>
          ) : (
            <>
              {/* Remote Peer Video Stream */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />

              {/* Waiting overlay if remote video stream has not yet negotiated */}
              {callStatus !== 'in_progress' && (
                <div className="absolute inset-0 bg-slate-950/70 flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <div className="w-16 h-16 rounded-3xl bg-forest-900/60 border border-forest-500/30 flex items-center justify-center text-forest-300 shadow-xl animate-pulse">
                    <Video className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-white">
                      {isFarmer ? 'Connecting with Prospective Buyer...' : 'Connecting with Farmer Field Camera...'}
                    </h3>
                    <p className="text-xs text-slate-400 max-w-sm mt-1">
                      Establishing encrypted peer-to-peer WebRTC connection using Google STUN signaling.
                    </p>
                  </div>
                </div>
              )}

              {/* Local Video Thumbnail (Picture-in-Picture) */}
              <div className="absolute bottom-4 right-4 w-36 sm:w-48 aspect-video bg-slate-900 rounded-2xl border-2 border-slate-700/80 overflow-hidden shadow-2xl">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover mirror"
                />
                <span className="absolute bottom-1.5 left-2 text-[10px] bg-slate-950/80 px-2 py-0.5 rounded-md font-medium text-slate-300">
                  You ({currentUser?.full_name?.split(' ')[0]})
                </span>
              </div>
            </>
          )}
        </div>

        {/* Bottom Call Controls */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-center gap-4">
          <button
            onClick={toggleMic}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition shadow-md ${
              micMuted
                ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-white'
            }`}
            title={micMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {micMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleVideo}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition shadow-md ${
              videoOff
                ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-white'
            }`}
            title={videoOff ? 'Enable Camera' : 'Disable Camera'}
          >
            {videoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>

          <button
            onClick={handleHangup}
            className="px-6 h-12 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-red-600/30"
          >
            <PhoneOff className="w-5 h-5" />
            <span>End Call</span>
          </button>
        </div>
      </div>
    </div>
  );
}
