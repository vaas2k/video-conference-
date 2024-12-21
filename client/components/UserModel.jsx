import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"


export function UsernameModal({ isOpen, onUsernameSet }) {
  const [username, setUsername] = useState('')

  useEffect(() => {
    // Reset username when modal opens
    if (isOpen) {
      setUsername('')
    }
  }, [isOpen])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (username.trim()) {
      onUsernameSet(username.trim());
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Welcome to Video Conference</DialogTitle>
          <DialogDescription>
            Please enter your username to continue.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                Username
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="col-span-3"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!username.trim()}>
              Set Username
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

