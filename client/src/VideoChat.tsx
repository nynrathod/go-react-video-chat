import React, { useEffect, useRef, useState } from "react";
import { SpeakerWaveIcon, SpeakerXMarkIcon, PhoneIcon, VideoCameraIcon, VideoCameraSlashIcon } from '@heroicons/react/24/outline'

interface VideoChatProps {
    roomID: string;
    onEndCall: () => void;
}

const VideoChat: React.FC<VideoChatProps> = ({ roomID, onEndCall }) => {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);

    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const signalingSocket = useRef<WebSocket | null>(null);

    useEffect(() => {
        navigator.mediaDevices
            .getUserMedia({ video: true, audio: true })
            .then((stream) => {
                setLocalStream(stream);
                if (localVideoRef.current) localVideoRef.current.srcObject = stream;
            });

        signalingSocket.current = new WebSocket(`ws://localhost:8080/ws/${roomID}`);

        signalingSocket.current.onmessage = async (message) => {
            const data = JSON.parse(message.data);

            if (data.offer) {
                await peerConnection.current?.setRemoteDescription(
                    new RTCSessionDescription(data.offer)
                );
                const answer = await peerConnection.current?.createAnswer();
                await peerConnection.current?.setLocalDescription(answer);
                signalingSocket.current?.send(JSON.stringify({ answer }));
            } else if (data.answer) {
                await peerConnection.current?.setRemoteDescription(
                    new RTCSessionDescription(data.answer)
                );
            } else if (data.candidate) {
                await peerConnection.current?.addIceCandidate(
                    new RTCIceCandidate(data.candidate)
                );
            } else if (data.disconnect) {
                onEndCall();
            }
        };

        return () => signalingSocket.current?.close();
    }, [roomID, onEndCall]);

    useEffect(() => {
        peerConnection.current = new RTCPeerConnection();

        localStream?.getTracks().forEach((track) => {
            peerConnection.current?.addTrack(track, localStream);
        });

        peerConnection.current.ontrack = (event) => {
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
        };

        peerConnection.current.onicecandidate = (event) => {
            if (event.candidate) {
                signalingSocket.current?.send(JSON.stringify({ candidate: event.candidate }));
            }
        };

        peerConnection.current.oniceconnectionstatechange = () => {
            if (peerConnection.current?.iceConnectionState === 'failed' || peerConnection.current?.iceConnectionState === 'disconnected') {
                onEndCall();
            }
        };

        return () => {
            peerConnection.current?.close();
        };
    }, [localStream, onEndCall]);

    const startCall = async () => {
        const offer = await peerConnection.current?.createOffer();
        await peerConnection.current?.setLocalDescription(offer);
        signalingSocket.current?.send(JSON.stringify({ offer }));
    };

    const toggleAudio = () => {
        localStream?.getAudioTracks().forEach((track) => (track.enabled = !track.enabled));
        setIsAudioEnabled((prev) => !prev);
    };

    const toggleVideo = () => {
        localStream?.getVideoTracks().forEach((track) => (track.enabled = !track.enabled));
        setIsVideoEnabled((prev) => !prev);
    };

    const endCall = () => {
        peerConnection.current?.close();
        signalingSocket.current?.send(JSON.stringify({ disconnect: true })); //
        onEndCall();
    };

    return (
        <div className="block w-full items-center justify-center bg-gray-100 p-4">
            <h2 className="text-xl absolute z-10 top-0 font-semibold text-center mb-4">Room ID: {roomID}</h2>
            <div className="relative flex items-center justify-center w-full  mb-4">
                <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    className="absolute top-0 right-0 w-32 h-32 rounded-lg border-2 border-white shadow-lg z-10"
                />
                <video
                    ref={remoteVideoRef}
                    autoPlay
                    className="w-full h-full object-cover rounded-lg shadow-lg border-2 border-white"
                    style={{aspectRatio: "16/9"}}
                />
            </div>
            <div className="flex absolute bottom-20 w-full justify-center gap-4">
                <button
                    className="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition"
                    onClick={startCall}
                >
                    Start Call
                </button>
                <button
                    className="bg-yellow-500 text-white py-2 px-4 rounded-lg hover:bg-yellow-600 transition"
                    onClick={toggleAudio}
                >
                    {isAudioEnabled ? <SpeakerWaveIcon className="size-6" /> : <SpeakerXMarkIcon className="size-6" /> }
                </button>
                <button
                    className="bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition"
                    onClick={toggleVideo}
                >
                    {isVideoEnabled ? <VideoCameraIcon className="size-6" /> : <VideoCameraSlashIcon className="size-6" /> }
                </button>
                <button
                    className="bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition"
                    onClick={endCall}
                >
                    <PhoneIcon className=" rotate-[135deg] size-6" />
                </button>
            </div>
        </div>
    );
};

export default VideoChat;
