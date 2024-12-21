import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function UsernameModal({ isOpen, onUsernameSet }) {
  const [username, setUsername] = useState('');

  useEffect(() => {
    // Reset username when modal opens
    if (isOpen) {
      setUsername('');
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.trim()) {
      onUsernameSet(username.trim());
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-bold text-gray-800">Welcome to Video Conference</DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            Please enter your username to continue and join the meeting.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="username" className="text-sm font-medium text-gray-700">
              Username
            </Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="w-full rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow"
              autoFocus
            />
          </div>
          <DialogFooter className="flex justify-end gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setUsername('')}
              className="bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Clear
            </Button>
            <Button
              type="submit"
              disabled={!username.trim()}
              className="bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
            >
              Set Username
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
