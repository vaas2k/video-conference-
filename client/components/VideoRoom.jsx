'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Sidebar } from './Sidebar'
import { Video, Plus } from 'lucide-react'
import { UsernameModal } from './UserModel';
import { useRouter } from 'next/navigation'
import useWebSocket from '@/store/useWebSocket'
import { Toaster, toast } from 'react-hot-toast'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"

export default function VideoDashboard() {

  const router = useRouter();
  const [username, setUsername] = useState('')
  const [showUsernameModal, setShowUsernameModal] = useState(true)
  const [meetingId, setMeetingId] = useState('')
  const initSocketConnection = useWebSocket(state => state.initSocketConnection);
  const socket = useWebSocket(state => state.socket);

  const [roomExist, setRoomExist] = useState(false);
  const [joinAudio, setJoinAudio] = useState(true);
  const [joinVideo, setJoinVideo] = useState(true);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    (async function inits() {
      await initSocketConnection();
    })();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.addEventListener('message', (message) => {
        const { event, data } = JSON.parse(message.data);
        console.log(event, data);
        if (event === 'room-exist') {
          const room_exist = data.room_exist;
          if (room_exist) {
            console.log(`${username} is joining meeting ${meetingId}`)
            setRoomExist(true);
          }
          else {
            toast.error('NO ROOM FOUND');
          }
        }
      })
    }
  }, [socket]);

  useEffect(() => {
    if (roomExist) {
      router.push(`/room/${username}-${meetingId}?audio=${joinAudio}&video=${joinVideo}`);
    }
  }, [roomExist]);


  const handleJoinMeeting = () => {
    setShowDialog(true);
  }

  const confirmJoinMeeting = () => {
    setShowDialog(false);
    socket.send(JSON.stringify({
      event: 'room-exist',
      data: {
        roomID: meetingId
      }
    }))
  }

  const handleUsernameSet = (newUsername) => {
    setUsername(newUsername)
    setShowUsernameModal(false)
  }

  const handleCreateMeeting = () => {
    console.log(`${username} is creating a new meeting`)
    // generate a random meeting id
    const newMeetingId = Math.random().toString(36).substring(2, 8);
    router.push(`/room/${username}-${newMeetingId}?audio=${joinAudio}&video=${joinVideo}`);
  }

  if (showUsernameModal) {
    return <UsernameModal isOpen={showUsernameModal} onUsernameSet={handleUsernameSet} />
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-100">
      <Toaster position="top-center" reverseOrder={false} />
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 ">
        <h1 className="text-2xl md:text-3xl text-center font-bold mb-4 md:mb-8">
          Welcome, {username}
        </h1>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Join a meeting</CardTitle>
              <CardDescription>Enter a code or link</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2">
                <Input
                  placeholder="Enter meeting code"
                  value={meetingId}
                  onChange={(e) => setMeetingId(e.target.value)}
                  className="w-full"
                />
                <Button
                  onClick={handleJoinMeeting}
                  disabled={!meetingId}
                  className="w-full md:w-auto"
                >
                  Join
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Create a meeting</CardTitle>
              <CardDescription>Start a new video meeting</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleCreateMeeting}
                className="w-full flex justify-center items-center"
              >
                <Plus className="mr-2 h-4 w-4" /> New meeting
              </Button>
            </CardContent>
          </Card>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Join Meeting Options</DialogTitle>
              <DialogDescription>
                Choose your audio and video preferences before joining.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <label htmlFor="audio">Enable Audio</label>
                <Switch
                  id="audio"
                  checked={joinAudio}
                  onCheckedChange={setJoinAudio}
                />
              </div>
              <div className="flex items-center justify-between">
                <label htmlFor="video">Enable Video</label>
                <Switch
                  id="video"
                  checked={joinVideo}
                  onCheckedChange={setJoinVideo}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={confirmJoinMeeting}>Confirm</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <h2 className="text-xl md:text-2xl font-semibold mt-8 md:mt-12 mb-4">
          Upcoming meetings
        </h2>
        <Card>
          <CardContent className="p-0">
            <div className="p-4 md:p-6 border-b">
              <div className="flex flex-col md:flex-row md:items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Team Standup</h3>
                  <p className="text-sm text-gray-500">10:00 AM - 10:30 AM</p>
                </div>
                <Button variant="outline" className="mt-2 md:mt-0">
                  <Video className="mr-2 h-4 w-4" /> Join
                </Button>
              </div>
            </div>
            <div className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Project Review</h3>
                  <p className="text-sm text-gray-500">2:00 PM - 3:00 PM</p>
                </div>
                <Button variant="outline" className="mt-2 md:mt-0">
                  <Video className="mr-2 h-4 w-4" /> Join
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
  
}
