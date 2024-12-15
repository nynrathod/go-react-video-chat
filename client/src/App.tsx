import React, { useState } from 'react';
import VideoChat from './VideoChat';

const App: React.FC = () => {
    const [roomID, setRoomID] = useState('');
    const [isRoomJoined, setIsRoomJoined] = useState(false);
    const [isCallActive, setIsCallActive] = useState(false);

    const handleCallEnd = () => {
        setIsCallActive(false); // Set call status to false when call ends
        setIsRoomJoined(false);  // Optionally reset the room state when the call ends
    };

    const createRoom = async () => {
        const response = await fetch('http://localhost:8080/create-room');
        const data = await response.json();
        setRoomID(data.roomID);
        setIsRoomJoined(true);
    };

    const joinRoom = () => {
        if (roomID.trim()) {
            setIsRoomJoined(true);
        }
    };

    return (
        <div className="flex items-center justify-center h-screen bg-gray-100">
            <div className="w-full p-6 bg-white rounded-lg shadow-lg">
                {!isRoomJoined && (
                    <h1 className="text-3xl font-semibold text-center mb-8">
                        Real-Time Video Call
                    </h1>
                )}
                <div className="flex flex-col items-center">
                    {!isRoomJoined ? (
                        <div className="flex flex-col items-center gap-4">
                            <button
                                className="px-6 py-3 bg-blue-500 text-white rounded-full text-lg w-full hover:bg-blue-600 transition"
                                onClick={createRoom}
                                disabled={isCallActive} // Disable if call is active
                            >
                                Create Room
                            </button>
                            <input
                                type="text"
                                placeholder="Enter Room ID to Join"
                                value={roomID}
                                onChange={(e) => setRoomID(e.target.value)}
                                className="w-full px-4 py-2 mt-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                className="px-6 py-3 bg-green-500 text-white rounded-full text-lg mt-4 w-full hover:bg-green-600 transition"
                                onClick={joinRoom}
                                disabled={isCallActive || roomID.trim() === ''} // Disable if call is active or roomID is empty
                            >
                                Join Room
                            </button>
                        </div>
                    ) : (
                        <VideoChat roomID={roomID} onEndCall={handleCallEnd} />
                    )}
                </div>
            </div>
        </div>
    );
};

export default App;
