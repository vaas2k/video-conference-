'use client';
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Mic, Video, Phone, MessageSquare, Users, MoreVertical, MonitorUp } from 'lucide-react';

const participants = [
  { id: 1, name: 'John Doe', avatar: '/placeholder.svg?height=40&width=40' },
  { id: 2, name: 'Jane Smith', avatar: '/placeholder.svg?height=40&width=40' },
  { id: 3, name: 'Bob Johnson', avatar: '/placeholder.svg?height=40&width=40' },
  { id: 4, name: 'Alice Brown', avatar: '/placeholder.svg?height=40&width=40' },
];

const VideoConference = () => {
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, sender: 'John Doe', text: 'Hello, everyone!' },
    { id: 2, sender: 'Jane Smith', text: 'Hi, John!' },
  ]);
  const [message, setMessage] = useState('');

  const handleMessage = () => {
    
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Video grid */}
        <div className='h-screen p-[15px] flex flex-wrap gap-[20px] overflow-y-auto'>
          <img src="" 
            className='border-[1px] border-zinc-600 w-[450px] h-[300px] rounded-xl'
          />
          <img src="" 
            className='border-[1px] border-zinc-600 w-[450px] h-[300px] rounded-xl'
          />
          <img src="" 
            className='border-[1px] border-zinc-600 w-[450px] h-[300px] rounded-xl'
          />
          <img src="" 
            className='border-[1px] border-zinc-600 w-[450px] h-[300px] rounded-xl'
          />
          <img src="" 
            className='border-[1px] border-zinc-600 w-[450px] h-[300px] rounded-xl'
          />
          <img src="" 
            className='border-[1px] border-zinc-600 w-[450px] h-[300px] rounded-xl'
          />
        </div>
        
        {/* Controls */}
        <div className="bg-white p-4 flex justify-between items-center">
          <div className="flex space-x-2">
            <Button variant="outline" size="icon">
              <Mic className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Video className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="icon" onClick={() => setShowChat(!showChat)}>
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setShowParticipants(!showParticipants)}>
              <Users className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <MonitorUp className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="destructive" size="icon">
            <Phone className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Sidebar */}
      {showParticipants && (
        <div className="w-64 bg-white border-l border-gray-200 p-4">
          <h2 className="text-lg font-semibold mb-4">Participants</h2>
          <div className="space-y-4">
            {participants.map((participant) => (
              <div key={participant.id} className="flex items-center space-x-2">
                <span>{participant.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showChat && (
        <div className="w-[320px] bg-white border-l border-gray-300 flex flex-col shadow-lg">
        {/* Chat Section */}
        <div className="flex flex-col p-6 h-full overflow-auto">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">Chat</h2>
          <div className="flex flex-col gap-3 mb-6">
            {messages.map((data, index) => (
              <div key={index} className="p-3 rounded-lg bg-gray-100 shadow-sm">
                <p className="text-sm font-semibold text-gray-800">{data.from}</p>
                <p className="text-sm text-gray-600">{data.message}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-auto">
            <input
              name="message"
              value={message}
              className="flex-1 border rounded px-3 py-2 text-sm"
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message"
            />
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded-lg"
              onClick={() => handleMessage(message)}
            >
              Send
            </button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default VideoConference;
